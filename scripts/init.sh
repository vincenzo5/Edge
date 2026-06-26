#!/usr/bin/env bash
# init.sh — Initialize Edge (TV AI) for a fresh agent or developer session.
# Idempotent: safe to re-run. Preserves package-lock.json for reproducible installs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

FULL_CHECK=false
for arg in "$@"; do
  case "$arg" in
    --full) FULL_CHECK=true ;;
    -h|--help)
      echo "Usage: scripts/init.sh [--full]"
      echo "  Default: npm ci + startup readiness check"
      echo "  --full:  npm ci + full check (lint:instructions, all tests, build)"
      exit 0
      ;;
  esac
done

log() { printf '\n\033[1;34m[init]\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m[error]\033[0m %s\n' "$1" >&2; }

# ---------------------------------------------------------------------------
# 1. Verify Node version (>= 20 required by Next / yahoo-finance2 v3).
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
# 2. Clean build artifacts only (preserve lockfile).
# ---------------------------------------------------------------------------
log "Cleaning build artifacts (.next)..."
rm -rf .next
echo "  cleaned .next"

# ---------------------------------------------------------------------------
# 3. Install dependencies from lockfile when available.
# ---------------------------------------------------------------------------
log "Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# ---------------------------------------------------------------------------
# 4. Create .env.local placeholder if absent.
# ---------------------------------------------------------------------------
if [ ! -f .env.local ]; then
  log "Creating .env.local placeholder..."
  cat > .env.local <<'EOF'
# Yahoo Finance (yahoo-finance2) requires no API key.
# Copy vars from .env.example when using Postgres persistence.
EOF
  echo "  created .env.local"
else
  echo "  .env.local already exists, leaving as-is"
fi

# ---------------------------------------------------------------------------
# 5. Startup readiness verification.
# ---------------------------------------------------------------------------
if [ "$FULL_CHECK" = true ]; then
  log "Running full check..."
  npm run check
else
  log "Running startup readiness check..."
  npm run check:startup
fi

# ---------------------------------------------------------------------------
# 6. Done.
# ---------------------------------------------------------------------------
log "Initialization complete."
echo "  Run \`npm run dev\` and open http://localhost:3003"
echo "  See docs/PROJECT-STATUS.md for active work and next priorities"
