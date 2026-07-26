#!/usr/bin/env bash
set -euo pipefail
exec npx tsx scripts/local-https.mts "$@"
