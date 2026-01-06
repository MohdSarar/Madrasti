$ErrorActionPreference = "Stop"

# ====== CONFIGURATION ======
$ProjRoot = "C:\Users\Utilisateur\Desktop\Madrasti"
$ComposeProject = "madrasti_hardened"
$AuthService = "auth"

# Internal auth service port inside the Docker network
# (based on `docker compose ps`)
$AuthPort = 8081

# BASE_URL as seen from the k6 container (Docker network scope)
$env:BASE_URL = "http://auth:$AuthPort"
$env:TENANT_SLUG = "tenant-a"
$env:EMAIL = "loadtest@madrasti.local"
$env:PASSWORD = "LoadTest12345!"

Set-Location $ProjRoot

Write-Host "`n[1/8] Build & start containers..." -ForegroundColor Cyan
docker compose -p $ComposeProject up -d --build

Write-Host "`n[2/8] Containers status..." -ForegroundColor Cyan
docker compose -p $ComposeProject ps

Write-Host "`n[3/8] LINT (TypeScript-aware ESLint)..." -ForegroundColor Cyan
docker compose -p $ComposeProject exec -T $AuthService npm run lint

Write-Host "`n[4/8] Database migrations..." -ForegroundColor Cyan
docker compose -p $ComposeProject exec -T $AuthService npm run migrate

Write-Host "`n[5/8] Tests + coverage (CI gates)..." -ForegroundColor Cyan
# NOTE:
# If Jest writes coverage to /app/coverage and you get EACCES,
# run this command as root:
docker compose -p $ComposeProject exec -T -u 0 $AuthService npm run test:coverage -- --detectOpenHandles

Write-Host "`n[6/8] Smoke checks (health / healthz / metrics) via Node fetch..." -ForegroundColor Cyan
# Fetch from inside the container (no wget/curl required)
$nodeFetch = @"
(async () => {
  const base = 'http://localhost:$AuthPort';
  const urls = ['/health','/healthz','/metrics'];
  for (const u of urls) {
    try {
      const r = await fetch(base + u);
      const t = await r.text();
      console.log('OK', u, r.status, t.slice(0, 200).replace(/\n/g,' '));
    } catch (e) {
      console.log('FAIL', u, e?.message || e);
      process.exitCode = 2;
    }
  }
})();
"@
docker compose -p $ComposeProject exec -T $AuthService node -e $nodeFetch

Write-Host "`n[7/8] k6 availability (executed via grafana/k6 container)..." -ForegroundColor Cyan
# Mount load-test scripts into a k6 container connected to the compose network
$LoadDir = Join-Path $ProjRoot "services\auth\tests\load"
if (!(Test-Path $LoadDir)) { throw "Load tests folder not found: $LoadDir" }

# Baseline load test
Write-Host "`n--- k6 baseline: auth-login.js ---" -ForegroundColor Cyan
docker run --rm `
  --network "${ComposeProject}_default" `
  -e BASE_URL="$env:BASE_URL" -e TENANT_SLUG="$env:TENANT_SLUG" -e EMAIL="$env:EMAIL" -e PASSWORD="$env:PASSWORD" `
  -v "${LoadDir}:/scripts:ro" `
  grafana/k6 run /scripts/auth-login.js

# Stress / breaking-point test
Write-Host "`n--- k6 stress: auth-stress.js ---" -ForegroundColor Cyan
docker run --rm `
  --network "${ComposeProject}_default" `
  -e BASE_URL="$env:BASE_URL" -e TENANT_SLUG="$env:TENANT_SLUG" -e EMAIL="$env:EMAIL" -e PASSWORD="$env:PASSWORD" `
  -v "${LoadDir}:/scripts:ro" `
  grafana/k6 run /scripts/auth-stress.js

Write-Host "`n[8/8] Summary..." -ForegroundColor Cyan
Write-Host "✅ DONE: lint + migrations + tests & coverage + smoke checks + k6 baseline & stress" -ForegroundColor Green
