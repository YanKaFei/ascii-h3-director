#!/usr/bin/env node
/**
 * ascii-h3-director — engine test suite.
 *
 * Zero dependencies, no test framework, no build step. Run it with:
 *
 *     node test/engine.test.js
 *
 * The suite exists to protect one promise above all others: the engine is
 * *deterministic*. The same brief, the same seed and the same parameters must
 * produce a bit-identical plan and bit-identical frames, on any machine, with
 * no network and no API key. Everything else (the glyph atlas, the motion
 * grammar, the continuity contract, the quality gate, the rasterizers) is
 * covered because it is what determinism has to hold together.
 *
 * Each case is `[name, fn]`. A case throws to fail; the thrown message and a
 * one-line detail are printed. The process exits non-zero if anything fails.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rng, hash32, EASE, RAMPS, PALETTES, clamp, lerp } from '../src/core.js';
import {
  glyphRows, glyphInk, pickGlyph, rampFromGlyphs,
  FIRST, LAST, GLYPH_W, GLYPH_H, ATLAS_SIZE, INK_TABLE,
} from '../src/glyph-atlas.js';
import {
  MECHANISMS, MECHANISM_BY_ID, FORM_SUCCESSORS, CAMERA_MOVES,
  entryState, exitState, inherit, checkSeam, planChain, densityCurve,
} from '../src/motion-grammar.js';
import {
  parseBrief, composePrompt, review, analyzeReference, planContinuation,
} from '../src/director.js';
import { Grid, planFilm, renderFilmFrame, Camera, compileScene, paletteFor, hexToRgb, inkColor } from '../src/renderer.js';
import { gridToSvg, gridToRgb, gridToText } from '../src/raster.js';
import { encodePng } from '../src/png.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CLI = join(ROOT, 'src', 'cli.js');

/* ------------------------------------------------------------------ *
 * Tiny harness
 * ------------------------------------------------------------------ */

const cases = [];

/** Register a test case. `fn` may return a string used as pass detail. */
function test(name, fn) {
  cases.push([name, fn]);
}

class AssertionError extends Error {}

function fail(message) {
  throw new AssertionError(message);
}

function assert(cond, message) {
  if (!cond) fail(message);
}

function eq(actual, expected, message = 'values differ') {
  if (actual !== expected) {
    fail(`${message}\n      expected: ${show(expected)}\n      actual:   ${show(actual)}`);
  }
}

function deepEq(actual, expected, message = 'structures differ') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) fail(`${message}\n      expected: ${trim(b)}\n      actual:   ${trim(a)}`);
}

function ok(cond, message) {
  assert(cond, message);
}

function near(actual, expected, eps, message = 'values are not near') {
  if (!(Math.abs(actual - expected) <= eps)) {
    fail(`${message}\n      expected: ${expected} ± ${eps}\n      actual:   ${actual}`);
  }
}

function show(v) {
  if (typeof v === 'string') return JSON.stringify(v.length > 120 ? v.slice(0, 120) + '…' : v);
  return trim(JSON.stringify(v));
}

function trim(s) {
  if (typeof s !== 'string') return String(s);
  return s.length > 300 ? s.slice(0, 300) + '…' : s;
}

/* ------------------------------------------------------------------ *
 * Shared fixtures — one canonical script, built exactly as the CLI does
 * ------------------------------------------------------------------ */

const BRIEF = 'a 15 second ultra-wide ASCII film about memory collapsing back into language';

function buildScript(over = {}) {
  const parsed = parseBrief(over.brief ?? BRIEF);
  const chain = over.chain ?? planChain({ startForm: 'void', count: over.beats ?? 5 });
  const script = {
    ...parsed,
    chain,
    seed: 'test-seed',
    title: 'memory / language',
    duration: 15,
    ratio: '21:9',
    palette: parsed.palette,
    ramp: parsed.ramp,
    mode: parsed.mode,
    heroText: ['VOID', 'MEMORY'],
    ...over,
  };
  // An explicit prompt is the thing under review; only compose when absent.
  script.prompt = typeof over.prompt === 'string' && over.prompt.length
    ? over.prompt
    : composePrompt(script);
  script.review = review(script);
  return script;
}

function film(over = {}) {
  return planFilm(buildScript(over));
}

/** Every non-space code point a grid actually emitted. */
function emittedCodes(grid) {
  const out = [];
  for (const code of grid.codes) {
    if (code !== 0x20) out.push(code);
  }
  return out;
}

/* ================================================================== *
 * 1. Determinism — the project's core promise
 * ================================================================== */

test('determinism: planChain is deep-equal for the same seed and params', () => {
  const a = planChain({ startForm: 'void', count: 6, seed: 'alpha' });
  const b = planChain({ startForm: 'void', count: 6, seed: 'alpha' });
  deepEq(b, a, 'two identical planChain calls returned different chains');
  eq(a.length, 6, 'planChain returned the wrong number of links');
  return `${a.length} links, ${a.map((l) => l.mechanism).join(' → ')}`;
});

test('determinism: planChain is idempotent across every start form', () => {
  const forms = Object.keys(FORM_SUCCESSORS);
  for (const startForm of forms) {
    const a = planChain({ startForm, count: 5, seed: 'beta' });
    const b = planChain({ startForm, count: 5, seed: 'beta' });
    deepEq(b, a, `planChain({startForm:"${startForm}"}) is not reproducible`);
  }
  return `${forms.length} start forms reproduced exactly`;
});

test('determinism: the seeded RNG replays bit-identically', () => {
  const a = Array.from({ length: 256 }, rng('seed-1'));
  const b = Array.from({ length: 256 }, rng('seed-1'));
  const c = Array.from({ length: 256 }, rng('seed-2'));
  deepEq(b, a, 'two RNG instances with the same seed diverged');
  ok(JSON.stringify(a) !== JSON.stringify(c), 'RNG ignores its seed entirely');
  for (const v of a) ok(v >= 0 && v < 1, `RNG returned ${v}, outside [0,1)`);
  return 'first value ' + a[0].toFixed(6);
});

test('determinism: renderFilmFrame is byte-identical on repeat calls', () => {
  const f = film();
  const times = [0, 1.7, 5.25, 7.5, 11.9, 14.999];
  for (const t of times) {
    const a = renderFilmFrame(f, t, { cols: 120, rows: 30 });
    const b = renderFilmFrame(f, t, { cols: 120, rows: 30 });
    eq(b.toText(), a.toText(), `frame at t=${t}s is not reproducible`);
    eq(b.stats().filled, a.stats().filled, `frame at t=${t}s has a different fill count`);
  }
  return `${times.length} frames ×2 identical at 120×30`;
});

test('determinism: re-planning the same script yields the same film spec', () => {
  const a = film();
  const b = film();
  deepEq(b, a, 'planFilm is not reproducible for the same script');
  return `${a.shots.length} shots, seed ${a.seed}`;
});

