Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Step($m){ Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function OK($m){ Write-Host "✅ $m" -ForegroundColor Green }
function Fail($m){ Write-Host "❌ $m" -ForegroundColor Red; throw $m }
function Run($cmd){ Write-Host ">> $cmd" -ForegroundColor DarkGray; Invoke-Expression $cmd }

Step "0) Preconditions"
if (!(Test-Path -Path "./frontend/package.json")) { Fail "frontend/package.json not found (did you apply the patch?)" }
OK "Frontend folder found"

Step "1) Install (npm ci)"
Push-Location "./frontend"
try {
  Run "npm ci"
  OK "npm ci OK"

  Step "2) Lint"
  Run "npm run lint"
  OK "lint OK"

  Step "3) Unit tests (Vitest)"
  Run "npm run test"
  OK "unit tests OK"

  Step "4) Build"
  Run "npm run build"
  OK "build OK"
}
finally {
  Pop-Location
}

Step "5) Docker build"
Run "docker build -t madrasti-frontend:dev -f ./frontend/Dockerfile ./frontend"
OK "docker build OK"

Step "6) Health route (optional local)"
Write-Host "You can now run: docker run --rm -p 3000:3000 madrasti-frontend:dev" -ForegroundColor Yelloww
Write-Host "Then check: http://localhost:3000/api/health" -ForegroundColor Yelloww
OK "DONE"
