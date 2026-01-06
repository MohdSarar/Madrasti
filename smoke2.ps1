Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PgService   = "postgres"
$PgUser      = "madrasti"
$PgDefaultDb = "postgres"

$AuthService = "auth"
$AuthWorkdir = "/app"

function Step($m){ Write-Host ""; Write-Host "=== $m ===" }
function Run($cmd){ Write-Host ">> $cmd"; Invoke-Expression $cmd }

function PgQuery([string]$db, [string]$sql) {
  docker compose exec -T $PgService psql -U $PgUser -d $db -Atc $sql
}

try {
  Step "0) Show DBs that exist"
  PgQuery $PgDefaultDb "SELECT datname FROM pg_database ORDER BY datname;" | ForEach-Object { Write-Host $_ }

  Step "1) Show AUTH container DB-related env (what it REALLY uses)"
  # Print common variants: DATABASE_URL, DB_* , POSTGRES_* etc
  Run "docker compose exec -T $AuthService sh -lc 'env | sort | egrep -i ""(DATABASE_URL|DB_|POSTGRES|PGHOST|PGPORT|PGUSER|PGDATABASE|PGPASSWORD)"" || true'"

  Step "2) Show auth container computed connection (if DATABASE_URL exists)"
  # IMPORTANT: use single quotes around sh command so PowerShell doesn't expand $
  Run "docker compose exec -T $AuthService sh -lc 'echo DATABASE_URL=${DATABASE_URL:-<empty>}'"

  Step "3) Check if auth_db currently has the expected tables"
  Write-Host ('to_regclass(public.user_sessions) => ' + (PgQuery 'auth_db' "SELECT to_regclass('public.user_sessions');").Trim())
  Write-Host ('to_regclass(public.users) => ' + (PgQuery 'auth_db' "SELECT to_regclass('public.users');").Trim())
  Write-Host ('to_regclass(public.schools) => ' + (PgQuery 'auth_db' "SELECT to_regclass('public.schools');").Trim())

  Step "4) Run auth migrations (inside container)"
  Run "docker compose exec -T $AuthService npm --prefix $AuthWorkdir run migrate"

  Step "5) Verify tables exist after migrate"
  $sess = (PgQuery 'auth_db' "SELECT to_regclass('public.user_sessions');").Trim()
  Write-Host "to_regclass(public.user_sessions) => $sess"
  if ($sess -notmatch "user_sessions") {
    Step "DEBUG: list all tables in auth_db (public schema)"
    PgQuery 'auth_db' "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" | ForEach-Object { Write-Host $_ }

    throw "Auth migrations did NOT create public.user_sessions in auth_db. This means migrate is targeting a different DB OR migrations don't include that table anymore."
  }

  Step "6) Seed (optional, but many tests need baseline data)"
  Run "docker compose exec -T $AuthService npm --prefix $AuthWorkdir run seed"

  Step "7) Run auth tests"
  Run "docker compose exec -T $AuthService npm --prefix $AuthWorkdir run test"

  Step "DONE ✅"
}
catch {
  Write-Host ""
  Write-Host "FAILED ❌" -ForegroundColor Red
  Write-Host $_

  Write-Host ""
  Write-Host "=== docker compose ps ==="
  docker compose ps

  Write-Host ""
  Write-Host "=== last logs (postgres/auth) ==="
  docker compose logs --tail=200 postgres auth

  exit 1
}
