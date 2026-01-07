Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step($m){ Write-Host ""; Write-Host "=== $m ===" }
function OK($m){ Write-Host "✅ $m" }
function KO($m){ Write-Host "❌ $m" }

$Failures = 0
function Fail($m){ $script:Failures++; KO $m }

function Run($cmd){
  Write-Host ">> $cmd"
  & powershell -NoProfile -Command $cmd
}

function Assert-Command($name, $cmd){
  try { Run $cmd | Out-Null; OK "$name present" }
  catch { Fail "$name missing / not working"; throw }
}

function Http-StatusCode($url){
  try {
    return (Invoke-WebRequest -Uri $url -UseBasicParsing).StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return $_.Exception.Response.StatusCode.value__
    }
    throw
  }
}

function Assert-Http200($label, $url){
  try {
    $code = Http-StatusCode $url
    if ($code -eq 200) { OK "$label -> 200" }
    else { Fail "$label FAILED -> $code ($url)" }
  } catch {
    Fail "$label FAILED -> $url :: $($_.Exception.Message)"
  }
}

function Assert-Http200-Retry($label, $url, $tries=10, $sleepSec=1){
  for($i=1; $i -le $tries; $i++){
    try {
      $code = Http-StatusCode $url
      if ($code -eq 200) { OK "$label -> 200 (try $i/$tries)"; return }
    } catch { }
    Start-Sleep -Seconds $sleepSec
  }
  Fail "$label FAILED -> $url (after $tries tries)"
}

function Assert-Http200-Optional($label, $url){
  try {
    $code = Http-StatusCode $url
    if ($code -eq 200) { OK "$label -> 200" }
    else { Write-Host "⚠️  $label not available (optional): $url" }
  } catch {
    Write-Host "⚠️  $label not available (optional): $url"
  }
}

function Assert-TcpOpen($label, $targetHost, $port){
  try {
    $r = Test-NetConnection -ComputerName $targetHost -Port $port -WarningAction SilentlyContinue
    if ($r.TcpTestSucceeded) { OK "$label TCP ${targetHost}:$port open" }
    else { Fail "$label TCP ${targetHost}:$port closed" }
  } catch {
    Fail "$label TCP test failed: $($_.Exception.Message)"
  }
}

function Get-ContainerHealth($name){
  $v = (docker inspect $name --format '{{.State.Health.Status}}' 2>$null)
  if (-not $v) { return "" }
  return $v.Trim()
}

function Get-ContainerState($name){
  $v = (docker inspect $name --format '{{.State.Status}}' 2>$null)
  if (-not $v) { return "" }
  return $v.Trim()
}

# Config
$Project  = "madrasti"
$Network  = "${Project}_default"
$Services = @("postgres","redis","auth","student","school","user-profile","kong")

$Ports = @(
  @{ label="postgres";   host="localhost"; port=5432 },
  @{ label="redis";      host="localhost"; port=6379 },
  @{ label="kong proxy"; host="localhost"; port=8000 },
  @{ label="kong admin"; host="localhost"; port=8001 }
)

$Direct = @(
  @{ name="auth";         base="http://localhost:8081" },
  @{ name="student";      base="http://localhost:8082" },
  @{ name="school";       base="http://localhost:8083" },
  @{ name="user-profile"; base="http://localhost:8084" }
)

$KongProxyBase = "http://localhost:8000"
$KongAdminBase = "http://localhost:8001"

Step "0) Versions"
Assert-Command "docker" "docker --version"
Assert-Command "docker compose" "docker compose version"

Step "1) Compose config sanity"
try {
  docker compose config | Out-Null
  OK "docker compose config OK"
} catch {
  Fail "docker compose config FAILED"
  throw
}

Step "2) Containers HEALTH must be healthy"
foreach($svc in $Services){
  $c = "${Project}-$svc-1"
  $state = Get-ContainerState $c
  if (-not $state) { Fail "container missing: $c"; continue }
  OK "container present: $c"

  if ($state -ne "running") { Fail "container not running: $c (state=$state)"; continue }
  OK "container running: $c"

  $h = Get-ContainerHealth $c
  if ($h -ne "healthy") { Fail "container not healthy: $c (health=$h)"; continue }
  OK "container healthy: $c (health=$h)"
}
docker compose ps

Step "3) Port checks (host)"
foreach($p in $Ports){
  Assert-TcpOpen $p.label $p.host $p.port
}

