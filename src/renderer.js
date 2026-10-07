/**
 * Deterministic ASCII rasterizer.
 *
 * A frame is a character grid. Every cell holds one ASCII code point and one
 * ink value; nothing else. There are no source images and no sampled footage:
 * a shot compiles to a seeded cloud of point primitives, a camera flies
 * through it, and the grid is what the camera sees.
 *
 * Determinism: no Math.random, no wall clock, no environment reads. Re-rendering
 * the same spec produces byte-identical frames. This is what lets the plugin
 * *show* the director a preview before spending money on a generation.
 *
 * Zero dependencies.
 */

import { rng, V, EASE, clamp, lerp, valueNoise3 } from './core.js';
import { glyphRows, glyphInk, pickGlyph, GLYPH_W, GLYPH_H, rampFromGlyphs } from './glyph-atlas.js';
import { RAMPS, PALETTES } from './core.js';
import { MECHANISM_BY_ID, densityCurve } from './motion-grammar.js';

/* ------------------------------------------------------------------ *
 * Grid — the character canvas
 * ------------------------------------------------------------------ */

export class Grid {
  /**
   * @param {number} cols
   * @param {number} rows
   */
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.codes = new Uint8Array(cols * rows).fill(0x20);
    /** signed ink, 0 = empty; magnitude = weight; sign = layer index (0..3) */
    this.ink = new Float32Array(cols * rows);
    this.depth = new Float32Array(cols * rows).fill(Infinity);
  }

  clear() {
    this.codes.fill(0x20);
    this.ink.fill(0);
    this.depth.fill(Infinity);
    return this;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  /**
   * Write a glyph, keeping whichever primitive is nearer the camera.
   * @param {number} x integer column
   * @param {number} y integer row
   * @param {number} code ascii code point
   * @param {number} depth camera-space depth (smaller = nearer)
   * @param {number} weight 0..1 apparent brightness
   * @param {number} layer 0..3 palette layer index
   */
  put(x, y, code, depth, weight, layer = 0) {
    if (!this.inBounds(x, y)) return;
    const i = y * this.cols + x;
    if (depth > this.depth[i]) return;
    this.depth[i] = depth;
    this.codes[i] = code;
    this.ink[i] = Math.abs(weight) * (layer === 0 ? 1 : 1) * (weight < 0 ? -1 : 1);
  }

  /** Composite a glyph additively (used for accumulative fields). */
  add(x, y, code, depth, weight, layer = 0) {
    if (!this.inBounds(x, y)) return;
    const i = y * this.cols + x;
    if (depth < this.depth[i]) {
      this.depth[i] = depth;
      this.codes[i] = code;
    }
    this.ink[i] = clamp(this.ink[i] + weight, -1, 4);
    void layer;
  }

  /** Plain string rows, spaces for blanks. */
  toRows() {
    const out = [];
    for (let y = 0; y < this.rows; y++) {
      let s = '';
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        s += String.fromCharCode(this.codes[i] || 0x20);
      }
      out.push(s.replace(/\s+$/, ''));
    }
    return out;
  }

  toText() {
    return this.toRows().join('\n');
  }

  /**
   * Runs of same-layer cells, for SVG/PNG emission. Returns
   * [{x, y, code, weight, layer}] for non-empty cells only.
   */
  cells() {
    const out = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = y * this.cols + x;
        if (this.codes[i] === 0x20) continue;
        const w = this.ink[i];
        out.push({
          x,
          y,
          code: this.codes[i],
          weight: Math.min(1, Math.abs(w)),
          layer: w < 0 ? 3 : 0,
        });
      }
    }
    return out;
  }

  /** Coverage stats for the review harness. */
  stats() {
    let filled = 0;
    let sum = 0;
    let maxW = 0;
    for (let i = 0; i < this.codes.length; i++) {
      if (this.codes[i] !== 0x20) {
        filled++;
        sum += Math.abs(this.ink[i]);
        maxW = Math.max(maxW, Math.abs(this.ink[i]));
      }
    }
    return {
      cols: this.cols,
      rows: this.rows,
      cells: this.codes.length,
      filled,
      density: filled / this.codes.length,
      meanInk: filled ? sum / filled : 0,
      maxInk: maxW,
    };
  }
}

/* ------------------------------------------------------------------ *
 * Text stamping — turns strings into the same physical matter
 * ------------------------------------------------------------------ */

/**
 * Stamp a string into the grid as glyphs. Used for hero typography, walls and
 * masks, so type and point clouds share one rasterizer.
 *
 * @param {Grid} grid
 * @param {string} text
 * @param {{x?:number,y?:number,scale?:number,letterSpacing?:number,depth?:number,
 *          weight?:number,layer?:number,vertical?:boolean}} [opts]
 */
