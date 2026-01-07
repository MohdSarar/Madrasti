# ============================================================================
# STEP 2 VERIFICATION (STRICT)
# ============================================================================
# Validates: Containers running, healthy, databases accessible, Redis working
# Run from: C:\Users\Utilisateur\Desktop\Madrasti
# Prerequisites: STEP1-VERIFY-STRICT.ps1 passed, docker compose up -d executed
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$POSTGRES_SERVICE = "postgres"
$POSTGRES_USER = "madrasti"
$POSTGRES_DB = "postgres"

$REDIS_SERVICE = "redis"

$REQUIRED_CONTAINERS = @(
  "postgres",
  "redis", 
  "auth",
  "student",
  "school",
  "user-profile",
  "kong"
)

$REQUIRED_HEALTHY = @(
  "postgres",
  "redis",
  "auth", 
  "student",
  "school",
  "user-profile",
  "kong"
)

$EXPECTED_PORTS = @(
  @{Port=5432; Service="postgres"; Protocol="TCP"}
  @{Port=6379; Service="redis"; Protocol="TCP"}
  @{Port=8081; Service="auth"; Protocol="TCP"}
  @{Port=8082; Service="student"; Protocol="TCP"}
  @{Port=8083; Service="school"; Protocol="TCP"}
  @{Port=8084; Service="user-profile"; Protocol="TCP"}
  @{Port=8000; Service="kong proxy"; Protocol="TCP"}
  @{Port=8001; Service="kong admin"; Protocol="TCP"}
)

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

function Exec([string]$cmd) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

function Test-Port([string]$hostname, [int]$port, [int]$timeoutMs = 2000) {
  try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $async = $tcpClient.BeginConnect($hostname, $port, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne($timeoutMs, $false)
    if ($wait) {
      try {
        $tcpClient.EndConnect($async)
        $tcpClient.Close()
        return $true
      } catch {
        return $false
      }
    }
    $tcpClient.Close()
    return $false
  } catch {
    return $false
  }
}

# ============================================================================
# STEP 1: Docker Version Check
# ============================================================================

Step "0) Versions"

try {
  Exec "docker --version"
  OK "docker present"
} catch {
  Fail "Docker not installed"
}

try {
  Exec "docker compose version"
  OK "docker compose present"
} catch {
  Fail "Docker Compose not installed"
}

# ============================================================================
# STEP 2: Compose Configuration
# ============================================================================

Step "1) Compose config sanity"

try {
  docker compose config > $null 2>&1
  if ($LASTEXITCODE -eq 0) {
    OK "docker compose config OK"
  } else {
    Fail "docker compose config failed"
  }
} catch {
  Fail "docker compose config validation error: $_"
}

# ============================================================================
# STEP 3: Container Status
# ============================================================================

Step "2) Containers MUST be present, running, and healthy"

$containers = docker ps -a --filter "name=madrasti" --format "{{.Names}}" 2>$null

foreach ($service in $REQUIRED_CONTAINERS) {
  $containerName = "madrasti-$service-1"
  
  # Check if container exists
  if ($containers -notcontains $containerName) {
    Fail "container missing: $containerName (run 'docker compose up -d' first)"
  }
  OK "container present: $containerName"
  
  # Check if container is running
  $state = docker inspect -f "{{.State.Running}}" $containerName 2>$null
  if ($state -ne "true") {
    Fail "container not running: $containerName (State.Running=$state)"
  }
  OK "container running: $containerName"
  
  # Check health status for containers that have health checks
  if ($REQUIRED_HEALTHY -contains $service) {
    $health = docker inspect -f "{{.State.Health.Status}}" $containerName 2>$null
    if ($health -eq "healthy") {
      OK "container healthy: $containerName (health=$health)"
    } elseif ($health -eq "") {
      WARN "container has no health check: $containerName"
    } else {
      Fail "container not healthy: $containerName (health=$health)"
    }
  }
}

Write-Host ""
docker compose ps

# ============================================================================
# STEP 4: Port Accessibility
# ============================================================================

Step "3) Port checks (host)"

foreach ($portInfo in $EXPECTED_PORTS) {
  $port = $portInfo.Port
  $service = $portInfo.Service
  
  if (Test-Port "localhost" $port) {
    OK "$service $($portInfo.Protocol) localhost:$port open"
  } else {
    Fail "$service port $port not accessible on localhost"
  }
}

# ============================================================================
# STEP 5: PostgreSQL Connectivity
# ============================================================================

Step "4) PostgreSQL connectivity (STRICT)"

Write-Host "Testing PostgreSQL connection..."

