# Madrasti Platform Startup Script
param([switch]$SkipBuild)

Write-Host "`n🚀 Starting Madrasti Platform..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "`n=== Starting Backend Services ===" -ForegroundColor Yellow
if ($SkipBuild) {
    docker compose up -d
} else {
    docker compose up -d --build
}

Write-Host "Waiting for services to be healthy (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 2. Check backend health
Write-Host "`n=== Backend Status ===" -ForegroundColor Cyan
docker compose ps

# 3. Start Frontend
Write-Host "`n=== Starting Frontend ===" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n✅ Platform Started!" -ForegroundColor Green
Write-Host "`nAccess the application:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "`nLogin credentials:" -ForegroundColor Cyan
Write-Host "  Email:    superadmin@madrasti.test" -ForegroundColor White
Write-Host "  Password: SuperAdmin12345!" -ForegroundColor White