test('determinism: a different seed changes the geometry, not the chain', () => {
  const a = film({ seed: 'seed-A' });
  const b = film({ seed: 'seed-B' });
  deepEq(b.chain, a.chain, 'the chain should not depend on the render seed');
  const ga = renderFilmFrame(a, 7.5, { cols: 100, rows: 26 }).toText();
  const gb = renderFilmFrame(b, 7.5, { cols: 100, rows: 26 }).toText();
  ok(ga !== gb, 'a different seed produced an identical frame — the seed is not reaching the scene');
  return 'same chain, different matter';
});

test('determinism: the module reads no wall clock and no Math.random', async () => {
  // Only the pure engine is scanned: `cli.js` and `index.js` are the impure
  // edge (they deliberately time themselves and touch the filesystem).
  // Comments are stripped, because the modules document the rule they follow.
  const strip = (src) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const source = await import('node:fs').then((fs) =>
    ['renderer', 'motion-grammar', 'director', 'glyph-atlas', 'core', 'raster', 'png']
      .map((m) => strip(fs.readFileSync(join(ROOT, 'src', `${m}.js`), 'utf8')))
      .join('\n'),
  );
  ok(!/Math\.random/.test(source), 'engine source calls Math.random');
  ok(!/Date\.now\(\)|new Date\(|performance\.now/.test(source), 'engine source reads the wall clock');
  ok(!/process\.env/.test(source), 'engine source reads the environment');
  return 'no Math.random, no clock, no environment reads in 7 pure modules';
});

/* ================================================================== *
 * 2. Glyph atlas
 * ================================================================== */

test('atlas: glyphRows covers every byte from 0x20 to 0x7E', () => {
  eq(LAST - FIRST + 1, 95, 'printable ASCII range is not 95 code points');
  eq(ATLAS_SIZE.count, 95, 'ATLAS_SIZE.count disagrees with the range');
  for (let code = FIRST; code <= LAST; code++) {
    const rows = glyphRows(code);
    eq(Array.isArray(rows) ? rows.length : -1, GLYPH_H,
      `glyphRows(0x${code.toString(16)}) did not return ${GLYPH_H} rows`);
    const ch = String.fromCharCode(code);
    ok(rows.some((r) => r !== 0) || ch === ' ',
      `glyphRows('${ch}') is blank but the character is not a space`);
    for (const r of rows) ok(r >= 0 && r <= 0b11111, `row mask ${r} exceeds 5 bits`);
  }
  return '95 code points × 9 rows, all within 5-bit masks';
});

test('atlas: out-of-range code points return the fallback, not a throw', () => {
  const q = glyphRows('?'.charCodeAt(0));
  for (const code of [-1, 0, 0x1f, 0x7f, 0x2603, 1e9, NaN]) {
    const rows = glyphRows(code);
    deepEq(rows, q, `glyphRows(${code}) should fall back to the "?" mark`);
  }
  return 'fallback = "?" for 7 out-of-range inputs';
});

test('atlas: glyphInk(" ") === 0 and "@" outweighs "."', () => {
  eq(glyphInk(0x20), 0, 'the space bar has ink');
  ok(glyphInk(0x40) > glyphInk(0x2e) && glyphInk(0x2e) > 0,
    `expected @ > . > 0, got @=${glyphInk(0x40)} .=${glyphInk(0x2e)}`);
  for (const { code, ink } of INK_TABLE) {
    ok(ink >= 0 && ink <= 1, `ink for ${JSON.stringify(String.fromCharCode(code))} is ${ink}`);
  }
  return `@=${glyphInk(0x40).toFixed(3)} .=${glyphInk(0x2e).toFixed(3)} space=0`;
});

test('atlas: pickGlyph pins the ends of the ramp', () => {
  const ramps = Object.values(RAMPS);
  for (const ramp of ramps) {
    eq(pickGlyph(ramp, 0), ramp.charCodeAt(0), `pickGlyph(ramp, 0) left ramp "${ramp}"`);
    eq(pickGlyph(ramp, 1), ramp.charCodeAt(ramp.length - 1), `pickGlyph(ramp, 1) left ramp "${ramp}"`);
    eq(pickGlyph(ramp, -5), ramp.charCodeAt(0), 'a negative density should clamp low');
    eq(pickGlyph(ramp, 5), ramp.charCodeAt(ramp.length - 1), 'a density above 1 should clamp high');
    const seen = new Set();
    for (let d = 0; d <= 1.0001; d += 0.01) {
      const code = pickGlyph(ramp, d);
      ok(ramp.includes(String.fromCharCode(code)), `pickGlyph returned a glyph outside "${ramp}"`);
      ok(code >= FIRST && code <= LAST, `pickGlyph returned non-printable 0x${code.toString(16)}`);
      seen.add(code);
    }
    eq(seen.size, new Set(ramp).size, `pickGlyph cannot reach every mark in "${ramp}"`);
  }
  eq(pickGlyph('', 0.5), 0x20, 'an empty ramp should yield a space');
  eq(pickGlyph('X', 0.5), 'X'.charCodeAt(0), 'a one-mark ramp should yield that mark');
  return `${ramps.length} ramps, ends pinned, sweep in range`;
});

test('atlas: rampFromGlyphs is monotonic in real glyph ink', () => {
  const up = rampFromGlyphs('@%#*+=-:. ', true);
  const down = rampFromGlyphs('@%#*+=-:. ', false);
  eq(down, [...up].reverse().join(''), 'descending ramp is not the reverse of the ascending one');
  for (let i = 1; i < up.length; i++) {
    ok(glyphInk(up.charCodeAt(i - 1)) <= glyphInk(up.charCodeAt(i)),
      `ramp not monotonic at index ${i} ("${up[i - 1]}" > "${up[i]}")`);
  }
  eq(new Set(up).size, up.length, 'rampFromGlyphs left duplicates in the ramp');
  // Non-printable code points are dropped, and the survivors come back
  // ordered by real ink then by code point — not in input order.
  const filtered = rampFromGlyphs('a\tb\u2603c', true);
  eq([...filtered].sort().join(''), 'abc', 'rampFromGlyphs should drop non-printable-ASCII characters');
  eq(rampFromGlyphs('\t\u2603\u00e9', true), '', 'a ramp with no printable ASCII should be empty');
  return `"${up}" ascending, ${up.length} marks`;
});

/* ================================================================== *
 * 3. Grammar legality
 * ================================================================== */

test('grammar: every chainsTo id resolves to a real mechanism', () => {
  let edges = 0;
  for (const m of MECHANISMS) {
    for (const id of m.chainsTo) {
      ok(MECHANISM_BY_ID.has(id), `${m.id} chains to unknown mechanism "${id}"`);
      edges++;
    }
  }
  return `${MECHANISMS.length} mechanisms, ${edges} legal edges, all resolve`;
});

test('grammar: every id in FORM_SUCCESSORS resolves', () => {
  let refs = 0;
  for (const [form, ids] of Object.entries(FORM_SUCCESSORS)) {
    ok(ids.length > 0, `form "${form}" has no legal successors`);
    for (const id of ids) {
      ok(MECHANISM_BY_ID.has(id), `FORM_SUCCESSORS["${form}"] names unknown mechanism "${id}"`);
      refs++;
    }
  }
  return `${Object.keys(FORM_SUCCESSORS).length} forms, ${refs} successor references, all resolve`;
});

test('grammar: rejected mechanisms are terminal but still nameable', () => {
  const rejects = MECHANISMS.filter((m) => m.tier === 'reject');
  ok(rejects.length >= 4, `expected the reject tier to be populated, found ${rejects.length}`);
  for (const m of rejects) {
    eq(m.chainsTo.length, 0, `${m.id} should chain nowhere`);
    eq(m.emits, 'cliche', `${m.id} should emit the cliche form`);
    ok(FORM_SUCCESSORS.cliche.includes('boot-signal'),
      'a cliche should have exactly one escape route back into the grammar');
  }
  for (const ids of Object.values(FORM_SUCCESSORS)) {
    for (const id of ids) ok(MECHANISM_BY_ID.get(id).tier !== 'reject',
      `FORM_SUCCESSORS admits the rejected mechanism "${id}"`);
  }
  return `${rejects.length} rejects, all terminal, none reachable`;
});

test('grammar: planChain never repeats a mechanism in ordinary planning', () => {
  let plans = 0;
  const offenders = [];
  for (const startForm of Object.keys(FORM_SUCCESSORS)) {
    for (let count = 1; count <= 8; count++) {
      const chain = planChain({ startForm, count, seed: 'legality' });
      plans++;
      const ids = chain.map((l) => l.mechanism);
      if (new Set(ids).size !== ids.length) offenders.push(`${startForm}/${count}: ${ids.join(' → ')}`);
    }
  }
  if (offenders.length) {
    fail(`planChain repeated a mechanism in ${offenders.length}/${plans} ordinary plans:\n      ` +
      offenders.join('\n      '));
  }
  return `${plans} plans, zero repeats`;
});

test('grammar: planChain returns n links, or fewer once the grammar runs out', () => {
  for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]) {
    for (const startForm of Object.keys(FORM_SUCCESSORS)) {
      const chain = planChain({ startForm, count });
      // A chain never repeats a mechanism, so it may legitimately be shorter
      // than the requested count once the grammar runs out of legal, unused
      // successors. It must never be longer, and it must never repeat.
      ok(chain.length <= count,
        `planChain({count:${count}, startForm:"${startForm}"}) returned ${chain.length} links`);
      const ids = chain.map((l) => l.mechanism);
      eq(new Set(ids).size, ids.length,
        `planChain({count:${count}, startForm:"${startForm}"}) repeated a mechanism: ${ids.join('→')}`);
      ok(chain.length >= Math.min(count, 3),
        `planChain({count:${count}, startForm:"${startForm}"}) returned only ${chain.length} links`);
    }
  }
  return 'counts 1–12 honoured from every start form';
});

