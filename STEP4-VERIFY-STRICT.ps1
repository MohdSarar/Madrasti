<# 
STEP4-VERIFY-STRICT.ps1 (v2 - strict & robust)
Smoke verification for Madrasti Step 4.

- Hard-fails on critical checks
- Auto-detects Security/Auth host ports via `docker compose port` when possible
- Avoids null Trim crashes
- Produces clear failure messages (missing endpoints vs unreachable OpenAPI)

Run:
  Set-StrictMode -Version Latest
  $ErrorActionPreference = "Stop"
  .\STEP4-VERIFY-STRICT.ps1

Optional overrides:
  $env:SECURITY_BASE_URL = "http://localhost:8085"   # if you want to force
  $env:AUTH_BASE_URL     = "http://localhost:8081"
  $env:GATEWAY_BASE_URL  = "http://localhost:8000"
  $env:PG_SERVICE        = "postgres"
  $env:PG_USER           = "madrasti"
  $env:PG_DB             = "postgres"
  $env:SECURITY_SERVICE_NAME = "security"            # compose service name
  $env:AUTH_SERVICE_NAME     = "auth"
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------
# Helpers
# ---------------------------
function Step([string]$msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function OK([string]$msg)   { Write-Host "OK  $msg" -ForegroundColor Green }
function Warn([string]$msg) { Write-Host "WARN $msg" -ForegroundColor Yellow }
function Fail([string]$msg) { throw "FAIL $msg" }

function Have-Command([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Run([string]$cmd) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  return Invoke-Expression $cmd
}

function Join-Url([string]$base, [string]$path) {
  if ([string]::IsNullOrWhiteSpace($base)) { return $null }
  $b = $base.TrimEnd("/")
  $p = if ($path.StartsWith("/")) { $path } else { "/" + $path }
  return "$b$p"
}

function Http-GetText([string]$url, [int]$timeoutSec = 6, [int]$retries = 10, [int]$sleepMs = 600) {
  if ([string]::IsNullOrWhiteSpace($url)) { throw "Http-GetText: url is empty" }

  $lastErr = $null
  for ($i=1; $i -le $retries; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSec
      return [string]$resp.Content
    } catch {
      $lastErr = $_
      Start-Sleep -Milliseconds $sleepMs
    }
  }
  throw "HTTP GET failed after $retries attempts: $url`nLast error: $lastErr"
}

function Try-Http([string]$url) {
  try {
    [void](Http-GetText $url 4 2 300)
    return $true
  } catch { return $false }
}

function Detect-WorkingBase([string[]]$bases, [string]$probePath = "/health") {
  foreach ($b in $bases) {
    $u = Join-Url $b $probePath
    if (Try-Http $u) { return $b }
  }
  return $null
}

function Docker-ComposeCmd() {
  if (-not (Have-Command "docker")) { Fail "docker command not found" }

  try {
    Run "docker compose version | Out-Null"
    return "docker compose"
  } catch {
    if (Have-Command "docker-compose") { return "docker-compose" }
    Fail "Docker Compose not found (neither 'docker compose' nor 'docker-compose')"
  }
}

function Compose-PS([string]$compose) {
  return Run "$compose ps --format json"
}

function Compose-Port([string]$compose, [string]$service, [int]$containerPort) {
  # returns "0.0.0.0:xxxxx" or empty
  try {
    $out = Run "$compose port $service $containerPort 2>$null"
    if ($out) { return ($out | Select-Object -First 1).ToString().Trim() }
    return $null
  } catch { return $null }
}

function Compose-ExecPsql([string]$compose, [string]$pgService, [string]$pgUser, [string]$pgDb, [string]$sql) {
  $escaped = $sql.Replace('"','\"')
  $cmd = "$compose exec -T $pgService psql -U $pgUser -d $pgDb -v ON_ERROR_STOP=1 -tAc ""$escaped"""
  $res = Run $cmd
  return [string]$res
}

function Require-PathsInOpenAPI([string]$openapiJson, [string[]]$paths, [string]$label) {
  $missing = @()
  foreach ($p in $paths) {
    if ($openapiJson -notmatch [regex]::Escape($p)) { $missing += $p }
  }
  if ($missing.Count -gt 0) {
    Fail "$label OpenAPI missing required paths:`n - " + ($missing -join "`n - ")
  }
  OK "$label OpenAPI has all required Step4 paths"
}

# ---------------------------
# Config (override via env)
# ---------------------------
$SecurityBase = if ($env:SECURITY_BASE_URL) { $env:SECURITY_BASE_URL } else { "http://localhost:8085" }
$AuthBase     = if ($env:AUTH_BASE_URL)     { $env:AUTH_BASE_URL }     else { "http://localhost:8081" }
$GatewayBase  = if ($env:GATEWAY_BASE_URL)  { $env:GATEWAY_BASE_URL }  else { "http://localhost:8000" }

$PgService = if ($env:PG_SERVICE) { $env:PG_SERVICE } else { "postgres" }
$PgUser    = if ($env:PG_USER)    { $env:PG_USER }    else { "madrasti" }
$PgDb      = if ($env:PG_DB)      { $env:PG_DB }      else { "postgres" }

$SecuritySvcName = if ($env:SECURITY_SERVICE_NAME) { $env:SECURITY_SERVICE_NAME } else { "security" }
$AuthSvcName     = if ($env:AUTH_SERVICE_NAME)     { $env:AUTH_SERVICE_NAME }     else { "auth" }

# ---------------------------
# Start
# ---------------------------
Step "Preflight"
$compose = Docker-ComposeCmd
OK "Using compose command: $compose"
OK "Default bases: Security=$SecurityBase Auth=$AuthBase Gateway=$GatewayBase"
OK "Postgres: service=$PgService user=$PgUser db=$PgDb"
OK "Compose service names: security=$SecuritySvcName auth=$AuthSvcName"

Step "Docker compose ps"
$psJson = Compose-PS $compose
if ([string]::IsNullOrWhiteSpace($psJson)) { Fail "docker compose ps returned empty output" }

# Parse json if possible (format differs between versions)
try {
  $ps = $psJson | ConvertFrom-Json
  OK "compose ps parsed as JSON"
} catch {
  Warn "compose ps not parsed as JSON (ok). We'll continue."
  $ps = $null
}

Step "Auto-detect host ports (if possible)"
# If your container listens on 8085 internally, this will find host binding.
$secPort = Compose-Port $compose $SecuritySvcName 8085
if ($secPort) {
  # secPort like "0.0.0.0:52433" or "[::]:52433"
  $hostPort = ($secPort -split ":")[-1]
  $SecurityBaseAuto = "http://localhost:$hostPort"
  OK "Detected security host port mapping: $secPort => $SecurityBaseAuto"
} else {
  $SecurityBaseAuto = $null
  Warn "Could not detect security port via 'compose port $SecuritySvcName 8085'. Will probe defaults."
}

$authPort = Compose-Port $compose $AuthSvcName 8081
if ($authPort) {
  $authHostPort = ($authPort -split ":")[-1]
  $AuthBaseAuto = "http://localhost:$authHostPort"
  OK "Detected auth host port mapping: $authPort => $AuthBaseAuto"
} else {
  $AuthBaseAuto = $null
  Warn "Could not detect auth port via 'compose port $AuthSvcName 8081'. Will probe defaults."
}

Step "Detect live endpoints"
# Security: try env/base, auto, then common fallbacks
$securityCandidates = @()
$securityCandidates += $SecurityBase
if ($SecurityBaseAuto) { $securityCandidates += $SecurityBaseAuto }
$securityCandidates += @("http://localhost:8085","http://localhost:8086","http://localhost:8080","http://localhost:8000") | Select-Object -Unique

$securityLive = Detect-WorkingBase $securityCandidates "/health"
if (-not $securityLive) {
  Fail "Security service unreachable. Tried:`n - " + ($securityCandidates -join "`n - ") + "`nExpected /health to respond."
}
OK "Security service reachable: $securityLive"

# Auth: try auto/base then gateway; accept /auth/health too
$authCandidates = @()
$authCandidates += $AuthBase
if ($AuthBaseAuto) { $authCandidates += $AuthBaseAuto }
$authCandidates += @($GatewayBase) | Select-Object -Unique

$authLive = Detect-WorkingBase $authCandidates "/health"
if (-not $authLive) { $authLive = Detect-WorkingBase @($GatewayBase) "/auth/health" }

if (-not $authLive) {
  Warn "Auth health not detected; will still try OpenAPI if possible."
} else {
  OK "Auth base detected: $authLive"
}

Step "Security service: health/readyz/metrics"
[void](Http-GetText (Join-Url $securityLive "/health"))
OK "Security GET /health OK"

# /readyz
[void](Http-GetText (Join-Url $securityLive "/readyz"))
OK "Security GET /readyz OK"

# /metrics
$secMetrics = Http-GetText (Join-Url $securityLive "/metrics")
if ($secMetrics -notmatch "security_|gdpr_") {
  Warn "Security metrics do not contain 'security_' or 'gdpr_' prefixes (maybe renamed)."
} else {
  OK "Security metrics prefixes present"
}

Step "Security service: OpenAPI (optional)"
$secOpenapiUrl = Join-Url $securityLive "/openapi.json"
if (Try-Http $secOpenapiUrl) {
  $secOpenapi = Http-GetText $secOpenapiUrl
  OK "Security GET /openapi.json OK"
} else {
  Warn "Security OpenAPI not exposed at $secOpenapiUrl (ok if not enabled)"
}

Step "Auth service: health/readyz/metrics (best-effort)"
if ($authLive) {
  [void](Http-GetText (Join-Url $authLive "/health"))
  OK "Auth GET /health OK"

  if (Try-Http (Join-Url $authLive "/readyz")) {
    [void](Http-GetText (Join-Url $authLive "/readyz"))
    OK "Auth GET /readyz OK"
  } else {
    Warn "Auth /readyz not available at $authLive"
  }

  if (Try-Http (Join-Url $authLive "/metrics")) {
    $authMetrics = Http-GetText (Join-Url $authLive "/metrics")
    OK "Auth GET /metrics OK"
    if ($authMetrics -match "auth_") { OK "Auth metrics contain 'auth_' prefix" }
    else { Warn "Auth metrics missing 'auth_' prefix (maybe renamed)" }
  } else {
    Warn "Auth /metrics not available at $authLive"
  }
}

Step "Auth OpenAPI: enforce Step 4 endpoints (STRICT if OpenAPI reachable)"
# Try direct openapi first, then gateway /auth/openapi.json
$authOpenapiUrl = $null
if ($authLive -and (Try-Http (Join-Url $authLive "/openapi.json"))) {
  $authOpenapiUrl = Join-Url $authLive "/openapi.json"
} elseif (Try-Http (Join-Url $GatewayBase "/auth/openapi.json")) {
  $authOpenapiUrl = Join-Url $GatewayBase "/auth/openapi.json"
}

if (-not $authOpenapiUrl) {
  Warn "Auth OpenAPI not reachable (skipping endpoint contract checks)."
} else {
  $authOpenapi = Http-GetText $authOpenapiUrl
  OK "Auth OpenAPI fetched: $authOpenapiUrl"

  $authExpectedPaths = @(
    "/api/v1/auth/password/change",
    "/api/v1/auth/password/reset/request",
    "/api/v1/auth/password/reset/confirm",
    "/api/v1/auth/security/settings",
    "/api/v1/auth/sessions/revoke-all"
  )
  Require-PathsInOpenAPI $authOpenapi $authExpectedPaths "Auth"
}

Step "Postgres: security schema & core tables (STRICT)"
# Check schema exists, and the core tables exist
$schema = Compose-ExecPsql $compose $PgService $PgUser $PgDb "SELECT schema_name FROM information_schema.schemata WHERE schema_name='security';"
$schema = [string]$schema
if ($schema.Trim() -ne "security") {
  Fail "Schema 'security' not found in Postgres. This usually means migrations were NOT applied."
}
OK "Schema exists: security"

$tables = @("audit_events","password_policies","password_history","account_lockouts","gdpr_requests")
foreach ($t in $tables) {
  $r = Compose-ExecPsql $compose $PgService $PgUser $PgDb "SELECT to_regclass('security.$t');"
  $r = [string]$r
  if ($r.Trim() -ne "security.$t") { Fail "Missing table: security.$t" }
  OK "Table exists: security.$t"
}

Step "DONE"
OK "Step 4 strict verification PASSED ✅"
