Write-Host "=== Starting Madrasti Platform ===" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting backend services..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 3

Write-Host "`n[2/2] Starting frontend..." -ForegroundColor Yellow
cd frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "`n✓ Platform started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan

# docker exec madrasti-auth-1 npm run dev:create-super-admin to create the superadmin if needed