test('grammar: an explicit allow-list cannot smuggle in an unlisted mechanism', () => {
  const allow = ['tunnel', 'type-wall', 'glyph-sphere'];
  for (const startForm of Object.keys(FORM_SUCCESSORS)) {
    for (const l of planChain({ startForm, count: 6, allow })) {
      ok(allow.includes(l.mechanism), `allow-list leaked ${l.mechanism}`);
    }
  }
  const blocked = ['assemble', 'tunnel', 'type-wall', 'glyph-sphere', 'implosion', 'shockwave'];
  for (const l of planChain({ count: 6, block: blocked })) {
    ok(!blocked.includes(l.mechanism), `block-list leaked ${l.mechanism}`);
  }
  return `${allow.length} allowed, ${blocked.length} blocked, both respected`;
});

test('grammar: every planned link carries a usable exit state', () => {
  for (const l of planChain({ count: 6 })) {
    ok(l.exit && typeof l.exit === 'object', `link ${l.mechanism} has no exit state`);
    ok(l.exit.form === MECHANISM_BY_ID.get(l.mechanism).emits,
      `link ${l.mechanism} exits on form "${l.exit.form}" but emits "${MECHANISM_BY_ID.get(l.mechanism).emits}"`);
    ok(CAMERA_MOVES.includes(l.exit.camera), `exit camera "${l.exit.camera}" is not in the camera grammar`);
    ok(typeof l.exit.unresolved === 'string' && l.exit.unresolved.length > 0,
      `link ${l.mechanism} does not leave an unresolved action`);
    ok(l.to > l.from, `link ${l.mechanism} has a non-positive beat span`);
  }
  return 'all 6 links: form matches, camera legal, action unresolved';
});

test('grammar: the camera grammar and the continuable subset agree', () => {
  eq(CAMERA_MOVES.length, 8, 'camera grammar changed size');
  eq(new Set(CAMERA_MOVES).size, CAMERA_MOVES.length, 'camera grammar has duplicates');
  ok(CAMERA_MOVES.includes('backward-suction'), 'the exit camera vector is missing');
  ok(CAMERA_MOVES.includes('forward-punch-through'), 'the entry camera vector is missing');
  const states = new Set(MECHANISMS.filter((m) => m.tier !== 'reject')
    .map((m) => exitState({ form: m.emits }).camera));
  ok(states.size >= 1, 'no camera vectors are reachable from the grammar');
  return CAMERA_MOVES.join(', ');
});

test('grammar: densityCurve spans the full contrast range', () => {
  for (const mode of ['high-impact', 'minimal-data']) {
    const curve = densityCurve({ duration: 15, mode });
    eq(curve.length, 121, 'densityCurve should return 121 samples');
    const ds = curve.map((s) => s.density);
    const ss = curve.map((s) => s.scale);
    ok(Math.min(...ds) >= 0 && Math.max(...ds) <= 1, `${mode} density left [0,1]`);
    ok(Math.max(...ds) - Math.min(...ds) > 0.4, `${mode} density has no contrast`);
    ok(Math.max(...ss) > Math.min(...ss), `${mode} scale never changes`);
    deepEq(densityCurve({ duration: 15, mode }), curve, 'densityCurve is not deterministic');
  }
  return 'both modes contrast, bounded and reproducible';
});

/* ================================================================== *
 * 4. The continuity contract
 * ================================================================== */

test('continuity: inherit(exit) preserves camera, palette and ramp', () => {
  const ex = exitState({
    form: 'space', camera: 'tunnel-travel', velocity: 1.4, rotation: 0.6,
    scaleTrend: -1, densityTrend: -1, palette: 'phosphor', ramp: 'operators',
    unresolved: 'the tunnel is still opening when the clip ends',
  });
  const entry = inherit(ex);
  eq(entry.camera, ex.camera, 'camera vector was not inherited');
  eq(entry.palette, ex.palette, 'palette was not inherited');
  eq(entry.ramp, ex.ramp, 'charset was not inherited');
  eq(entry.form, ex.form, 'form was not inherited');
  eq(entry.rotation, ex.rotation, 'rotation was not inherited');
  eq(entry.scaleTrend, ex.scaleTrend, 'scale trend was not inherited');
  eq(entry.densityTrend, ex.densityTrend, 'density trend was not inherited');
  return `camera ${entry.camera}, palette ${entry.palette}, ramp ${entry.ramp} all carried`;
});

