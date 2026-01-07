#!/usr/bin/env bash
set -euo pipefail

echo "[init] Applying service migrations from /migrations/* ..."
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

# Ensure core extensions exist early
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL

apply_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    echo "[init] skip missing dir: $dir"
    return
  fi
  echo "[init] -> $dir"
  find "$dir" -maxdepth 1 -type f -name "*.sql" | sort | while read -r f; do
    echo "[init]    psql < $(basename "$f")"
    psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" -f "$f"
  done
}

for dir in /migrations/*; do
  [ -d "$dir" ] || continue
  apply_dir "$dir"
done

echo "[init] Done."
