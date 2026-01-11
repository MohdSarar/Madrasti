# Stop any running processes
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

Write-Host "`n=== 1) Backend Verification ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== 2) Backend Health Checks ===" -ForegroundColor Cyan
$services = @("auth:8081", "student:8082", "school:8083", "user-profile:8084", "academic:8085", "attendance:8086", "scheduling:8087", "reporting:8088", "notification:8089", "document:8090")
foreach ($svc in $services) {
    $name, $port = $svc -split ":"
    try {
        $response = Invoke-WebRequest "http://localhost:$port/health" -TimeoutSec 3 -UseBasicParsing
        Write-Host "✅ $name ($port): OK" -ForegroundColor Green
    } catch {
        Write-Host "❌ $name ($port): FAIL" -ForegroundColor Red
    }
}

Write-Host "`n=== 3) Frontend Tests ===" -ForegroundColor Cyan
cd frontend
npm run test
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend tests passed" -ForegroundColor Green
} else {
    Write-Host "⚠️ Frontend tests had issues" -ForegroundColor Yellow
}

Write-Host "`n=== 4) Frontend Build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
}

Write-Host "`n=== 5) Start Frontend Dev Server ===" -ForegroundColor Cyan
Write-Host "Starting dev server in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Start-Sleep -Seconds 5

Write-Host "`n=== 6) Frontend Health Check ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest "http://localhost:3000" -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ Frontend accessible at http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Frontend not yet ready, check the dev server window" -ForegroundColor Yellow
}

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host "Backend Gateway: http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open browser to http://localhost:3000" -ForegroundColor White
Write-Host "2. Try logging in" -ForegroundColor White
Write-Host "3. Navigate through the dashboard" -ForegroundColor White