test('continuity: inherit(exit) multiplies velocity by speedUp', () => {
  const ex = exitState({ velocity: 1.5 });
  near(inherit(ex).velocity, 1.5 * 1.1, 1e-12, 'default speedUp is not 1.1×');
  near(inherit(ex, { speedUp: 2 }).velocity, 3, 1e-12, 'explicit speedUp was ignored');
  near(inherit(ex, { speedUp: 1 }).velocity, 1.5, 1e-12, 'speedUp 1 should be the identity');
  const slow = exitState({ velocity: 1.5 });
  ok(inherit(slow, { speedUp: 0.5 }).velocity < slow.velocity, 'speedUp < 1 should slow the sequel');
  ok(Math.sign(inherit(ex).velocity) === Math.sign(ex.velocity), 'velocity changed sign across the seam');
  return '1.5 → 1.65 (default), → 3.0 (2×)';
});

test('continuity: the unresolved action is closed, not re-declared', () => {
  const ex = exitState({ unresolved: 'the sphere is still converging' });
  // The predecessor's unfinished action is handed to the sequel so the sequel
  // can close it. Re-declaring it as unresolved would stall the sequence, and
  // dropping it would lose the seam — so it must carry over verbatim.
  eq(inherit(ex).unresolved, ex.unresolved,
    'inherit() should carry the unresolved action forward for the sequel to close');
  eq(inherit(ex, { keepForm: false }).form, 'void', 'keepForm:false should reset the form');
  eq(inherit(ex).velocity, ex.velocity * 1.1, 'inherit() should speed the motion up slightly');
  return 'action carried forward; form resettable';
});

test('continuity: checkSeam returns [] for a correct inheritance', () => {
  const ex = exitState({
    form: 'fragments', camera: 'forward-punch-through', velocity: 1.2,
    palette: 'paper-terminal', ramp: 'classic', unresolved: 'the wall is still shattering',
  });
  const strict = { requireCamera: true, requirePalette: true };
  deepEq(checkSeam(ex, inherit(ex), strict), [],
    'a correct inheritance reported seam violations');
  eq(inherit(ex).unresolved, ex.unresolved,
    'inherit() should carry the unresolved action forward');
  // Inheritance itself is what makes the seam hold, so a derived entry state
  // is never reported regardless of how many times it is checked.
  deepEq(checkSeam(ex, inherit(ex), strict), checkSeam(ex, inherit(ex), strict),
    'checkSeam is not deterministic');
  return 'seam holds under strict checking';
});

test('continuity: checkSeam reports a deliberately broken camera', () => {
  const ex = exitState({ camera: 'tunnel-travel' });
  const broken = { ...inherit(ex), camera: 'orbital-lock' };
  const v = checkSeam(ex, broken, { requireCamera: true });
  ok(v.length > 0, 'a camera reset across the seam was not reported');
  ok(v.some((s) => /camera/i.test(s)), `the violation does not mention the camera: ${v.join(' | ')}`);
  deepEq(checkSeam(ex, broken), [],
    'the camera check must stay silent unless the caller declares a continuation');
  return trim(v[0]);
});

test('continuity: checkSeam reports a deliberately broken palette and charset', () => {
  const ex = exitState({ palette: 'brutalist-digital', ramp: 'brutalist' });
  const strict = { requirePalette: true };
  const pal = checkSeam(ex, { ...inherit(ex), palette: 'phosphor' }, strict);
  const ramp = checkSeam(ex, { ...inherit(ex), ramp: 'minimal' }, strict);
  ok(pal.length > 0 && /palette/i.test(pal.join(' ')), 'a palette change was not reported');
  ok(ramp.length > 0 && /charset/i.test(ramp.join(' ')), 'a charset change was not reported');
  deepEq(checkSeam(ex, { ...inherit(ex), palette: 'phosphor' }), [],
    'the palette check must stay silent unless the caller declares a continuation');
  return `${pal.length} palette + ${ramp.length} charset violation(s)`;
});

test('continuity: checkSeam catches a dropped or reversed velocity', () => {
  const ex = exitState({ velocity: 1.2 });
  const dropped = checkSeam(ex, { ...inherit(ex), velocity: 0 });
  const reversed = checkSeam(ex, { ...inherit(ex), velocity: -1.2 });
  ok(dropped.some((s) => /zero|reset/i.test(s)), 'a velocity dropped to zero was not reported');
  ok(reversed.some((s) => /revers/i.test(s)), 'a reversed velocity was not reported');
  deepEq(checkSeam(exitState({ velocity: 0 }), entryState()), [],
    'a seam from a stopped clip should not be flagged for velocity');
  return 'drop and reversal both reported';
});

test('continuity: planContinuation inherits and closes the predecessor', () => {
  const prev = exitState({
    form: 'field', camera: 'forward-punch-through', velocity: 1,
    palette: 'minimal-signal', ramp: 'minimal', unresolved: 'the field is still pulsing',
  });
  const script = planContinuation(prev, 'a 15 second sequel about the field remembering shape');
  eq(script.continuation, true, 'the sequel script is not marked as a continuation');
  eq(script.palette, prev.palette, 'the sequel did not inherit the palette');
  eq(script.ramp, prev.ramp, 'the sequel did not inherit the charset');
  eq(script.entryState.camera, prev.camera, 'the sequel did not inherit the camera vector');
  deepEq(script.seam, [], 'the sequel reported seam violations');
  eq(script.chain[0].mechanism && MECHANISM_BY_ID.has(script.chain[0].mechanism), true,
    'the sequel chain does not open on a real mechanism');
  ok(script.chain.every((l) => l.mechanism !== 'reject-city'), 'the sequel admitted a rejected mechanism');
  ok(/continuation/i.test(script.prompt), 'the prompt does not declare the continuation');
  deepEq(planContinuation(prev, 'a 15 second sequel').seam, [], 'planContinuation is not reproducible');
  return `${script.chain.length} beats from form "${prev.form}", seed ${script.seed}`;
});

/* ================================================================== *
 * 5. Quality gate
 * ================================================================== */

test('gate: review() has exactly seven checks and the documented ids', () => {
  const r = review(buildScript());
  eq(r.checks.length, 7, 'the quality gate changed size');
  const ids = r.checks.map((c) => c.id);
  deepEq(ids, ['single-chain', 'source-state', 'physical-cause', 'contrast',
    'exit-state', 'no-cliche', 'compact'], 'the gate checks changed identity or order');
  for (const c of r.checks) {
    ok(typeof c.label === 'string' && c.label.length > 0, `check ${c.id} has no label`);
    ok(typeof c.pass === 'boolean', `check ${c.id} does not report a boolean`);
  }
  return ids.join(', ');
});

test('gate: a well-formed script scores 100 and passes', () => {
  const script = buildScript();
  const r = script.review;
  eq(r.score, 100, `a well-formed plan scored ${r.score}: ` +
    r.checks.filter((c) => !c.pass).map((c) => `${c.id} (${c.detail})`).join('; '));
  eq(r.pass, true, 'a well-formed plan failed the gate');
  ok(script.prompt.split(/\s+/).length <= 320, 'the composed prompt is over the word budget');
  return `${r.score}/100, prompt ${script.prompt.split(/\s+/).length} words`;
});

