# QUICK-START-DEMO.ps1
# One-click startup for Madrasti platform demos and presentations

Write-Host "=== STARTING MADRASTI MVP ===" -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = "C:\Users\Utilisateur\Desktop\Madrasti"
}
Set-Location $scriptDir

# 1. Start backend
Write-Host "`n1. Starting backend services..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep 10

# 2. Health check
Write-Host "`n2. Checking system health..." -ForegroundColor Yellow
if (Test-Path ".\MADRASTI-HEALTH-CHECK.ps1") {
    & ".\MADRASTI-HEALTH-CHECK.ps1"
} else {
    Write-Host "⚠ Health check script not found, skipping..." -ForegroundColor Yellow
}

# 3. Start frontend dev
Write-Host "`n3. Starting frontend (dev mode)..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Set-Location frontend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
    Set-Location $scriptDir
} else {
    Write-Host "✗ frontend directory not found" -ForegroundColor Red
}

Write-Host "`n✓✓✓ SYSTEM STARTED ✓✓✓" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:8000" -ForegroundColor Cyan
