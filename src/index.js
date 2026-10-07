/**
 * ASCII H3 Director — Host half of the DeepSeek Harness plugin.
 *
 * Registers five agent tools over the deterministic engine and adds one
 * system-prompt section. Generation is the only stage that costs money, and
 * every generation tool refuses to run until the director's quality gate has
 * passed, so an agent cannot burn quota on a diffuse prompt.
 *
 * The engine is plain ESM with zero dependencies; nothing here needs a build
 * step or a network call until the paid generation stage.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { parseBrief, composePrompt, review, analyzeReference, planContinuation } from './director.js';
import {
  MECHANISMS, MECHANISM_BY_ID, planChain, checkSeam, exitState,
} from './motion-grammar.js';
import { planFilm, renderFilmFrame, GLYPH_W, GLYPH_H } from './renderer.js';
import { gridToSvg, gridToRgb, gridToText } from './raster.js';
import { encodePng } from './png.js';

export const name = 'ascii-h3-director';
export const inject = ['tools', 'systemPrompt'];

/* ------------------------------------------------------------------ *
 * Config — dependency-free, so the plugin activates in any profile
 * ------------------------------------------------------------------ */

export const Config = {
  type: 'object',
  additionalProperties: true,
  properties: {
    defaultDuration: { type: 'number', default: 15, description: 'Default clip length in seconds (4–15).' },
    defaultRatio: { type: 'string', default: '21:9', description: 'Default frame shape.' },
    defaultPalette: { type: 'string', default: 'brutalist-digital', description: 'Default palette name.' },
    defaultRamp: { type: 'string', default: 'brutalist', description: 'Default character ramp name.' },
    outputDir: { type: 'string', default: '.ascii-h3', description: 'Where previews and contact sheets are written.' },
    enforceGate: { type: 'boolean', default: true, description: 'Refuse paid generation until the quality gate passes.' },
  },
};