export function stampText(grid, text, opts = {}) {
  const scale = opts.scale ?? 1;
  const spacing = opts.letterSpacing ?? 1;
  const depth = opts.depth ?? 1;
  const weight = opts.weight ?? 1;
  const layer = opts.layer ?? 0;
  const chars = [...String(text)];

  // Measure for centring when x is omitted.
  const cellW = (GLYPH_W + spacing) * scale;
  const totalW = chars.length * cellW - spacing * scale;
  let ox = opts.x ?? Math.round((grid.cols - totalW) / 2);
  const oy = opts.y ?? Math.round((grid.rows - GLYPH_H * scale) / 2);

  for (const ch of chars) {
    const code = ch.charCodeAt(0);
    const rows = glyphRows(code);
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const mask = rows[gy];
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (!(mask & (1 << (GLYPH_W - 1 - gx)))) continue;
        // A glyph pixel becomes a run of `scale` cells, so type has real weight.
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = Math.round(ox + gx * scale + sx);
            const py = Math.round(oy + gy * scale + sy);
            grid.put(px, py, code, depth, weight, layer);
          }
        }
      }
    }
    ox += cellW;
  }
  return { x: opts.x ?? Math.round((grid.cols - totalW) / 2), y: oy, w: totalW, h: GLYPH_H * scale };
}

/**
 * Draw a string as *density* rather than as letterforms: the glyph is chosen
 * from the ramp by local field value. This is how text participates in a
 * point-cloud world without looking pasted on.
 */
export function stampTextAsField(grid, text, field, opts = {}) {
  const scale = opts.scale ?? 1;
  const spacing = opts.letterSpacing ?? 1;
  const ramp = opts.ramp ?? 'brutalist';
  const layer = opts.layer ?? 0;
  const chars = [...String(text)];
  const cellW = (GLYPH_W + spacing) * scale;
  const totalW = chars.length * cellW - spacing * scale;
  let ox = opts.x ?? Math.round((grid.cols - totalW) / 2);
  const oy = opts.y ?? Math.round((grid.rows - GLYPH_H * scale) / 2);

  for (const ch of chars) {
    const rows = glyphRows(ch.charCodeAt(0));
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const mask = rows[gy];
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (!(mask & (1 << (GLYPH_W - 1 - gx)))) continue;
        const px = Math.round(ox + gx * scale);
        const py = Math.round(oy + gy * scale);
        const d = field(px, py);
        const code = pickGlyph(ramp, d * 0.85 + 0.15);
        grid.put(px, py, code, opts.depth ?? 1, 0.4 + d * 0.6, layer);
      }
    }
    ox += cellW;
  }
}

/* ------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------ */

/**
 * A pinhole camera. `focal` stays 1.0: framing is controlled by distance,
 * never by folding distance into focal (which double-counts and yields a film
 * that looks plausible but is subtly broken).
 */
export class Camera {
  constructor(opts = {}) {
    this.pos = opts.pos ?? [0, 0, 6];
    this.target = opts.target ?? [0, 0, 0];
    this.up = opts.up ?? [0, 1, 0];
    this.focal = 1.0;
    this.roll = opts.roll ?? 0;
    this._basis = null;
  }

  /** Recompute the view basis (call once per frame, not per primitive). */
  look() {
    const f = V.norm(V.sub(this.target, this.pos));
    let r = V.cross(f, this.up);
    if (V.len(r) < 1e-6) r = V.cross(f, [0, 0, 1]);
    r = V.norm(r);
    let u = V.norm(V.cross(r, f));
    if (this.roll) {
      const c = Math.cos(this.roll), s = Math.sin(this.roll);
      const r2 = V.add(V.mul(r, c), V.mul(u, s));
      const u2 = V.add(V.mul(u, c), V.mul(r, -s));
      r = r2; u = u2;
    }
    this._basis = { f, r, u };
    return this;
  }

  /**
   * Project a world point. Returns null when behind the camera.
   * @param {number[]} p
   * @returns {{rx:number, ry:number, depth:number}|null} rx/ry in [-1,1] on the short axis
   */
  project(p) {
    const { f, r, u } = this._basis;
    const d = V.sub(p, this.pos);
    const depth = V.dot(d, f);
    if (depth <= 0.05) return null;
    const x = (V.dot(d, r) / depth) * this.focal;
    const y = (V.dot(d, u) / depth) * this.focal;
    return { rx: x, ry: y, depth };
  }
}

/* ------------------------------------------------------------------ *
 * Primitives — the only content a scene can be made of
 * ------------------------------------------------------------------ */

/** @typedef {{kind:string, seed:number, [k:string]:any}} Primitive */

