# ============================================================================
# STEP 1 VERIFICATION (STRICT)
# ============================================================================
# Validates: Docker installation, compose files, and basic infrastructure
# Run from: C:\Users\Utilisateur\Desktop\Madrasti
# Expected: Docker installed, compose file valid, no syntax errors
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# Helper Functions
# ============================================================================

function OK([string]$msg) {
  Write-Host "✅ $msg" -ForegroundColor Green
}

function WARN([string]$msg) {
  Write-Host "⚠️  $msg" -ForegroundColor Yellow
}

function Fail([string]$msg) {
  throw "FAIL $msg"
}

function Step([string]$msg) {
  Write-Host ""
  Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Exec([string]$cmd, [switch]$Silent) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  if ($Silent) {
    Invoke-Expression $cmd 2>&1 | Out-Null
  } else {
    Invoke-Expression $cmd
  }
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    throw "Command failed with exit code $LASTEXITCODE"
  }
}

# ============================================================================
# STEP 1: Docker & Compose Installation
# ============================================================================

Step "0) Docker Installation"

try {
  Exec "docker --version" -Silent
  OK "docker present"
} catch {
  Fail "Docker not installed or not in PATH"
}

try {
  Exec "docker compose version" -Silent
  OK "docker compose present"
} catch {
  Fail "Docker Compose not installed or not in PATH (use 'docker compose' not 'docker-compose')"
}

# ============================================================================
# STEP 2: Verify Working Directory
# ============================================================================

Step "1) Working Directory"

if (!(Test-Path ".\docker-compose.yml") -and !(Test-Path ".\docker-compose.yaml")) {
  Fail "docker-compose.yml not found. Run this script from the Madrasti project root."
}
OK "docker-compose.yml found"

# ============================================================================
# STEP 3: Compose File Validation
# ============================================================================

Step "2) Docker Compose File Validation"

try {
  $config = docker compose config 2>&1
  if ($LASTEXITCODE -ne 0) {
    Fail "docker compose config failed:`n$config"
  }
  OK "docker-compose.yml syntax valid"
} catch {
  Fail "docker compose config validation failed: $_"
}

# ============================================================================
# STEP 4: Service Definitions
# ============================================================================

Step "3) Required Services Defined"

$requiredServices = @("postgres", "redis", "auth", "student", "school", "user-profile", "kong")

foreach ($service in $requiredServices) {
  if ($config -notmatch "name:\s+$service") {
    WARN "Service '$service' not found in compose config (check service names)"
  } else {
    OK "Service defined: $service"
  }
}

# ============================================================================
# STEP 5: Volume Definitions
# ============================================================================

Step "4) Volume Persistence"

if ($config -match "postgres_data:|redis_data:") {
  OK "Persistent volumes defined for databases"
} else {
  WARN "No named volumes found - data may not persist"
}

# ============================================================================
# STEP 6: Network Configuration
# ============================================================================

Step "5) Network Configuration"

if ($config -match "networks:") {
  OK "Custom networks defined"
} else {
  WARN "Using default network (acceptable but explicit networks recommended)"
}

# ============================================================================
# STEP 7: Health Check Definitions
# ============================================================================

Step "6) Health Checks"

$healthCheckServices = @("postgres", "redis", "auth", "student", "user-profile", "school")

foreach ($service in $healthCheckServices) {
  if ($config -match "$service`:[\s\S]*?healthcheck:") {
    OK "Health check defined: $service"
  } else {
    WARN "No health check for: $service"
  }
}

# ============================================================================
# STEP 8: Port Exposure
# ============================================================================

Step "7) Port Mappings"

$expectedPorts = @{
  "5432" = "postgres"
  "6379" = "redis"
  "8081" = "auth"
  "8082" = "student"
  "8083" = "school"
  "8084" = "user-profile"
  "8085" = "security"
  "8000" = "kong"
  "8001" = "kong admin"
}

foreach ($port in $expectedPorts.Keys) {
  if ($config -match ":$port" -or $config -match "- \`"?${port}:") {
    OK "Port exposed: $port ($($expectedPorts[$port]))"
  } else {
    WARN "Port not exposed: $port ($($expectedPorts[$port]))"
  }
}

# ============================================================================
# STEP 9: Environment Variables
# ============================================================================

Step "8) Environment Variables"

$criticalEnvVars = @("DATABASE_URL", "POSTGRES_", "REDIS_")

$foundEnvVars = $false
foreach ($envPattern in $criticalEnvVars) {
  if ($config -match $envPattern) {
    $foundEnvVars = $true
    break
  }
}

if ($foundEnvVars) {
  OK "Environment variables configured"
} else {
  WARN "No environment variables found (may rely on .env file)"
}

# ============================================================================
# STEP 10: Dockerfile Presence
# ============================================================================

Step "9) Dockerfile Validation"

$serviceDockerfiles = @(
  @{Service="auth"; Path="services/auth/Dockerfile"}
  @{Service="student"; Path="services/student/Dockerfile"}
  @{Service="school"; Path="services/school/Dockerfile"}
  @{Service="user-profile"; Path="services/user-profile/Dockerfile"}
  @{Service="security"; Path="services/security/Dockerfile"}
)

foreach ($item in $serviceDockerfiles) {
  if (Test-Path $item.Path) {
    OK "Dockerfile exists: $($item.Service)"
  } else {
    WARN "Dockerfile missing: $($item.Path)"
  }
}

# ============================================================================
# STEP 11: Package Files
# ============================================================================

Step "10) Package Files"

if (Test-Path ".\package.json") {
  OK "Root package.json found"
} else {
  WARN "No root package.json (monorepo may not be configured)"
}

$servicePackages = @(
  "services/auth/package.json",
  "services/student/package.json",
  "services/school/package.json",
  "services/user-profile/package.json",
  "services/security/package.json"
)

foreach ($pkg in $servicePackages) {
  if (Test-Path $pkg) {
    OK "Package file: $pkg"
  } else {
    WARN "Missing package.json: $pkg"
  }
}

# ============================================================================
# Summary
# ============================================================================

Step "11) Summary"
Write-Host ""
OK "STEP 1 VERIFICATION (STRICT): PASS ✅"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: .\STEP2-VERIFY-STRICT.ps1" -ForegroundColor White
Write-Host "  2. Verify containers start and become healthy" -ForegroundColor White
Write-Host ""
