#!/usr/bin/env bash
set -euo pipefail

# Runs once when the postgres volume is empty.
# Creates per-service databases and applies baseline SQL migrations.

create_db() {
  local db="$1"
  echo "[postgres-init] ensuring db exists: ${db}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${db}') THEN
    EXECUTE format('CREATE DATABASE %I', '${db}');
  END IF;
END
$$;
EOSQL
}

apply_sql() {
  local db="$1"
  local file="$2"
  if [ -f "$file" ]; then
    echo "[postgres-init] applying $file -> ${db}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" -f "$file"
  fi
}

create_db auth_db
create_db student_db
create_db school_db
create_db user_db

# Baseline migrations
apply_sql auth_db "/migrations/auth/001_init.sql"
apply_sql student_db "/migrations/student/001_init.sql"
apply_sql school_db "/migrations/school/001_init.sql"
apply_sql user_db "/migrations/user-profile/001_init.sql"

echo "[postgres-init] done"
