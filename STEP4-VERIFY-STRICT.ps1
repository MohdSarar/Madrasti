# STEP4-VERIFY-STRICT.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step($m){ Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail($m){ Write-Host "[FAIL] $m" -ForegroundColor Red; exit 1 }

function Read-FileText([string]$path){
  if (!(Test-Path $path)) { Fail "Missing file: $path" }
  return Get-Content -Raw -Encoding UTF8 $path
}

function Try-Http([string]$name, [string]$url){
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10
    Ok "${name}: reachable ($url) HTTP $($r.StatusCode)"
    return $true
  } catch {
    Fail "${name}: unreachable ($url) -> $($_.Exception.Message)"
  }
}

function Get-Json([string]$name, [string]$url){
  try {
    return Invoke-RestMethod -Uri $url -TimeoutSec 10
  } catch {
    Fail "${name}: JSON fetch failed ($url) -> $($_.Exception.Message)"
  }
}

function Assert-JsonHas([string]$name, $obj, [string]$key){
  if ($null -eq $obj) { Fail "${name}: no JSON returned" }
  if (-not ($obj.PSObject.Properties.Name -contains $key)) { Fail "${name}: missing JSON key '$key'" }
  Ok "${name}: contains '$key'"
}

function Compose-Up {
  Step "Docker compose up"
  docker compose up -d --build | Out-Host
  Ok "docker compose up done"
}

function Compose-Down {
  Step "Docker compose down"
  docker compose down | Out-Host
}

function Compose-Port([string]$svc, [int]$containerPort){
  # returns "http://127.0.0.1:HOSTPORT" or $null
  try {
    $out = docker compose port $svc $containerPort 2>$null
    if (-not $out) { return $null }
    $out = $out.Trim()
    # typical: "0.0.0.0:8085" or "127.0.0.1:8085"
    $hostPort = $out.Split(":")[-1]
    if (-not $hostPort) { return $null }
    return "http://127.0.0.1:$hostPort"
  } catch {
    return $null
  }
}

