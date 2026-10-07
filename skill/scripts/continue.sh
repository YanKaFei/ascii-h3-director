#!/usr/bin/env bash
# Plan a seamless sequel from the previous clip's exit state.
#
#   ./continue.sh exit-state.json "part two: more violent, more typographic"
#
# Produce exit-state.json from a plan:
#   node ../src/cli.js plan "<brief>" --json | jq '.chain[-1].exit'
#
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 2 ]; then
  echo "Usage: $0 <exit-state.json> \"<brief for the sequel>\"" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" continue "$@"
