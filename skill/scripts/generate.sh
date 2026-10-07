#!/usr/bin/env bash
# The ONLY stage that costs money: send a gated prompt to MiniMax H3.
#
#   ./generate.sh prompt.txt out.mp4 15 21:9
#
# This script refuses to run unless the prompt is present and the provider CLI
# is installed. It does not silently install anything or read an API key from
# an unexpected place. Verify the CLI flags with:
#   mmx video generate --help
#
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <prompt.txt> <output.mp4> [duration=15] [ratio=21:9]" >&2
  exit 2
fi

PROMPT_FILE="$1"
OUT="$2"
DURATION="${3:-15}"
RATIO="${4:-21:9}"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "ascii-h3: prompt file not found: $PROMPT_FILE" >&2
  exit 2
fi
if ! command -v mmx >/dev/null 2>&1; then
  cat >&2 <<'MSG'
ascii-h3: the MiniMax CLI is not installed.

  npm install -g mmx-cli
  mmx auth login --api-key <your-key>

Generation is optional. Everything up to this point — planning, the quality
gate, previews and contact sheets — works without it.
MSG
  exit 127
fi

mkdir -p "$(dirname "$OUT")"
PROMPT="$(cat "$PROMPT_FILE")"

echo "model    : MiniMax-H3"
echo "duration : ${DURATION}s"
echo "ratio    : ${RATIO}"
echo "output   : ${OUT}"
echo

mmx video generate \
  --model MiniMax-H3 \
  --prompt "$PROMPT" \
  --duration "$DURATION" \
  --ratio "$RATIO" \
  --download "$OUT"

echo
echo "wrote $OUT"
echo "Next: review the first and last 12 frames, then read the exit state and"
echo "plan the continuation with ./continue.sh"