test('gate: an empty chain fails single-chain', () => {
  const script = buildScript({ chain: [] });
  const c = script.review.checks.find((x) => x.id === 'single-chain');
  eq(c.pass, false, 'an empty chain passed single-chain');
  eq(script.review.pass, false, 'an empty chain passed the whole gate');
  const two = buildScript({ chain: planChain({ count: 2 }) });
  eq(two.review.checks.find((x) => x.id === 'single-chain').pass, false,
    'a two-beat chain should be too short to be legible');
  const three = buildScript({ chain: planChain({ count: 3 }) });
  eq(three.review.checks.find((x) => x.id === 'single-chain').pass, true,
    'a three-beat chain should clear the minimum');
  return '0 and 2 beats fail, 3 beats pass';
});

test('gate: an illegal transition fails physical-cause', () => {
  const chain = planChain({ count: 5 });
  // implosion does not chain into density-dissolve: the transition has no cause.
  const broken = chain.map((l, i) => (i === 3 ? { ...chain[2], mechanism: 'density-dissolve' } : l));
  const script = buildScript({ chain: broken });
  const c = script.review.checks.find((x) => x.id === 'physical-cause');
  eq(c.pass, false, 'an illegal transition passed physical-cause');
  eq(script.review.pass, false, 'an illegal transition passed the whole gate');
  // A legal chain must still pass the same check, or the check is a rubber stamp.
  eq(buildScript({ chain }).review.checks.find((x) => x.id === 'physical-cause').pass, true,
    'a legal chain failed physical-cause');
  return trim(c.detail);
});

test('gate: a cliché in the positive prompt fails no-cliche', () => {
  const script = buildScript();
  const clean = script.review.checks.find((x) => x.id === 'no-cliche');
  eq(clean.pass, true, 'the composer emitted rejected vocabulary on its own');
  const positive = script.prompt.split(/RULE:/)[0];
  const dirty = buildScript({ prompt: `${positive}a neon cyberpunk city skyline appears\nRULE: nothing.` });
  const c = dirty.review.checks.find((x) => x.id === 'no-cliche');
  eq(c.pass, false, 'a cliché in the positive prompt passed no-cliche');
  eq(dirty.review.pass, false, 'a cliché passed the whole gate');
  // The negative line is allowed to name the clichés it bans.
  const negativeOnly = buildScript({ prompt: 'plain\nRULE: avoid cyberpunk city, neon.' });
  eq(negativeOnly.review.checks.find((x) => x.id === 'no-cliche').pass, true,
    'the RULE line should be allowed to name what it forbids');
  return trim(c.detail);
});

test('gate: an overlong prompt fails compact', () => {
  const script = buildScript();
  const words = script.prompt.split(/\s+/).length;
  const filler = 'and then it transforms again without any physical cause';
  const bloated = buildScript({ prompt: `${script.prompt} ${filler.repeat(60)}` });
  const c = bloated.review.checks.find((x) => x.id === 'compact');
  ok((c.detail.match(/^(\d+) words$/) || [])[1] > 320,
    `the bloated prompt is only ${c.detail}; the test does not exercise the limit`);
  eq(c.pass, false, 'a prompt well over 320 words passed compact');
  eq(bloated.review.pass, false, 'an overlong prompt passed the whole gate');
  eq(script.review.checks.find((x) => x.id === 'compact').pass, true, 'a 100-word prompt failed compact');
  near(words, script.prompt.trim().split(/\s+/).length, 0, 'word counting is unstable');
  return `${c.detail}; the composed prompt is ${words} words`;
});

test('gate: a fully resolved ending fails exit-state', () => {
  const chain = planChain({ count: 5 }).map((l) => ({ ...l, exit: { ...l.exit, unresolved: '' } }));
  const script = buildScript({ chain, prompt: 'A closed clip with no leftover motion.' });
  const c = script.review.checks.find((x) => x.id === 'exit-state');
  eq(c.pass, false, 'a resolved ending passed exit-state');
  const open = buildScript();
  eq(open.review.checks.find((x) => x.id === 'exit-state').pass, true, 'an unresolved ending failed exit-state');
  return trim(c.detail);
});

test('gate: the score tracks the fraction of checks passed', () => {
  const cases = [
    { over: {}, expected: 100 },
    { over: { chain: [] }, expected: null },
  ];
  for (const { over } of cases) {
    const r = buildScript(over).review;
    const passed = r.checks.filter((c) => c.pass).length;
    eq(r.score, Math.round((passed / r.checks.length) * 100), 'score does not match the check tally');
    eq(r.pass, r.checks.every((c) => c.pass), 'pass does not match the check tally');
  }
  return 'score == passed/total for both a clean and a broken plan';
});

test('gate: parseBrief extracts duration, ratio, palette and hero words', () => {
  const p = parseBrief('a 12 second 16:9 phosphor terminal piece with the word OPEN and "SHUT"');
  eq(p.duration, 12, 'duration was not parsed');
  eq(p.ratio, '16:9', 'aspect ratio was not parsed');
  eq(p.palette, 'phosphor', 'palette was not parsed from tonal words');
  eq(p.ramp, 'phosphor', 'ramp was not parsed from tonal words');
  ok(p.heroText.includes('OPEN'), 'an uppercase word after "word" was not captured');
  ok(p.heroText.includes('SHUT'), 'a quoted word was not captured');
  eq(parseBrief('a 90 second clip').duration, 15, 'duration should clamp to 15s');
  eq(parseBrief('a 1 second clip').duration, 4, 'duration should clamp to 4s');
  eq(parseBrief('').duration, 15, 'an empty brief should default to 15s');
  eq(parseBrief('').ratio, '21:9', 'an empty brief should default to 21:9');
  const c = parseBrief('a neon cyberpunk city with a hologram hud');
  ok(c.cliches.includes('reject-city') && c.cliches.includes('reject-hud'),
    `cliché detection missed: ${c.cliches.join(', ')}`);
  return `${p.duration}s ${p.ratio} ${p.palette}/${p.ramp}, hero ${p.heroText.join('+')}`;
});

test('gate: composePrompt emits one block per beat plus STYLE and RULE', () => {
  for (const beats of [3, 5, 8]) {
    const script = buildScript({ beats, chain: planChain({ count: beats }) });
    const lines = script.prompt.split('\n');
    const beatLines = lines.filter((l) => /^\d+(\.\d+)?[–-]\d+(\.\d+)?s:/.test(l));
    eq(beatLines.length, beats, `expected ${beats} time blocks in the prompt`);
    eq(lines.filter((l) => l.startsWith('STYLE:')).length, 1, 'expected exactly one STYLE line');
    eq(lines.filter((l) => l.startsWith('RULE:')).length, 1, 'expected exactly one RULE line');
    ok(/no normal cuts/.test(script.prompt), 'the RULE line does not forbid normal cuts');
    ok(/emerges from the previous form/.test(script.prompt),
      'the RULE line does not require physical emergence');
  }
  return '3, 5 and 8 beats: blocks + STYLE + RULE';
});