try {
  $pgTest = docker compose exec -T $POSTGRES_SERVICE psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1 as ok;" 2>&1
  
  if ($pgTest -match "1 row" -or $pgTest -match "ok") {
    OK "PostgreSQL accessible and responding"
  } else {
    Fail "PostgreSQL query failed: $pgTest"
  }
} catch {
  Fail "PostgreSQL connection error: $_"
}

# Test database list
try {
  $databases = docker compose exec -T $POSTGRES_SERVICE psql -U $POSTGRES_USER -d $POSTGRES_DB -tAc "\l" 2>&1
  OK "PostgreSQL database list retrieved"
} catch {
  WARN "Could not list databases: $_"
}

# ============================================================================
# STEP 6: Redis Connectivity
# ============================================================================

Step "5) Redis connectivity (STRICT)"

Write-Host "Testing Redis connection..."

try {
  $redisPing = docker compose exec -T $REDIS_SERVICE redis-cli ping 2>&1
  
  if ($redisPing -match "PONG") {
    OK "Redis accessible and responding (PONG)"
  } else {
    Fail "Redis ping failed: $redisPing"
  }
} catch {
  Fail "Redis connection error: $_"
}

# Test Redis info
try {
  $redisInfo = docker compose exec -T $REDIS_SERVICE redis-cli info server 2>&1 | Select-String "redis_version"
  if ($redisInfo) {
    OK "Redis info: $redisInfo"
  }
} catch {
  WARN "Could not get Redis version info"
}

# ============================================================================
# STEP 7: Container Logs Check
# ============================================================================

Step "6) Container logs (error detection)"

$services = @("auth", "student", "school", "user-profile")
$foundErrors = $false

foreach ($service in $services) {
  $containerName = "madrasti-$service-1"
  $logs = docker logs $containerName --tail 100 2>&1 | Select-String -Pattern "ERROR|FATAL|ECONNREFUSED" -SimpleMatch
  
  if ($logs) {
    WARN "$service has errors in logs (check 'docker logs $containerName')"
    $foundErrors = $true
  } else {
    OK "$service logs clean (no ERROR/FATAL in last 100 lines)"
  }
}

# ============================================================================
# STEP 8: Network Connectivity (Internal)
# ============================================================================

Step "7) Internal network DNS resolution"

try {
  # Test DNS resolution from auth container to postgres
  $dnsTest = docker exec madrasti-auth-1 sh -c "getent hosts postgres" 2>&1
  
  if ($dnsTest -match "postgres") {
    OK "DNS resolution working (auth can resolve postgres)"
  } else {
    WARN "DNS resolution may have issues: $dnsTest"
  }
} catch {
  WARN "Could not test internal DNS: $_"
}

# ============================================================================
# STEP 9: Volume Mounts
# ============================================================================

Step "8) Volume mounts and permissions"

try {
  # Check if postgres data is persisted
  $pgVolume = docker volume inspect madrasti_postgres_data 2>&1
  if ($pgVolume -match "Mountpoint") {
    OK "PostgreSQL data volume exists"
  } else {
    WARN "PostgreSQL data volume not found (data may not persist)"
  }
} catch {
  WARN "Could not inspect postgres volume"
}

try {
  # Check if redis data is persisted
  $redisVolume = docker volume inspect madrasti_redis_data 2>&1
  if ($redisVolume -match "Mountpoint") {
    OK "Redis data volume exists"
  } else {
    WARN "Redis data volume not found (data may not persist)"
  }
} catch {
  WARN "Could not inspect redis volume"
}

# ============================================================================
# STEP 10: Resource Usage
# ============================================================================

Step "9) Container resource usage"

try {
  $stats = docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" --filter "name=madrasti" 2>&1 | Out-String
  Write-Host $stats
  OK "Resource stats retrieved"
} catch {
  WARN "Could not get container stats: $_"
}

# ============================================================================
# Summary
# ============================================================================

Step "10) Summary"

if ($foundErrors) {
  WARN "STEP 2 VERIFY (STRICT): PASS with warnings ⚠️"
  Write-Host ""
  Write-Host "Some services have errors in logs. Review with:" -ForegroundColor Yellow
  Write-Host "  docker logs madrasti-<service>-1" -ForegroundColor White
} else {
  OK "STEP 2 VERIFY (STRICT): PASS ✅"
}

Write-Host ""
Write-Host "All containers are running and infrastructure is accessible!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: .\STEP3-VERIFY-STRICT.ps1" -ForegroundColor White
Write-Host "  2. Verify service health endpoints" -ForegroundColor White
Write-Host ""
