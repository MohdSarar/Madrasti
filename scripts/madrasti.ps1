#Requires -Version 5.1
<#
.SYNOPSIS
    Madrasti Platform management script.

.DESCRIPTION
    Unified CLI for managing the Madrasti school management platform.

.PARAMETER Command
    The command to run: setup | start | stop | restart | health | test | logs | clean

.PARAMETER Service
    (Optional) Target a specific service for logs/restart.

.EXAMPLE
    .\scripts\madrasti.ps1 setup       # First-time setup
    .\scripts\madrasti.ps1 start       # Start all services
    .\scripts\madrasti.ps1 health      # Health check
    .\scripts\madrasti.ps1 test        # Run all tests
    .\scripts\madrasti.ps1 stop        # Stop all services
    .\scripts\madrasti.ps1 logs auth   # Tail auth service logs
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("setup","start","stop","restart","health","test","logs","clean","status","help")]
    [string]$Command = "help",

    [Parameter(Position=1)]
    [string]$Service = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSScriptRoot) { $ProjectRoot = Split-Path $PSScriptRoot -Parent } else { $ProjectRoot = (Get-Location).Path }
Set-Location $ProjectRoot

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

function Write-Header([string]$text) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor DarkCyan
}

function Write-Step([string]$text) {
    Write-Host ""
    Write-Host ">> $text" -ForegroundColor Yellow
}

function Write-OK([string]$text) {
    Write-Host "  [OK] $text" -ForegroundColor Green
}

function Write-Warn([string]$text) {
    Write-Host "  [WARN] $text" -ForegroundColor Yellow
}

function Write-Fail([string]$text) {
    Write-Host "  [FAIL] $text" -ForegroundColor Red
}

function Require-Command([string]$cmd, [string]$install) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Fail "$cmd not found. $install"
        exit 1
    }
}

function Test-HttpEndpoint([string]$url, [int]$timeoutSec = 3) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSec -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────────────────

function Invoke-Setup {
    Write-Header "MADRASTI SETUP"

    # Prerequisites
    Write-Step "Checking prerequisites"
    Require-Command "docker"   "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
    Write-OK "docker $(docker --version 2>&1)"
    Require-Command "node"     "Install Node.js 20.x: https://nodejs.org"
    Write-OK "node $(node --version 2>&1)"
    Require-Command "npm"      "npm should come with Node.js"
    Write-OK "npm v$(npm --version 2>&1)"

    # Environment
    Write-Step "Configuring environment"
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-OK "Created .env from .env.example — edit secrets before going to production!"
    } else {
        Write-OK ".env already exists"
    }

    if (-not (Test-Path "frontend\.env.local")) {
        $content = @"
NEXT_PUBLIC_API_URL=http://localhost:8000/auth
NEXT_PUBLIC_SOCKET_URL=http://localhost:8089
NEXT_PUBLIC_ATTENDANCE_URL=http://localhost:8000/attendance
NEXT_PUBLIC_ACADEMIC_URL=http://localhost:8000/academic
NEXT_PUBLIC_SCHEDULING_URL=http://localhost:8000/scheduling
NEXT_PUBLIC_NOTIFICATION_URL=http://localhost:8000/notification
NEXT_PUBLIC_DOCUMENT_URL=http://localhost:8000/document
NEXT_PUBLIC_SCHOOL_URL=http://localhost:8000/school
NEXT_PUBLIC_PROFILE_URL=http://localhost:8000/profile
"@
        Set-Content "frontend\.env.local" -Value $content -Encoding UTF8
        Write-OK "Created frontend/.env.local"
    } else {
        Write-OK "frontend/.env.local already exists"
    }

    # Dependencies
    Write-Step "Installing root dependencies"
    npm install --silent
    Write-OK "Root dependencies installed"

    Write-Step "Installing frontend dependencies"
    Push-Location "frontend"
    npm install --silent
    Pop-Location
    Write-OK "Frontend dependencies installed"

    # Start services
    Write-Step "Starting backend services (first run may take a few minutes)"
    docker compose up -d
    Write-OK "Backend services started"

    Write-Step "Waiting for services to stabilize..."
    Start-Sleep -Seconds 15

    Invoke-Health

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host "  SETUP COMPLETE" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host ""
    Write-Host "  Start frontend:  cd frontend && npm run dev" -ForegroundColor Cyan
    Write-Host "  Frontend URL:    http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API Gateway:     http://localhost:8000" -ForegroundColor Cyan
    Write-Host "  Kong Admin:      http://localhost:8001" -ForegroundColor Cyan
    Write-Host ""
}

