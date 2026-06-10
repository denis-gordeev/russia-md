#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "ERROR: dist/ directory not found at $DIST_DIR" >&2
  echo "Run 'npm run build' first." >&2
  exit 1
fi

exec python3 "$SCRIPT_DIR/verify_internal_links.py" "$DIST_DIR" "${SAMPLE_SIZE:-0}"
