#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

log() { printf '\033[1;34m[dev]\033[0m %s\n' "$1"; }
err() { printf '\033[1;31m[dev]\033[0m %s\n' "$1" >&2; }

if ! command -v docker >/dev/null 2>&1; then
  err "Docker is not installed or not on PATH. Install Docker Desktop to use cloud sync locally."
  exit 1
fi

if [ ! -f .env.local ]; then
  err ".env.local is missing. Copy .env.example to .env.local and set DATABASE_URL and EDGE_AUTH_SECRET."
  exit 1
fi

if ! grep -q '^DATABASE_URL=' .env.local 2>/dev/null; then
  err "DATABASE_URL is not set in .env.local. Copy .env.example and configure persistence vars."
  exit 1
fi

if ! grep -q '^EDGE_AUTH_SECRET=' .env.local 2>/dev/null; then
  err "EDGE_AUTH_SECRET is not set in .env.local. Cloud sync requires a signed dev session cookie."
  exit 1
fi

if grep -E '^EDGE_AUTH_SECRET=(replace-with-a-long-random-secret|)\s*$' .env.local >/dev/null 2>&1; then
  err "EDGE_AUTH_SECRET is still the placeholder value. Set a long random secret in .env.local."
  exit 1
fi

DEV_PORT=3003
dev_started=false

cleanup() {
  if [ "$dev_started" = true ]; then
    log "Dev server stopped. Postgres is still running — stop it with: npm run db:down"
  fi
}

clear_dev_port() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi

  local pids
  pids="$(lsof -iTCP:"${DEV_PORT}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -z "${pids}" ]; then
    return 0
  fi

  log "Clearing port ${DEV_PORT} (stopping pids: ${pids//$'\n'/ })..."
  while IFS= read -r pid; do
    [ -n "${pid}" ] || continue
    kill "${pid}" 2>/dev/null || true
  done <<< "${pids}"

  sleep 1

  pids="$(lsof -iTCP:"${DEV_PORT}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    while IFS= read -r pid; do
      [ -n "${pid}" ] || continue
      kill -9 "${pid}" 2>/dev/null || true
    done <<< "${pids}"
  fi

  if lsof -iTCP:"${DEV_PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    err "Port ${DEV_PORT} is still in use after cleanup. Stop the process manually and retry."
    exit 1
  fi
}

trap cleanup EXIT INT TERM

log "Starting Postgres (docker compose)..."
docker compose up -d postgres

log "Waiting for Postgres to accept connections..."
npx tsx scripts/wait-for-postgres.mts

log "Applying migrations..."
npm run db:migrate

log "Postgres ready. Starting dev server on http://localhost:${DEV_PORT} ..."
clear_dev_port
dev_started=true
exec npm run dev:lite
