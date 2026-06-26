#!/usr/bin/env bash
# Start IBKR Client Portal Gateway (HTTP API) on port 5001.
# This is NOT IB Gateway/TWS — our read-only provider uses Client Portal Web API only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.tools/ibkr" && pwd)"
CONF="$ROOT/root/conf.yaml"
LOG="$ROOT/gateway.log"
PID_FILE="$ROOT/gateway.pid"

IB_GATEWAY_JRE="${IB_GATEWAY_JRE:-/Users/vincentn/Applications/IB Gateway 10.40/.install4j/jre.bundle/Contents/Home}"
if [[ -x "$IB_GATEWAY_JRE/bin/java" ]]; then
  export JAVA_HOME="$IB_GATEWAY_JRE"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Java not found. Install a JRE or set JAVA_HOME (IB Gateway bundles one)." >&2
  exit 1
fi

if [[ ! -f "$CONF" ]]; then
  echo "Gateway not installed. Run: npm run ibkr:setup" >&2
  exit 1
fi

if lsof -i :5001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 5001 already listening — Gateway may already be running."
  echo "Login UI: https://localhost:5001"
  exit 0
fi

cd "$ROOT"
nohup bin/run.sh root/conf.yaml >>"$LOG" 2>&1 &
echo $! >"$PID_FILE"
sleep 6

if lsof -i :5001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Client Portal Gateway started on https://localhost:5001"
  echo "Log: $LOG"
  echo "Login in browser, then run: npm run ibkr:probe"
else
  echo "Gateway failed to start. Check $LOG" >&2
  tail -20 "$LOG" >&2 || true
  exit 1
fi