const PRIMITIVE_BUILDERS = {
  /** A volumetric character cloud filling a box. */
  pointCloud(p, rand) {
    const n = p.count ?? 2000;
    const ext = p.extent ?? [10, 6, 10];
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pts[i * 3] = (rand() - 0.5) * ext[0];
      pts[i * 3 + 1] = (rand() - 0.5) * ext[1];
      pts[i * 3 + 2] = (rand() - 0.5) * ext[2];
    }
    return { ...p, pts, count: n };
  },

  /** Concentric rings receding down +z: the tunnel. */
  rings(p, rand) {
    const ringsCount = p.rings ?? 26;
    const per = p.perRing ?? 64;
    const radius = p.radius ?? 3.2;
    const depth = p.depth ?? 34;
    const n = ringsCount * per;
    const pts = new Float32Array(n * 3);
    const meta = new Float32Array(n);
    let k = 0;
    for (let r = 0; r < ringsCount; r++) {
      const z = (r / ringsCount) * depth;
      const rr = radius * (0.35 + 0.65 * (r / ringsCount)) * (p.taper ? 1 + r / ringsCount : 1);
      const spin = p.spin ? (r / ringsCount) * Math.PI * (p.spinTurns ?? 2) : 0;
      for (let i = 0; i < per; i++) {
        const a = (i / per) * Math.PI * 2 + spin + (rand() - 0.5) * 0.03;
        pts[k * 3] = Math.cos(a) * rr;
        pts[k * 3 + 1] = Math.sin(a) * rr * (p.flat ? 0.35 : 1);
        pts[k * 3 + 2] = z;
        meta[k] = r / ringsCount;
        k++;
      }
    }
    return { ...p, pts, meta, count: n };
  },

  /** A sphere whose every surface point is a glyph. */
  sphere(p, rand) {
    const n = p.count ?? 2600;
    const radius = p.radius ?? 2.6;
    const pts = new Float32Array(n * 3);
    const meta = new Float32Array(n);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i + (rand() - 0.5) * 0.02;
      pts[i * 3] = Math.cos(th) * r * radius;
      pts[i * 3 + 1] = y * radius;
      pts[i * 3 + 2] = Math.sin(th) * r * radius;
      meta[i] = Math.abs(y);
    }
    return { ...p, pts, meta, count: n };
  },

  /** Parallel planes of characters — walls the camera punches through. */
  walls(p, rand) {
    const planes = p.planes ?? 5;
    const gap = p.gap ?? 6;
    const w = p.w ?? 14;
    const h = p.h ?? 8;
    const n = planes * (p.perPlane ?? 700);
    const pts = new Float32Array(n * 3);
    const meta = new Float32Array(n);
    let k = 0;
    for (let pl = 0; pl < planes; pl++) {
      const z = pl * gap;
      for (let i = 0; i < (p.perPlane ?? 700); i++) {
        pts[k * 3] = (rand() - 0.5) * w;
        pts[k * 3 + 1] = (rand() - 0.5) * h;
        pts[k * 3 + 2] = z + (rand() - 0.5) * 0.4;
        meta[k] = pl / planes;
        k++;
      }
    }
    return { ...p, pts, meta, count: n };
  },

  /** A dense slab that can dissolve or compress. */
  slab(p, rand) {
    const n = p.count ?? 3000;
    const w = p.w ?? 12;
    const h = p.h ?? 7;
    const t = p.t ?? 0.5;
    const pts = new Float32Array(n * 3);
    const meta = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pts[i * 3] = (rand() - 0.5) * w;
      pts[i * 3 + 1] = (rand() - 0.5) * h;
      pts[i * 3 + 2] = (rand() - 0.5) * t;
      meta[i] = Math.hypot(pts[i * 3] / (w / 2), pts[i * 3 + 1] / (h / 2));
    }
    return { ...p, pts, meta, count: n };
  },

  /** A closed loop of characters: the vortex drain rim. */
  vortex(p, rand) {
    const n = p.count ?? 1800;
    const turns = p.turns ?? 3.2;
    const rIn = p.rIn ?? 0.25;
    const rOut = p.rOut ?? 6;
    const pts = new Float32Array(n * 3);
    const meta = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const r = lerp(rIn, rOut, Math.pow(u, p.power ?? 0.7));
      const a = u * Math.PI * 2 * turns + (rand() - 0.5) * 0.05;
      pts[i * 3] = Math.cos(a) * r;
      pts[i * 3 + 1] = Math.sin(a) * r;
      pts[i * 3 + 2] = -u * (p.length ?? 6) + (rand() - 0.5) * 0.3;
      meta[i] = u;
    }
    return { ...p, pts, meta, count: n };
  },

  /** A 2D plane of characters that can fold through itself. */
  plane(p, rand) {
    const n = p.count ?? 2600;
    const w = p.w ?? 16;
    const h = p.h ?? 9;
    const pts = new Float32Array(n * 3);
    const meta = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (rand() - 0.5) * w;
      const y = (rand() - 0.5) * h;
      pts[i * 3] = x;
      pts[i * 3 + 1] = y;
      pts[i * 3 + 2] = 0;
      meta[i] = Math.min(1, Math.hypot(x / (w / 2), y / (h / 2)));
    }
    return { ...p, pts, meta, count: n };
  },
};

/**
 * How many points a primitive spec will materialise. Some builders take an
 * explicit `count` (pointCloud, slab, sphere, plane, vortex); the parametric
 * ones derive it from their shape parameters (rings, walls). Keeping this in
 * one place lets a FilmSpec report its budget without compiling the buffers.
 *
 * @param {{kind:string, [k:string]:any}} spec
 * @returns {number}
 */
export function primitivePointCount(spec) {
  switch (spec.kind) {
    case 'rings': return (spec.rings ?? 26) * (spec.perRing ?? 64);
    case 'walls': return (spec.planes ?? 5) * (spec.perPlane ?? 700);
    default: return spec.count ?? 0;
  }
}

/**
 * Compile a shot into a primitive cloud. Pure and seeded.
 *
 * @param {object} shot
 * @returns {{primitives:Primitive[], seed:string}}
 */