function Invoke-Start {
    Write-Header "STARTING MADRASTI"

    # Ensure frontend/.env.local exists
    if (-not (Test-Path "frontend\.env.local")) {
        Write-Step "Creating frontend/.env.local"
        $content = @"
NEXT_PUBLIC_API_URL=http://localhost:8000/auth
NEXT_PUBLIC_SOCKET_URL=http://localhost:8089
NEXT_PUBLIC_ATTENDANCE_URL=http://localhost:8000/attendance
NEXT_PUBLIC_ACADEMIC_URL=http://localhost:8000/academic
NEXT_PUBLIC_SCHEDULING_URL=http://localhost:8000/scheduling
NEXT_PUBLIC_NOTIFICATION_URL=http://localhost:8000/notification
NEXT_PUBLIC_DOCUMENT_URL=http://localhost:8000/document
NEXT_PUBLIC_SCHOOL_URL=http://localhost:8000/school
NEXT_PUBLIC_PROFILE_URL=http://localhost:8000/profile
"@
        Set-Content "frontend\.env.local" -Value $content -Encoding UTF8
        Write-OK "frontend/.env.local created"
    }

    # Install frontend deps if needed
    if (-not (Test-Path "frontend\node_modules")) {
        Write-Step "Installing frontend dependencies (first run)..."
        Push-Location "frontend"
        npm install --silent
        Pop-Location
        Write-OK "Frontend dependencies installed"
    }

    # Start backend
    Write-Step "Starting backend services (Docker)"
    docker compose up -d
    Write-OK "Backend services started"

    # Wait for postgres + redis to be healthy
    Write-Step "Waiting for database to be ready..."
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        $pgReady = docker compose exec -T postgres pg_isready -U madrasti -d madrasti 2>&1 | Where-Object { $_ -notmatch "^time=" }
        if ($pgReady -match "accepting connections") { break }
        Start-Sleep -Seconds 3
        $waited += 3
    }
    Write-OK "Database ready"

    # Start frontend in a new terminal window
    Write-Step "Starting frontend dev server"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", `
        "Write-Host 'Madrasti Frontend' -ForegroundColor Cyan; " + `
        "Set-Location '$ProjectRoot\frontend'; " + `
        "npm run dev"
    Write-OK "Frontend starting in new window..."

    # Wait for frontend to respond, then open browser
    Write-Step "Waiting for frontend to be ready..."
    $maxWait = 60
    $waited = 0
    $ready = $false
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 3
        $waited += 3
        if (Test-HttpEndpoint "http://localhost:3000" 2) {
            $ready = $true
            break
        }
    }

    if ($ready) {
        Write-OK "Frontend is up — opening browser"
        Start-Process "http://localhost:3000"
    } else {
        Write-Warn "Frontend not ready yet — open manually: http://localhost:3000"
    }

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host "  MADRASTI IS RUNNING" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API Gateway: http://localhost:8000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Stop:   .\scripts\madrasti.ps1 stop" -ForegroundColor DarkGray
    Write-Host "  Health: .\scripts\madrasti.ps1 health" -ForegroundColor DarkGray
    Write-Host ""
}

function Invoke-Stop {
    Write-Header "STOPPING MADRASTI"
    Write-Step "Stopping all services"
    docker compose down
    Write-OK "All services stopped"
}

function Invoke-Restart {
    Write-Header "RESTARTING MADRASTI"
    if ($Service) {
        Write-Step "Restarting service: $Service"
        docker compose restart $Service
        Write-OK "$Service restarted"
    } else {
        Invoke-Stop
        Start-Sleep -Seconds 2
        docker compose up -d
        Write-OK "All services restarted"
    }
}

function Invoke-Status {
    Write-Header "SERVICE STATUS"
    docker compose ps
}

function Invoke-Health {
    Write-Header "MADRASTI HEALTH CHECK"
    $errors = [System.Collections.Generic.List[string]]::new()

    # Services
    Write-Step "Checking service health endpoints"
    $services = @(
        @{name="auth";         port=8081},
        @{name="student";      port=8082},
        @{name="school";       port=8083},
        @{name="user-profile"; port=8084},
        @{name="academic";     port=8085},
        @{name="attendance";   port=8086},
        @{name="scheduling";   port=8087},
        @{name="reporting";    port=8088},
        @{name="notification"; port=8089},
        @{name="document";     port=8090},
        @{name="security";     port=8091}
    )

    foreach ($svc in $services) {
        if (Test-HttpEndpoint "http://localhost:$($svc.port)/health") {
            Write-OK "$($svc.name) (:$($svc.port))"
        } else {
            Write-Fail "$($svc.name) (:$($svc.port)) - not responding"
            $errors.Add("$($svc.name) service unhealthy")
        }
    }

    # Kong gateway
    Write-Step "Checking Kong gateway routes"
    $routes = @(
        "/auth/health", "/student/health", "/school/health",
        "/attendance/health", "/notification/health", "/academic/health",
        "/scheduling/health", "/reporting/health", "/document/health",
        "/profile/health", "/security/health"
    )

    foreach ($route in $routes) {
        if (Test-HttpEndpoint "http://localhost:8000$route") {
            Write-OK "Kong $route"
        } else {
            Write-Warn "Kong $route - not reachable (service may still be starting)"
        }
    }

    # Frontend env
    Write-Step "Checking frontend environment"
    if (Test-Path "frontend\.env.local") {
        $envContent = Get-Content "frontend\.env.local" -ErrorAction SilentlyContinue
        foreach ($var in @("NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SOCKET_URL")) {
            if ($envContent -match "^$var=") {
                Write-OK "$var"
            } else {
                Write-Warn "$var missing in frontend/.env.local"
                $errors.Add("$var missing")
            }
        }
    } else {
        Write-Warn "frontend/.env.local missing — run setup first"
        $errors.Add("frontend/.env.local missing")
    }

    # Summary
    Write-Host ""
    if ($errors.Count -eq 0) {
        Write-Host "  *** SYSTEM HEALTHY — ALL CHECKS PASSED ***" -ForegroundColor Green
    } else {
        Write-Host "  *** $($errors.Count) ISSUE(S) DETECTED ***" -ForegroundColor Red
        $errors | ForEach-Object { Write-Fail "  $_" }
        Write-Host ""
        Write-Host "  Tip: run 'docker compose logs <service>' to investigate." -ForegroundColor Yellow
    }
}

