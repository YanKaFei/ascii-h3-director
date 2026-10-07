/**
 * ascii-h3-director — deterministic core utilities.
 *
 * Zero dependencies. No Math.random, no wall-clock reads, no environment reads.
 * Every stochastic process is seeded so that a FilmSpec re-renders bit-identically.
 */

/* ------------------------------------------------------------------ *
 * Seeded RNG — sfc32. Fast, tiny, and good enough for visual work.
 * ------------------------------------------------------------------ */

/**
 * @param {number|string} seed
 * @returns {() => number} uniform generator in [0, 1)
 */
export function rng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = (h ^ 0x9e3779b9) >>> 0;
  let b = (h ^ 0x85ebca6b) >>> 0;
  let c = (h ^ 0xc2b2ae35) >>> 0;
  let d = (h ^ 0x27d4eb2f) >>> 0;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) >>> 0;
    t = (t + d) >>> 0;
    c = (c + t) >>> 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  return next;
}

/** Stable string hash → unsigned 32-bit. */
export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * Vector / scalar helpers (plain arrays, no allocation-heavy classes)
 * ------------------------------------------------------------------ */

export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
};

/* ------------------------------------------------------------------ *
 * Easing — the director's punctuation.
 * ------------------------------------------------------------------ */

export const EASE = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  /** Punch-through: slow load, violent release. */
  punch: (t) => Math.pow(t, 3.2),
  /** Implosion: violent start, dead stop. */
  implode: (t) => 1 - Math.pow(1 - t, 3.2),
  /** Freeze: hard arrival then hold. */
  freeze: (t) => Math.min(1, t * 1.6),
  /** Suction: accelerates away from rest. */
  suction: (t) => Math.pow(t, 2.6) * (1 + 0.25 * Math.sin(t * Math.PI * 3)),
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.35;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
  /** Snap: step-with-overshoot, used for hard typographic impacts. */
  snap: (t) => {
    if (t >= 1) return 1;
    const s = 1.7;
    return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  },
};

/* ------------------------------------------------------------------ *
 * Noise — value noise with seeded gradients, integer-hash based.
 * ------------------------------------------------------------------ */

function fract(x) { return x - Math.floor(x); }
function hash1(n) { return fract(Math.sin(n) * 43758.5453123); }

export function valueNoise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = fract(x);
  const u = f * f * (3 - 2 * f);
  const a = hash1(i + seed * 71.13);
  const b = hash1(i + 1 + seed * 71.13);
  return a + (b - a) * u;
}

export function valueNoise3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fract(x), fy = fract(y), fz = fract(z);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const h = (a, b, c) => hash1(a * 127.1 + b * 311.7 + c * 74.7 + seed * 91.7);
  const c000 = h(ix, iy, iz), c100 = h(ix + 1, iy, iz);
  const c010 = h(ix, iy + 1, iz), c110 = h(ix + 1, iy + 1, iz);
  const c001 = h(ix, iy, iz + 1), c101 = h(ix + 1, iy, iz + 1);
  const c011 = h(ix, iy + 1, iz + 1), c111 = h(ix + 1, iy + 1, iz + 1);
  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

/* ------------------------------------------------------------------ *
 * ASCII ramps — the renderer's only vocabulary for choosing a glyph.
 * ------------------------------------------------------------------ */

export const RAMPS = {
  /** Classic density ramp, dark→light. */
  classic: ' .:-=+*#%@',
  /** Brutalist computational: punctuation and operators as structure. */
  brutalist: ' .`\'",:;!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  /** Minimal signal: high contrast, very few tones. */
  minimal: ' .*#',
  /** Code / operator ramp — reads as source text, not as a photograph. */
  operators: ' .:-=+<>[]{}()/\\|!?*&#%@$',
  /** Binary / boot ramp. */
  binary: ' .01',
  /** Data ramp for dense fields. */
  data: ' .oO0#@',
  /** Terminal green phosphor feel. */
  phosphor: ' .:-=+*#%@@',
  /** Wide glyph vocabulary for typographic walls. */
  typographic: ' .,:;i1tfLCG08@#',
};

export const PALETTES = {
  'brutalist-digital': {
    bg: '#050506',
    layers: [
      { ink: '#f2f4f5', name: 'structure' },
      { ink: '#7dff4a', name: 'data' },
      { ink: '#3ea6ff', name: 'secondary' },
      { ink: '#ff2f45', name: 'signal' },
    ],
  },
  'minimal-signal': {
    bg: '#040404',
    layers: [
      { ink: '#ffffff', name: 'structure' },
      { ink: '#ff3b30', name: 'signal' },
    ],
  },
  phosphor: {
    bg: '#020604',
    layers: [
      { ink: '#8dffb0', name: 'structure' },
      { ink: '#26ff7a', name: 'data' },
      { ink: '#d9ffe6', name: 'highlight' },
    ],
  },
  'paper-terminal': {
    bg: '#0b0b0c',
    layers: [
      { ink: '#e8e6e1', name: 'structure' },
      { ink: '#c8b273', name: 'accent' },
      { ink: '#6fb3c9', name: 'secondary' },
    ],
  },
  monolith: {
    bg: '#000000',
    layers: [
      { ink: '#ffffff', name: 'structure' },
      { ink: '#9aa0a6', name: 'mid' },
      { ink: '#2b2f33', name: 'shadow' },
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}
