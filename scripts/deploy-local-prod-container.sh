#!/usr/bin/env bash
set -euo pipefail
exec npx tsx scripts/deploy-local-prod-container.mts "$@"
