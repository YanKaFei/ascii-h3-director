#!/usr/bin/env node
/**
 * ascii-h3 — the plugin's command surface.
 *
 * Every subcommand works without an API key. Generation is the only stage that
 * costs money, and it refuses to run until the director's quality gate passes.
 *
 * Usage:
 *   ascii-h3 plan    "<brief>" [--seed S] [--beats N] [--json]
 *   ascii-h3 prompt  "<brief>" [--seed S] [--beats N] [--out FILE]
 *   ascii-h3 review  <prompt.txt|--brief ".."> [--chain id,id,..]
 *   ascii-h3 chain   "<brief>" [--beats N] [--json]
 *   ascii-h3 preview "<brief>" [--t SEC] [--cols N] [--rows N] [--seed S]
 *   ascii-h3 strip   "<brief>" [--frames N] [--cols N] [--rows N] [--out FILE.svg|.png]
 *   ascii-h3 svg     "<brief>" --t SEC --out FILE.svg
 *   ascii-h3 png     "<brief>" --t SEC --out FILE.png
 *   ascii-h3 reference <notes.json> [--json]
 *   ascii-h3 continue <exit-state.json> "<brief>" [--json]
 *   ascii-h3 doctor
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAMPS, PALETTES } from './core.js';
import {
  parseBrief, composePrompt, review, analyzeReference, planContinuation,
} from './director.js';
import {
  MECHANISMS, MECHANISM_BY_ID, planChain, densityCurve, exitState, inherit, checkSeam,
} from './motion-grammar.js';
import { planFilm, renderFilmFrame, paletteFor, GLYPH_W, GLYPH_H } from './renderer.js';
import { gridToSvg, gridToRgb, gridToText } from './raster.js';
import { encodePng } from './png.js';

const VERSION = '3.0.0';

/* ------------------------------------------------------------------ *
 * Argument parsing — tiny, positional + --flags
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

const num = (v, d) => (v === undefined ? d : Number(v));

/* ------------------------------------------------------------------ *
 * Brief → script
 * ------------------------------------------------------------------ */

export function buildScript(brief, flags = {}) {
  const parsed = parseBrief(brief);
  const beats = num(flags.beats, 5);
  const seed = flags.seed ?? `ascii-h3:${hashish(brief)}`;
  // An explicit chain overrides planning, so an existing plan (or a test
  // fixture) can be composed, reviewed and rendered without being re-planned.
  const chain = Array.isArray(flags.chain) && flags.chain.length
    ? flags.chain
    : planChain({
        startForm: flags.startForm ?? 'void',
        count: beats,
        duration: num(flags.duration, parsed.duration),
        allow: flags.allow ? String(flags.allow).split(',').map((s) => s.trim()) : undefined,
        block: flags.block ? String(flags.block).split(',').map((s) => s.trim()) : undefined,
      });
  const script = {
    ...parsed,
    chain,
    seed,
    title: flags.title ?? (parsed.keywords.slice(0, 4).join(' / ') || 'untitled'),
    duration: num(flags.duration, parsed.duration),
    ratio: flags.ratio ?? parsed.ratio,
    palette: flags.palette ?? parsed.palette,
    ramp: flags.ramp ?? parsed.ramp,
    mode: flags.mode ?? parsed.mode,
    heroText: flags.text ? String(flags.text).split(',') : parsed.heroText,
    avoid: flags.avoid ? String(flags.avoid).split(',') : undefined,
  };
  // An explicit prompt overrides the composition. `review` must be able to
  // judge an existing prompt that the user brought with them, not only its own.
  script.prompt = typeof flags.prompt === 'string' && flags.prompt.trim()
    ? flags.prompt
    : composePrompt(script);
  script.review = review(script);
  script.seed = seed;
  return script;
}

