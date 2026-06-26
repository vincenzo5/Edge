#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${ROOT}/.tools/tws-sidecar-venv"

python3 -m venv "$VENV"
"${VENV}/bin/pip" install --upgrade pip
"${VENV}/bin/pip" install -r "${ROOT}/services/tws-sidecar/requirements.txt"

echo "TWS sidecar venv ready at ${VENV}"
echo "Start with: npm run tws:sidecar"
