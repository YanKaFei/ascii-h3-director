#!/usr/bin/env bash
# Direction plan: transformation chain, motion states, prompt and quality gate.
#
#   ./plan.sh "15s ASCII film about memory collapsing into language"
#   ./plan.sh "<brief>" --beats 6 --palette phosphor --seed myshoot
#
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<brief>\" [extra flags...]" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" plan "$@"
