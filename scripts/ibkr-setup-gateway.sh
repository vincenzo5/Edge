#!/usr/bin/env bash
# Download official IBKR Client Portal Gateway and configure port 5001 (avoids macOS AirPlay on 5000).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.tools/ibkr" && pwd)"
ZIP_URL="https://download2.interactivebrokers.com/portal/clientportal.gw.zip"

mkdir -p "$ROOT"
cd "$ROOT"

if [[ ! -f bin/run.sh ]]; then
  echo "Downloading Client Portal Gateway..."
  curl -fsSL "$ZIP_URL" -o clientportal.gw.zip
  unzip -q -o clientportal.gw.zip
  echo "Extracted to $ROOT"
fi

if grep -q 'listenPort: 5000' root/conf.yaml; then
  sed -i '' 's/listenPort: 5000/listenPort: 5001/' root/conf.yaml
  echo "Set listenPort to 5001 in root/conf.yaml"
fi

echo "Setup complete. Start with: npm run ibkr:gateway"