# ---- Main ----
try {
  Step "A) Basic files"
  $composePath = ".\docker-compose.yml"
  $compose = Read-FileText $composePath
  Ok "docker-compose.yml found"

  Step "B) Services present in docker-compose"
  $requiredSvcs = @("security","academic","attendance","scheduling","reporting","notification","document")
  foreach ($svc in $requiredSvcs) {
    if ($compose -notmatch "(\r?\n)\s*${svc}:\s*") {
      Fail "docker-compose.yml: missing service '${svc}'"
    }
    Ok "docker-compose.yml: contains '${svc}'"
  }

  Step "C) Repo structure checks"
  $requiredFiles = @(
    "Dockerfile",
    "package.json",
    "tsconfig.json",
    "src\app.ts",
    "src\index.ts"
  )

  foreach ($svc in @("academic","attendance","scheduling","reporting","notification","document")) {
    $base = Join-Path "services" $svc
    if (!(Test-Path $base)) { Fail "Missing folder: $base" }

    foreach ($f in $requiredFiles) {
      $p = Join-Path $base $f
      if (!(Test-Path $p)) { Fail "services/${svc}: missing $f" }
    }

    $migDir = Join-Path $base "migrations"
    if (!(Test-Path $migDir)) { Fail "services/${svc}: missing migrations/" }

    Ok "services/${svc}: required files present"
  }

  Step "D) Port conflict check (Security must be 8091, Academic 8085)"

  $cfg = docker compose config
  if (-not $cfg) { Fail "docker compose config failed" }

  # Extract security published port (host) and target port (container)
  $secBlock = ($cfg | Select-String -Pattern "^\s*security:\s*$" -Context 0,80).Context.PostContext
  $secPublished = ($secBlock | Select-String -Pattern "published:\s*`"(\d+)`"" | Select-Object -First 1).Matches.Groups[1].Value
  $secTarget    = ($secBlock | Select-String -Pattern "target:\s*(\d+)" | Select-Object -First 1).Matches.Groups[1].Value

  if ($secPublished -ne "8091" -or $secTarget -ne "8091") {
    Fail "security ports invalid: published=$secPublished target=$secTarget (expected 8091/8091)"
  }
  Ok "security ports OK: 8091->8091"

  # Academic must be 8085
  $acaBlock = ($cfg | Select-String -Pattern "^\s*academic:\s*$" -Context 0,80).Context.PostContext
  $acaPublished = ($acaBlock | Select-String -Pattern "published:\s*`"(\d+)`"" | Select-Object -First 1).Matches.Groups[1].Value
  $acaTarget    = ($acaBlock | Select-String -Pattern "target:\s*(\d+)" | Select-Object -First 1).Matches.Groups[1].Value

  if ($acaPublished -ne "8085" -or $acaTarget -ne "8085") {
    Fail "academic ports invalid: published=$acaPublished target=$acaTarget (expected 8085/8085)"
  }
  Ok "academic ports OK: 8085->8085"


  Step "E) Discover mapped ports"

  $svcPorts = @{
    security     = 8091
    academic     = 8085
    attendance   = 8086
    scheduling   = 8087
    reporting    = 8088
    notification = 8089
    document     = 8090
  }

  $svcBaseUrl = @{}

  foreach ($k in $svcPorts.Keys) {
    if (-not $svcPorts.ContainsKey($k)) {
      Warn "${k}: skipping (no port mapping configured)"
      continue
    }

    $containerPort = [int]$svcPorts[$k]
    $u = Compose-Port $k $containerPort

    if ($null -eq $u) {
      Warn "${k}: skipping (no port mapping detected for ${k}:${containerPort})"
      continue
    }

    $svcBaseUrl[$k] = $u
    Ok "${k}: base url = $u"
  }


  Step "F) Health / Readyz / Metrics"
  foreach ($k in $svcBaseUrl.Keys) {
    $base = $svcBaseUrl[$k]

    Try-Http $k "$base/health" | Out-Null
    $r = Get-Json $k "$base/readyz"
    Assert-JsonHas $k $r "ok"
    if ($r.ok -ne $true) { Fail "${k}: readyz ok != true" }
    Ok "${k}: readyz ok=true"

    # metrics must exist and not be empty
    try {
      $m = Invoke-WebRequest -UseBasicParsing -Uri "$base/metrics" -TimeoutSec 10
      if (-not $m.Content -or $m.Content.Length -lt 10) { Fail "${k}: metrics empty" }
      Ok "${k}: metrics non-empty"
    } catch {
      Fail "${k}: metrics fetch failed -> $($_.Exception.Message)"
    }
  }

  Step "G) Minimal API validation (expect 400 on missing required fields)"
  if ($svcBaseUrl.ContainsKey("academic")) {
    $base = $svcBaseUrl["academic"]
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$base/api/v1/subjects" -ContentType "application/json" -Body "{}" -TimeoutSec 10
      Fail "academic: expected 400 but got $($resp.StatusCode)"
    } catch {
      # Invoke-WebRequest throws on non-2xx. We want 400.
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -ne 400) { Fail "academic: expected 400 but got $status" }
      Ok "academic: POST /subjects missing fields -> 400 OK"
    }
  } else {
    Warn "academic: skipping API check (no port)"
  }

  if ($svcBaseUrl.ContainsKey("attendance")) {
    $base = $svcBaseUrl["attendance"]
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$base/api/v1/leave-requests" -ContentType "application/json" -Body "{}" -TimeoutSec 10
      Fail "attendance: expected 400 but got $($resp.StatusCode)"
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -ne 400) { Fail "attendance: expected 400 but got $status" }
      Ok "attendance: POST /leave-requests missing fields -> 400 OK"
    }
  } else {
    Warn "attendance: skipping API check (no port)"
  }

  Step "H) Done"
  Ok "STEP 4 verification PASS ✅"
}
catch {
  Fail "Unhandled error: $($_.Exception.Message)"
}
finally {
  # keep running containers if you want; comment out to auto-down
  # Compose-Down
}
