#!/usr/bin/env bash
# Verify the direction engine, the grammar and the preview renderer.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$("$HERE/_engine.sh")" doctor "$@"
