#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if [[ "${1:-}" == "--stop" ]]; then
  exec docker --context default compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    stop mediamtx
fi

if [[ "${1:-}" == "--log" ]]; then
  exec docker --context default compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    logs -f mediamtx
fi

if [[ "${1:-}" == "--restart" ]]; then
  docker --context default compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    stop mediamtx

  docker --context default compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    up -d mediamtx

  exec docker --context default compose logs -f mediamtx
fi

docker --context default compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up -d mediamtx

exec docker --context default compose logs -f mediamtx
