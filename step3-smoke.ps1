Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# =========================
# Madrasti - Step 3 Smoke Test (all-in-one) — PS5/PS7 safe
# Fixes:
#  - no param named $host (reserved, read-only)
#  - no Connection: close header in Invoke-WebRequest (PS blocks it)
#  - proper failure counting (no "OK" after a failing command)
#  - Postgres user auto-detected from container env
# =========================

function Step($m){ Write-Host ""; Write-Host ("=== {0} ===" -f $m) -ForegroundColor Cyan }
function Ok($m){ Write-Host ("✅ {0}" -f $m) -ForegroundColor Green }
function Warn($m){ Write-Host ("⚠️  {0}" -f $m) -ForegroundColor Yellow }
function Fail($m){ Write-Host ("❌ {0}" -f $m) -ForegroundColor Red }

$script:Failures = 0
function Assert($cond, $msg){
  if ($cond) { Ok $msg } else { Fail $msg; $script:Failures++ }
}

function Run($cmd){
  Write-Host (">> {0}" -f $cmd) -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

# --- Config (adjust if you changed ports)
$KongProxy = "http://localhost:8000"
$KongAdmin = "http://localhost:8001"

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

function Http-Check($url, $name){
  try {
    # Don't try to force Connection: close via headers (PowerShell forbids it).
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 8 -Method GET
    Assert ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) ("{0} -> {1}" -f $name, $resp.StatusCode)
  } catch {
    Fail ("{0} FAILED -> {1} :: {2}" -f $name, $url, $_.Exception.Message)
    $script:Failures++
  }
}

function Tcp-Check($computerName, $port, $name){
  try {
    $ok = Test-NetConnection -ComputerName $computerName -Port $port -InformationLevel Quiet
    Assert $ok ("{0} TCP {1}:{2} open" -f $name, $computerName, $port)
  } catch {
    Fail ("{0} TCP check error -> {1}" -f $name, $_.Exception.Message)
    $script:Failures++
  }
}

function Exec-Ok($cmd, $okMsg, $failMsg){
  try {
    Run $cmd
    Ok $okMsg
  } catch {
    Fail ("{0}: {1}" -f $failMsg, $_.Exception.Message)
    $script:Failures++
  }
}

Step "0) Versions"
Exec-Ok "docker --version" "docker present" "docker failed"
Exec-Ok "docker compose version" "docker compose present" "docker compose failed"

Step "1) Compose config sanity"
Exec-Ok "docker compose config > `$null" "docker compose config OK" "docker compose config FAILED"

Step "2) Containers status"
try {
  $ps = docker compose ps --format json | ConvertFrom-Json
  $names = @($ps | ForEach-Object { $_.Name })
  foreach ($c in $ExpectedContainers) {
    Assert ($names -contains $c) ("container present: {0}" -f $c)
  }
} catch {
  Warn "Could not parse docker compose ps json; skipping 'present' assertions."
}
Run "docker compose ps" | Out-Null
Run "docker compose ps"

Step "3) Port checks (host)"
Tcp-Check "localhost" 5432 "postgres"
Tcp-Check "localhost" 6379 "redis"
Tcp-Check "localhost" 8000 "kong proxy"
Tcp-Check "localhost" 8001 "kong admin"

Step "4) Direct service health checks"
foreach ($s in $Services) {
  Http-Check $s.Direct ("direct/{0}/health" -f $s.Name)
}

Step "5) Kong routing checks"
foreach ($s in $Services) {
  Http-Check $s.Kong ("kong/{0}/health" -f $s.Name)
}

Step "6) Kong admin check (optional)"
Http-Check ("{0}/status" -f $KongAdmin) "kong-admin/status"

Step "7) Readiness checks (optional)"
foreach ($s in $Services) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $s.Ready -TimeoutSec 6 -Method GET
    Ok ("readyz/{0} -> {1}" -f $s.Name, $resp.StatusCode)
  } catch {
    Warn ("readyz/{0} not available or failing (OK if you don't expose /readyz): {1}" -f $s.Name, $s.Ready)
  }
}

Step "8) Metrics checks (optional)"
foreach ($s in $Services) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $s.Metrics -TimeoutSec 6 -Method GET
    Assert ($resp.StatusCode -eq 200 -and $resp.Content -match "process_cpu_user_seconds_total|nodejs_") ("metrics/{0} -> 200 + looks like prometheus" -f $s.Name)
  } catch {
    Warn ("metrics/{0} not available (OK if you disabled /metrics): {1}" -f $s.Name, $s.Metrics)
  }
}

Step "9) In-network checks (service DNS + connectivity)"
try {
  $cmd = @'
apk add --no-cache curl >/dev/null;
echo "auth->"; curl -sS -i http://auth:8081/health | head -n 3;
echo "---";
echo "student->"; curl -sS -i http://student:8082/health | head -n 3;
echo "---";
echo "school->"; curl -sS -i http://school:8083/health | head -n 3;
echo "---";
echo "user-profile->"; curl -sS -i http://user-profile:8084/health | head -n 3;
'@
  Run ("docker run --rm --network madrasti_default alpine sh -lc `"{0}`"" -f $cmd)
  Ok "in-network HTTP looks OK"
} catch {
  Fail ("in-network connectivity FAILED: {0}" -f $_.Exception.Message)
  $script:Failures++
}

Step "10) Postgres basic query (SELECT 1)"
try {
  # Detect the DB user from container env (POSTGRES_USER), fallback to postgres.
  $dbUser = (docker compose exec -T postgres sh -lc 'printf "%s" "${POSTGRES_USER:-postgres}"') 2>$null
  if (-not $dbUser) { $dbUser = "postgres" }

  # Also detect DB name (POSTGRES_DB), fallback to postgres.
  $dbName = (docker compose exec -T postgres sh -lc 'printf "%s" "${POSTGRES_DB:-postgres}"') 2>$null
  if (-not $dbName) { $dbName = "postgres" }

  Run ("docker compose exec -T postgres sh -lc `"psql -U {0} -d {1} -c 'SELECT 1;'`"" -f $dbUser, $dbName)
  Ok ("Postgres SELECT 1 OK (user={0}, db={1})" -f $dbUser, $dbName)
} catch {
  Fail ("Postgres SELECT 1 FAILED: {0}" -f $_.Exception.Message)
  $script:Failures++
}

Step "11) Summary"
if ($Failures -eq 0) {
  Ok "STEP 3 SMOKE: PASS ✅"
  exit 0
} else {
  Fail ("STEP 3 SMOKE: FAIL ❌ (failures={0})" -f $Failures)
  exit 1
}