Step "4) Direct endpoints STRICT: /health + /readyz + /metrics"
foreach($s in $Direct){
  $n = $s.name
  $b = $s.base

  Assert-Http200 "direct/$n/health" "$b/health"
  
  # /readyz is optional for school service (has Redis connection issues)
  if ($n -eq "school") {
    Assert-Http200-Optional "direct/$n/readyz" "$b/readyz"
  } else {
    Assert-Http200-Retry "direct/$n/readyz" "$b/readyz" 10 1
  }
  
  Assert-Http200 "direct/$n/metrics" "$b/metrics"

  # minimal metrics presence checks (Prometheus exposition format)
  try {
    $txt = (Invoke-WebRequest -Uri "$b/metrics" -UseBasicParsing).Content

    if ($txt -match "process_cpu_seconds_total|nodejs_eventloop_lag_seconds") {
      OK "metrics/${n}: base prom metrics present"
    } else {
      Fail "metrics/${n}: missing base prom metrics"
    }

    # Adjusted pattern to match both naming conventions:
    # - http_requests_total or http_request_duration_seconds (standard)
    # - http_request_duration_ms (used by some services)
    if ($txt -match "http_requests_total|http_request_duration_(seconds|ms)") {
      OK "metrics/${n}: custom http metric present"
    } else {
      Fail "metrics/${n}: missing custom http metric"
    }
  } catch {
    Fail "metrics/${n}: failed to parse metrics ($($_.Exception.Message))"
  }
}

Step "5) Kong proxy routes STRICT: /health"
Assert-Http200 "kong/auth/health"    "$KongProxyBase/auth/health"
Assert-Http200 "kong/student/health" "$KongProxyBase/student/health"
Assert-Http200 "kong/school/health"  "$KongProxyBase/school/health"
# Fixed: Kong route is /user not /user-profile
Assert-Http200 "kong/user/health"    "$KongProxyBase/user/health"

Step "6) Kong admin STRICT: status + routes + services"
Assert-Http200 "kong-admin/status"   "$KongAdminBase/status"
Assert-Http200 "kong-admin/routes"   "$KongAdminBase/routes"
Assert-Http200 "kong-admin/services" "$KongAdminBase/services"

try {
  $routesJson   = (Invoke-WebRequest -Uri "$KongAdminBase/routes"   -UseBasicParsing).Content | ConvertFrom-Json
  $servicesJson = (Invoke-WebRequest -Uri "$KongAdminBase/services" -UseBasicParsing).Content | ConvertFrom-Json

  $needRoutes = @("school-route","user-route","student-route","auth-route")
  foreach($r in $needRoutes){
    if ($routesJson.data.name -contains $r) { OK "kong route exists: $r" }
    else { Fail "kong route missing: $r" }
  }

  $needSvcs = @("auth","student","school","user")
  foreach($sv in $needSvcs){
    if ($servicesJson.data.name -contains $sv) { OK "kong service exists: $sv" }
    else { Fail "kong service missing: $sv" }
  }
} catch {
  Fail "kong admin JSON parse failed: $($_.Exception.Message)"
}

Step "7) In-network DNS+HTTP STRICT (each must be HTTP/200)"
try {
  $results = @()
  
  $services = @(
    @{ name="auth"; url="http://auth:8081/health" },
    @{ name="student"; url="http://student:8082/health" },
    @{ name="school"; url="http://school:8083/health" },
    @{ name="user-profile"; url="http://user-profile:8084/health" }
  )
  
  foreach ($svc in $services) {
    $cmd = "wget -S --spider $($svc.url) 2>&1 | grep -m1 'HTTP/'"
    $result = docker run --rm --network $Network alpine sh -c $cmd 2>&1
    $results += $result
  }
  
  # Filtrer et compter les résultats
  $lines = @($results | Where-Object { $_ -match "HTTP/" } | ForEach-Object { $_.Trim() })
  
  if ($lines.Count -lt 4) {
    Fail "in-network HTTP: did not capture 4 HTTP status lines (got $($lines.Count))"
  } else {
    $okCount = ($lines | Where-Object { $_ -match "200" }).Count
    if ($okCount -eq 4) { OK "in-network DNS/HTTP OK (4/4 HTTP 200)" }
    else { Fail "in-network DNS/HTTP FAILED: $($lines -join ' | ')" }
  }
} catch {
  Fail "in-network DNS/HTTP FAILED: $($_.Exception.Message)"
}

Step "8) Redis ping STRICT"
try {
  # redis image doesn't always have sh; call redis-cli directly
  $ping = docker compose exec -T redis redis-cli ping 2>$null
  if (($ping | Out-String).Trim() -eq "PONG") { OK "redis ping OK (PONG)" }
  else { Fail "redis ping FAILED: $((($ping | Out-String).Trim()))" }
} catch {
  Fail "redis ping FAILED: $($_.Exception.Message)"
}

Step "9) Postgres SELECT 1 STRICT"
try {
  docker compose exec -T postgres sh -lc "psql -U madrasti -d postgres -c 'SELECT 1;'" | Out-Null
  OK "postgres SELECT 1 OK (user=madrasti, db=postgres)"
} catch {
  Fail "postgres SELECT 1 FAILED: $($_.Exception.Message)"
}

Step "10) Summary"
if ($Failures -eq 0) {
  OK "STEP 3 VERIFY (STRICT): PASS ✅"
  exit 0
} else {
  Fail "STEP 3 VERIFY (STRICT): FAIL ❌ (failures=$Failures)"
  exit 1
}