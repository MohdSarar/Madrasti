Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# =========================
# Madrasti - STEP 3 VERIFY (PS5/PS7 safe)
# - Hard checks: infra + kong + services + metrics + db + redis
# - Uses docker inspect for HEALTH
# - Fixes quoting for alpine checks + proper route mapping for user-profile
# =========================

function Step($m){ Write-Host ""; Write-Host ("=== {0} ===" -f $m) -ForegroundColor Cyan }
function Ok($m){ Write-Host ("✅ {0}" -f $m) -ForegroundColor Green }
function Warn($m){ Write-Host ("⚠️  {0}" -f $m) -ForegroundColor Yellow }
function FailMsg($m){ Write-Host ("❌ {0}" -f $m) -ForegroundColor Red }

$script:Failures = 0
function Assert($cond, $msg){
  if ($cond) { Ok $msg } else { FailMsg $msg; $script:Failures++ }
}

function Run($cmd){
  Write-Host (">> {0}" -f $cmd) -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

function Exec-Ok($cmd, $okMsg, $failMsg){
  try { Run $cmd | Out-Null; Ok $okMsg }
  catch { FailMsg ("{0}: {1}" -f $failMsg, $_.Exception.Message); $script:Failures++ }
}

function Tcp-Check($computerName, $port, $name){
  try {
    $ok = Test-NetConnection -ComputerName $computerName -Port $port -InformationLevel Quiet
    Assert $ok ("{0} TCP {1}:{2} open" -f $name, $computerName, $port)
  } catch {
    FailMsg ("{0} TCP check error -> {1}" -f $name, $_.Exception.Message)
    $script:Failures++
  }
}

function Http-Check($url, $name, $expectStatus = 200, $mustContainRegex = $null){
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10 -Method GET
    Assert ($resp.StatusCode -eq $expectStatus) ("{0} -> {1}" -f $name, $resp.StatusCode)
    if ($mustContainRegex) {
      Assert ($resp.Content -match $mustContainRegex) ("{0} content matches /{1}/" -f $name, $mustContainRegex)
    }
    return $resp
  } catch {
    FailMsg ("{0} FAILED -> {1} :: {2}" -f $name, $url, $_.Exception.Message)
    $script:Failures++
    return $null
  }
}

function Docker-Health($containerName){
  # returns: healthy | unhealthy | none | notfound | notrunning | unknown
  try {
    $exists = docker ps -a --format "{{.Names}}" | Select-String -SimpleMatch $containerName
    if (-not $exists) { return "notfound" }

    $running = docker inspect -f "{{.State.Running}}" $containerName 2>$null
    if ($running -ne "true") { return "notrunning" }

    $health = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{end}}" $containerName 2>$null
    if ([string]::IsNullOrWhiteSpace($health)) { return "none" }

    return $health.Trim()
  } catch {
    return "unknown"
  }
}

# --- Config
$KongProxy = "http://localhost:8000"
$KongAdmin = "http://localhost:8001"
$Network   = "madrasti_default"

$Services = @(
  @{ Name="auth";         Direct="http://localhost:8081/health"; Kong=("$KongProxy/auth/health");     Ready="http://localhost:8081/readyz";     Metrics="http://localhost:8081/metrics" },
  @{ Name="student";      Direct="http://localhost:8082/health"; Kong=("$KongProxy/student/health");  Ready="http://localhost:8082/readyz";     Metrics="http://localhost:8082/metrics" },
  @{ Name="school";       Direct="http://localhost:8083/health"; Kong=("$KongProxy/school/health");   Ready="http://localhost:8083/readyz";     Metrics="http://localhost:8083/metrics" },
  @{ Name="user-profile"; Direct="http://localhost:8084/health"; Kong=("$KongProxy/user/health");     Ready="http://localhost:8084/readyz";     Metrics="http://localhost:8084/metrics" }
)

$ExpectedContainers = @(
  "madrasti-postgres-1",
  "madrasti-redis-1",
  "madrasti-auth-1",
  "madrasti-student-1",
  "madrasti-school-1",
  "madrasti-user-profile-1",
  "madrasti-kong-1"
)

$MustHaveMetricsRegex = "process_cpu_user_seconds_total|process_resident_memory_bytes|nodejs_eventloop_lag_seconds|nodejs_version_info"
$MustHaveCustomHttpMetricRegex = "http_request_duration_seconds|http_request_duration_ms|http_requests_total"

$RequireReadyz = $false
$RequireKongAdmin = $true
$RequireKongConfig = $true

# --------- RUN ---------

Step "0) Versions"
Exec-Ok "docker --version" "docker present" "docker failed"
Exec-Ok "docker compose version" "docker compose present" "docker compose failed"

Step "1) Compose config sanity"
Exec-Ok "docker compose config > `$null" "docker compose config OK" "docker compose config FAILED"

Step "2) Containers present + running/healthy (docker inspect)"
foreach ($c in $ExpectedContainers) {
  $h = Docker-Health $c
  Assert ($h -ne "notfound") ("container present: {0}" -f $c)
  Assert ($h -ne "notrunning") ("container running: {0}" -f $c)

  if ($h -eq "none") {
    Warn ("container has no healthcheck: {0}" -f $c)
  } elseif ($h -eq "healthy") {
    Ok ("container healthy: {0}" -f $c)
  } elseif ($h -eq "unhealthy") {
    FailMsg ("container UNHEALTHY: {0}" -f $c)
    $script:Failures++
  } else {
    Warn ("container health status='{0}' for {1}" -f $h, $c)
  }
}

