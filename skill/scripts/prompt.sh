#!/usr/bin/env bash
# Emit only the compact H3 prompt, and optionally write it to a file.
#
#   ./prompt.sh "12s ASCII tunnel about memory" --out prompt.txt
#
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<brief>\" [--out FILE] [extra flags...]" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" prompt "$@"