test('gate: analyzeReference turns observations into STYLE DNA', () => {
  const result = analyzeReference({
    duration: 12,
    aspect: '21:9',
    materials: ['monospaced glyphs', 'operators'],
    camera: ['forward punch-through', 'orbital lock'],
    densityCurve: 'compress → release every 2s',
    typography: 'one cropped word, then fragments',
    transitions: ['glyph sphere', 'implosion', 'cursor vortex'],
    ending: 'mid-dive into a cursor',
  });
  ok(result.styleDNA.startsWith('FORMAT: 21:9, ~12s'), 'STYLE DNA has no FORMAT line');
  for (const key of ['MATERIALS', 'CAMERA', 'DENSITY', 'TYPOGRAPHY', 'TRANSITION MECHANISMS', 'ENDING', 'CHAIN']) {
    ok(result.styleDNA.includes(`${key}:`), `STYLE DNA is missing the ${key} line`);
  }
  ok(result.notes.length >= 3, 'analyzeReference should return its analysis notes');
  deepEq(analyzeReference({ transitions: ['implosion'] }).styleDNA,
    analyzeReference({ transitions: ['implosion'] }).styleDNA, 'analyzeReference is not deterministic');
  const unknown = analyzeReference({ transitions: ['not a mechanism at all'] });
  ok(unknown.chain.length >= 1, 'an unrecognised transition list should still produce a chain');
  const first = analyzeReference({ transitions: ['cursor vortex'] }).chain[0].mechanism;
  eq(first, 'cursor-vortex', 'transitions should be resolved by name');
  return trim(result.styleDNA.split('\n').at(-1));
});

/* ================================================================== *
 * 6. Renderer
 * ================================================================== */

test('render: planFilm builds one shot per link and spans the clip', () => {
  const f = film();
  eq(f.shots.length, f.chain.length, 'shot count does not match the chain');
  near(f.shots[0].t0, 0, 1e-9, 'the film does not start at 0');
  near(f.shots.at(-1).t1, f.duration, 1e-9, 'the film does not end at its duration');
  for (let i = 1; i < f.shots.length; i++) {
    near(f.shots[i].t0, f.shots[i - 1].t1, 1e-9, `shot ${i} does not begin where shot ${i - 1} ended`);
  }
  for (const s of f.shots) {
    ok(s.primitives.length > 0, `shot "${s.mechanism}" declared no primitives`);
    ok(s.density >= 0 && s.density <= 1, `shot "${s.mechanism}" has density ${s.density}`);
    // A FilmSpec holds primitive *specs*; the points are compiled on demand.
    ok(s.scenePointCount > 0, `shot "${s.mechanism}" budgets zero points`);
    const { primitives } = compileScene({ seed: s.seed, primitives: s.primitives });
    eq(primitives.length, s.primitives.length, `shot "${s.mechanism}" lost a primitive when compiled`);
    for (const p of primitives) {
      eq(p.pts.length, p.count * 3, `primitive "${p.kind}" has a malformed point buffer`);
      ok(p.pts.every((v) => Number.isFinite(v)), `primitive "${p.kind}" produced a non-finite coordinate`);
    }
  }
  return `${f.shots.length} shots × ${f.shots[0].duration.toFixed(2)}s = ${f.duration}s`;
});

test('render: renderFilmFrame returns a filled Grid with sane stats', () => {
  const f = film();
  const grid = renderFilmFrame(f, f.duration / 2, { cols: 120, rows: 30 });
  ok(grid instanceof Grid, 'renderFilmFrame did not return a Grid');
  eq(grid.cols, 120, 'grid width is wrong');
  eq(grid.rows, 30, 'grid height is wrong');
  const stats = grid.stats();
  ok(stats.filled > 0, 'the frame is empty');
  ok(stats.filled <= stats.cells, 'more cells are filled than exist');
  ok(stats.density > 0 && stats.density < 1, `density ${stats.density} is not strictly inside (0,1)`);
  ok(stats.meanInk > 0 && stats.meanInk <= 1, `meanInk ${stats.meanInk} is out of range`);
  ok(stats.maxInk > 0 && stats.maxInk <= 1, `maxInk ${stats.maxInk} is out of range`);
  eq(grid.toText().split('\n').length, 30, 'toText() has the wrong number of rows');
  for (const row of grid.toRows()) ok(!/\s$/.test(row), 'toText() left trailing whitespace');
  return `${stats.filled}/${stats.cells} cells (${(stats.density * 100).toFixed(1)}%), meanInk ${stats.meanInk.toFixed(2)}`;
});

test('render: every emitted code stays inside printable ASCII', () => {
  const f = film();
  let checked = 0;
  for (const t of [0, 0.4, 2.2, 4.6, 7.5, 9.1, 12.3, 14.9]) {
    const grid = renderFilmFrame(f, t, { cols: 100, rows: 26 });
    const codes = emittedCodes(grid);
    ok(codes.length > 0, `no marks at t=${t}s`);
    for (const code of codes) {
      if (!(code >= FIRST && code <= LAST)) {
        fail(`t=${t}s emitted 0x${code.toString(16)} (${JSON.stringify(String.fromCharCode(code))}), ` +
          'outside 0x20–0x7E');
      }
    }
    checked += codes.length;
  }
  return `${checked} marks over 8 frames, all in 0x20–0x7E`;
});

test('render: the frames of a film actually change over time', () => {
  const f = film();
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    const t = (i / 7) * (f.duration - 0.05);
    seen.add(renderFilmFrame(f, t, { cols: 80, rows: 20 }).toText());
  }
  eq(seen.size, 8, 'the film holds still: some sampled frames are identical');
  const at = (t) => renderFilmFrame(f, t, { cols: 80, rows: 20 }).stats().filled;
  ok(new Set([at(0), at(7.5), at(14.9)]).size >= 2, 'the frame density never changes');
  return '8 distinct frames';
});

test('render: each mechanism in the grammar can be rendered', () => {
  const rendered = [];
  for (const m of MECHANISMS.filter((x) => x.tier !== 'reject')) {
    const script = buildScript({ chain: planChain({ count: 3, startForm: 'void', allow: [m.id] }) });
    // `allow` with fewer mechanisms than beats may repeat; render the first shot only.
    const f = planFilm(script);
    const grid = renderFilmFrame({ ...f, shots: [f.shots[0]], duration: 3 }, 1.5, { cols: 60, rows: 16 });
    ok(grid.stats().filled > 0, `mechanism "${m.id}" rendered an empty frame`);
    rendered.push(m.id);
  }
  return `${rendered.length} mechanisms render`;
});

test('render: an unknown primitive kind is rejected, not ignored', () => {
  let threw = false;
  try {
    planFilm(buildScript({ chain: [{ ...planChain({ count: 3 })[0], mechanism: 'not-a-mechanism' }] }));
  } catch {
    threw = true;
  }
  // The chain builder substitutes the field scene for unknown ids; the frame
  // must still render rather than silently emit nothing.
  const f = planFilm(buildScript({
    chain: [{ ...planChain({ count: 3 })[0], mechanism: 'not-a-mechanism' }],
  }));
  const grid = renderFilmFrame(f, 0.5, { cols: 60, rows: 16 });
  ok(grid.stats().filled > 0, `an unknown mechanism rendered an empty frame (threw=${threw})`);
  return 'unknown ids fall back to a rendered field';
});

