#!/usr/bin/env bash
# Print one real ASCII frame to the terminal. Offline, deterministic, free.
#
#   ./preview.sh "ASCII tunnel about memory" --t 9 --cols 110 --rows 28
#
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<brief>\" [--t SEC] [--cols N] [--rows N]" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" preview "$@"
