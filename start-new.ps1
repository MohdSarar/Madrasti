Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [switch]$NoBuild,
  [switch]$NoFrontend,
  [switch]$Verify,
  [string]$FrontendMode = "dev"
)

if ($FrontendMode -notin @("dev","prod")) {
  throw "FrontendMode must be 'dev' or 'prod'"
}

function Step($m){ Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function OK($m){ Write-Host "✅ $m" -ForegroundColor Green }
function Warn($m){ Write-Host "⚠️  $m" -ForegroundColor Yellow }
function Fail($m){ Write-Host "❌ $m" -ForegroundColor Red; throw $m }

function Require-Cmd($name){
  if (!(Get-Command $name -ErrorAction SilentlyContinue)) { Fail "$name not found in PATH" }
}

function Wait-HttpOk([string]$url, [int]$timeoutSec = 120){
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    try {
      $r = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch { Start-Sleep -Seconds 2 }
  }
  return $false
}

Step "0) Preconditions"
if (!(Test-Path "./docker-compose.yml")) { Fail "Run this script from repo root (docker-compose.yml not found)." }
Require-Cmd docker
Require-Cmd node
Require-Cmd npm

try { docker info | Out-Null } catch { Fail "Docker daemon not running. Start Docker Desktop then retry." }
OK "Tooling OK"

Step "1) Backend (Docker Compose up)"
if ($NoBuild) {
  docker compose up -d
} else {
  docker compose up -d --build
}
OK "docker compose up done"

Step "2) Wait for gateway and core services"
$kong = "http://localhost:8000"
if (Wait-HttpOk "$kong" 180) {
  OK "Gateway reachable at $kong"
} else {
  Warn "Gateway not reachable yet (check: docker compose ps / logs). Continuing."
}

$healthChecks = @(
  @{ name="auth"; url="http://localhost:8081/health" },
  @{ name="student"; url="http://localhost:8082/health" },
  @{ name="school"; url="http://localhost:8083/health" },
  @{ name="user-profile"; url="http://localhost:8084/health" }
)
foreach ($h in $healthChecks) {
  if (Wait-HttpOk $h.url 120) { OK "$($h.name) reachable" } else { Warn "$($h.name) not reachable at $($h.url)" }
}

if (-not $NoFrontend) {
  Step "3) Frontend"
  Push-Location "./frontend"
  try {
    if (Test-Path "./tools/cleanup-frontend.ps1") {
      Step "3.0) Frontend cleanup"
      powershell -NoProfile -ExecutionPolicy Bypass -File "./tools/cleanup-frontend.ps1"
      OK "frontend cleanup OK"
    }

    if (!(Test-Path "./node_modules")) {
      Step "3.1) Frontend install (npm ci)"
      npm ci
      OK "frontend npm ci OK"
    } else {
      OK "frontend node_modules present (skip npm ci)"
    }

    if ($FrontendMode -eq "prod") {
      Step "3.2) Frontend build"
      npm run build
      OK "frontend build OK"

      Step "3.3) Start frontend (prod)"
      Start-Process powershell -ArgumentList "-NoExit","-Command","cd $PWD; npm run start"
    } else {
      Step "3.2) Start frontend (dev)"
      Start-Process powershell -ArgumentList "-NoExit","-Command","cd $PWD; npm run dev"
    }
  }
  finally { Pop-Location }
  OK "Frontend started in a new terminal window"
}

if ($Verify) {
  Step "4) Verification scripts"
  if (Test-Path "./STEP4-VERIFY-STRICT.ps1") {
    powershell -NoProfile -ExecutionPolicy Bypass -File "./STEP4-VERIFY-STRICT.ps1"
    OK "STEP4 verify done"
  } else {
    Warn "STEP4-VERIFY-STRICT.ps1 not found"
  }

  if (Test-Path "./FRONTEND-VERIFY-STRICT.ps1") {
    powershell -NoProfile -ExecutionPolicy Bypass -File "./FRONTEND-VERIFY-STRICT.ps1"
    OK "Frontend verify done"
  } else {
    Warn "FRONTEND-VERIFY-STRICT.ps1 not found"
  }
}

Step "Done"
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Gateway:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Tip: run 'docker compose logs -f --tail=100' to inspect." -ForegroundColor DarkGray
