#!/bin/sh
set -e

DB_HOST="${POSTGRESQL_HOST:-postgres}"
DB_PORT="${POSTGRESQL_PORT:-5432}"
DB_NAME="${POSTGRESQL_DATABASE:-madrasti}"
DB_USER="${POSTGRESQL_USERNAME:-madrasti}"
DB_PASS="${POSTGRESQL_PASSWORD:-madrasti}"
AUTH_TYPE="${PGBOUNCER_AUTH_TYPE:-trust}"
POOL_MODE="${PGBOUNCER_POOL_MODE:-transaction}"
MAX_CLIENT="${PGBOUNCER_MAX_CLIENT_CONN:-500}"
POOL_SIZE="${PGBOUNCER_DEFAULT_POOL_SIZE:-20}"
MIN_POOL="${PGBOUNCER_MIN_POOL_SIZE:-5}"

mkdir -p /etc/pgbouncer

cat > /etc/pgbouncer/pgbouncer.ini << EOF
[databases]
${DB_NAME} = host=${DB_HOST} port=${DB_PORT} dbname=${DB_NAME}

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 5432
auth_type = ${AUTH_TYPE}
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = ${POOL_MODE}
max_client_conn = ${MAX_CLIENT}
default_pool_size = ${POOL_SIZE}
min_pool_size = ${MIN_POOL}
ignore_startup_parameters = extra_float_digits
logfile = /dev/null
pidfile = /tmp/pgbouncer.pid
EOF

printf '"%s" "%s"\n' "${DB_USER}" "${DB_PASS}" > /etc/pgbouncer/userlist.txt

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
