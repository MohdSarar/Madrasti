# MADRASTI-HEALTH-CHECK.ps1
# Quick system health verification for Madrasti platform

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = "C:\Users\Utilisateur\Desktop\Madrasti"
}
Set-Location $scriptDir

$errors = @()

Write-Host "`n=== 1. DATABASES CHECK ===" -ForegroundColor Cyan
$dbs = @("madrasti", "madrasti_attendance", "auth_db", "student_db", "school_db", "user_db")
foreach ($db in $dbs) {
    $result = docker exec madrasti-postgres-1 psql -U madrasti -d $db -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $db" -ForegroundColor Green
    } else {
        Write-Host "✗ $db MISSING" -ForegroundColor Red
        $errors += "DB $db missing"
    }
}

Write-Host "`n=== 2. SERVICES HEALTH ===" -ForegroundColor Cyan
$services = @(
    @{name="auth"; port=8081},
    @{name="student"; port=8082},
    @{name="attendance"; port=8086},
    @{name="notification"; port=8089}
)
foreach ($svc in $services) {
    try {
        $result = Invoke-WebRequest -Uri "http://localhost:$($svc.port)/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($result.StatusCode -eq 200) {
            Write-Host "✓ $($svc.name)" -ForegroundColor Green
        } else {
            Write-Host "✗ $($svc.name) DOWN" -ForegroundColor Red
            $errors += "$($svc.name) service down"
        }
    } catch {
        Write-Host "✗ $($svc.name) DOWN" -ForegroundColor Red
        $errors += "$($svc.name) service down"
    }
}

Write-Host "`n=== 3. KONG ROUTES ===" -ForegroundColor Cyan
$routes = @("/auth/health", "/attendance/health", "/notification/health")
foreach ($route in $routes) {
    try {
        $result = Invoke-WebRequest -Uri "http://localhost:8000$route" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($result.StatusCode -eq 200) {
            Write-Host "✓ $route" -ForegroundColor Green
        } else {
            Write-Host "✗ $route FAILED" -ForegroundColor Red
            $errors += "Kong route $route failed"
        }
    } catch {
        Write-Host "✗ $route FAILED" -ForegroundColor Red
        $errors += "Kong route $route failed"
    }
}

Write-Host "`n=== 4. FRONTEND (DEV MODE) ===" -ForegroundColor Cyan
Write-Host "⚠ Use 'npm run dev' for demos (prod build skip)" -ForegroundColor Yellow

Write-Host "`n=== 5. ENV VARIABLES ===" -ForegroundColor Cyan
$envVars = @("NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_ATTENDANCE_URL", "NEXT_PUBLIC_NOTIFICATION_URL")
if (Test-Path "frontend\.env.local") {
    $envContent = Get-Content "frontend\.env.local" -ErrorAction SilentlyContinue
    foreach ($var in $envVars) {
        if ($envContent -match "^$var=") {
            Write-Host "✓ $var" -ForegroundColor Green
        } else {
            Write-Host "✗ $var MISSING" -ForegroundColor Red
            $errors += "$var missing"
        }
    }
} else {
    Write-Host "✗ frontend/.env.local MISSING" -ForegroundColor Red
    $errors += "frontend/.env.local missing"
}

Write-Host "`n=== RESULT ===" -ForegroundColor Yellow
if ($errors.Count -eq 0) {
    Write-Host "`n✓✓✓ SYSTEM 100% OPERATIONAL ✓✓✓" -ForegroundColor Green
    Write-Host "Start with: .\QUICK-START-DEMO.ps1`n" -ForegroundColor Cyan
} else {
    Write-Host "`n✗✗✗ $($errors.Count) ERRORS DETECTED ✗✗✗" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`nFIX BEFORE DEMO!`n" -ForegroundColor Red
}