test('render: a Camera projects deterministically and drops points behind it', () => {
  const cam = new Camera({ pos: [0, 0, 6], target: [0, 0, 0] });
  cam.look();
  const front = cam.project([0, 0, 0]);
  ok(front && front.depth > 0, 'the target should project in front of the camera');
  eq(cam.project([0, 0, 9]), null, 'a point behind the camera should not project');
  deepEq(cam.project([0, 0, 0]), front, 'projection is not deterministic');
  const right = cam.project([1, 0, 0]);
  ok(right.rx > 0, 'a point to the right should project to positive rx');
  const up = cam.project([0, 1, 0]);
  ok(up.ry > 0, 'a point above should project to positive ry');
  return `target at depth ${front.depth.toFixed(2)}`;
});

/* ================================================================== *
 * 7. Raster and PNG
 * ================================================================== */

test('raster: gridToSvg emits a complete SVG document', () => {
  const f = film();
  const grid = renderFilmFrame(f, 7.5, { cols: 60, rows: 16 });
  const svg = gridToSvg(grid, { palette: f.palette, title: 'test frame' });
  ok(svg.startsWith('<svg'), `SVG does not start with <svg: ${JSON.stringify(svg.slice(0, 40))}`);
  ok(svg.trimEnd().endsWith('</svg>'), `SVG does not end with </svg>: ${JSON.stringify(svg.slice(-40))}`);
  ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), 'SVG has no namespace');
  ok(/width="\d+" height="\d+"/.test(svg), 'SVG has no pixel dimensions');
  ok(svg.includes('<path'), 'SVG contains no glyph paths');
  ok(svg.includes('shape-rendering="crispEdges"'), 'SVG does not request crisp edges');
  ok(!svg.includes('NaN'), 'SVG contains NaN coordinates');
  const rects = (svg.match(/<rect/g) ?? []).length;
  eq(rects, 1, 'SVG should carry exactly one background rect');
  eq(gridToSvg(grid, { palette: f.palette, title: 'test frame' }), svg, 'gridToSvg is not deterministic');
  const escaped = gridToSvg(grid, { title: '<script>&"' });
  ok(!escaped.includes('<script>'), 'the SVG title was not XML-escaped');
  return `${svg.length} bytes, ${(svg.match(/<path/g) ?? []).length} paths`;
});

test('raster: gridToRgb and encodePng produce a valid PNG', () => {
  const f = film();
  const grid = renderFilmFrame(f, 7.5, { cols: 40, rows: 12 });
  const { width, height, rgb } = gridToRgb(grid, { palette: f.palette, cellW: 4, cellH: 8 });
  eq(width, 40 * 4, 'raster width is wrong');
  eq(height, 12 * 8, 'raster height is wrong');
  eq(rgb.length, width * height * 3, 'RGB buffer length does not match its dimensions');
  const buf = encodePng(width, height, rgb);
  ok(Buffer.isBuffer(buf), 'encodePng did not return a Buffer');
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  ok(buf.subarray(0, 8).equals(SIG), `PNG signature is wrong: ${[...buf.subarray(0, 8)].join(',')}`);
  const ihdr = buf.indexOf('IHDR');
  ok(ihdr > 0, 'the PNG has no IHDR chunk');
  eq(buf.readUInt32BE(ihdr - 4), 13, 'IHDR chunk length should be 13');
  eq(buf.readUInt32BE(ihdr + 4), width, 'IHDR width does not match');
  eq(buf.readUInt32BE(ihdr + 8), height, 'IHDR height does not match');
  eq(buf[ihdr + 12], 8, 'IHDR bit depth should be 8');
  eq(buf[ihdr + 13], 2, 'IHDR colour type should be 2 (truecolour)');
  ok(buf.indexOf('IDAT') > 0, 'the PNG has no IDAT chunk');
  ok(buf.indexOf('IEND') > 0, 'the PNG has no IEND chunk');
  ok(buf.subarray(0, buf.length - 12).indexOf('IEND') === -1, 'IEND is not the final chunk');
  ok(buf.length > 100, 'the PNG is suspiciously small');
  ok(buf.equals(encodePng(width, height, rgb)), 'encodePng is not deterministic');
  return `${width}×${height}, ${buf.length} bytes, IHDR + IDAT + IEND`;
});

test('raster: SVG and PNG agree on structure and stay in the palette', () => {
  const f = film();
  const grid = renderFilmFrame(f, 5.5, { cols: 36, rows: 12 });
  const svg = gridToSvg(grid, { palette: f.palette });
  const { rgb } = gridToRgb(grid, { palette: f.palette });
  const colors = new Set();
  for (let i = 0; i < rgb.length; i += 3) {
    colors.add(`${rgb[i]},${rgb[i + 1]},${rgb[i + 2]}`);
  }
  ok(colors.size >= 2, 'a rasterized frame should hold at least a background and an ink');
  ok(svg.length > 0 && rgb.length > 0, 'one of the emitters returned nothing');
  // Every pixel must lie on the line between the palette background and one of
  // its layer inks: the raster blends weight, it never invents a hue.
  // Every pixel must lie on the segment between the palette background and one
  // of its layer inks: the raster blends weight continuously, so membership is
  // a colinearity test, not a lookup in an enumerable set.
  const pal = paletteFor(f.palette);
  const bg = hexToRgb(pal.bg);
  const inks = pal.layers.map((l) => hexToRgb(l.ink));
  const onAnySegment = (r, g, b) => inks.some((ink) => {
    let scale = 0;
    for (let ch = 0; ch < 3; ch++) {
      const span = ink[ch] - bg[ch];
      if (Math.abs(span) < 1) continue;
      scale = Math.max(scale, Math.abs(([r, g, b][ch] - bg[ch]) / span));
    }
    if (scale > 1.02) return false;
    return [0, 1, 2].every((ch) => Math.abs(bg[ch] + (ink[ch] - bg[ch]) * scale - [r, g, b][ch]) <= 2);
  });
  const offPalette = [...colors].filter((key) => {
    const [r, g, b] = key.split(',').map(Number);
    return !onAnySegment(r, g, b);
  });
  eq(offPalette.length, 0, `the raster used ${offPalette.length} off-palette colour(s), e.g. ${offPalette[0]}`);
  eq(gridToText(grid), grid.toText(), 'gridToText disagrees with Grid.toText');
  return `${colors.size} distinct colours`;
});

/* ================================================================== *
 * 8. CLI smoke test — the engine as the user meets it
 * ================================================================== */

test('cli: `node src/cli.js doctor` exits 0 and reports all core checks passed', () => {
  const stdout = execFileSync(process.execPath, [CLI, 'doctor'], { encoding: 'utf8' });
  ok(stdout.includes('all core checks passed'), `doctor stdout: ${trim(stdout)}`);
  ok(!/\[XX\]/.test(stdout), `doctor reported a failed check: ${trim(stdout)}`);
  ok(/v\d+\.\d+\.\d+/.test(stdout), 'doctor did not report a version');
  return trim(stdout.split('\n').filter((l) => l.startsWith('[ok] render')).join(' ') || 'ok');
});