export function compileScene(shot) {
  const rand = rng(shot.seed ?? 'ascii-h3');
  const primitives = [];
  for (const spec of shot.primitives ?? []) {
    const build = PRIMITIVE_BUILDERS[spec.kind];
    if (!build) throw new Error(`unknown primitive kind: ${spec.kind}`);
    primitives.push(build(spec, rand));
  }
  return { primitives, seed: shot.seed ?? 'ascii-h3' };
}

/* ------------------------------------------------------------------ *
 * Frame evaluation
 * ------------------------------------------------------------------ */

/**
 * Evaluate one frame of one shot.
 *
 * @param {object} args
 * @param {number} args.t            local time within the shot, seconds
 * @param {number} args.duration
 * @param {ReturnType<typeof compileScene>} args.scene
 * @param {Camera} args.camera
 * @param {number} args.cols
 * @param {number} args.rows
 * @param {string} args.ramp
 * @param {string} [args.heroText]
 * @param {number} [args.heroScale]
 * @param {number} [args.heroOpacity]  0..1
 * @param {number} [args.exposure]
 * @param {number} [args.splat]
 * @returns {Grid}
 */
export function evaluateFrame(args) {
  const {
    t, duration, scene, camera, cols, rows,
    ramp = RAMPS.brutalist,
    heroText, heroScale = 1, heroOpacity = 0,
    exposure = 1, splat = 1, paletteLayers = 4,
  } = args;

  const u = clamp(duration > 0 ? t / duration : 0, 0, 1);
  const grid = new Grid(cols, rows);
  camera.look();

  // Pass 1 accumulates mass per cell instead of letting the nearest point win
  // outright. Choosing a character from the *nearest point's* brightness makes
  // every dense cloud saturate to '@'; choosing it from the cell's accumulated
  // mass is what lets a tunnel read as rings and a sphere read as a sphere.
  const mass = new Float32Array(cols * rows);
  const nearDepth = new Float32Array(cols * rows).fill(Infinity);
  const layerOf = new Uint8Array(cols * rows);

  for (const prim of scene.primitives) {
    const { pts, meta, count } = prim;
    const layer = prim.layer ?? 0;
    const gain = prim.gain ?? 1;
    const noiseAmp = prim.noise ?? 0;
    const noiseFreq = prim.noiseFreq ?? 0.6;
    const seedNum = prim.seedNum ?? 1;

    for (let i = 0; i < count; i++) {
      let x = pts[i * 3];
      let y = pts[i * 3 + 1];
      let z = pts[i * 3 + 2];

      if (prim.motion) {
        const m = prim.motion;
        if (m.type === 'converge') {
          const k = EASE[m.ease ?? 'implode'](u);
          const s = lerp(1, m.to ?? 0.02, k);
          x *= s; y *= s; z *= s;
        } else if (m.type === 'expand') {
          const k = EASE[m.ease ?? 'expoOut'](u);
          const s = lerp(1, m.to ?? 6, k);
          x *= s; y *= s; z *= s;
        } else if (m.type === 'travel') {
          z -= EASE[m.ease ?? 'cubicInOut'](u) * (m.distance ?? 30);
        } else if (m.type === 'spin') {
          const a = u * (m.turns ?? 1) * Math.PI * 2;
          const c = Math.cos(a), s = Math.sin(a);
          const nx = x * c - z * s;
          const nz = x * s + z * c;
          x = nx; z = nz;
        } else if (m.type === 'fold') {
          const a = EASE.cubicInOut(u) * Math.PI;
          const c = Math.cos(a), s = Math.sin(a);
          if ((m.axis ?? 'y') === 'y') {
            const nx = x * c + z * s;
            const nz = -x * s + z * c;
            x = nx; z = nz;
          } else {
            const ny = y * c - z * s;
            const nz = y * s + z * c;
            y = ny; z = nz;
          }
        } else if (m.type === 'dissolve') {
          if (meta && meta[i] < EASE.quadIn(u) * (m.threshold ?? 1)) continue;
        } else if (m.type === 'assemble') {
          const k = EASE[m.ease ?? 'expoOut'](u);
          const s = lerp(1 + (m.scatter ?? 2.5), m.targetScale ?? 1, k);
          const wob = valueNoise3(x * 0.3, y * 0.3, z * 0.3, seedNum);
          x *= s * (1 + (wob - 0.5) * 0.15 * (1 - k));
          y *= s;
          z *= s;
        } else if (m.type === 'pulse') {
          const s = 1 + Math.sin(u * Math.PI * 2 * (m.freq ?? 2)) * (m.amp ?? 0.15);
          x *= s; y *= s; z *= s;
        } else if (m.type === 'vortex') {
          const k = EASE[m.ease ?? 'suction'](u);
          const a = k * (m.turns ?? 4) * Math.PI * 2;
          const c = Math.cos(a), s = Math.sin(a);
          const nx = x * c - y * s;
          const ny = x * s + y * c;
          x = nx * (1 - k * 0.85);
          y = ny * (1 - k * 0.85);
          z = lerp(z, -2, k);
        }
      }

      if (noiseAmp) {
        x += (valueNoise3(x * noiseFreq, y * noiseFreq, z * noiseFreq + u * 4, seedNum) - 0.5) * noiseAmp;
        y += (valueNoise3(y * noiseFreq + 11, z * noiseFreq, x * noiseFreq + u * 4, seedNum + 3) - 0.5) * noiseAmp;
      }

      const proj = camera.project([x, y, z]);
      if (!proj) continue;
      const { rx, ry, depth } = proj;
      const cx = Math.round((rx * 0.5 + 0.5) * cols);
      const cy = Math.round((ry * -0.5 + 0.5) * rows);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;

      // Depth falloff: near marks are heavier but do not saturate alone.
      const falloff = clamp(Math.pow(1 - (depth - 0.5) / (prim.fade ?? 30), 1.0), 0.02, 1);
      let w = falloff * gain * exposure;
      if (meta && prim.rim) w *= 1 + prim.rim * (1 - Math.abs(meta[i] * 2 - 1));
      if (w <= 0.01) continue;

      const idx = cy * cols + cx;
      mass[idx] += w * (prim.mass ?? 1.0);
      if (depth < nearDepth[idx]) { nearDepth[idx] = depth; layerOf[idx] = layer; }
    }
  }

  // Pass 2 quantises accumulated mass into characters. The normalisation uses
  // a soft knee so sparse fields still produce light marks and dense fields
  // reach the top of the ramp without flattening everything against it.
  const knee = massKnee(mass);
  for (let i = 0; i < mass.length; i++) {
    const m = mass[i];
    if (m <= 0.0001) continue;
    const d = clamp(Math.pow(m / (m + knee), 0.55), 0, 1);
    if (d < 0.06) continue;
    const code = pickGlyph(ramp, d);
    const y = (i / cols) | 0;
    const x = i - y * cols;
    grid.put(x, y, code, nearDepth[i], clamp(0.35 + d * 0.65, 0, 1), layerOf[i]);
  }

  if (heroText && heroOpacity > 0.01) {
    stampHero(grid, heroText, { scale: heroScale, opacity: heroOpacity, ramp, u });
  }

  void splat;
  void paletteLayers;
  return grid;
}

