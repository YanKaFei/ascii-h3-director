#!/usr/bin/env bash
# Resolve the engine whether this skill is installed flat (~/.agents/skills/...)
# or run from the repository checkout. Prints the path to cli.js.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for cand in \
  "$HERE/../engine/cli.js" \
  "$HERE/../../src/cli.js" \
  "$HERE/../../../src/cli.js"; do
  if [ -f "$cand" ]; then
    printf '%s\n' "$(cd "$(dirname "$cand")" && pwd)/$(basename "$cand")"
    exit 0
  fi
done
echo "ascii-h3: engine not found. Re-run skill/INSTALL.command." >&2
exit 127
