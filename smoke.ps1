Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------- config ----------
$PgService   = "postgres"
$PgUser      = "madrasti"
$PgDefaultDb = "postgres"

$DbNames = @("auth_db","student_db","school_db","user_db")

$ServicesToRestart = @("student","school","user-profile")

$ReadyUrls = @(
  "http://localhost:8081/readyz",
  "http://localhost:8082/readyz",
  "http://localhost:8083/readyz",
  "http://localhost:8084/readyz"
)

$HealthUrls = @(
  "http://localhost:8081/health",
  "http://localhost:8082/health",
  "http://localhost:8083/health",
  "http://localhost:8084/health"
)

# ---------- helpers ----------
function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "=== $msg ==="
}

function Exec([string]$cmd) {
  Write-Host ">> $cmd"
  Invoke-Expression $cmd
}

function Wait-Health([string]$service, [int]$timeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    $id = (docker compose ps -q $service) 2>$null
    if ($id) {
      $health = (docker inspect -f "{{.State.Health.Status}}" $id) 2>$null
      if ($health -eq "healthy") { return }
    }
    Start-Sleep -Seconds 2
  }
  throw "Timeout waiting for health: $service"
}

# Idempotent DB creation WITHOUT crashing under $ErrorActionPreference="Stop"
function Ensure-Db([string]$dbName) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"

  try {
    $out = & docker compose exec -T $PgService `
      psql -U $PgUser -d $PgDefaultDb -c "CREATE DATABASE $dbName;" 2>&1 | Out-String
  }
  finally {
    $ErrorActionPreference = $prev
  }

  if ($out -match "CREATE DATABASE" -or $out -match "already exists") { return }

  throw "Failed to ensure DB '$dbName'. Output:`n$out"
}

function Get-Payload([string]$url) {
  try {
    (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $url).Content
  } catch {
    $null
  }
}

function Wait-Ready([string]$url, [int]$timeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $last = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $url
      $last = $r.Content

      # accept both shapes:
      # {"ok":true} OR {"status":"ok"}
      if ($last -match '"ok"\s*:\s*true' -or $last -match '"status"\s*:\s*"ok"') {
        return
      }
    } catch {
      $last = $_.Exception.Message
    }
    Start-Sleep -Seconds 2
  }

  throw "Timeout waiting for readyz: $url`nLast: $last"
}

function Dump-Urls([string]$title, [string[]]$urls) {
  Write-Host ""
  Write-Host "=== $title (best effort) ==="
  foreach ($u in $urls) {
    $p = Get-Payload $u
    if ($p) { Write-Host "$u -> $p" } else { Write-Host "$u -> ERROR" }
  }
}

function Restart-AppServices([string[]]$services) {
  $list = ($services -join " ")
  Exec "docker compose restart $list"
}

function Wait-PortsStable([int]$seconds = 3) {
  # quick safety: if services are flapping right after ready, this catches it visually
  Start-Sleep -Seconds $seconds
}

# ---------- run ----------
try {
  Write-Step "Step 1: docker compose up"
  Exec "docker compose up -d --remove-orphans"

  Write-Step "Step 2: wait infra health (postgres, redis)"
  Wait-Health "postgres" 120
  Wait-Health "redis" 120

  Write-Step "Step 3: ensure databases (idempotent)"
  foreach ($db in $DbNames) {
    Ensure-Db $db
    Write-Host "DB OK: $db"
  }

  Write-Step "Step 4: restart app services (so they reconnect after DB creation)"
  Restart-AppServices $ServicesToRestart

  Write-Step "Step 5: wait services readyz"
  foreach ($u in $ReadyUrls) {
    Wait-Ready $u 120
    Write-Host "READY OK: $u"
  }

  Write-Step "Step 6: short stability wait (avoid flapping false positive)"
  Wait-PortsStable 3

  Write-Step "Smoke tests: OK ✅"
  Dump-Urls "readyz payloads" $ReadyUrls
  Dump-Urls "health payloads" $HealthUrls

  Write-Host ""
  docker compose ps
}
catch {
  Write-Host ""
  Write-Host "Smoke tests: FAILED ❌"
  Write-Host $_

  Dump-Urls "readyz payloads" $ReadyUrls
  Dump-Urls "health payloads" $HealthUrls

  Write-Host ""
  Write-Host "=== docker compose ps ==="
  docker compose ps

  Write-Host ""
  Write-Host "=== last logs (auth/student/school/user-profile) ==="
  docker compose logs --tail=120 auth student school user-profile

  exit 1
}