/**
 * The half-saturation mass of a frame. Estimating it per frame keeps exposure
 * stable across mechanisms whose point counts differ by an order of magnitude,
 * so a 260-point boot signal and a 3200-point field both read correctly.
 */
function massKnee(mass) {
  let max = 0;
  for (let i = 0; i < mass.length; i++) if (mass[i] > max) max = mass[i];
  if (max <= 0) return 1;
  return Math.max(0.10, max * 0.30);
}

function focalDistance(camera) {
  // The distance that frames a 2-unit-tall subject at focal 1.0.
  const targetDist = V.len(V.sub(camera.target, camera.pos));
  return Math.max(0.5, targetDist);
}

function stampHero(grid, text, opts) {
  const { scale, opacity, ramp, u } = opts;
  const rows = glyphRows(0x20);
  void rows;
  const chars = [...String(text)];
  const cellW = (GLYPH_W + 1) * scale;
  const totalW = chars.length * cellW;
  // The word grows from microscopic to beyond frame: scale is physical.
  const growth = lerp(0.2, 1.6, EASE.punch(clamp(u, 0, 1)));
  const s = Math.max(1, Math.round(scale * growth));
  const ox = Math.round((grid.cols - totalW * growth) / 2);
  const oy = Math.round((grid.rows - GLYPH_H * s) / 2);
  let x = ox;
  const layer = 3;
  for (const ch of chars) {
    const g = glyphRows(ch.charCodeAt(0));
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const mask = g[gy];
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (!(mask & (1 << (GLYPH_W - 1 - gx)))) continue;
        for (let sy = 0; sy < s; sy++) {
          for (let sx = 0; sx < s; sx++) {
            const px = x + gx * s + sx;
            const py = oy + gy * s + sy;
            const d = 0.82 + 0.18 * (gy / GLYPH_H);
            grid.put(px, py, pickGlyph(ramp, d), 0.5, opacity, layer);
          }
        }
      }
    }
    x += cellW * growth;
  }
}

/* ------------------------------------------------------------------ *
 * Script → scene plan
 * ------------------------------------------------------------------ */

