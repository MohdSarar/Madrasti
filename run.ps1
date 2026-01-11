param([switch]$NoBuild,[switch]$NoFrontend,[switch]$Verify,[string]$FrontendMode="dev")
if($FrontendMode -notin @("dev","prod")){throw "FrontendMode must be dev or prod"}
function Step($m){Write-Host "";Write-Host "=== $m ===" -ForegroundColor Cyan}
function OK($m){Write-Host "✅ $m" -ForegroundColor Green}
function Warn($m){Write-Host "⚠️ $m" -ForegroundColor Yellow}
function Fail($m){Write-Host "❌ $m" -ForegroundColor Red;throw $m}
function Require-Cmd($name){if(!(Get-Command $name -EA SilentlyContinue)){Fail "$name not found"}}
function Wait-HttpOk([string]$url,[int]$timeoutSec=120){$sw=[Diagnostics.Stopwatch]::StartNew();while($sw.Elapsed.TotalSeconds -lt $timeoutSec){try{$r=Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 5;if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){return $true}}catch{Start-Sleep -Seconds 2}}return $false}
Step "0) Preconditions";if(!(Test-Path "./docker-compose.yml")){Fail "Run from repo root"}
Require-Cmd docker;Require-Cmd node;Require-Cmd npm
try{docker info|Out-Null}catch{Fail "Docker not running"}
OK "Tooling OK"
Step "1) Backend";if($NoBuild){docker compose up -d}else{docker compose up -d --build};OK "docker compose up done"
Step "2) Wait for services";$kong="http://localhost:8000";if(Wait-HttpOk $kong 180){OK "Gateway reachable"}else{Warn "Gateway not reachable"}
$healthChecks=@(@{name="auth";url="http://localhost:8081/health"},@{name="student";url="http://localhost:8082/health"},@{name="school";url="http://localhost:8083/health"},@{name="user-profile";url="http://localhost:8084/health"})
foreach($h in $healthChecks){if(Wait-HttpOk $h.url 120){OK "$($h.name) reachable"}else{Warn "$($h.name) not reachable"}}
if(-not $NoFrontend){Step "3) Frontend";Push-Location "./frontend";try{if(Test-Path "./tools/cleanup-frontend.ps1"){Step "3.0) Cleanup";powershell -NoProfile -ExecutionPolicy Bypass -File "./tools/cleanup-frontend.ps1";OK "cleanup OK"}if(!(Test-Path "./node_modules")){Step "3.1) Install";npm ci;OK "npm ci OK"}else{OK "node_modules present"}if($FrontendMode -eq "prod"){Step "3.2) Build";npm run build;OK "build OK";Step "3.3) Start prod";Start-Process powershell -ArgumentList "-NoExit","-Command","cd $PWD;npm run start"}else{Step "3.2) Start dev";Start-Process powershell -ArgumentList "-NoExit","-Command","cd $PWD;npm run dev"}}finally{Pop-Location};OK "Frontend started"}
if($Verify){Step "4) Verification";if(Test-Path "./STEP4-VERIFY-STRICT.ps1"){powershell -NoProfile -ExecutionPolicy Bypass -File "./STEP4-VERIFY-STRICT.ps1";OK "STEP4 verify done"}else{Warn "STEP4 not found"}if(Test-Path "./FRONTEND-VERIFY-STRICT.ps1"){powershell -NoProfile -ExecutionPolicy Bypass -File "./FRONTEND-VERIFY-STRICT.ps1";OK "Frontend verify done"}else{Warn "Frontend verify not found"}}
Step "Done";Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan;Write-Host "Gateway: http://localhost:8000" -ForegroundColor Cyan
