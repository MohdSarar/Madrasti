# START-MADRASTI-EXTENDED2.ps1
# Step4 / Frontend pages integration (Dashboard -> Attendance -> Schedule -> Messaging -> Documents -> Settings)
# Usage:
#   PowerShell:  .\START-MADRASTI-EXTENDED2.ps1
# Options:
#   -SkipDocker   : don't start docker
#   -SkipInstall  : don't run npm installs
#   -SkipTests    : don't run unit/e2e tests
#   -FrontendOnly : only start frontend (assumes APIs already running)

param(
  [switch]$SkipDocker,
  [switch]$SkipInstall,
  [switch]$SkipTests,
  [switch]$FrontendOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function OK($m) { Write-Host "[OK]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[FAIL] $m" -ForegroundColor Red }

function Run($cmd, [string]$label) {
  Info $label
  & $cmd
  if ($LASTEXITCODE -ne 0) { Fail "$label (exit=$LASTEXITCODE)"; throw "$label failed" }
  OK $label
}

function RunNpm([string[]]$npmArgs, [string]$label) {
  Info $label
  & npm @npmArgs
  if ($LASTEXITCODE -ne 0) { Fail "$label (exit=$LASTEXITCODE)"; throw "$label failed" }
  OK $label
}

function RunNpmOptional([string[]]$npmArgs, [string]$label) {
  Info $label
  try {
    & npm @npmArgs | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "exit=$LASTEXITCODE" }
    OK $label
  } catch {
    Warn "$label (skipped/failed)"
  }
}

function EnsureInstall([string]$dir, [string]$name) {
  Push-Location $dir
  try {
    $lock = Join-Path $dir "package-lock.json"
    if (Test-Path $lock) {
      RunNpm @("ci","--prefer-offline") "$name`: npm ci"
    } else {
      Warn "$name`: package-lock.json missing -> using npm install (will generate lockfile)"
      RunNpm @("install","--prefer-offline") "$name`: npm install"
    }
  } finally {
    Pop-Location
  }
}

function ShowTailLogIfExists([string]$title) {
  try {
    $logDir = Join-Path $env:LOCALAPPDATA "npm-cache\_logs"
    if (Test-Path $logDir) {
      $latest = Get-ChildItem $logDir -Filter "*debug-0.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if ($latest) {
        Warn "$title - last npm log: $($latest.FullName)"
        Get-Content $latest.FullName -Tail 40 | ForEach-Object { Write-Host $_ }
      }
    }
  } catch { }
}

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo
Info "Repo: $repo"

# Tools
Info "Checking tools..."
try { node -v | Out-Null; OK "node OK" } catch { Fail "Node.js missing"; throw }
try { npm -v | Out-Null; OK "npm OK" } catch { Fail "npm missing"; throw }
if (-not $SkipDocker -and -not $FrontendOnly) {
  try { docker version | Out-Null; OK "docker OK" } catch { Fail "docker not available (use -SkipDocker)"; throw }
} else {
  try { docker version | Out-Null; OK "docker OK" } catch { Warn "docker not available (ok if -SkipDocker/-FrontendOnly)" }
}

# Root deps
if (-not $SkipInstall) {
  try {
    EnsureInstall $repo "root"
  } catch {
    ShowTailLogIfExists "Root install failed"
    throw
  }
}

# Docker up
if (-not $SkipDocker -and -not $FrontendOnly) {
  Run { docker compose up -d --remove-orphans } "docker compose up -d (infra + services)"
  Info "Waiting for core services health (best effort)..."
  $healthUrls = @(
    "http://localhost:8081/health",
    "http://localhost:8085/health",
    "http://localhost:8086/health",
    "http://localhost:8087/health",
    "http://localhost:8089/health",
    "http://localhost:8090/health"
  )

  foreach ($u in $healthUrls) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri $u
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) {
        OK "Healthy: $u"
      } else {
        Warn "Unhealthy (status $($r.StatusCode)): $u"
      }
    } catch {
      Warn "Not reachable: $u"
    }
  }
}

# Frontend checks
$fe = Join-Path $repo "frontend"
if (-not (Test-Path $fe)) { Fail "frontend folder not found"; throw }

# Env
$envLocal = Join-Path $fe ".env.local"
$envExample = Join-Path $fe ".env.example"
if (-not (Test-Path $envLocal)) {
  Warn ".env.local missing -> copy from .env.example"
  if (-not (Test-Path $envExample)) { Fail "frontend/.env.example missing"; throw }
  Copy-Item $envExample $envLocal -Force
}

Info "Frontend env (read-only preview):"
Get-Content $envLocal | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }

# Install frontend deps (STRICT: must succeed or stop)
if (-not $SkipInstall) {
  try {
    EnsureInstall $fe "frontend"
  } catch {
    Warn "If you see EPERM unlink on next-swc*.node: close VSCode/Node processes or AV is locking the file."
    Warn "Quick kill: taskkill /IM node.exe /F ; then delete frontend/node_modules and retry."
    ShowTailLogIfExists "Frontend install failed"
    throw
  }
}

Push-Location $fe
try {
  # Guard: .bin should exist after successful install
  if (-not (Test-Path ".\node_modules\.bin")) {
    Fail "frontend: node_modules/.bin missing (install did not complete correctly)"
    throw "frontend bins missing"
  }

  RunNpmOptional @("run","-s","lint") "frontend: lint"
  RunNpm @("run","-s","build") "frontend: build"

  if (-not $SkipTests) {
    RunNpm @("run","-s","test") "frontend: unit tests (vitest)"
    RunNpmOptional @("run","-s","test:e2e") "frontend: e2e (playwright)"
  }

  Info "Starting frontend dev server..."
  Info "Login: superadmin@madrasti.test / SuperAdmin12345!"
  & npm run -s dev
  if ($LASTEXITCODE -ne 0) { Fail "frontend: dev failed (exit=$LASTEXITCODE)"; throw "frontend dev failed" }

} finally {
  Pop-Location
}