/** Map a mechanism id to the primitives that realise it. */
const MECHANISM_SCENES = {
  'boot-signal': (seed) => [
    { kind: 'pointCloud', count: 260, extent: [9, 5, 3], layer: 0, gain: 0.9, seedNum: 5,
      motion: { type: 'assemble', scatter: 3.2, targetScale: 1, ease: 'expoOut' } },
  ],
  'assemble': (seed) => [
    { kind: 'slab', count: 2000, w: 8.5, h: 5, t: 0.3, layer: 0, gain: 1.05, seedNum: 11,
      motion: { type: 'assemble', scatter: 3.6, targetScale: 1, ease: 'expoOut' } },
    { kind: 'pointCloud', count: 900, extent: [16, 9, 6], layer: 1, gain: 0.5, seedNum: 21,
      motion: { type: 'assemble', scatter: 2.2, targetScale: 1, ease: 'quadOut' } },
  ],
  'density-dissolve': (seed) => [
    { kind: 'slab', count: 2200, w: 9.5, h: 5.6, t: 0.4, layer: 0, gain: 1.1, seedNum: 12,
      motion: { type: 'dissolve', threshold: 1.0 } },
    { kind: 'pointCloud', count: 1400, extent: [18, 10, 8], layer: 1, gain: 0.55, seedNum: 31,
      motion: { type: 'expand', to: 1.5, ease: 'quadOut' } },
  ],
  'structural-decay': (seed) => [
    { kind: 'walls', planes: 5, gap: 4.4, w: 11, h: 6.4, perPlane: 560, layer: 0, gain: 1.0, seedNum: 13,
      motion: { type: 'dissolve', threshold: 0.9 } },
    { kind: 'pointCloud', count: 1200, extent: [20, 12, 14], layer: 2, gain: 0.45, seedNum: 41,
      motion: { type: 'travel', distance: 8, ease: 'cubicIn' } },
  ],
  'letter-fragmentation': (seed) => [
    { kind: 'slab', count: 1700, w: 7, h: 4, t: 0.25, layer: 0, gain: 1.15, seedNum: 14,
      motion: { type: 'expand', to: 3.4, ease: 'expoOut' }, noise: 0.5, noiseFreq: 1.1 },
    { kind: 'pointCloud', count: 800, extent: [14, 8, 6], layer: 3, gain: 0.7, seedNum: 44,
      motion: { type: 'vortex', turns: 1.6, ease: 'quadIn' } },
  ],
  'contour-migration': (seed) => [
    { kind: 'slab', count: 2100, w: 8.5, h: 5.2, t: 0.35, layer: 0, gain: 1.05, seedNum: 15,
      rim: 0.9, motion: { type: 'pulse', freq: 1.4, amp: 0.12 } },
    { kind: 'plane', count: 1200, w: 18, h: 10, layer: 1, gain: 0.6, seedNum: 51,
      motion: { type: 'travel', distance: -6, ease: 'linear' } },
  ],
  'tunnel': (seed) => [
    { kind: 'rings', rings: 24, perRing: 44, radius: 2.6, depth: 30, layer: 0, gain: 1.0, seedNum: 16,
      spin: true, spinTurns: 2.2, taper: true, motion: { type: 'travel', distance: 30, ease: 'cubicInOut' } },
    { kind: 'rings', rings: 14, perRing: 28, radius: 4.2, depth: 34, layer: 2, gain: 0.5, seedNum: 61,
      spin: true, spinTurns: -1.4, flat: true, motion: { type: 'travel', distance: 34, ease: 'quadIn' } },
  ],
  'type-wall': (seed) => [
    { kind: 'walls', planes: 6, gap: 4.2, w: 12.5, h: 7.2, perPlane: 640, layer: 0, gain: 1.1, seedNum: 17,
      motion: { type: 'travel', distance: 26, ease: 'punch' } },
    { kind: 'pointCloud', count: 900, extent: [22, 12, 26], layer: 1, gain: 0.45, seedNum: 71,
      motion: { type: 'travel', distance: 20, ease: 'quadIn' } },
  ],
  'glyph-sphere': (seed) => [
    { kind: 'sphere', count: 2200, radius: 2.0, layer: 0, gain: 1.05, seedNum: 18,
      rim: 0.7, motion: { type: 'spin', turns: 0.8 } },
    { kind: 'pointCloud', count: 700, extent: [10, 6, 10], layer: 1, gain: 0.5, seedNum: 81,
      motion: { type: 'spin', turns: 0.6 } },
  ],
  'implosion': (seed) => [
    { kind: 'sphere', count: 2000, radius: 2.2, layer: 0, gain: 1.15, seedNum: 19,
      motion: { type: 'converge', to: 0.03, ease: 'implode' } },
    { kind: 'rings', rings: 16, perRing: 40, radius: 3.2, depth: 16, layer: 3, gain: 0.8, seedNum: 91,
      motion: { type: 'converge', to: 0.02, ease: 'punch' } },
  ],
  'shockwave': (seed) => [
    { kind: 'rings', rings: 18, perRing: 44, radius: 1.0, depth: 8, layer: 0, gain: 1.2, seedNum: 20,
      flat: true, motion: { type: 'expand', to: 7.5, ease: 'expoOut' } },
    { kind: 'pointCloud', count: 1400, extent: [24, 14, 10], layer: 2, gain: 0.55, seedNum: 101,
      motion: { type: 'expand', to: 2.4, ease: 'quadOut' } },
  ],
  'giant-word': (seed) => [
    { kind: 'plane', count: 1700, w: 20, h: 11, layer: 0, gain: 0.75, seedNum: 22,
      rim: 1.1, motion: { type: 'pulse', freq: 0.7, amp: 0.06 } },
    { kind: 'pointCloud', count: 700, extent: [26, 14, 8], layer: 3, gain: 0.5, seedNum: 111,
      motion: { type: 'expand', to: 1.2, ease: 'linear' } },
  ],
  'spatial-fold': (seed) => [
    { kind: 'plane', count: 2100, w: 13, h: 7.6, layer: 0, gain: 1.05, seedNum: 23,
      motion: { type: 'fold', axis: 'y' } },
    { kind: 'pointCloud', count: 800, extent: [12, 7, 12], layer: 1, gain: 0.5, seedNum: 121,
      motion: { type: 'fold', axis: 'y' } },
  ],
  'cursor-vortex': (seed) => [
    { kind: 'vortex', count: 2000, turns: 3.4, rIn: 0.18, rOut: 5.6, length: 5.5, layer: 0, gain: 1.2, seedNum: 24,
      motion: { type: 'vortex', turns: 2.4, ease: 'suction' } },
    { kind: 'pointCloud', count: 900, extent: [16, 9, 10], layer: 3, gain: 0.7, seedNum: 131,
      motion: { type: 'vortex', turns: 3.0, ease: 'suction' } },
  ],
  'field': (seed) => [
    { kind: 'plane', count: 2400, w: 18, h: 10, layer: 0, gain: 0.85, seedNum: 25,
      rim: 0.6, motion: { type: 'pulse', freq: 1.1, amp: 0.08 } },
  ],
  'mask': (seed) => [
    { kind: 'plane', count: 2000, w: 11, h: 6.4, layer: 0, gain: 1.0, seedNum: 26,
      motion: { type: 'pulse', freq: 0.8, amp: 0.05 } },
  ],
};

