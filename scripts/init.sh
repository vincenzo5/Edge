#!/usr/bin/env bash
# init.sh — Initialize the TV AI stock chart prototype.
# Idempotent: safe to re-run. Verifies Node, cleans installs, smoke-tests the build.
set -euo pipefail

# Resolve the project root (directory containing this script's parent).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

log() { printf '\n\033[1;34m[init]\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m[error]\033[0m %s\n' "$1" >&2; }

# ---------------------------------------------------------------------------
# 1. Verify Node version (>= 20 required by Next 15 / yahoo-finance2 v3).
# ---------------------------------------------------------------------------
log "Checking Node version..."
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed. Install Node >= 20 from https://nodejs.org"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node >= 20 is required (found v$(node -v)). Please upgrade."
  exit 1
fi
echo "  Node v$(node -v) OK"

if ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed. It ships with Node — reinstall Node >= 20."
  exit 1
fi
echo "  npm v$(npm -v) OK"

# ---------------------------------------------------------------------------
# 2. Clean install for reproducibility.
# ---------------------------------------------------------------------------
log "Cleaning previous install (node_modules, lockfile, .next)..."
rm -rf node_modules package-lock.json .next
echo "  cleaned"

# ---------------------------------------------------------------------------
# 3. Install dependencies.
# ---------------------------------------------------------------------------
log "Installing dependencies (this may take a minute)..."
npm install --no-audit --no-fund

# ---------------------------------------------------------------------------
# 4. Create .env.local placeholder if absent (no API key needed for Yahoo,
#    but reserved for future config). .gitignore already excludes .env.local.
# ---------------------------------------------------------------------------
if [ ! -f .env.local ]; then
  log "Creating .env.local placeholder..."
  cat > .env.local <<'EOF'
# Yahoo Finance (yahoo-finance2) requires no API key.
# Add any future secrets here. This file is gitignored.
EOF
  echo "  created .env.local"
else
  echo "  .env.local already exists, leaving as-is"
fi

# ---------------------------------------------------------------------------
# 5. Smoke test: confirm the production build compiles.
# ---------------------------------------------------------------------------
log "Running production build smoke test..."
if npm run build; then
  log "Build succeeded."
else
  err "Build failed. See output above."
  exit 1
fi

# ---------------------------------------------------------------------------
# 6. Done.
# ---------------------------------------------------------------------------
log "Initialization complete."
echo "  Run \`npm run dev\` and open http://localhost:3003"
