#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set -a; source "$ROOT_DIR/.env.local"; set +a
elif [[ -f "$ROOT_DIR/.env" ]]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

# Parse connection string: postgresql://user:pass@host:port/dbname
# Strip scheme
rest="${DATABASE_URL#postgresql://}"
rest="${rest#postgres://}"

userpass="${rest%%@*}"
hostport_db="${rest#*@}"

DB_USER="${userpass%%:*}"
DB_PASS="${userpass#*:}"
hostport="${hostport_db%%/*}"
DB_NAME="${hostport_db#*/}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport#*:}"
DB_PORT="${DB_PORT:-5432}"

echo "Dropping and recreating database: $DB_NAME on $DB_HOST:$DB_PORT"

PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  --dbname="postgres" \
  --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  --command="DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  --command="CREATE DATABASE \"$DB_NAME\";"

echo "Running migrations..."
cd "$ROOT_DIR"
bun run db:migrate

echo "Done."