/**
 * Deterministic camera path per mechanism. The camera is graphic, never
 * handheld: forward punch-through, scale dive, orbital lock, spatial fold.
 */
function cameraFor(mechanismId, u, duration) {
  const cam = new Camera({ pos: [0, 0, 7], target: [0, 0, 0] });
  const k = clamp(u, 0, 1);
  switch (mechanismId) {
    case 'boot-signal':
      cam.pos = [0, 0, lerp(9, 5.5, EASE.quadOut(k))];
      break;
    case 'assemble':
      cam.pos = [lerp(1.2, 0, EASE.quadOut(k)), lerp(0.6, 0, EASE.quadOut(k)), lerp(8, 6.4, k)];
      cam.roll = lerp(0.06, 0, k);
      break;
    case 'density-dissolve':
      cam.pos = [0, 0, lerp(5.2, 7.6, EASE.quadInOut(k))];
      break;
    case 'structural-decay':
      cam.pos = [0, lerp(0.4, 0, k), lerp(7, 10, EASE.cubicIn(k))];
      break;
    case 'letter-fragmentation':
      cam.pos = [0, 0, lerp(6.2, 4.2, EASE.punch(k))];
      cam.roll = lerp(0, 0.1, k);
      break;
    case 'contour-migration':
      cam.pos = [lerp(-1.4, 1.4, k), 0, 6.6];
      break;
    case 'tunnel':
      cam.pos = [0, 0, lerp(4.0, -6, EASE.cubicInOut(k))];
      cam.roll = k * 0.35;
      break;
    case 'type-wall':
      cam.pos = [0, 0, lerp(6.0, -21, EASE.punch(k))];
      break;
    case 'glyph-sphere': {
      const a = k * Math.PI * 0.9;
      cam.pos = [Math.sin(a) * 6.4, lerp(1.4, -1.0, k), Math.cos(a) * 6.4];
      cam.target = [0, 0, 0];
      break;
    }
    case 'implosion':
      cam.pos = [0, 0, lerp(7.2, 1.3, EASE.punch(k))];
      break;
    case 'shockwave':
      cam.pos = [0, 0, lerp(1.6, 4.4, EASE.expoOut(k))];
      break;
    case 'giant-word':
      cam.pos = [lerp(-1.0, 0, k), 0, lerp(8.5, 5.0, EASE.quadInOut(k))];
      break;
    case 'spatial-fold': {
      const a = k * 0.5;
      cam.pos = [Math.sin(a) * 5.4, 1.2, Math.cos(a) * 5.4];
      break;
    }
    case 'cursor-vortex':
      cam.pos = [0, 0, lerp(7.6, -4.5, EASE.suction(k))];
      cam.roll = k * 1.5;
      break;
    case 'field':
      cam.pos = [0, 0, lerp(9, 7, k)];
      break;
    case 'mask':
      cam.pos = [0, 0, lerp(6.6, 5.6, k)];
      break;
    default:
      cam.pos = [0, 0, lerp(7, 5, k)];
  }
  void duration;
  return cam;
}

/**
 * Plan a full film from a director script: one shot per chain link.
 *
 * @param {object} script
 * @returns {object} FilmSpec
 */