Run "docker compose ps"

Step "3) Port checks (host)"
Tcp-Check "localhost" 5432 "postgres"
Tcp-Check "localhost" 6379 "redis"
Tcp-Check "localhost" 8000 "kong proxy"
Tcp-Check "localhost" 8001 "kong admin"

Step "4) Direct service health checks (must be 200)"
foreach ($s in $Services) { Http-Check $s.Direct ("direct/{0}/health" -f $s.Name) 200 | Out-Null }

Step "5) Kong routing checks (must be 200)"
foreach ($s in $Services) { Http-Check $s.Kong ("kong/{0}/health" -f $s.Name) 200 | Out-Null }

Step "6) Kong admin checks"
if ($RequireKongAdmin) {
  Http-Check ("{0}/status" -f $KongAdmin) "kong-admin/status" 200 | Out-Null

  if ($RequireKongConfig) {
    $routes = Http-Check ("{0}/routes" -f $KongAdmin) "kong-admin/routes" 200
    $svcs   = Http-Check ("{0}/services" -f $KongAdmin) "kong-admin/services" 200

    if ($routes -and $routes.Content) {
      # IMPORTANT: user-profile is routed as "user-route" in Kong
      $RouteMap = @(
        "auth-route",
        "student-route",
        "school-route",
        "user-route"
      )
      foreach ($r in $RouteMap) {
        Assert ($routes.Content -match $r) ("kong route exists: {0}" -f $r)
      }
    }

    if ($svcs -and $svcs.Content) {
      Assert ($svcs.Content -match '"name"\s*:\s*"auth"')    "kong service exists: auth"
      Assert ($svcs.Content -match '"name"\s*:\s*"student"') "kong service exists: student"
      Assert ($svcs.Content -match '"name"\s*:\s*"school"')  "kong service exists: school"
      Assert ($svcs.Content -match '"name"\s*:\s*"user"')    "kong service exists: user"
    }
  }
} else {
  Warn "Kong admin checks disabled"
}

Step "7) Readiness checks"
foreach ($s in $Services) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $s.Ready -TimeoutSec 8 -Method GET
    if ($RequireReadyz) { Assert ($resp.StatusCode -eq 200) ("readyz/{0} -> {1}" -f $s.Name, $resp.StatusCode) }
    else { Ok ("readyz/{0} -> {1}" -f $s.Name, $resp.StatusCode) }
  } catch {
    if ($RequireReadyz) { FailMsg ("readyz/{0} FAILED (required): {1}" -f $s.Name, $s.Ready); $script:Failures++ }
    else { Warn ("readyz/{0} not available (optional): {1}" -f $s.Name, $s.Ready) }
  }
}

Step "8) Metrics checks (must be 200 + base prom + custom http metric)"
foreach ($s in $Services) {
  $resp = Http-Check $s.Metrics ("metrics/{0}" -f $s.Name) 200
  if ($resp) {
    Assert ($resp.Content -match $MustHaveMetricsRegex) ("metrics/{0}: base prom metrics present" -f $s.Name)
    Assert ($resp.Content -match $MustHaveCustomHttpMetricRegex) ("metrics/{0}: custom http metric present" -f $s.Name)
  }
}

Step "9) In-network checks (service DNS + HTTP) via alpine"
try {
  $oneLine = "apk add --no-cache curl >/dev/null; " +
             "curl -sS -i http://auth:8081/health | head -n 1; " +
             "curl -sS -i http://student:8082/health | head -n 1; " +
             "curl -sS -i http://school:8083/health | head -n 1; " +
             "curl -sS -i http://user-profile:8084/health | head -n 1"
  $out = (docker run --rm --network $Network alpine sh -lc $oneLine) 2>&1
  Assert ($out -match "HTTP/1\.1 200") "in-network HTTP 200 for services (at least one line shows 200)"
} catch {
  FailMsg ("in-network DNS/HTTP FAILED: {0}" -f $_.Exception.Message)
  $script:Failures++
}

Step "10) Redis ping (from a client container)"
try {
  $oneLine = "apk add --no-cache redis >/dev/null; redis-cli -h redis ping"
  $out = (docker run --rm --network $Network alpine sh -lc $oneLine) 2>&1
  Assert ($out -match "PONG") "redis ping -> PONG"
} catch {
  FailMsg ("redis ping FAILED: {0}" -f $_.Exception.Message)
  $script:Failures++
}

Step "11) Postgres SELECT 1"
try {
  $dbUser = (docker compose exec -T postgres sh -lc 'printf "%s" "${POSTGRES_USER:-postgres}"') 2>$null
  if (-not $dbUser) { $dbUser = "postgres" }
  $dbName = (docker compose exec -T postgres sh -lc 'printf "%s" "${POSTGRES_DB:-postgres}"') 2>$null
  if (-not $dbName) { $dbName = "postgres" }

  Run ("docker compose exec -T postgres sh -lc `"psql -U {0} -d {1} -c 'SELECT 1;'`"" -f $dbUser, $dbName) | Out-Null
  Ok ("postgres SELECT 1 OK (user={0}, db={1})" -f $dbUser, $dbName)
} catch {
  FailMsg ("postgres checks FAILED: {0}" -f $_.Exception.Message)
  $script:Failures++
}

Step "12) Summary"
if ($script:Failures -eq 0) {
  Ok "STEP 3 VERIFY: PASS ✅"
  exit 0
} else {
  FailMsg ("STEP 3 VERIFY: FAIL ❌ (failures={0})" -f $script:Failures)
  exit 1
}
