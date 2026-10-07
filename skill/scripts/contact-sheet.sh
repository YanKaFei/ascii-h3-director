#!/usr/bin/env bash
# Write a contact sheet of evenly-spaced frames as PNG or SVG.
# No ffmpeg required — the engine composes the grid itself.
#
#   ./contact-sheet.sh "ASCII tunnel about memory" --frames 6 --out sheet.png
#
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<brief>\" [--frames N] --out sheet.png|.svg" >&2
  exit 2
fi
exec node "$("$HERE/_engine.sh")" strip "$@"