export function planFilm(script) {
  const chain = script.chain ?? [];
  const duration = script.duration ?? 15;
  const span = chain.length ? duration / chain.length : duration;
  const curve = densityCurve({ duration, mode: script.mode ?? 'high-impact' });

  const shots = chain.map((link, i) => {
    const build = MECHANISM_SCENES[link.mechanism] ?? MECHANISM_SCENES.field;
    const prims = build(`${script.seed ?? 'ascii-h3'}:${link.mechanism}`).map((p, j) => ({
      ...p,
      seedNum: (i + 1) * 17 + j,
    }));
    const t0 = i * span;
    const t1 = t0 + span;
    const seg = curve.filter((s) => s.t >= t0 - 0.001 && s.t <= t1 + 0.001);
    const density = seg.length
      ? seg.reduce((a, s) => a + s.density, 0) / seg.length
      : 0.5;
    const scale = seg.length ? seg.reduce((a, s) => a + s.scale, 0) / seg.length : 1;
    return {
      index: i,
      mechanism: link.mechanism,
      name: MECHANISM_BY_ID.get(link.mechanism)?.name ?? link.mechanism,
      beat: link.beat,
      t0,
      t1,
      duration: span,
      density,
      scale,
      seed: `${script.seed ?? 'ascii-h3'}:${i}:${link.mechanism}`,
      // Primitive *specs*, not point clouds: the points are compiled lazily by
      // renderFilmFrame so a long FilmSpec stays cheap to hold and serialise.
      // Use compileScene({ seed: shot.seed, primitives: shot.primitives }) to
      // materialise them, or read scenePointCount for the budget.
      primitives: prims,
      scenePointCount: prims.reduce((a, q) => a + primitivePointCount(q), 0),
      hero: undefined,
    };
  });

  // Hero text belongs on the beats that can actually hold it. Dumping every
  // word on the opening beat produces a film whose typography has no timing.
  const heroes = script.heroText ?? [];
  if (heroes.length) {
    const CARRIERS = new Set(['giant-word', 'type-wall', 'letter-fragmentation', 'mask', 'shockwave']);
    const carriers = shots.filter((s) => CARRIERS.has(s.mechanism));
    const targets = carriers.length ? carriers : shots.slice(-1);
    targets.forEach((shot, i) => { shot.hero = heroes[i % heroes.length]; });
  }

  return {
    version: 'ascii-h3-filmspec/1',
    seed: script.seed ?? 'ascii-h3',
    title: script.title ?? 'untitled',
    duration,
    ratio: script.ratio ?? '21:9',
    palette: script.palette ?? 'brutalist-digital',
    ramp: script.ramp ?? RAMPS.brutalist,
    mode: script.mode ?? 'high-impact',
    shots,
    chain: chain.map((l) => l.mechanism),
    prompt: script.prompt ?? '',
  };
}

/**
 * Render one frame of a FilmSpec at absolute time `t` (seconds).
 *
 * @param {object} film
 * @param {number} t
 * @param {{cols?:number, rows?:number, exposure?:number, heroOpacity?:number}} [opts]
 * @returns {Grid}
 */
export function renderFilmFrame(film, t, opts = {}) {
  const cols = opts.cols ?? 180;
  const rows = opts.rows ?? 45;
  const time = clamp(t, 0, film.duration);
  let shot = film.shots[film.shots.length - 1];
  for (const s of film.shots) {
    if (time >= s.t0 && time < s.t1) { shot = s; break; }
  }
  const local = clamp(time - shot.t0, 0, shot.duration);
  const u = shot.duration > 0 ? local / shot.duration : 0;

  const scene = compileScene({ seed: shot.seed, primitives: shot.primitives });
  const camera = cameraFor(shot.mechanism, u, shot.duration);

  const heroText = shot.hero;
  const heroOpacity = heroText
    ? clamp(Math.sin(Math.PI * clamp((u - 0.15) / 0.7, 0, 1)) * 1.4, 0, 1)
    : 0;

  const rampName = typeof film.ramp === 'string' && RAMPS[film.ramp] ? RAMPS[film.ramp] : film.ramp;
  const ramp = rampName || RAMPS.brutalist;

  return evaluateFrame({
    t: local,
    duration: shot.duration,
    scene,
    camera,
    cols,
    rows,
    ramp,
    heroText,
    heroScale: Math.max(1, Math.round(rows / 18)),
    heroOpacity: opts.heroOpacity ?? heroOpacity,
    exposure: opts.exposure ?? (0.75 + shot.density * 0.6),
    splat: 2,
  });
}

/* ------------------------------------------------------------------ *
 * Palette resolution for raster output
 * ------------------------------------------------------------------ */

export function paletteFor(name) {
  return PALETTES[name] ?? PALETTES['brutalist-digital'];
}

/** Resolve a cell's ink + layer to an RGB triple. */
export function inkColor(palette, cell) {
  const layers = palette.layers;
  const idx = clamp(cell.layer ?? 0, 0, layers.length - 1);
  const ink = layers[idx].ink;
  const rgb = hexToRgb(ink);
  const w = clamp(cell.weight ?? 1, 0.08, 1);
  return [
    Math.round(palette.bg ? hexToRgb(palette.bg)[0] + (rgb[0] - hexToRgb(palette.bg)[0]) * w : rgb[0] * w),
    Math.round(palette.bg ? hexToRgb(palette.bg)[1] + (rgb[1] - hexToRgb(palette.bg)[1]) * w : rgb[1] * w),
    Math.round(palette.bg ? hexToRgb(palette.bg)[2] + (rgb[2] - hexToRgb(palette.bg)[2]) * w : rgb[2] * w),
  ];
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export { GLYPH_W, GLYPH_H, glyphRows, rampFromGlyphs, glyphInk, pickGlyph };
