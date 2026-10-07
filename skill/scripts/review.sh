#!/usr/bin/env bash
# Run the quality gate. Pass a brief, or a file containing an existing prompt.
#
#   ./review.sh "15s ASCII film about X"
#   ./review.sh --brief "15s ASCII film about X" --out existing-prompt.txt
#
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<brief>\" | --brief \"<brief>\" --out prompt.txt" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" review "$@"
