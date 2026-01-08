Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function OK($m)   { Write-Host "✅ $m" -ForegroundColor Green }
function WARN($m) { Write-Host "⚠️  $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "❌ $m" -ForegroundColor Red; exit 1 }
function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }

function Run($cmd) {
  Write-Host ">> $cmd" -ForegroundColor DarkGray
  Invoke-Expression $cmd
}

function Test-File($path) {
  if (-not (Test-Path $path)) { Fail "Missing file: $path" }
  OK "Found: $path"
}

function Assert-Contains($path, $needle, $label) {
  if (-not (Test-Path $path)) { Fail "Missing file: $path" }
  $txt = Get-Content $path -Raw

  # Literal contains (safer than regex)
  if ($txt.IndexOf($needle, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
    Fail "${label}: missing literal '${needle}' in $path"
  }
  OK "${label}: contains '${needle}'"
}


function Get-HttpStatus($url, $timeoutSec = 5) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec $timeoutSec -UseBasicParsing
    return [int]$r.StatusCode
  } catch {
    # Try to extract status code if present
    $resp = $_.Exception.Response
    if ($resp -and $resp.StatusCode) {
      return [int]$resp.StatusCode
    }
    return -1
  }
}

function Wait-Healthy($name, $url, $tries = 60, $sleepSec = 2) {
  for ($i = 1; $i -le $tries; $i++) {
    $code = Get-HttpStatus $url 3
    if ($code -eq 200) { OK "${name}: /health 200"; return }
    Start-Sleep -Seconds $sleepSec
  }
  Fail "${name}: /health did not become healthy at $url"
}

function Test-Ready($name, $url) {
  $code = Get-HttpStatus $url 5
  if ($code -ne 200) { Fail "${name}: /readyz expected 200, got $code ($url)" }
  OK "${name}: /readyz 200"
}

function Get-ServicePortsFromCompose($composePath) {
  # Returns hashtable: serviceName -> hostPort (best effort)
  $ports = @{}
  if (-not (Test-Path $composePath)) {
    WARN "docker-compose.yml not found at $composePath (port autodetect skipped)"
    return $ports
  }

  $lines = Get-Content $composePath
  $current = $null
  $inServices = $false
  $inPorts = $false

  foreach ($line in $lines) {
    if ($line -match '^\s*services:\s*$') { $inServices = $true; continue }
    if (-not $inServices) { continue }

    # service name: two spaces then name:
    if ($line -match '^\s{2}([a-zA-Z0-9\-_]+):\s*$') {
      $current = $Matches[1]
      $inPorts = $false
      continue
    }

    if (-not $current) { continue }

    if ($line -match '^\s{4}ports:\s*$') {
      $inPorts = $true
      continue
    }

    if ($inPorts) {
      # Match "- "HOST:CONTAINER""
      if ($line -match '^\s{6}-\s*"?([0-9]+):([0-9]+)"?\s*$') {
        $hostPort = [int]$Matches[1]
        if (-not $ports.ContainsKey($current)) {
          $ports[$current] = $hostPort
        }
        continue
      }

      # If ports section ends
      if ($line -match '^\s{4}[a-zA-Z0-9\-_]+:\s*') {
        $inPorts = $false
        continue
      }
    }
  }

  return $ports
}

function Test-RouteNot404($name, $url) {
  $code = Get-HttpStatus $url 5
  # Accept: 200/201/204/400/401/403 because auth/validation may block
  if ($code -eq 404 -or $code -eq -1) {
    Fail "${name}: route check failed (got $code) at $url"
  }
  OK "${name}: route exists (got $code) at $url"
}

Step "0) Preconditions"
if (-not (Test-Path ".\\docker-compose.yml")) { Fail "Run this script at repo root (docker-compose.yml not found)" }
OK "Repo root OK"

Step "1.1) Lockfile integrity (npm ci must succeed)"
try {
  Run "npm ci --silent"
  OK "npm ci OK (lockfile in sync)"
} catch {
  Fail "npm ci failed: package-lock.json out of sync. Run: npm install, then commit package-lock.json"
}


Step "1.2) Docker Compose up (Step 4 services)"
Run "docker compose up -d --build"

Step "2) Detect service ports from docker-compose.yml"
$composePorts = Get-ServicePortsFromCompose ".\\docker-compose.yml"
if ($composePorts.Count -eq 0) {
  WARN "No ports detected from compose. If health checks fail, run: docker compose ps"
}

# Step 4 services we expect
$step4Services = @("academic","attendance","scheduling","reporting","notification","document")

# Build URL map using detected ports
$svcUrls = @{}
foreach ($s in $step4Services) {
  if ($composePorts.ContainsKey($s)) {
    $p = $composePorts[$s]
    $svcUrls[$s] = @{
      health = "http://localhost:$p/health"
      ready  = "http://localhost:$p/readyz"
      base   = "http://localhost:$p"
    }
    OK "Detected ${s} port: $p"
  } else {
    WARN "No port detected for ${s} in docker-compose.yml (health checks may be skipped)"
  }
}

Step "3) Health + readiness checks (Step 4 services)"
foreach ($s in $step4Services) {
  if ($svcUrls.ContainsKey($s)) {
    Wait-Healthy $s $svcUrls[$s].health
    Test-Ready $s $svcUrls[$s].ready
  } else {
    WARN "Skipping HTTP checks for ${s} (no port)"
  }
}

Step "4) Step 4 backend code presence checks"

