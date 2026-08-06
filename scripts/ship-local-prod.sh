#!/usr/bin/env bash
set -euo pipefail
exec npx tsx scripts/ship-local-prod.mts "$@"
