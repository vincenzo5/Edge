#!/usr/bin/env bash
# Start live + paper IB Gateways and the Compose TWS sidecar (primary broker stack).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${ROOT}/services/ib-gateway/docker-compose.yml"
COMPOSE_PROJECT="services/ib-gateway"
PORT="${TWS_SIDECAR_PORT:-8765}"

if command -v lsof >/dev/null 2>&1; then
  LISTENER_PIDS="$(lsof -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${LISTENER_PIDS}" ]]; then
    DOCKER_PIDS=""
    while IFS= read -r pid; do
      [[ -z "${pid}" ]] && continue
      if ps -p "${pid}" -o comm= 2>/dev/null | grep -q '[d]ocker'; then
        DOCKER_PIDS="${DOCKER_PIDS} ${pid}"
      fi
    done <<< "${LISTENER_PIDS}"

    if [[ -z "${DOCKER_PIDS// /}" ]]; then
      echo "Port ${PORT} is in use by a non-Docker process (likely host npm run tws:sidecar)." >&2
      echo "Stop the host sidecar before starting the Compose stack." >&2
      exit 1
    fi
  fi
fi

exec docker compose --project-directory "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE}" up -d --build