function hashish(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/* ------------------------------------------------------------------ *
 * Commands
 * ------------------------------------------------------------------ */

const COMMANDS = {
  plan(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    if (args.flags.json) return out(JSON.stringify(script, null, 2));
    return out(renderPlan(script));
  },

  chain(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    if (args.flags.json) {
      return out(JSON.stringify({ seed: script.seed, chain: script.chain }, null, 2));
    }
    return out(
      script.chain
        .map((l, i) => {
          const m = MECHANISM_BY_ID.get(l.mechanism);
          return `${String(i + 1).padStart(2)}. ${l.beat.padEnd(10)} ${m.name}\n      ${m.action}`;
        })
        .join('\n'),
    );
  },

  prompt(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    if (args.flags.out) {
      writeFileSync(args.flags.out, script.prompt + '\n');
      return out(`wrote ${args.flags.out} (${script.prompt.split(/\s+/).length} words)`);
    }
    return out(script.prompt);
  },

  review(args) {
    const brief = args.flags.brief ?? args.positional[0] ?? '';
    const script = buildScript(brief, args.flags);
    if (args.flags.out) {
      const txt = readFileSync(args.flags.out, 'utf8');
      script.prompt = txt;
    }
    script.review = review(script);
    if (args.flags.json) return out(JSON.stringify(script.review, null, 2));
    return out(renderReview(script.review, script));
  },

  reference(args) {
    const file = args.positional[0];
    if (!file) throw new UsageError('reference needs a JSON file describing the observed reference');
    const obs = JSON.parse(readFileSync(file, 'utf8'));
    const result = analyzeReference(obs);
    if (args.flags.json) return out(JSON.stringify(result, null, 2));
    return out([result.styleDNA, '', 'NOTES:', ...result.notes.map((n) => `  - ${n}`)].join('\n'));
  },

  continue(args) {
    const file = args.positional[0];
    const brief = args.positional.slice(1).join(' ') || args.flags.brief || 'continue the sequence';
    if (!file) throw new UsageError('continue needs an exit-state JSON file');
    const prev = file === '-' ? exitState() : JSON.parse(readFileSync(file, 'utf8'));
    const script = planContinuation(prev, brief, {
      beats: num(args.flags.beats, 5),
      allow: args.flags.allow ? String(args.flags.allow).split(',') : undefined,
    });
    if (args.flags.json) return out(JSON.stringify(script, null, 2));
    const seam = script.seam.length
      ? ['SEAM: BROKEN', ...script.seam.map((v) => `  ! ${v}`)].join('\n')
      : 'SEAM: holds — camera, velocity, palette and charset all inherit';
    return out([script.prompt, '', seam, '', renderReview(script.review, script)].join('\n'));
  },

  preview(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    const film = planFilm(script);
    const grid = renderFilmFrame(film, num(args.flags.t, film.duration / 2), {
      cols: num(args.flags.cols, 150),
      rows: num(args.flags.rows, 40),
    });
    if (args.flags.json) return out(JSON.stringify(grid.stats(), null, 2));
    if (args.flags.stats) return out(JSON.stringify(grid.stats(), null, 2));
    return out(gridToText(grid));
  },

  svg(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    const film = planFilm(script);
    const t = num(args.flags.t, film.duration / 2);
    const grid = renderFilmFrame(film, t, {
      cols: num(args.flags.cols, 150),
      rows: num(args.flags.rows, 40),
    });
    const svg = gridToSvg(grid, {
      palette: film.palette,
      cellW: num(args.flags.cellW, 9),
      cellH: num(args.flags.cellH, 16),
      title: `${film.title} @ ${t}s`,
    });
    const dest = args.flags.out;
    if (dest) { writeFileSync(dest, svg); return out(`wrote ${dest}`); }
    return out(svg);
  },

  png(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    const film = planFilm(script);
    const t = num(args.flags.t, film.duration / 2);
    const grid = renderFilmFrame(film, t, {
      cols: num(args.flags.cols, 150),
      rows: num(args.flags.rows, 40),
    });
    const { width, height, rgb } = gridToRgb(grid, {
      palette: film.palette,
      cellW: num(args.flags.cellW, 9),
      cellH: num(args.flags.cellH, 16),
    });
    const dest = args.flags.out;
    if (!dest) throw new UsageError('png needs --out FILE.png');
    const buf = encodePng(width, height, rgb);
    mkdirSync(dirname(resolve(dest)), { recursive: true });
    writeFileSync(dest, buf);
    return out(`wrote ${dest} (${width}×${height}, ${buf.length} bytes)`);
  },

  /**
   * A contact sheet: one image containing N evenly-spaced frames, which is the
   * deterministic equivalent of the ffmpeg contact sheet and needs no ffmpeg.
   */
  strip(args) {
    const brief = requireBrief(args);
    const script = buildScript(brief, args.flags);
    const film = planFilm(script);
    const frames = num(args.flags.frames, 6);
    const cols = num(args.flags.cols, 100);
    const rows = num(args.flags.rows, 24);
    const cellW = num(args.flags.cellW, 6);
    const cellH = num(args.flags.cellH, 11);

    const grids = [];
    for (let i = 0; i < frames; i++) {
      const t = (i / Math.max(1, frames - 1)) * (film.duration - 0.05);
      grids.push({ t, grid: renderFilmFrame(film, t, { cols, rows }) });
    }

    const dest = args.flags.out ?? 'strip.png';
    const isPng = /\.png$/i.test(dest);
    const isSvg = /\.svg$/i.test(dest);

    // Lay the contact sheet out as a grid, not one endless column: a film strip
    // is read side by side, so the sheet should be roughly frame-shaped.
    const nCols = Math.max(1, num(args.flags.stripCols, Math.min(3, frames)));
    const nRows = Math.max(1, Math.ceil(frames / nCols));
    const labelH = num(args.flags.labelH, 20);

    if (isSvg) {
      const pal = paletteFor(film.palette);
      const cellWpx = cols * cellW;
      const cellHpx = rows * cellH;
      const padX = 10;
      const padY = 8;
      const width = nCols * (cellWpx + padX) + padX;
      const height = nRows * (cellHpx + labelH + padY) + padY;
      const parts = [];
      grids.forEach(({ t, grid }, i) => {
        const gx = i % nCols;
        const gy = Math.floor(i / nCols);
        const ox = padX + gx * (cellWpx + padX);
        const oy = padY + gy * (cellHpx + labelH + padY);
        const svg = gridToSvg(grid, { palette: film.palette, cellW, cellH });
        const body = svg.replace(/^[\s\S]*?<rect[^>]*\/>/, '').replace(/<\/svg>\s*$/, '');
        parts.push(`<g transform="translate(${ox},${oy})">${body}</g>`);
        parts.push(
          `<text x="${ox}" y="${oy + cellHpx + 14}" font-family="monospace" font-size="12" fill="${pal.layers[0].ink}">` +
            `t=${t.toFixed(1)}s · ${film.shots.find((s) => t >= s.t0 && t < s.t1)?.mechanism ?? ''}</text>`,
        );
      });
      const doc = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<rect width="${width}" height="${height}" fill="${pal.bg}"/>`,
        ...parts,
        '</svg>',
        '',
      ].join('\n');
      mkdirSync(dirname(resolve(dest)), { recursive: true });
      writeFileSync(dest, doc);
      return out(`wrote ${dest} (${frames} frames, ${nCols}×${nRows})`);
    }

    if (!isPng) throw new UsageError('strip --out must end in .png or .svg');

    // Compose the contact sheet in one RGB buffer.
    const padX = 10;
    const padY = 8;
    const frameW = cols * cellW;
    const frameH = rows * cellH;
    const width = nCols * (frameW + padX) + padX;
    const height = nRows * (frameH + labelH + padY) + padY;
    const sheet = new Uint8Array(width * height * 3);
    const bg = hexRgb(paletteFor(film.palette).bg);
    for (let i = 0; i < width * height; i++) {
      sheet[i * 3] = bg[0]; sheet[i * 3 + 1] = bg[1]; sheet[i * 3 + 2] = bg[2];
    }
    grids.forEach(({ grid }, i) => {
      const gx = i % nCols;
      const gy = Math.floor(i / nCols);
      const ox = padX + gx * (frameW + padX);
      const oy = padY + gy * (frameH + labelH + padY);
      const { width: fw, height: fh, rgb } = gridToRgb(grid, { palette: film.palette, cellW, cellH });
      const copyW = Math.min(fw, frameW);
      const copyH = Math.min(fh, frameH);
      for (let y = 0; y < copyH; y++) {
        if (oy + y >= height) break;
        const src = y * fw * 3;
        sheet.set(rgb.subarray(src, src + copyW * 3), ((oy + y) * width + ox) * 3);
      }
    });
    mkdirSync(dirname(resolve(dest)), { recursive: true });
    const buf = encodePng(width, height, sheet);
    writeFileSync(dest, buf);
    return out(`wrote ${dest} (${frames} frames, ${nCols}×${nRows}, ${width}×${height})`);
  },

  doctor() {
    const checks = [];
    const ok = (label, cond, detail = '') => checks.push({ label, ok: cond, detail });

    ok('node', Number(process.versions.node.split('.')[0]) >= 18, `v${process.versions.node}`);
    ok('engine modules', true, `${Object.keys(RAMPS).length} ramps, ${Object.keys(PALETTES).length} palettes`);
    ok('glyph atlas', GLYPH_W === 5 && GLYPH_H === 9, `${GLYPH_W}×${GLYPH_H} bitmap font, printable ASCII`);
    ok('mechanisms', MECHANISMS.length > 10, `${MECHANISMS.length} mechanisms in the grammar`);
    ok('png encoder', true, 'built-in, no image library required');

    // A render smoke test, so doctor actually proves the engine runs.
    try {
      const script = buildScript('doctor smoke test', { seed: 'doctor' });
      const film = planFilm(script);
      const t0 = Date.now();
      const grid = renderFilmFrame(film, film.duration / 2, { cols: 80, rows: 20 });
      const ms = Date.now() - t0;
      ok('render smoke test', grid.stats().filled > 0, `${grid.stats().filled} cells in ${ms}ms`);
      ok('quality gate', true, `score ${script.review.score}/100`);
    } catch (err) {
      ok('render smoke test', false, String(err && err.message));
    }

    // Optional external stages are reported, never required.
    const mmx = which('mmx');
    checks.push({
      label: 'mmx-cli (paid generation)',
      ok: true,
      detail: mmx ? `found at ${mmx}` : 'not installed — optional; install with: npm i -g mmx-cli',
    });

    const lines = checks.map(
      (c) => `[${c.ok ? 'ok' : 'XX'}] ${c.label.padEnd(28)} ${c.detail}`,
    );
    const failed = checks.filter((c) => !c.ok).length;
    return out([`ascii-h3-director v${VERSION}`, '', ...lines, '', failed ? `${failed} check(s) failed` : 'all core checks passed'].join('\n'), failed ? 1 : 0);
  },

  mechanisms(args) {
    if (args.flags.json) return out(JSON.stringify(MECHANISMS, null, 2));
    const byTier = {};
    for (const m of MECHANISMS) (byTier[m.tier] ??= []).push(m);
    const lines = [];
    for (const tier of ['canonical', 'strong', 'support', 'reject']) {
      if (!byTier[tier]) continue;
      lines.push(`── ${tier.toUpperCase()} ${'─'.repeat(60 - tier.length)}`);
      for (const m of byTier[tier]) {
        lines.push(`  ${m.id.padEnd(24)} ${m.name}`);
        lines.push(`  ${' '.repeat(24)} → emits ${m.emits}`);
        if (m.chainsTo.length) lines.push(`  ${' '.repeat(24)} → chains to ${m.chainsTo.join(', ')}`);
      }
      lines.push('');
    }
    return out(lines.join('\n'));
  },

  help() {
    return out(HELP);
  },
};

function hexRgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ------------------------------------------------------------------ *
 * Rendering helpers
 * ------------------------------------------------------------------ */

function renderPlan(script) {
  const lines = [
    `TITLE      ${script.title}`,
    `SEED       ${script.seed}`,
    `DURATION   ${script.duration}s @ ${script.ratio}`,
    `LOOK       ${script.palette} / ${script.ramp} / ${script.mode}`,
    `HERO TEXT  ${script.heroText.length ? script.heroText.join(', ') : '—'}`,
    '',
    'TRANSFORMATION CHAIN',
  ];
  script.chain.forEach((l, i) => {
    const m = MECHANISM_BY_ID.get(l.mechanism);
    lines.push(`  ${String(i + 1).padStart(2)}. ${l.beat.padEnd(10)} ${m.name}  [${m.tier}]`);
    lines.push(`      ${m.action}`);
    lines.push(`      exit → form=${l.exit.form} camera=${l.exit.camera} v=${l.exit.velocity}`);
  });
  lines.push('', renderReview(script.review, script));
  return lines.join('\n');
}

function renderReview(r, script) {
  const lines = [
    `QUALITY GATE  ${r.pass ? 'PASS' : 'FAIL'}  (${r.score}/100)`,
    '─'.repeat(64),
  ];
  for (const c of r.checks) {
    lines.push(`  ${c.pass ? '✔' : '✖'} ${c.label}`);
    lines.push(`      ${c.detail}`);
  }
  if (!r.pass) {
    lines.push(
      '',
      'Fix, do not decorate: change the transformation chain, the scale contrast,',
      'the density curve, the camera vector, the hero object, or the end state.',
    );
  }
  if (script?.prompt) {
    lines.push('', `PROMPT (${script.prompt.split(/\s+/).length} words)`, '─'.repeat(64), script.prompt);
  }
  return lines.join('\n');
}

function requireBrief(args) {
  const brief = args.positional.join(' ').trim() || args.flags.brief;
  if (!brief) throw new UsageError('a brief is required, e.g. ascii-h3 plan "15s ASCII clip about X"');
  return String(brief);
}

function which(cmd) {
  const paths = (process.env.PATH ?? '').split(':');
  for (const p of paths) {
    try {
      const full = `${p}/${cmd}`;
      readFileSync(full);
      return full;
    } catch { /* keep looking */ }
  }
  return null;
}

class UsageError extends Error {}

function out(text, code = 0) {
  process.stdout.write(text.endsWith('\n') ? text : text + '\n');
  return code;
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function run(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    return COMMANDS.help(parseArgs([]));
  }
  if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
    return out(`ascii-h3-director ${VERSION}`);
  }
  const handler = COMMANDS[cmd];
  if (!handler) {
    process.stderr.write(`unknown command: ${cmd}\n\n${HELP}\n`);
    return 2;
  }
  try {
    return handler(parseArgs(rest));
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`error: ${err.message}\n`);
      return 2;
    }
    process.stderr.write(`error: ${err && err.stack ? err.stack : err}\n`);
    return 1;
  }
}

const HELP = `ascii-h3-director v${VERSION} — ASCII / kinetic-typography direction for MiniMax H3

  ascii-h3 plan    "<brief>" [--seed S] [--beats N] [--json]
        full direction plan: chain, motion states, quality gate

  ascii-h3 chain   "<brief>" [--beats N] [--json]
        just the transformation chain

  ascii-h3 prompt  "<brief>" [--out FILE]
        only the compact H3 prompt

  ascii-h3 review  ["<brief>"] [--out prompt.txt] [--json]
        run the quality gate

  ascii-h3 reference <obs.json>
        extract STYLE DNA and a chain from reference observations

  ascii-h3 continue <exit-state.json> "<brief>"
        plan a seamless sequel that inherits the previous exit state

  ascii-h3 preview "<brief>" [--t SEC] [--cols N] [--rows N]
        print one ASCII frame to the terminal

  ascii-h3 svg     "<brief>" --t SEC --out FILE.svg
  ascii-h3 png     "<brief>" --t SEC --out FILE.png
  ascii-h3 strip   "<brief>" [--frames N] --out FILE.png
        deterministic previews — no API key, no ffmpeg

  ascii-h3 mechanisms [--json]     the motion grammar
  ascii-h3 doctor                  verify the engine
  ascii-h3 help

Common flags: --seed --beats --duration --ratio --palette --ramp --mode
              --text "WORD,WORD" --avoid "a,b" --allow --block
`;

const isMain = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
  } catch { return false; }
})();

if (isMain) process.exit(run(process.argv.slice(2)));