function resolveConfig(config) {
  const c = config && typeof config === 'object' ? config : {};
  return {
    defaultDuration: Number.isFinite(c.defaultDuration) ? c.defaultDuration : 15,
    defaultRatio: typeof c.defaultRatio === 'string' ? c.defaultRatio : '21:9',
    defaultPalette: typeof c.defaultPalette === 'string' ? c.defaultPalette : 'brutalist-digital',
    defaultRamp: typeof c.defaultRamp === 'string' ? c.defaultRamp : 'brutalist',
    outputDir: typeof c.outputDir === 'string' && c.outputDir.trim() ? c.outputDir : '.ascii-h3',
    enforceGate: c.enforceGate !== false,
  };
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/**
 * Canonical output declaration shared by every tool: the model receives the
 * value as JSON text, which keeps the tools' result shape stable without
 * depending on the harness tool SDK.
 */
function textResult() {
  return {
    schema: { type: 'object', additionalProperties: true },
    render: (_args, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
  };
}

const OUT = textResult;

function present(title, kind, rawInput) {
  return { card: 'generic', title, kind, ...(rawInput === undefined ? {} : { rawInput }) };
}

function resolveOut(cfg, file) {
  if (isAbsolute(file)) return file;
  return resolve(process.cwd(), cfg.outputDir, file);
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

/** Brief → full director script, with the gate evaluated. */
function direct(brief, args, cfg) {
  const parsed = parseBrief(brief);
  const beats = clampInt(args.beats, 3, 8, 5);
  const chain = planChain({
    startForm: args.startForm ?? 'void',
    count: beats,
    allow: args.allow,
    block: args.block,
  });
  const script = {
    ...parsed,
    chain,
    seed: args.seed ?? `ascii-h3:${hashish(brief)}`,
    title: args.title ?? (parsed.keywords.slice(0, 4).join(' / ') || 'untitled'),
    duration: clampInt(args.duration, 4, 15, cfg.defaultDuration),
    ratio: args.ratio ?? cfg.defaultRatio,
    palette: args.palette ?? parsed.palette ?? cfg.defaultPalette,
    ramp: args.ramp ?? parsed.ramp ?? cfg.defaultRamp,
    mode: args.mode ?? parsed.mode,
    heroText: args.heroText ?? parsed.heroText,
  };
  script.prompt = composePrompt(script);
  script.review = review(script);
  return script;
}

function clampInt(v, lo, hi, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function hashish(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function summarizeChain(chain) {
  return chain.map((l, i) => {
    const m = MECHANISM_BY_ID.get(l.mechanism);
    return {
      index: i + 1,
      beat: l.beat,
      mechanism: l.mechanism,
      name: m?.name ?? l.mechanism,
      tier: m?.tier ?? 'unknown',
      emits: m?.emits ?? 'unknown',
      description: m?.action ?? '',
      exitState: l.exit,
    };
  });
}

/* ------------------------------------------------------------------ *
 * apply
 * ------------------------------------------------------------------ */

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {unknown} config
 */
export function apply(ctx, config) {
  const cfg = resolveConfig(config);

  /* Guidance the model reads before choosing a tool. */
  ctx.systemPrompt.section({
    name: 'tool:ascii-h3-director',
    order: 60,
    text: [
      'ASCII H3 Director is installed. It directs ASCII-art and kinetic-typography films.',
      'Treat characters as physical matter, never as decoration: a clip is a transformation',
      'chain, not a style. Prefer 15-second sequences split into 3-second beats.',
      'Before proposing a paid generation, run `ascii_h3_review` and report the score;',
      'when the gate fails, change the chain, the scale contrast, the density curve, the',
      'camera vector, the hero object, or the end state — never add adjectives.',
      'Use `ascii_h3_preview` to show the user what a beat will look like; the preview',
      'engine is deterministic and needs no API key. Use `ascii_h3_continue` to plan a',
      'sequel that inherits the previous clip\u2019s exit state instead of restarting.',
    ].join(' '),
  });

  /* ---------------- ascii_h3_plan ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_plan',
    description:
      'Direct an ASCII / kinetic-typography clip. Returns the transformation chain, the per-beat ' +
      'motion states, the compact H3 prompt and the quality-gate result. Use this first for any ' +
      'ASCII film request; it costs nothing and makes no network call.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        brief: { type: 'string', description: 'The film idea in plain language. Duration, aspect ratio, palette hints and hero words are parsed out of it.' },
        beats: { type: 'integer', description: 'Number of transformation beats, 3–8. Default 5.' },
        duration: { type: 'integer', description: 'Clip length in seconds, 4–15. Default 15.' },
        ratio: { type: 'string', description: 'Frame shape: 21:9, 16:9, 9:16, 4:3, 1:1 or adaptive.' },
        palette: { type: 'string', description: 'Palette name: brutalist-digital, minimal-signal, phosphor, paper-terminal, monolith.' },
        ramp: { type: 'string', description: 'Character ramp name: brutalist, classic, minimal, operators, binary, data, phosphor, typographic.' },
        heroText: { type: 'array', items: { type: 'string' }, description: 'Short hero words to place on the beats that can hold them.' },
        seed: { type: 'string', description: 'Determinism seed. The same seed and brief reproduce the same plan and frames.' },
        allow: { type: 'array', items: { type: 'string' }, description: 'Restrict the chain to these mechanism ids.' },
        block: { type: 'array', items: { type: 'string' }, description: 'Forbid these mechanism ids.' },
      },
      required: ['brief'],
    },
    output: OUT(),
    execute(args) {
      const a = args ?? {};
      const script = direct(String(a.brief ?? ''), a, cfg);
      return Promise.resolve({
        seed: script.seed,
        title: script.title,
        duration: script.duration,
        ratio: script.ratio,
        palette: script.palette,
        ramp: script.ramp,
        mode: script.mode,
        heroText: script.heroText,
        chain: summarizeChain(script.chain),
        prompt: script.prompt,
        review: script.review,
        cliches: script.cliches,
      });
    },
    presentCall: (args) => present('Direct ASCII film', 'other', args?.brief),
  });

  /* ---------------- ascii_h3_prompt ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_prompt',
    description:
      'Return only the compact H3 prompt for a film idea, in the five-block time form. Use when the ' +
      'user wants the prompt text itself rather than a plan, for example to paste into another tool.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        brief: { type: 'string', description: 'The film idea in plain language.' },
        beats: { type: 'integer', description: 'Number of time blocks, 3–8. Default 5.' },
        duration: { type: 'integer', description: 'Clip length in seconds, 4–15.' },
        ratio: { type: 'string', description: 'Frame shape.' },
        heroText: { type: 'array', items: { type: 'string' }, description: 'Short hero words.' },
        seed: { type: 'string', description: 'Determinism seed.' },
      },
      required: ['brief'],
    },
    output: OUT(),
    execute(args) {
      const a = args ?? {};
      const script = direct(String(a.brief ?? ''), a, cfg);
      return Promise.resolve({ prompt: script.prompt, words: script.prompt.split(/\s+/).length, chain: script.chain.map((l) => l.mechanism) });
    },
    presentCall: () => present('Compose H3 prompt', 'other'),
  });

  /* ---------------- ascii_h3_review ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_review',
    description:
      'Run the director\u2019s quality gate on a plan or on a prompt the user supplies. Returns a 0–100 ' +
      'score and one row per check with the concrete reason. Call this before any paid generation.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        brief: { type: 'string', description: 'The film idea the prompt was written for.' },
        prompt: { type: 'string', description: 'An existing H3 prompt to review. When omitted, the prompt is composed from the brief.' },
        beats: { type: 'integer', description: 'Number of beats used when composing.' },
        duration: { type: 'integer', description: 'Clip length in seconds.' },
      },
      required: ['brief'],
    },
    output: OUT(),
    execute(args) {
      const a = args ?? {};
      const script = direct(String(a.brief ?? ''), a, cfg);
      if (typeof a.prompt === 'string' && a.prompt.trim()) script.prompt = a.prompt;
      script.review = review(script);
      return Promise.resolve({ ...script.review, prompt: script.prompt, chain: script.chain.map((l) => l.mechanism) });
    },
    presentCall: () => present('Run quality gate', 'other'),
  });

  /* ---------------- ascii_h3_preview ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_preview',
    description:
      'Render a deterministic preview of a beat without any API key: a single ASCII frame for the ' +
      'terminal, or a PNG/SVG file, or a contact sheet of N frames. Use it to show the user what the ' +
      'film will look like before spending money on generation.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        brief: { type: 'string', description: 'The film idea in plain language.' },
        t: { type: 'number', description: 'Time within the clip, in seconds. Defaults to the midpoint.' },
        cols: { type: 'integer', description: 'Grid width in characters. Default 110.' },
        rows: { type: 'integer', description: 'Grid height in characters. Default 28.' },
        format: { type: 'string', enum: ['ascii', 'png', 'svg', 'strip'], description: 'ascii prints to the result; the others write a file.' },
        frames: { type: 'integer', description: 'Frame count for the contact sheet when format is strip. Default 6.' },
        out: { type: 'string', description: 'Output filename, relative to the configured output directory.' },
        seed: { type: 'string', description: 'Determinism seed.' },
        beats: { type: 'integer', description: 'Number of beats used to plan the film.' },
        duration: { type: 'integer', description: 'Clip length in seconds.' },
      },
      required: ['brief'],
    },
    output: OUT(),
    execute(args) {
      const a = args ?? {};
      const script = direct(String(a.brief ?? ''), a, cfg);
      const film = planFilm(script);
      const format = a.format ?? 'ascii';
      const cols = clampInt(a.cols, 20, 400, 110);
      const rows = clampInt(a.rows, 8, 200, 28);
      const t = Number.isFinite(Number(a.t)) ? Number(a.t) : film.duration / 2;

      if (format === 'ascii') {
        const grid = renderFilmFrame(film, t, { cols, rows });
        return Promise.resolve({
          format,
          t,
          stats: grid.stats(),
          frame: gridToText(grid),
        });
      }

      if (format === 'strip') {
        const frames = clampInt(a.frames, 2, 24, 6);
        const cellW = 6;
        const cellH = 11;
        const width = cols * cellW;
        const frameH = rows * cellH;
        const gap = 14;
        const labelH = 20;
        const height = frames * (frameH + gap + labelH);
        const sheet = new Uint8Array(width * height * 3);
        const bg = hexRgb(paletteBg(film.palette));
        for (let i = 0; i < width * height; i++) {
          sheet[i * 3] = bg[0]; sheet[i * 3 + 1] = bg[1]; sheet[i * 3 + 2] = bg[2];
        }
        let oy = 0;
        const marks = [];
        for (let i = 0; i < frames; i++) {
          const ft = (i / Math.max(1, frames - 1)) * (film.duration - 0.05);
          const grid = renderFilmFrame(film, ft, { cols, rows });
          const { width: fw, height: fh, rgb } = gridToRgb(grid, { palette: film.palette, cellW, cellH });
          for (let y = 0; y < fh; y++) {
            const src = y * fw * 3;
            sheet.set(rgb.subarray(src, src + Math.min(fw, width) * 3), ((oy + y) * width) * 3);
          }
          marks.push({ index: i + 1, t: Math.round(ft * 100) / 100, mechanism: shotAt(film, ft)?.mechanism });
          oy += frameH + gap + labelH;
        }
        const file = resolveOut(cfg, a.out ?? 'strip.png');
        ensureDir(file);
        writeFileSync(file, encodePng(width, height, sheet));
        return Promise.resolve({ format, file, width, height, frames: marks });
      }

      const grid = renderFilmFrame(film, t, { cols, rows });
      const ext = format === 'svg' ? 'svg' : 'png';
      const file = resolveOut(cfg, a.out ?? `frame-${Math.round(t * 10)}.${ext}`);
      ensureDir(file);
      if (format === 'svg') {
        writeFileSync(file, gridToSvg(grid, { palette: film.palette, title: `${film.title} @ ${t}s` }));
      } else {
        const { width, height, rgb } = gridToRgb(grid, { palette: film.palette });
        writeFileSync(file, encodePng(width, height, rgb));
      }
      return Promise.resolve({ format, file, t, stats: grid.stats(), mechanism: shotAt(film, t)?.mechanism });
    },
    presentCall: (args) => present(`Preview ASCII film (${args?.format ?? 'ascii'})`, 'other', args?.brief),
  });

  /* ---------------- ascii_h3_continue ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_continue',
    description:
      'Plan a seamless sequel. Give it the previous clip\u2019s exit state and it inherits camera, ' +
      'velocity, palette and charset, then closes the unresolved action. Returns the prompt plus any ' +
      'seam violations. Use it whenever the user asks for a part two, an extension or "continue from here".',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        brief: { type: 'string', description: 'What the next clip should do.' },
        exitState: {
          type: 'object',
          additionalProperties: true,
          description: 'The previous clip\u2019s exit state: form, camera, velocity, rotation, scaleTrend, densityTrend, unresolved, palette, ramp. Omit to assume an unresolved mid-dive exit.',
        },
        beats: { type: 'integer', description: 'Number of beats for the sequel. Default 5.' },
        allow: { type: 'array', items: { type: 'string' }, description: 'Restrict the sequel\u2019s chain to these mechanism ids.' },
      },
      required: ['brief'],
    },
    output: OUT(),
    execute(args) {
      const a = args ?? {};
      const prev = a.exitState && typeof a.exitState === 'object' ? a.exitState : exitState();
      const script = planContinuation(prev, String(a.brief ?? 'continue the sequence'), {
        beats: clampInt(a.beats, 3, 8, 5),
        allow: a.allow,
      });
      const seam = checkSeam(prev, script.entryState ?? prev);
      return Promise.resolve({
        prompt: script.prompt,
        chain: summarizeChain(script.chain),
        entryState: script.entryState,
        seamViolations: seam.length ? seam : [],
        seamHolds: seam.length === 0,
        review: script.review,
      });
    },
    presentCall: (args) => present('Plan seamless continuation', 'other', args?.brief),
  });

  /* ---------------- ascii_h3_grammar ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_grammar',
    description:
      'Read the ASCII motion grammar: every mechanism with its tier, the form it emits, and the ' +
      'mechanisms it chains into. Use it when you need to justify a structural choice or when the ' +
      'user asks why a transition does not work.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tier: { type: 'string', enum: ['canonical', 'strong', 'support', 'reject'], description: 'Return only this tier.' },
      },
    },
    output: OUT(),
    execute(args) {
      const tier = args?.tier;
      const list = tier ? MECHANISMS.filter((m) => m.tier === tier) : MECHANISMS;
      return Promise.resolve({
        count: list.length,
        bitmapFont: `${GLYPH_W}×${GLYPH_H}`,
        mechanisms: list.map((m) => ({
          id: m.id, name: m.name, tier: m.tier, emits: m.emits,
          action: m.action, chainsTo: m.chainsTo,
        })),
      });
    },
    presentCall: () => present('Read motion grammar', 'read'),
  });

  /* ---------------- ascii_h3_reference ---------------- */
  ctx.tools.register({
    name: 'ascii_h3_reference',
    description:
      'Turn observations about a reference video into a STYLE DNA block and a transformation chain. ' +
      'Use it when the user supplies a reference: it extracts motion grammar instead of imitating surface style.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        duration: { type: 'number', description: 'Reference duration in seconds.' },
        aspect: { type: 'string', description: 'Reference frame shape.' },
        materials: { type: 'array', items: { type: 'string' }, description: 'What the reference is physically made of.' },
        camera: { type: 'array', items: { type: 'string' }, description: 'Camera behaviours observed.' },
        densityCurve: { type: 'string', description: 'How density changes over the reference.' },
        typography: { type: 'string', description: 'How type behaves in the reference.' },
        transitions: { type: 'array', items: { type: 'string' }, description: 'Named transition mechanisms you observed.' },
        ending: { type: 'string', description: 'The reference\u2019s ending state.' },
      },
    },
    output: OUT(),
    execute(args) {
      const result = analyzeReference(args && typeof args === 'object' ? args : {});
      return Promise.resolve({ styleDNA: result.styleDNA, notes: result.notes, chain: summarizeChain(result.chain) });
    },
    presentCall: () => present('Analyze reference motion grammar', 'read'),
  });
}

/* ------------------------------------------------------------------ *
 * Local utilities (kept private so the module has no imports beyond node:)
 * ------------------------------------------------------------------ */

function shotAt(film, t) {
  for (const s of film.shots) if (t >= s.t0 && t < s.t1) return s;
  return film.shots[film.shots.length - 1];
}

function paletteBg(name) {
  const table = {
    'brutalist-digital': '#050506',
    'minimal-signal': '#040404',
    phosphor: '#020604',
    'paper-terminal': '#0b0b0c',
    monolith: '#000000',
  };
  return table[name] ?? '#050506';
}

function hexRgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
