#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
if [[ -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
  PY="$SCRIPT_DIR/.venv/bin/python"
  echo "Using venv: $PY"
else
  PY="python3"
fi
if [[ "$PY" == "python3" ]] && ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 (e.g. brew install python)." >&2
  exit 1
fi
exec "$PY" -m pip install -r "$SCRIPT_DIR/requirements.txt"