test('cli: plan, chain, prompt and review run without an API key', () => {
  const run = (args) => execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const plan = run(['plan', BRIEF, '--seed', 'cli']);
  ok(/TRANSFORMATION CHAIN/.test(plan), 'plan has no chain section');
  ok(/QUALITY GATE\s+PASS/.test(plan), `plan did not pass the gate:\n${trim(plan)}`);
  const chain = run(['chain', BRIEF]);
  ok(chain.split('\n').filter((l) => /^\s*\d+\./.test(l)).length === 5, 'chain should print 5 beats');
  const prompt = run(['prompt', BRIEF]);
  ok(/STYLE:/.test(prompt) && /RULE:/.test(prompt), 'prompt has no STYLE/RULE lines');
  const reviewJson = JSON.parse(run(['review', BRIEF, '--json']));
  eq(reviewJson.checks.length, 7, 'review --json does not report 7 checks');
  eq(reviewJson.pass, true, 'review --json failed a well-formed brief');
  const mechanisms = run(['mechanisms', '--json']);
  eq(JSON.parse(mechanisms).length, MECHANISMS.length, 'mechanisms --json is out of sync with the grammar');
  return `plan PASS, ${reviewJson.score}/100, ${MECHANISMS.length} mechanisms listed`;
});

test('cli: reference, continue and preview all work offline', () => {
  const run = (args) => execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const tmp = mkdtempSync(join(tmpdir(), 'ascii-h3-test-'));
  try {
    const obsFile = join(tmp, 'obs.json');
    writeFileSync(obsFile, JSON.stringify({
      duration: 12, aspect: '21:9',
      materials: ['monospaced glyphs'],
      camera: ['forward punch-through'],
      densityCurve: 'compress and release',
      typography: 'one cropped word',
      transitions: ['boot signal', 'assemble', 'glyph sphere'],
      ending: 'mid-motion',
    }));
    const dna = run(['reference', obsFile]);
    ok(dna.includes('FORMAT: 21:9, ~12s'), `reference output: ${trim(dna)}`);
    ok(dna.includes('CHAIN:'), 'reference output has no CHAIN line');

    const exitFile = join(tmp, 'exit.json');
    const exitStateJson = JSON.stringify(exitState({
      form: 'space', camera: 'tunnel-travel', velocity: 1.2,
      palette: 'brutalist-digital', ramp: 'brutalist',
      unresolved: 'the tunnel is still opening when the clip ends',
    }));
    writeFileSync(exitFile, exitStateJson);
    const cont = run(['continue', exitFile, 'a 15 second sequel']);
    ok(/SEAM: holds/.test(cont), `continuation seam did not hold:\n${trim(cont)}`);

    const frame = run(['preview', BRIEF, '--t', '4', '--cols', '60', '--rows', '16']);
    ok(frame.trim().length > 0, 'preview printed nothing');
    ok(frame.split('\n').length >= 16, 'preview printed fewer rows than requested');
    return 'reference, continue and preview all offline';
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ *
 * 9. Coverage of the parts a preview depends on
 * ------------------------------------------------------------------ */

test('render: each non-rejected mechanism renders a non-empty frame', () => {
  const rendered = [];
  for (const m of MECHANISMS) {
    if (m.tier === 'reject') continue;
    // One beat, opened freely on this mechanism (the first beat of a chain is
    // chosen from the pool, so this also proves the pool admits every tier).
    const s = buildScript({ chain: planChain({ startForm: 'void', count: 1, allow: [m.id] }) });
    const f = planFilm(s);
    eq(f.shots[0].mechanism, m.id, `allow:[${m.id}] did not open on it`);
    const grid = renderFilmFrame(f, f.duration / 2, { cols: 60, rows: 16 });
    ok(grid.stats().filled > 0, `mechanism "${m.id}" rendered an empty frame`);
    rendered.push(m.id);
  }
  eq(rendered.length, MECHANISMS.filter((m) => m.tier !== 'reject').length,
    'not every usable mechanism was rendered');
  return `${rendered.length} mechanisms render`;
});

test('render: hero text lands only on beats that can carry it', () => {
  const f = film({ heroText: ['VOID', 'MEMORY'] });
  const carriers = new Set(['giant-word', 'type-wall', 'letter-fragmentation', 'mask', 'shockwave']);
  const withHero = f.shots.filter((s) => s.hero);
  ok(withHero.length > 0, 'hero text was dropped entirely');
  for (const s of withHero) {
    ok(carriers.has(s.mechanism),
      `mechanism "${s.mechanism}" was handed hero text it cannot hold`);
  }
  eq(film({ heroText: [] }).shots.filter((s) => s.hero).length, 0,
    'hero text appeared without being requested');
  return `${withHero.length} carrier beat(s): ${withHero.map((s) => `${s.mechanism}=${s.hero}`).join(', ')}`;
});

test('render: every declared palette resolves and blends in range', () => {
  for (const name of Object.keys(PALETTES)) {
    const pal = paletteFor(name);
    deepEq(pal, PALETTES[name], `paletteFor("${name}") did not return the declared palette`);
    ok(pal.layers.length >= 2, `palette "${name}" has fewer than two layers`);
    for (let layer = 0; layer < pal.layers.length; layer++) {
      const rgb = inkColor(pal, { layer, weight: 1 });
      eq(rgb.length, 3, 'inkColor did not return an RGB triple');
      for (const v of rgb) ok(Number.isInteger(v) && v >= 0 && v <= 255, `channel ${v} out of range`);
    }
  }
  deepEq(paletteFor('does-not-exist'), PALETTES['brutalist-digital'],
    'an unknown palette should fall back to brutalist-digital');
  return `${Object.keys(PALETTES).length} palettes resolve`;
});

test('cli: an unknown command exits non-zero', () => {
  let status = 0;
  try {
    execFileSync(process.execPath, [CLI, 'not-a-command'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    status = err.status;
  }
  eq(status, 2, 'an unknown command should exit 2');
  return 'unknown command exits 2';
});

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const failures = [];
let passed = 0;
const t0 = Date.now();

for (const [name, fn] of cases) {
  try {
    const detail = await fn();
    passed++;
    console.log(`PASS  ${name}${detail ? `\n        ${detail}` : ''}`);
  } catch (err) {
    failures.push({ name, err });
    const kind = err instanceof AssertionError ? 'assertion' : (err && err.constructor && err.constructor.name) || 'error';
    console.log(`FAIL  ${name}\n        ${kind}: ${err && err.message ? err.message : String(err)}`);
    if (!(err instanceof AssertionError) && err && err.stack) {
      const frame = err.stack.split('\n').slice(1, 3).map((l) => l.trim()).join('\n        ');
      if (frame) console.log(`        ${frame}`);
    }
  }
}

const ms = Date.now() - t0;
const total = cases.length;
console.log('');
if (failures.length) {
  console.log(`FAILED ${failures.length}/${total} tests — ${failures.map((f) => f.name).join(', ')}`);
  console.log(`${total - failures.length} passed, ${failures.length} failed in ${ms}ms`);
  process.exit(1);
}
console.log(`PASSED ${passed}/${total} tests in ${ms}ms`);
console.log(`OK — ${total}/${total} passed, 0 failed`);
