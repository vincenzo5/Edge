#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${ROOT}/.tools/tws-sidecar-venv"
TOOLS="${ROOT}/.tools"
PID_FILE="${TOOLS}/tws-sidecar.pid"
LOCK_FILE="${TOOLS}/tws-sidecar.lock"
LOCK_DIR="${TOOLS}/tws-sidecar.lock.d"
PORT="${TWS_SIDECAR_PORT:-8765}"

if [[ ! -x "${VENV}/bin/python" ]]; then
  echo "Sidecar venv missing. Run: npm run tws:sidecar-setup" >&2
  exit 1
fi

mkdir -p "${TOOLS}"

# Clear stale macOS mkdir lock when no listener holds the port.
if [[ -d "${LOCK_DIR}" ]] && command -v lsof >/dev/null 2>&1; then
  if ! lsof -iTCP:"${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    rmdir "${LOCK_DIR}" 2>/dev/null || true
  fi
fi

if [[ -f "${PID_FILE}" ]]; then
  OLD_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" 2>/dev/null; then
    echo "TWS sidecar already running (pid ${OLD_PID}). Stop it before starting another." >&2
    exit 1
  fi
  rm -f "${PID_FILE}"
fi

if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:"${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port ${PORT} is already in use. Stop the process on that port or set TWS_SIDECAR_PORT." >&2
    exit 1
  fi
fi

release_lock() {
  if command -v flock >/dev/null 2>&1; then
    rm -f "${LOCK_FILE}"
  else
    rmdir "${LOCK_DIR}" 2>/dev/null || true
  fi
}

if command -v flock >/dev/null 2>&1; then
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    echo "Another sidecar start is in progress (lock ${LOCK_FILE})." >&2
    exit 1
  fi
else
  if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
    echo "Another sidecar start is in progress (lock ${LOCK_DIR})." >&2
    exit 1
  fi
fi

cleanup() {
  rm -f "${PID_FILE}"
  release_lock
}
trap cleanup EXIT INT TERM

export TWS_HOST="${TWS_HOST:-127.0.0.1}"
export TWS_PORT="${TWS_PORT:-4002}"
export TWS_CLIENT_ID="${TWS_CLIENT_ID:-77}"
export TWS_READONLY="${TWS_READONLY:-true}"
export TWS_SIDECAR_PORT="${PORT}"
export TWS_MANAGED_BY="${TWS_MANAGED_BY:-standalone}"
export EDGE_INSTANCE_ID="${EDGE_INSTANCE_ID:-}"
export TWS_SIDECAR_SECRET="${TWS_SIDECAR_SECRET:-}"

echo "Starting TWS sidecar: IB Gateway ${TWS_HOST}:${TWS_PORT} (paper default 4002, live 4001), clientId=${TWS_CLIENT_ID}, sidecarPort=${TWS_SIDECAR_PORT}, managedBy=${TWS_MANAGED_BY}" >&2

echo $$ > "${PID_FILE}"
exec "${VENV}/bin/python" "${ROOT}/services/tws-sidecar/main.py"