function Invoke-Test {
    Write-Header "RUNNING ALL TESTS"

    Write-Step "Shared packages"
    npm -w @madrasti/auth-sdk test
    npm -w @madrasti/event-bus test

    Write-Step "Service tests"
    $testServices = @(
        "@madrasti/auth-service",
        "@madrasti/student-service",
        "@madrasti/school-service",
        "@madrasti/user-profile-service",
        "@madrasti/academic-service",
        "@madrasti/attendance-service",
        "@madrasti/scheduling-service",
        "@madrasti/reporting-service",
        "@madrasti/notification-service",
        "@madrasti/document-service",
        "@madrasti/security-service"
    )

    $failed = [System.Collections.Generic.List[string]]::new()
    foreach ($pkg in $testServices) {
        Write-Host "  Testing $pkg..." -NoNewline
        npm -w $pkg test 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host " PASS" -ForegroundColor Green
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            $failed.Add($pkg)
        }
    }

    Write-Host ""
    if ($failed.Count -eq 0) {
        Write-OK "All tests passed"
    } else {
        Write-Fail "Failed packages:"
        $failed | ForEach-Object { Write-Fail "  - $_" }
        exit 1
    }
}

function Invoke-Logs {
    if ($Service) {
        docker compose logs -f $Service
    } else {
        docker compose logs -f --tail 100
    }
}

function Invoke-Clean {
    Write-Header "CLEAN"
    Write-Warn "This will remove all containers, volumes and images."
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        return
    }
    docker compose down -v --rmi local
    Write-OK "Clean complete"
}

function Show-Help {
    Write-Host ""
    Write-Host "  Madrasti Platform CLI" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Usage: .\scripts\madrasti.ps1 <command> [service]" -ForegroundColor White
    Write-Host ""
    Write-Host "  Commands:" -ForegroundColor Yellow
    Write-Host "    setup      First-time installation and startup" -ForegroundColor White
    Write-Host "    start      Start all services (+ frontend in new window)" -ForegroundColor White
    Write-Host "    stop       Stop all Docker services" -ForegroundColor White
    Write-Host "    restart    Restart all services (or a single <service>)" -ForegroundColor White
    Write-Host "    status     Show Docker Compose service status" -ForegroundColor White
    Write-Host "    health     Full system health check" -ForegroundColor White
    Write-Host "    test       Run all service and package tests" -ForegroundColor White
    Write-Host "    logs       Tail logs (all services, or a single <service>)" -ForegroundColor White
    Write-Host "    clean      Remove all containers, volumes and local images" -ForegroundColor White
    Write-Host ""
    Write-Host "  Examples:" -ForegroundColor Yellow
    Write-Host "    .\scripts\madrasti.ps1 setup" -ForegroundColor DarkGray
    Write-Host "    .\scripts\madrasti.ps1 health" -ForegroundColor DarkGray
    Write-Host "    .\scripts\madrasti.ps1 logs auth" -ForegroundColor DarkGray
    Write-Host "    .\scripts\madrasti.ps1 restart school" -ForegroundColor DarkGray
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Dispatch
# ─────────────────────────────────────────────────────────────────────────────

switch ($Command) {
    "setup"   { Invoke-Setup }
    "start"   { Invoke-Start }
    "stop"    { Invoke-Stop }
    "restart" { Invoke-Restart }
    "status"  { Invoke-Status }
    "health"  { Invoke-Health }
    "test"    { Invoke-Test }
    "logs"    { Invoke-Logs }
    "clean"   { Invoke-Clean }
    default   { Show-Help }
}
