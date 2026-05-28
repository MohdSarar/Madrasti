#!/usr/bin/env bash
# Runs all service SQL migrations in order.
# All migration files use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so re-running is safe.
set -euo pipefail

export PGPASSWORD="${POSTGRES_PASSWORD}"
PSQL="psql -v ON_ERROR_STOP=1 -U ${POSTGRES_USER} -d ${POSTGRES_DB} -h postgres"

echo "[migrate] Ensuring pgcrypto extension..."
$PSQL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

for dir in $(find /migrations -mindepth 1 -maxdepth 1 -type d | sort); do
  svc=$(basename "$dir")
  files=$(find "$dir" -maxdepth 1 -name "*.sql" | sort)
  [ -z "$files" ] && continue
  echo "[migrate] Service: $svc"
  for f in $files; do
    echo "[migrate]   $(basename "$f")"
    $PSQL -f "$f"
  done
done

echo "[migrate] Done."
