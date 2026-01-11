Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step($m){ Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function OK($m){ Write-Host "✅ $m" -ForegroundColor Green }

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path) | Out-Null
Pop-Location | Out-Null

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Step "1) Remove duplicate PostCSS config"
$cjs = Join-Path $root "postcss.config.cjs"
if (Test-Path $cjs) {
  Remove-Item $cjs -Force
  OK "Removed postcss.config.cjs"
} else {
  OK "postcss.config.cjs already absent"
}

Step "2) Remove empty shared/ directory if present"
$shared = Join-Path $root "shared"
if (Test-Path $shared) {
  $items = Get-ChildItem $shared -Recurse -Force -ErrorAction SilentlyContinue
  if (!$items) {
    Remove-Item $shared -Recurse -Force
    OK "Removed empty shared/"
  } else {
    OK "shared/ not empty (kept)"
  }
} else {
  OK "shared/ not present"
}

Write-Host ""
Write-Host "Done. Re-run: npm run build (frontend) to confirm." -ForegroundColor Yellow