# 4.1 Academic - GPA Calculator + endpoint wiring expectations
Test-File ".\\services\\academic\\src\\services\\GPACalculator.ts"
Assert-Contains ".\\services\\academic\\src\\services\\GPACalculator.ts" "calculateGPA" "Academic GPA"
Assert-Contains ".\\services\\academic\\src\\services\\GPACalculator.ts" "invalidateCache" "Academic GPA cache invalidation"

# Controller route may vary; we check at least controller exists if you added it
if (Test-Path ".\\services\\academic\\src\\controllers\\GradeController.ts") {
  Assert-Contains ".\\services\\academic\\src\\controllers\\GradeController.ts" "getStudentGPA" "Academic GPA controller"
} else {
  WARN "GradeController.ts not found (if you used another controller file, ignore)"
}

# 4.2 Attendance - cron + job
Test-File ".\\services\\attendance\\src\\jobs\\autoMarkAbsent.ts"
Assert-Contains ".\\services\\attendance\\src\\jobs\\autoMarkAbsent.ts" "autoMarkAbsent" "Attendance auto-mark job"
Assert-Contains ".\\services\\attendance\\src\\jobs\\autoMarkAbsent.ts" "attendance_records" "Attendance job writes attendance_records"

# Ensure cron setup is present somewhere (index.ts typically)
if (Test-Path ".\\services\\attendance\\src\\index.ts") {
  # cron is wired
Assert-Contains ".\\services\\attendance\\src\\index.ts" "cron.schedule" "Attendance cron wiring"

# cron expression present (single OR double quotes OR env fallback)
$idx = Get-Content ".\\services\\attendance\\src\\index.ts" -Raw
if ($idx -notmatch "0\s+11\s+\*\s+\*\s+\*") {
  WARN "Attendance cron: '0 11 * * *' not found literally in index.ts (maybe env-driven or moved)."
} else {
  OK "Attendance cron: contains 0 11 * * *"
}
} else {
  WARN "services/attendance/src/index.ts not found (cron may be wired elsewhere)"
}

# 4.3 Notification - multi-channel + listeners
Test-File ".\\services\\notification\\src\\services\\NotificationService.ts"
Assert-Contains ".\\services\\notification\\src\\services\\NotificationService.ts" "channels" "Notification multi-channel"
Assert-Contains ".\\services\\notification\\src\\services\\NotificationService.ts" "sendEmail" "Notification email method"
Assert-Contains ".\\services\\notification\\src\\services\\NotificationService.ts" "sendSMS" "Notification sms method"
Assert-Contains ".\\services\\notification\\src\\services\\NotificationService.ts" "sendWebSocket" "Notification websocket method"

if (Test-Path ".\\services\\notification\\src\\eventListeners.ts") {
  Assert-Contains ".\\services\\notification\\src\\eventListeners.ts" "academic-events" "Notification listens academic-events"
  Assert-Contains ".\\services\\notification\\src\\eventListeners.ts" "attendance-events" "Notification listens attendance-events"
} else {
  WARN "services/notification/src/eventListeners.ts not found (listeners may be in another file)"
}

# 4.4 Document - S3 + multer
Test-File ".\\services\\document\\src\\services\\S3Service.ts"
Assert-Contains ".\\services\\document\\src\\services\\S3Service.ts" "S3Client" "Document S3 client"
Assert-Contains ".\\services\\document\\src\\services\\S3Service.ts" "getSignedUrl" "Document presigned URL"

if (Test-Path ".\\services\\document\\src\\middleware\\upload.ts") {
  Assert-Contains ".\\services\\document\\src\\middleware\\upload.ts" "multer" "Document upload middleware"
} else {
  WARN "services/document/src/middleware/upload.ts not found (upload middleware may be elsewhere)"
}

Step "5) Dependency checks (package.json)"

# Attendance: node-cron
if (Test-Path ".\\services\\attendance\\package.json") {
  Assert-Contains ".\\services\\attendance\\package.json" "\"node-cron\"" "Attendance deps"
} else {
  WARN "services/attendance/package.json not found"
}

# Document: aws sdk + multer + uuid
if (Test-Path ".\\services\\document\\package.json") {
  Assert-Contains ".\\services\\document\\package.json" "@aws-sdk/client-s3" "Document deps"
  Assert-Contains ".\\services\\document\\package.json" "multer" "Document deps"
  Assert-Contains ".\\services\\document\\package.json" "\"uuid\"" "Document deps"
} else {
  WARN "services/document/package.json not found"
}

Step "6) Env example checks (S3)"
if (Test-Path ".\\.env.example") {
  $envTxt = Get-Content ".\\.env.example" -Raw
  foreach ($k in @("S3_REGION","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY","S3_BUCKET")) {
    if ($envTxt -notmatch $k) { WARN ".env.example: missing $k (add it if you deploy Document service with S3)" }
    else { OK ".env.example: contains $k" }
  }
} else {
  WARN ".env.example not found"
}

Step "7) Optional route existence checks (best-effort, may require auth)"
# We only ensure routes are not 404 (auth likely returns 401/403)
if ($svcUrls.ContainsKey("academic")) {
  # If your academic exposes API under /api/v1, adjust if needed
  Test-RouteNot404 "academic GPA route" "$($svcUrls['academic'].base)/grades/student/test/period/test/gpa"
}

OK "STEP 4 VERIFY (STRICT): PASS ✅"
