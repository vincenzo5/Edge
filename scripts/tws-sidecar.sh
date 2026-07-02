#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${ROOT}/.tools/tws-sidecar-venv"

if [[ ! -x "${VENV}/bin/python" ]]; then
  echo "Sidecar venv missing. Run: npm run tws:sidecar-setup" >&2
  exit 1
fi

export TWS_HOST="${TWS_HOST:-127.0.0.1}"
export TWS_PORT="${TWS_PORT:-4002}"
export TWS_CLIENT_ID="${TWS_CLIENT_ID:-77}"
export TWS_READONLY="${TWS_READONLY:-true}"
export TWS_SIDECAR_PORT="${TWS_SIDECAR_PORT:-8765}"

echo "Starting TWS sidecar: IB Gateway ${TWS_HOST}:${TWS_PORT} (paper default 4002, live 4001), clientId=${TWS_CLIENT_ID}, sidecarPort=${TWS_SIDECAR_PORT}" >&2

exec "${VENV}/bin/python" "${ROOT}/services/tws-sidecar/main.py"
