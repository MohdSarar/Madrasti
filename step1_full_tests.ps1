# Madrasti Auth (Step 2) - One-shot verification script
# Run from: C:\Users\Utilisateur\Desktop\Madrasti
# It will: rebuild, wait health, lint, typecheck (if present), tests+coverage, smoke HTTP checks, show logs on failure.

$ErrorActionPreference = "Stop"

# -------- Config --------
$proj = if ($env:proj) { $env:proj } else { "madrasti_hardened" }
$composeArgs = @("-p", $proj)

Write-Host "== Madrasti Auth Step2 Verification ==" -ForegroundColor Cyan
Write-Host "Project: $proj" -ForegroundColor Cyan

function Exec($cmd) {
  Write-Host "`n> $cmd" -ForegroundColor Yellow
  Invoke-Expression $cmd
}

function Wait-Healthy {
  param(
    [string]$ServiceName,
    [int]$TimeoutSec = 90
  )

  $cid = (docker compose @composeArgs ps -q $ServiceName).Trim()
  if (-not $cid) { throw "Cannot find container for service '$ServiceName'." }

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $status = (docker inspect -f "{{.State.Health.Status}}" $cid 2>$null).Trim()
    if ($status -eq "healthy") { Write-Host "$ServiceName is healthy." -ForegroundColor Green; return }
    Start-Sleep -Seconds 2
  }
  throw "Timeout waiting for $ServiceName to become healthy."
}

function CurlJson {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    $Body = $null
  )
  $h = @{}
  foreach ($k in $Headers.Keys) { $h[$k] = $Headers[$k] }

  if ($null -ne $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $h -Body ($Body | ConvertTo-Json -Depth 10) -ContentType "application/json"
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $h
}

# Ensure we run from repo root with compose file
if (-not (Test-Path ".\docker-compose.yml") -and -not (Test-Path ".\docker-compose.yaml")) {
  throw "Run this from the Madrasti repo root (where docker-compose.yml/yaml exists)."
}

try {
  # 1) Clean slate & build
  Exec "docker compose $($composeArgs -join ' ') down -v"
  Exec "docker compose $($composeArgs -join ' ') up -d --build"

  # 2) Wait containers healthy (postgres/redis should have healthchecks)
  Wait-Healthy -ServiceName "postgres" -TimeoutSec 120
  Wait-Healthy -ServiceName "redis"    -TimeoutSec 120

  # 3) Smoke-check auth container is running
  Exec "docker compose $($composeArgs -join ' ') ps"

  # 4) Lint
  Exec "docker compose $($composeArgs -join ' ') exec -T auth npm run lint"

  # 5) Typecheck (only if script exists)
  $pkg = docker compose @composeArgs exec -T auth node -e "const p=require('./package.json'); console.log(Object.keys((p.scripts||{})).join(','));"
  if ($pkg -match "(^|,)typecheck(,|$)") {
    Exec "docker compose $($composeArgs -join ' ') exec -T auth npm run typecheck"
  } else {
    Write-Host "No npm script 'typecheck' found. Skipping." -ForegroundColor DarkYellow
  }

  # 6) Tests + coverage (+ detect open handles)
  Exec "docker compose $($composeArgs -join ' ') exec -T auth npm run test:coverage -- --detectOpenHandles"

  # 7) HTTP smoke tests (host->container). Assumes auth is published to localhost (common in compose).
  # If your compose does NOT publish ports, comment this block or exec curl from inside the auth container.
  $base = "http://localhost:8081"
  Write-Host "`n== HTTP Smoke Checks ==" -ForegroundColor Cyan

  CurlJson "$base/health" "GET" | Out-Null
  Write-Host "/health OK" -ForegroundColor Green

  CurlJson "$base/healthz" "GET" | Out-Null
  Write-Host "/healthz OK" -ForegroundColor Green

  # Optional: metrics & openapi (ignore if endpoints differ)
  try { CurlJson "$base/metrics" "GET" | Out-Null; Write-Host "/metrics OK" -ForegroundColor Green } catch { Write-Host "/metrics skipped/failed (endpoint may differ)" -ForegroundColor DarkYellow }
  try { CurlJson "$base/openapi.json" "GET" | Out-Null; Write-Host "/openapi.json OK" -ForegroundColor Green } catch { Write-Host "/openapi.json skipped/failed (endpoint may differ)" -ForegroundColor DarkYellow }
  try { CurlJson "$base/docs" "GET" | Out-Null; Write-Host "/docs OK" -ForegroundColor Green } catch { Write-Host "/docs skipped/failed (endpoint may differ)" -ForegroundColor DarkYellow }

  Write-Host "`n✅ All checks passed." -ForegroundColor Green
}
catch {
  Write-Host "`n❌ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "`n== Last auth logs ==" -ForegroundColor Cyan
  try { docker compose @composeArgs logs --no-color --tail 200 auth } catch {}
  Write-Host "`n== Container status ==" -ForegroundColor Cyan
  try { docker compose @composeArgs ps } catch {}
  exit 1
}
