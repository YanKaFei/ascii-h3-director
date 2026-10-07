#!/usr/bin/env bash
# Extract STYLE DNA and a transformation chain from reference observations.
#
#   ./reference.sh observations.json
#
# See references/REFERENCE_ANALYSIS.md for the observation file's shape.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 1 ]; then
  echo "Usage: $0 <observations.json>" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" reference "$@"
