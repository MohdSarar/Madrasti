# SETUP.ps1 - Madrasti Platform Initial Setup
# Consolidates installation and first-time setup

Write-Host @"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         MADRASTI PLATFORM - INITIAL SETUP                ║
║                                                          ║
║  This script will:                                       ║
║  1. Verify prerequisites (Docker, Node.js)               ║
║  2. Install dependencies                                 ║
║  3. Configure environment                                ║
║  4. Start all services                                   ║
║  5. Run health check                                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = "C:\Users\Utilisateur\Desktop\Madrasti"
}
Set-Location $scriptDir

# ============================================
# STEP 1: Prerequisites Check
# ============================================
Write-Host "`n[STEP 1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
Write-Host "  Checking Docker..." -NoNewline
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host " ✗ MISSING" -ForegroundColor Red
        Write-Host "    Install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    Write-Host "    Install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
Write-Host "  Checking Docker Compose..." -NoNewline
try {
    $composeVersion = docker-compose --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ $composeVersion" -ForegroundColor Green
    } else {
        Write-Host " ✗ MISSING" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "  Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host " ✗ MISSING" -ForegroundColor Red
        Write-Host "    Install Node.js 20.x: https://nodejs.org" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    Write-Host "    Install Node.js 20.x: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "  Checking npm..." -NoNewline
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host " ✗ MISSING" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 2: Environment Configuration
# ============================================
Write-Host "`n[STEP 2/5] Configuring environment..." -ForegroundColor Yellow

# Backend .env
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "  Creating .env from .env.example..." -NoNewline
        Copy-Item ".env.example" ".env"
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host "  ✗ .env.example not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  .env already exists ✓" -ForegroundColor Green
}

# Frontend .env.local
$frontendEnvPath = "frontend\.env.local"
if (-not (Test-Path $frontendEnvPath)) {
    Write-Host "  Creating frontend/.env.local..." -NoNewline
    $frontendEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8089
NEXT_PUBLIC_S3_BUCKET=madrasti-documents
NEXT_PUBLIC_ATTENDANCE_URL=http://localhost:8000/attendance
NEXT_PUBLIC_ACADEMIC_URL=http://localhost:8000/academic
NEXT_PUBLIC_SCHEDULING_URL=http://localhost:8000/scheduling
NEXT_PUBLIC_NOTIFICATION_URL=http://localhost:8000/notification
NEXT_PUBLIC_DOCUMENT_URL=http://localhost:8000/document
"@
    Set-Content $frontendEnvPath -Value $frontendEnv -Encoding UTF8
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host "  frontend/.env.local already exists ✓" -ForegroundColor Green
}

# ============================================
# STEP 3: Install Dependencies
# ============================================
Write-Host "`n[STEP 3/5] Installing dependencies..." -ForegroundColor Yellow

# Root dependencies
Write-Host "  Installing root dependencies..." -NoNewline
npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ FAILED" -ForegroundColor Red
    Write-Host "    Run manually: npm install" -ForegroundColor Yellow
}

# Frontend dependencies
Write-Host "  Installing frontend dependencies..." -NoNewline
Set-Location "frontend"
npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ FAILED" -ForegroundColor Red
    Write-Host "    Run manually: cd frontend && npm install" -ForegroundColor Yellow
}
Set-Location $scriptDir

# ============================================
# STEP 4: Start Services
# ============================================
Write-Host "`n[STEP 4/5] Starting services..." -ForegroundColor Yellow

Write-Host "  Starting Docker Compose (this may take 2-3 minutes)..." -NoNewline
docker-compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ FAILED" -ForegroundColor Red
    Write-Host "    Check logs: docker-compose logs" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Waiting for services to stabilize (10 seconds)..." -NoNewline
Start-Sleep 10
Write-Host " ✓" -ForegroundColor Green

# ============================================
# STEP 5: Health Check
# ============================================
Write-Host "`n[STEP 5/5] Checking system health..." -ForegroundColor Yellow

if (Test-Path ".\MADRASTI-HEALTH-CHECK.ps1") {
    & ".\MADRASTI-HEALTH-CHECK.ps1"
} else {
    Write-Host "  ⚠ Health check script not found, manual verification required" -ForegroundColor Yellow
}

# ============================================
# FINAL MESSAGE
# ============================================
Write-Host @"

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              INSTALLATION COMPLETE!                      ║
║                                                          ║
║  Backend services: ✓ Started                             ║
║  Databases:        ✓ Created                             ║
║  Configuration:    ✓ Ready                               ║
║                                                          ║
║  Next steps:                                             ║
║  1. Start the frontend:                                  ║
║     cd frontend                                          ║
║     npm run dev                                          ║
║                                                          ║
║  2. Access the application:                              ║
║     http://localhost:3000                                ║
║                                                          ║
║  For demos, use:                                         ║
║     .\QUICK-START-DEMO.ps1                               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "For more information, see README.md" -ForegroundColor Cyan
