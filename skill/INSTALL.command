#!/usr/bin/env bash
#
# ASCII H3 Director — installer for the generic Agent Skill form.
#
# Installs this skill into ~/.agents/skills/ascii-h3-director so any agent
# harness that reads SKILL.md files can find it, then verifies the engine.
#
# This does NOT install any API key and does NOT require one. The direction
# engine, the quality gate and the preview renderer are entirely offline.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}/ascii-h3-director"

echo "╭──────────────────────────────────────────────╮"
echo "│  ASCII H3 Director — skill installer         │"
echo "╰──────────────────────────────────────────────╯"
echo

# ── prerequisites ────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js 18+ is required. Install it from https://nodejs.org" >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js 18+ is required (found $(node -v))." >&2
  exit 1
fi
echo "[ok] node $(node -v)"

# ── install ──────────────────────────────────────────────────────────────
PARENT="$(dirname "$TARGET")"
mkdir -p "$PARENT"

if [ -e "$TARGET" ]; then
  BACKUP="$TARGET.backup.$(date +%Y%m%d%H%M%S)"
  echo "[..] existing install found; moving it to $BACKUP"
  mv "$TARGET" "$BACKUP"
fi

# Copy the skill, the engine it drives, the CLI shim and the manifest.
mkdir -p "$TARGET"
cp -R "$ROOT/skill/." "$TARGET/"
mkdir -p "$TARGET/engine" "$TARGET/bin"
cp -R "$ROOT/src/." "$TARGET/engine/"
cp -R "$ROOT/bin/." "$TARGET/bin/"
[ -f "$ROOT/package.json" ] && cp "$ROOT/package.json" "$TARGET/"
[ -f "$ROOT/LICENSE" ] && cp "$ROOT/LICENSE" "$TARGET/"

# The skill's scripts invoke ../engine/cli.js; make the shim executable.
chmod +x "$TARGET/bin/ascii-h3" 2>/dev/null || true
echo "[ok] installed skill to $TARGET"

# ── verify ───────────────────────────────────────────────────────────────
echo
echo "Verifying the engine…"
if node "$TARGET/engine/cli.js" doctor; then
  echo
  echo "[ok] engine verified"
else
  echo "WARNING: the engine self-check reported a problem (see above)." >&2
fi

# ── optional external stages ─────────────────────────────────────────────
echo
if command -v mmx >/dev/null 2>&1; then
  echo "[ok] mmx-cli found — paid generation is available"
else
  echo "[--] mmx-cli not found. This is optional: it is only needed for the"
  echo "     final paid generation step. Install it with:"
  echo "       npm install -g mmx-cli"
fi
if command -v ffmpeg >/dev/null 2>&1; then
  echo "[ok] ffmpeg found — MP4 encoding and contact sheets are available"
else
  echo "[--] ffmpeg not found. Previews and contact sheets still work; only"
  echo "     MP4 encoding from generated frames needs it."
fi

cat <<TXT

Done.

  Skill location : $TARGET
  Engine         : node $TARGET/engine/cli.js
  Try it         : node $TARGET/engine/cli.js preview "ASCII tunnel about memory" --cols 100 --rows 24
  Direction plan : node $TARGET/engine/cli.js plan "15s ASCII film about X"

The engine is offline and deterministic. Nothing above made a network call.
TXT
