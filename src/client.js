/**
 * ascii-h3-director — Client half (Harness Web UI).
 *
 * A full-page "Director Console": brief → transformation chain → compact H3
 * prompt → quality gate, with a live procedural ASCII preview.
 *
 * This module is loaded in the browser through the Harness module loader and is
 * deliberately self-contained: the only runtime dependency is `react`. The
 * motion grammar, the prompt composer, the gate and the ASCII rasterizer below
 * are a faithful browser-side port of the Node halves of this package — they
 * are re-declared rather than imported because a browser module cannot reach
 * the package's Node sources.
 *
 * Rules honoured here:
 *   - UI chrome uses theme tokens only; literal colors appear solely inside the
 *     ASCII canvas, where they belong to the artwork's palettes.
 *   - No DOM access outside the component tree; no `document.body` writes.
 *   - A thrown error cannot blank the slot: every entry body sits inside an
 *     error boundary.
 */

window.__ModuleLoader__.load({
  id: '@yankafei/ascii-h3-director',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    /* ================================================================== *
     * Motion grammar (browser port of motion-grammar.js)
     * ================================================================== */

    /**
     * @typedef {Object} Mechanism
     * @property {string} id
     * @property {string} name
     * @property {'canonical'|'strong'|'support'|'reject'} tier
     * @property {string} material
     * @property {string} action
     * @property {string} emits
     * @property {string} phase   part of the cyclic form grammar
     */

    /** @type {Mechanism[]} */
    const MECHANISMS = [
      {
        id: 'boot-signal', name: 'Boot Signal', tier: 'strong', phase: 'letterform',
        material: 'a single cursor and a handful of glyphs on an empty field',
        action: 'a sparse constellation of marks ignites and self-organises into a legible structure',
        emits: 'letterform',
      },
      {
        id: 'assemble', name: 'Assemble from Sparse Field', tier: 'canonical', phase: 'solid-form',
        material: 'thousands of loose characters drifting in void',
        action: 'characters converge along their own velocity vectors until a solid form snaps into legibility',
        emits: 'solid-form',
      },
      {
        id: 'density-dissolve', name: 'Density Dissolve', tier: 'canonical', phase: 'field',
        material: 'a solid glyph mass',
        action: 'the form dematerialises because its glyph ramp slides toward emptiness while its silhouette holds',
        emits: 'field',
      },
      {
        id: 'structural-decay', name: 'Structural Decay', tier: 'canonical', phase: 'fragments',
        material: 'a built environment made of typography',
        action: 'the environment is lost in stages — edges first, then surfaces, then the ground itself',
        emits: 'fragments',
      },
      {
        id: 'letter-fragmentation', name: 'Diegetic Letter-Topology Fragmentation', tier: 'canonical', phase: 'fragments',
        material: 'one short word, still readable',
        action: 'the word breaks along its own letter topology; strokes separate into strokes before the word stops meaning anything',
        emits: 'fragments',
      },
      {
        id: 'contour-migration', name: 'Contour Migration', tier: 'strong', phase: 'solid-form',
        material: 'a glyph silhouette with a migrating edge',
        action: 'the outline itself travels across the form, so the shape appears to pour in one direction',
        emits: 'solid-form',
      },
      {
        id: 'tunnel', name: 'ASCII Tunnel', tier: 'strong', phase: 'space',
        material: 'concentric rings of characters receding to a point',
        action: 'the camera travels forward through the rings while they stretch into long perspective trails',
        emits: 'space',
      },
      {
        id: 'type-wall', name: 'Typographic Wall', tier: 'strong', phase: 'fragments',
        material: 'giant cropped letters standing as architecture',
        action: 'the camera punches through each wall without cutting; the wall shatters from the point of impact outward',
        emits: 'fragments',
      },
      {
        id: 'glyph-sphere', name: 'Glyph Sphere', tier: 'strong', phase: 'solid-form',
        material: 'a sphere whose every surface is a character',
        action: 'thousands of characters orbit a tiny focal mark, then all orbits converge',
        emits: 'solid-form',
      },
      {
        id: 'implosion', name: 'Implosion', tier: 'canonical', phase: 'void',
        material: 'a dense orbiting mass collapsing inward',
        action: 'the mass is sucked into a focal glyph; density spikes to a point, then releases as a wave',
        emits: 'void',
      },
      {
        id: 'shockwave', name: 'Command Shockwave', tier: 'canonical', phase: 'space',
        material: 'a white ring of operators expanding past frame',
        action: 'the release from compression travels outward as a single readable command, dragging microtype in its wake',
        emits: 'space',
      },
      {
        id: 'giant-word', name: 'Giant Cropped Typography', tier: 'strong', phase: 'letterform',
        material: 'one or two words far larger than frame',
        action: 'the word grows from microscopic to beyond the frame edge, so the audience reads it with their body before their eye',
        emits: 'letterform',
      },
      {
        id: 'spatial-fold', name: 'Spatial Fold', tier: 'strong', phase: 'space',
        material: 'a plane of characters',
        action: 'the plane folds 180 degrees through itself, turning the flat field into a volume without a cut',
        emits: 'space',
      },
      {
        id: 'cursor-vortex', name: 'Cursor Vortex', tier: 'canonical', phase: 'void',
        material: 'a small cursor mark with everything spiralling into it',
        action: 'the whole frame is drawn backward into a cursor-shaped drain, and the clip ends mid-dive',
        emits: 'void',
      },
      {
        id: 'field', name: 'Character Field', tier: 'support', phase: 'field',
        material: 'a wide, even plane of characters',
        action: 'the field pulses as one material, carrying whatever motion the previous state handed it',
        emits: 'field',
      },
      {
        id: 'mask', name: 'Text Mask', tier: 'support', phase: 'letterform',
        material: 'a character field constrained inside letterforms',
        action: 'the field is only visible where the mask allows it, so type becomes a window onto the motion',
        emits: 'letterform',
      },

      /* kept so the gate can name the failure it rejects */
      {
        id: 'reject-hud', name: 'Decorative HUD', tier: 'reject', phase: 'cliche',
        material: 'unmotivated interface chrome',
        action: 'readouts animate because the frame looked empty',
        emits: 'cliche',
      },
      {
        id: 'reject-city', name: 'Generic Cyberpunk City', tier: 'reject', phase: 'cliche',
        material: 'neon skyline',
        action: 'a city appears because the brief said science fiction',
        emits: 'cliche',
      },
      {
        id: 'reject-glitch', name: 'Meaningless Glitch', tier: 'reject', phase: 'cliche',
        material: 'random displacement',
        action: 'the image is damaged for texture rather than by a physical cause',
        emits: 'cliche',
      },
      {
        id: 'reject-particles', name: 'Unmotivated Particles', tier: 'reject', phase: 'cliche',
        material: 'floating dots with no source',
        action: 'particles drift to add production value',
        emits: 'cliche',
      },
      {
        id: 'reject-smoke', name: 'Smoke / Liquid Wipe', tier: 'reject', phase: 'cliche',
        material: 'soft organic transition',
        action: 'a wipe hides the fact that two states do not connect',
        emits: 'cliche',
      },
    ];

    const FRAG = {};
    for (const m of MECHANISMS) FRAG[m.id] = m;

    function known(id) {
      return Object.prototype.hasOwnProperty.call(FRAG, id) ? FRAG[id] : null;
    }

    /**
     * The cyclic form grammar, derived from the mechanism phases so the browser
     * table stays the single source of truth: a mechanism may follow another
     * when its phase is a legal successor of the form the previous one emitted.
     * `cliche` is terminal — the rejected tier can never be reached.
     */
    const FORM_SUCCESSORS = {
      'void': ['letterform', 'solid-form', 'space'],
      'field': ['solid-form', 'field', 'fragments'],
      'fragments': ['space', 'void', 'fragments'],
      'letterform': ['letterform', 'solid-form', 'fragments'],
      'solid-form': ['solid-form', 'field', 'void'],
      'geometry': ['space', 'solid-form'],
      'space': ['fragments', 'space', 'solid-form'],
      'cliche': ['letterform'],
    };

    /** @type {Map<string, string[]>} mechanism id → legal successor mechanism ids */
    const CHAINS_TO = new Map();
    for (const m of MECHANISMS) CHAINS_TO.set(m.id, []);

    /** Per-form membership, used to keep chains inside the live vocabulary. */
    const FORM_MEMBERS = new Map();
    for (const m of MECHANISMS) {
      if (!FORM_MEMBERS.has(m.emits)) FORM_MEMBERS.set(m.emits, []);
      FORM_MEMBERS.get(m.emits).push(m.id);
    }

    for (const m of MECHANISMS) {
      const nextForms = FORM_SUCCESSORS[m.emits] || [];
      const out = CHAINS_TO.get(m.id);
      for (const form of nextForms) {
        for (const id of FORM_MEMBERS.get(form) || []) {
          const cand = FRAG[id];
          if (!cand || cand.tier === 'reject' || cand.phase === 'cliche') continue;
          if (id !== m.id && out.indexOf(id) === -1) out.push(id);
        }
      }
    }

    const CAMERA_MOVES = [
      'forward-punch-through',
      'rapid-scale-dive',
      'orbital-lock',
      'spatial-fold-180',
      'planar-to-volume',
      'sudden-freeze',
      'tunnel-travel',
      'backward-suction',
    ];

    /** @returns {object} a MotionState with defensive defaults */
    function entryState(over) {
      return Object.assign({
        form: 'void',
        camera: 'forward-punch-through',
        velocity: 1,
        rotation: 0,
        scaleTrend: 1,
        densityTrend: 0,
        unresolved: 'the camera is already moving into frame',
        palette: 'brutalist-digital',
        ramp: 'brutalist',
      }, over || {});
    }

    /** @returns {object} a MotionState with defensive defaults */
    function exitState(over) {
      return Object.assign({
        form: 'void',
        camera: 'backward-suction',
        velocity: 1,
        rotation: 0,
        scaleTrend: -1,
        densityTrend: -1,
        unresolved: 'the clip ends mid-dive, with speed left over',
        palette: 'brutalist-digital',
        ramp: 'brutalist',
      }, over || {});
    }

    /**
     * The continuity contract: an entry may inherit a previous exit without the
     * seam reading as a reset. Returns a list of violations (empty = clean).
     */
    function checkSeam(prevExit, nextEntry) {
      const violations = [];
      const a = prevExit || exitState();
      const b = nextEntry || entryState();

      if (a.camera !== b.camera) {
        violations.push('seam.camera');
      }
      if (a.velocity !== 0 && b.velocity === 0) {
        violations.push('seam.velocity');
      }
      if (a.velocity !== 0 && b.velocity !== 0 && Math.sign(a.velocity) !== Math.sign(b.velocity)) {
        violations.push('seam.direction');
      }
      if (a.palette !== b.palette) {
        violations.push('seam.palette');
      }
      if (a.ramp !== b.ramp) {
        violations.push('seam.ramp');
      }
      if (a.unresolved && b.unresolved && a.unresolved === b.unresolved) {
        violations.push('seam.stall');
      }
      return violations;
    }

    /**
     * The transition envelope. A major perceptual change has to land every
     * `everySeconds`; a monotone curve reads as a screensaver.
     *
     * @param {{duration?:number, everySeconds?:number, mode?:string, steps?:number}} opts
     * @returns {Array<{t:number, density:number, scale:number}>}
     */
    function densityCurve(opts) {
      const o = opts || {};
      const duration = Number(o.duration) > 0 ? Number(o.duration) : 15;
      const every = Number(o.everySeconds) > 0 ? Number(o.everySeconds) : 3;
      const mode = o.mode === 'minimal-data' ? 'minimal-data' : 'high-impact';
      const steps = Number(o.steps) > 1 ? Math.min(600, Number(o.steps)) : 120;
      const beats = Math.max(2, Math.round(duration / every));
      const out = [];

      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * duration;
        const phase = (t / duration) * beats;
        const local = phase - Math.floor(phase);
        const wave = Math.abs(Math.sin(local * Math.PI));
        const swing = mode === 'high-impact' ? Math.pow(wave, 0.55) : 0.35 + 0.3 * Math.sin(local * Math.PI * 2);
        out.push({
          t,
          density: 0.12 + 0.82 * swing,
          scale: mode === 'high-impact' ? 1.4 - 1.1 * swing : 0.9 + 0.1 * Math.sin(local * Math.PI * 2),
        });
      }
      return out;
    }

    /** Major directional swings above `threshold`; a monotone signal has none. */
    function countSwing(values, threshold) {
      if (!values || values.length < 2) return 0;
      let count = 0;
      let dir = 0;
      let extreme = values[0];
      for (let i = 1; i < values.length; i++) {
        const v = values[i];
        const d = Math.sign(v - extreme);
        if (d === 0) continue;
        if (dir !== 0 && d !== dir && Math.abs(v - extreme) > threshold) {
          count++;
          extreme = v;
          dir = d;
        } else if (d === dir) {
          extreme = v;
        } else if (Math.abs(v - extreme) > threshold) {
          extreme = v;
          dir = d;
        }
      }
      return count;
    }

    /* ================================================================== *
     * Seeded numbers (no Math.random anywhere in this module)
     * ================================================================== */

    function hash32(str) {
      let x = 2166136261 >>> 0;
      const s = String(str);
      for (let i = 0; i < s.length; i++) {
        x ^= s.charCodeAt(i);
        x = Math.imul(x, 16777619);
      }
      return x >>> 0;
    }

    /** sfc32 seeded from a string; deterministic across renders and machines. */
    function rng(seed) {
      let a = (hash32(seed) ^ 0x9e3779b9) >>> 0;
      let b = (hash32(seed + ':b') ^ 0x85ebca6b) >>> 0;
      let c = (hash32(seed + ':c') ^ 0xc2b2ae35) >>> 0;
      let d = (hash32(seed + ':d') ^ 0x27d4eb2f) >>> 0;

      return function next() {
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
    }

    function clamp(v, lo, hi) {
      const n = Number(v);
      if (!isFinite(n)) return lo;
      return n < lo ? lo : n > hi ? hi : n;
    }

    function smoothstep(e0, e1, x) {
      const t = clamp((x - e0) / (e1 - e0 || 1), 0, 1);
      return t * t * (3 - 2 * t);
    }

    /* ================================================================== *
     * Character ramps and palettes — the canvas vocabulary.
     * Literal colors live here and nowhere else: this is artwork, not chrome.
     * ================================================================== */

    const RAMPS = {
      classic: ' .:-=+*#%@',
      brutalist: ' .`\'",:;!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
      minimal: ' .*#',
      operators: ' .:-=+<>[]{}()/\\|!?*&#%@$',
      binary: ' .01',
      data: ' .oO0#@',
      phosphor: ' .:-=+*#%@@',
      typographic: ' .,:;i1tfLCG08@#',
    };

    const RAMP_IDS = Object.keys(RAMPS);

    const PALETTES = {
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

    const PALETTE_IDS = Object.keys(PALETTES);
    const RATIOS = ['21:9', '16:9', '9:16', '1:1'];
    const DEFAULT_PALETTE = 'brutalist-digital';
    const DEFAULT_RAMP = 'brutalist';

    function paletteOf(name) {
      return PALETTES[name] || PALETTES[DEFAULT_PALETTE];
    }

    function rampOf(name) {
      const r = RAMPS[name];
      return typeof r === 'string' && r.length ? r : RAMPS[DEFAULT_RAMP];
    }

    function pickGlyph(ramp, density) {
      if (!ramp || !ramp.length) return ' ';
      if (ramp.length === 1) return ramp.charAt(0);
      const t = density <= 0 ? 0 : density >= 1 ? 1 : density;
      return ramp.charAt(Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))));
    }

    /* ================================================================== *
     * Inline ASCII rasterizer — a few procedural motion families.
     *
     * The preview is not the Node renderer: it is a contract sketch that shows
     * the mechanism's *motion family* and its palette. Deterministic in time and
     * seed, so scrubbing back to a timecode reproduces the same frame.
     * ================================================================== */

    const GRID_COLS = 92;
    const GRID_ROWS = 28;

    function blankGrid(cols, rows) {
      const cells = [];
      for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) row.push(null);
        cells.push(row);
      }
      return cells;
    }

    /** Keep the nearest mark per cell; ink is a number on [-1, 4]. */
    function put(cells, x, y, ch, depth, weight) {
      const rows = cells.length;
      const cols = rows ? cells[0].length : 0;
      const cx = Math.round(x);
      const cy = Math.round(y);
      if (cy < 0 || cy >= rows || cx < 0 || cx >= cols) return;
      const cell = cells[cy][cx];
      if (cell && cell.depth <= depth) return;
      cells[cy][cx] = { ch, depth, ink: clamp(weight, -1, 1) };
    }

    /** Additive composite, for trails and wakes. */
    function add(cells, x, y, ch, depth, weight) {
      const rows = cells.length;
      const cols = rows ? cells[0].length : 0;
      const cx = Math.round(x);
      const cy = Math.round(y);
      if (cy < 0 || cy >= rows || cx < 0 || cx >= cols) return;
      const cell = cells[cy][cx];
      if (!cell) {
        cells[cy][cx] = { ch, depth, ink: clamp(weight, -1, 1) };
        return;
      }
      if (depth < cell.depth) {
        cell.depth = depth;
        cell.ch = ch;
      }
      cell.ink = clamp(cell.ink + weight * 0.65, -1, 4);
    }

    function timecodeOf(seconds) {
      const s = Number(seconds);
      const safe = isFinite(s) && s > 0 ? s : 0;
      const whole = Math.floor(safe);
      const frames = Math.floor((safe - whole) * 24);
      const mm = String(Math.floor(whole / 60)).padStart(2, '0');
      const ss = String(whole % 60).padStart(2, '0');
      const ff = String(frames).padStart(2, '0');
      return mm + ':' + ss + ':' + ff;
    }

    /**
     * Fixed instrumentation: a ruler, the hero marquee and the timecode strip.
     * Returned as a sparse row map so the motion field can be drawn first and
     * the chrome stamped over it.
     */
    function frameStamp(cols, rows, heroText, timecode, u) {
      const stamp = {};
      const width = Math.max(6, cols - 8);

      function stampText(rowIndex, text, ink) {
        if (rowIndex < 0 || rowIndex >= rows) return;
        const row = [];
        for (let x = 0; x < cols; x++) {
          const ch = x < text.length ? text.charAt(x) : ' ';
          row.push(ch === ' ' ? null : { ch, depth: -1000, ink });
        }
        stamp[rowIndex] = row;
      }

      /* the bottom rule: a ruler of anchors */
      const ruler = [];
      for (let x = 0; x < cols; x++) {
        ruler.push(x % 12 === 0 ? { ch: '+', depth: -1000, ink: 0.5 } : { ch: '-', depth: -1000, ink: 0.25 });
      }
      stamp[rows - 2] = ruler;

      const hero = String(heroText || '').toUpperCase().replace(/\s+/g, ' ').trim();
      if (hero) {
        const period = hero.length + 3;
        const cycles = Math.ceil(width / period) + 2;
        let marquee = '';
        for (let i = 0; i < cycles; i++) marquee += hero + '   ';
        const step = Math.floor(u * period * 2) % period;
        stampText(1, '  ' + marquee.slice(step, step + width), 0.95);
      }

      stampText(rows - 1, '  ' + ('ASCII/H3  ' + timecode).slice(0, width), 0.6);
      return stamp;
    }

    /**
     * Render one preview frame.
     * @returns {{rows:string[], bg:string, layers:string}}
     */
    function renderFrame(opts) {
      const o = opts || {};
      const cols = clamp(o.cols || GRID_COLS, 24, 200);
      const rows = clamp(o.rows || GRID_ROWS, 8, 80);
      const u = clamp(o.u || 0, 0, 1);
      const duration = Number(o.duration) > 0 ? Number(o.duration) : 15;
      const t = u * duration;
      const mech = MECHANISMS.find((m) => m.id === o.mechanism) || MECHANISMS[0];
      const pattern = mech.phase;
      const ramp = rampOf(o.ramp);
      const palette = paletteOf(o.palette);
      const layerCount = palette.layers.length;
      const seedRand = rng(String(o.seed || 'ascii-h3'));
      const seed = Math.floor(seedRand() * 1e6);
      const heroText = String(o.heroText || '').split(/[,/|]/)[0].trim();
      const tau = Math.PI * 2;

      const cells = blankGrid(cols, rows);
      const cx = cols / 2;
      const cy = rows / 2;
      const aspect = 2.05;

      for (let y = 0; y < rows; y++) {
        const dy = y - cy;
        for (let x = 0; x < cols; x++) {
          const dx = (x - cx) / aspect;
          const r = Math.hypot(dx, dy);
          const ux = r > 0.0001 ? dx / r : 0;
          const uy = r > 0.0001 ? dy / r : 0;
          const ang = Math.atan2(dy, dx);

          const wav = Math.sin(x * 0.11 + t * 0.9 + seed * 0.0007)
            + Math.cos(y * 0.19 - t * 0.7 + seed * 0.0003);
          const wx = x + wav * 1.35 + Math.sin(y * 0.14 + t * 1.1) * 0.9;
          const wy = y + wav * 0.75 + Math.cos(x * 0.17 - t * 0.8) * 0.7;

          let v = 0;
          let layer = 0;

          if (pattern === 'space') {
            const punch = 1.9 + u * 3.1;
            const rr = r / punch;
            const trail = smoothstep(0.06, 0.95, rr);
            let ring = Math.pow(Math.abs(Math.sin(rr * 9.5 - t * 1.9 + seed * 0.001)), 0.5);
            ring = Math.min(1, ring + Math.exp(-r * 0.85) * 0.95);
            const streak = Math.abs(Math.sin(ang * 7 + t * 0.55));
            v = ring * (0.42 + 0.62 * streak) * (0.3 + 0.75 * trail);
            layer = rr < 0.55 ? 1 : rr < 1.5 ? 0 : 2;
          } else if (pattern === 'void') {
            const swirl = Math.abs(Math.sin(ang * 3 + r * 1.85 - t * 4.4));
            const fall = Math.exp(-Math.pow(Math.max(0, r - 0.3) / 2.5, 1.25));
            const arms = Math.pow(swirl, 0.45);
            const core = r < 1.3 ? Math.pow(1 - r / 1.3, 0.5) : 0;
            v = clamp(arms * fall * 1.15 + core * 0.95, 0, 1);
            layer = v > 0.72 ? 3 : v > 0.4 ? 1 : 0;
          } else if (pattern === 'solid-form') {
            const pulse = 0.5 + 0.5 * Math.sin(u * tau * 2.2);
            const R = 3.4 + pulse * 4.8 + u * 1.6;
            const shell = 1 - Math.min(1, Math.abs(r - R) / 1.7);
            const fill = r < R ? 0.22 + 0.38 * (1 - r / R) : 0;
            const ribs = 0.68 + 0.32 * Math.abs(Math.sin(ang * 5 - t * 1.1));
            v = clamp(shell * ribs * 1.05 + fill * (0.5 + 0.5 * Math.abs(Math.sin(r * 2.2 - t * 2))), 0, 1);
            layer = shell > 0.55 ? 0 : 1;
          } else if (pattern === 'fragments') {
            const shard = Math.abs(Math.sin(13.3 * ux + 7.1 * uy + t * 0.4));
            const blocks = Math.pow(Math.abs(Math.sin(wx * 0.55) * Math.cos(wy * 0.95)), 0.4);
            const crack = smoothstep(0.82, 0.99, shard);
            const impact = Math.exp(-Math.hypot(ux - 0.2, uy) * 1.1);
            v = clamp(blocks * (0.28 + 0.72 * (1 - u)) + crack * impact * 1.3, 0, 1);
            layer = crack > 0.6 ? 3 : 0;
          } else if (pattern === 'letterform') {
            const band = Math.abs(Math.sin(wy * 0.6 + t * 0.5)) * Math.abs(Math.cos(wx * 0.22 - t * 0.3));
            let rects = 0;
            const phase = (wx * 0.16 + t * 0.28) % 1;
            if (phase > 0.14 && phase < 0.56 && Math.abs(wy) < rows * 0.3) rects = 1;
            const phase2 = (wx * 0.16 + t * 0.28 + 0.42) % 1;
            if (phase2 > 0.2 && phase2 < 0.34 && wy > -1 && wy < rows * 0.22) rects = 1;
            const bloom = 0.5 + 0.5 * Math.sin(u * tau * 2.6);
            v = clamp(band * 0.75 + rects * (0.55 + 0.45 * bloom), 0, 1);
            layer = rects ? 0 : 1;
          } else {
            /* field: one material, pulsing, carrying the previous motion */
            const swell = 0.5 + 0.5 * Math.sin(u * tau * 3 - r * 0.55);
            const grid = 0.55 + 0.45 * Math.abs(Math.sin(wx * 0.5) * Math.sin(wy * 0.9));
            v = clamp(swell * grid * (1.25 - r / (Math.max(rows, cols) * 0.42)), 0, 1);
            layer = v > 0.66 ? 1 : v > 0.32 ? 0 : 2;
          }

          /* the camera's twist warps every family a little */
          const twist = Math.sin(r * 0.7 - t * 0.5 + seed * 0.001) * 0.09;
          v = clamp(v + twist * v, 0, 1);

          if (v > 0.055) {
            const ch = pickGlyph(ramp, clamp(v * 1.12, 0, 1));
            cells[y][x] = { ch, depth: r, ink: clamp(v, -1, 1), layer: layer % Math.max(1, layerCount) };
          }
        }
      }

      /* microtype wake: deterministic specks that appear when the frame moves */
      const motion = 0.35 + 0.65 * Math.abs(Math.sin(u * Math.PI * 3));
      const specks = 26;
      for (let i = 0; i < specks; i++) {
        const r1 = seedRand();
        const r2 = seedRand();
        const r3 = seedRand();
        const sx = ((r1 * cols + t * (1.4 + r3 * 5)) % cols + cols) % cols;
        const sy = r2 * rows;
        const stream = pattern === 'fragments' ? '.:|!' : pattern === 'void' ? '.,\'`' : '.:+';
        const ch = stream.charAt(Math.floor(r3 * stream.length) % stream.length);
        add(cells, sx, sy, ch, 5 + r3 * 6, 0.22 + motion * 0.5);
      }

      const stamped = frameStamp(cols, rows, heroText, timecodeOf(u * duration), u);

      /* Composite: motion field first, fixed instrumentation stamped over it. */
      const outRows = [];
      const outLayers = [];
      for (let y = 0; y < rows; y++) {
        const stampRow = stamped[y];
        const layerRow = [];
        let line = '';
        for (let x = 0; x < cols; x++) {
          const fixed = stampRow ? stampRow[x] : null;
          if (fixed) {
            line += fixed.ch;
            layerRow.push(-1);
            continue;
          }
          const cell = cells[y][x];
          if (cell && cell.ch !== ' ') {
            line += cell.ch;
            layerRow.push(cell.layer);
          } else {
            line += ' ';
            layerRow.push(-1);
          }
        }
        outRows.push(line.replace(/\s+$/, ''));
        outLayers.push(layerRow);
      }

      return {
        rows: outRows,
        layers: outLayers,
        bg: palette.bg,
        inks: palette.layers.map((l) => l.ink),
      };
    }

    /**
     * Flatten a frame to colored spans, merging cells that share a palette
     * layer so the DOM stays small (tens of spans, not thousands).
     */
    function frameToSpans(frame) {
      const inks = frame.inks && frame.inks.length ? frame.inks : ['#f2f4f5'];
      const lines = frame.rows || [];
      const layerRows = frame.layers || [];
      const nodes = [];
      let key = 0;

      for (let y = 0; y < lines.length; y++) {
        const line = lines[y];
        const layerRow = layerRows[y] || [];
        let run = '';
        let current = -2;
        for (let x = 0; x < line.length; x++) {
          const ch = line.charAt(x);
          const raw = layerRow[x];
          const idx = raw === undefined || raw === null || raw < 0 ? -1 : raw % inks.length;
          if (idx !== current) {
            if (run) {
              nodes.push(h('span', {
                key: 'k' + (key++),
                style: { color: current < 0 ? undefined : inks[current] },
              }, run));
            }
            run = ch;
            current = idx;
          } else {
            run += ch;
          }
        }
        if (run) {
          nodes.push(h('span', {
            key: 'k' + (key++),
            style: { color: current < 0 ? undefined : inks[current] },
          }, run));
        }
        nodes.push('\n');
      }
      return nodes;
    }

    /* ================================================================== *
     * Brief parsing and the prompt composer
     * ================================================================== */

    const STOP_WORDS = {};
    ('a an the and or of to in on for with without into from at by is are be as it its this that ' +
      'make create build generate produce clip video about using use please can you me my i want ' +
      'second seconds minute minutes long short').split(' ').forEach((w) => { STOP_WORDS[w] = true; });

    function parseBrief(brief) {
      const text = String(brief == null ? '' : brief).trim();
      const lower = text.toLowerCase();

      let duration = 15;
      const dm = lower.match(/(\d+(?:\.\d+)?)\s*(?:-|\s)?\s*(?:second|sec|s\b)/);
      if (dm) duration = clamp(parseFloat(dm[1]), 4, 15);

      let ratio = '21:9';
      const rm = lower.match(/\b(21:9|16:9|9:16|4:3|1:1|adaptive)\b/);
      if (rm) ratio = rm[1];

      const heroText = [];
      const quoted = text.match(/["“”'『「]([^"“”'』」]{1,12})["“”'』」]/g) || [];
      for (const q of quoted) heroText.push(q.replace(/["“”'『」]/g, ''));
      const wordMatches = text.matchAll(/\b(?:word|text|type|say|says|reads?)\s+([A-Z][A-Z0-9]{1,11})\b/g);
      for (const m of wordMatches) heroText.push(m[1]);

      let palette = DEFAULT_PALETTE;
      if (/\b(green|phosphor|terminal|matrix)\b/.test(lower)) palette = 'phosphor';
      else if (/\b(minimal|quiet|silent|monochrome|black and white|b\/w)\b/.test(lower)) palette = 'minimal-signal';
      else if (/\b(paper|archival|document|print)\b/.test(lower)) palette = 'paper-terminal';
      else if (/\b(monolith|pure|absolute|void)\b/.test(lower)) palette = 'monolith';

      let ramp = DEFAULT_RAMP;
      if (/\b(minimal|sparse|quiet|silent)\b/.test(lower)) ramp = 'minimal';
      else if (/\b(code|source|operator|syntax)\b/.test(lower)) ramp = 'operators';
      else if (/\b(binary|bit|boot|zero|one)\b/.test(lower)) ramp = 'binary';
      else if (/\b(green|phosphor|terminal|matrix)\b/.test(lower)) ramp = 'phosphor';
      else if (/\b(letter|word|type|typograph)/.test(lower)) ramp = 'typographic';

      const mode = /\b(minimal|quiet|calm|restrained|subtle)\b/.test(lower) ? 'minimal-data' : 'high-impact';

      const seen = {};
      const keywords = [];
      const words = lower.replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, ' ').split(/\s+/);
      for (const raw of words) {
        const w = raw.trim();
        if (w.length <= 2 || STOP_WORDS[w] || /^\d+$/.test(w) || seen[w]) continue;
        seen[w] = true;
        keywords.push(w);
        if (keywords.length >= 8) break;
      }

      const cliches = [];
      const hints = ['cyberpunk', 'neon', 'skyline', 'hud', 'dashboard', 'interface', 'glitch', 'smoke', 'particle', 'particles', 'hologram'];
      for (const hint of hints) {
        if (new RegExp('\\b' + hint, 'i').test(lower)) {
          const id = hint === 'glitch' ? 'reject-glitch'
            : hint === 'smoke' ? 'reject-smoke'
              : (hint === 'particle' || hint === 'particles') ? 'reject-particles'
                : 'reject-hud';
          if (cliches.indexOf(id) === -1) cliches.push(id);
        }
      }

      return {
        concept: text || 'an ASCII transformation about nothing becoming something',
        keywords,
        duration,
        ratio,
        heroText,
        cliches,
        palette,
        ramp,
        mode,
      };
    }

    /**
     * Walk the grammar from a start form and pick `count` mechanisms that chain
     * legally, never repeating one: repetition reads as a stall.
     */
    function planChain(opts) {
      const o = opts || {};
      const count = clamp(o.count == null ? 5 : o.count, 1, 12);
      const startForm = FORM_SUCCESSORS[o.startForm] ? o.startForm : 'void';
      const block = {};
      for (const id of o.block || []) block[id] = true;
      const allow = o.allow ? o.allow.slice() : null;
      const rand = rng(String(o.seed || 'chain'));

      const legalPool = MECHANISMS.filter((m) => m.tier !== 'reject' && !block[m.id]);

      const links = [];
      const used = {};
      let form = startForm;
      let preferred = null;

      for (let i = 0; i < count; i++) {
        const nextForms = FORM_SUCCESSORS[form] || [];
        let cands = legalPool.filter((m) => nextForms.indexOf(m.phase) !== -1 || m.emits === form);
        if (i === 0) {
          const extra = legalPool.filter((m) => nextForms.indexOf(m.phase) === -1);
          cands = cands.concat(extra.slice(0, 2));
        }
        if (allow) {
          const filtered = cands.filter((m) => allow.indexOf(m.id) !== -1);
          if (filtered.length) cands = filtered;
        }
        if (preferred) {
          const pref = cands.filter((m) => (CHAINS_TO.get(preferred) || []).indexOf(m.id) !== -1);
          if (pref.length) cands = pref;
        }
        const unused = cands.filter((m) => !used[m.id]);
        if (unused.length) cands = unused;
        if (!cands.length) {
          cands = legalPool.filter((m) => !used[m.id]);
        }
        if (!cands.length) break;

        const pick = cands[Math.min(cands.length - 1, Math.floor(rand() * cands.length))];
        const from = links.length ? links[links.length - 1].to : 0;
        const span = (o.duration > 0 ? Number(o.duration) : 15) / count;
        const to = from + span;

        links.push({
          mechanism: pick.id,
          beat: round1(from) + '–' + round1(to) + 's',
          from,
          to,
          exit: exitState({
            form: pick.emits,
            camera: pick.id === 'cursor-vortex' || pick.id === 'implosion' ? 'backward-suction' : 'forward-punch-through',
            velocity: pick.id === 'sudden-freeze' ? 0 : 1,
            rotation: pick.id === 'glyph-sphere' ? 0.6 : 0,
            scaleTrend: pick.id === 'giant-word' || pick.id === 'shockwave' ? 1 : -1,
            densityTrend: pick.id === 'density-dissolve' || pick.id === 'structural-decay' ? -1 : 1,
            unresolved: 'the ' + pick.name.toLowerCase() + ' is still resolving when the clip ends',
          }),
          description: pick.name + ': ' + pick.action,
        });

        form = pick.emits;
        preferred = pick.id;
        used[pick.id] = true;
      }

      return links;
    }

    function round1(n) {
      return Math.round(n * 10) / 10;
    }

    function fmtNum(n) {
      const r = Math.round(n * 10) / 10;
      return Number.isInteger(r) ? String(r) : r.toFixed(1);
    }

    function sentenceCase(s) {
      const str = String(s == null ? '' : s);
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function blocksPerChain(n, duration) {
      if (!n || n <= 0) return [];
      const span = duration / n;
      const out = [];
      for (let i = 0; i < n; i++) out.push(fmtNum(i * span) + '–' + fmtNum((i + 1) * span) + 's');
      return out;
    }

    function styleLine(script) {
      const bits = [
        String(script.palette || DEFAULT_PALETTE).replace(/-/g, ' ') + ' palette',
        String(script.ramp || DEFAULT_RAMP) + ' character set',
        'brutalist computational motion design',
        'extreme perspective and scale contrast',
        'monospaced glyphs as physical matter, not overlay',
      ];
      if (script.ratio) bits.push(script.ratio + ' frame');
      if (script.heroText && script.heroText.length) {
        bits.push('hero text limited to ' + script.heroText.map((t) => '"' + t + '"').join(' / '));
      }
      return bits.join('; ') + '.';
    }

    function ruleLine(script) {
      const avoid = [
        'generic HUD',
        'cyberpunk city',
        'random glitch',
        'unmotivated particles',
        'smoke wipes',
        'photoreal humans',
      ];
      for (const id of script.cliches || []) {
        const m = known(id);
        const label = m ? m.name.toLowerCase() : String(id);
        if (avoid.indexOf(label) === -1) avoid.push(label);
      }
      return [
        'no normal cuts',
        'every transformation physically emerges from the previous form',
        'preserve direction, velocity and scale across every transition',
        'avoid ' + avoid.join(', '),
      ].join('; ') + '.';
    }

    /** Render a transformation chain as the compact, time-addressed H3 prompt. */
    function composePrompt(script) {
      const s = script || {};
      const duration = Number(s.duration) > 0 ? Number(s.duration) : 15;
      const chain = Array.isArray(s.chain) ? s.chain : [];
      const blocks = blocksPerChain(chain.length, duration);
      const lines = [];

      lines.push(
        s.continuation
          ? duration + '-second ultra-wide ASCII kinetic typography sequence, direct continuation from the previous clip.'
          : duration + '-second ultra-wide ASCII kinetic typography sequence.',
      );
      if (s.entry) lines.push('Begin exactly as ' + s.entry + '.');
      lines.push('');

      chain.forEach((link, i) => {
        const m = known(link.mechanism);
        const beat = blocks[i] || blocks[blocks.length - 1] || '';
        const parts = m ? [sentenceCase(m.action) + '.'] : ['the previous motion continues and intensifies.'];
        if (i === chain.length - 1) {
          const unresolved = link.exit && link.exit.unresolved;
          parts.push(unresolved ? sentenceCase(unresolved) + '.' : 'The clip ends mid-motion so another clip can continue.');
        }
        lines.push(beat + ': ' + parts.join(' '));
      });

      lines.push('');
      lines.push('STYLE: ' + styleLine(s));
      lines.push('RULE: ' + ruleLine(s));
      return lines.join('\n');
    }

    /**
     * The gate the director must pass before paying for a generation. Each check
     * is a yes/no question with the evidence attached.
     */
    function review(script) {
      const s = script || {};
      const chain = Array.isArray(s.chain) ? s.chain : [];
      const prompt = typeof s.prompt === 'string' ? s.prompt : '';
      const duration = Number(s.duration) > 0 ? Number(s.duration) : 15;
      const checks = [];

      checks.push({
        id: 'single-chain',
        pass: chain.length >= 3,
        detail: chain.length + ' beats',
      });

      const first = chain.length ? known(chain[0].mechanism) : null;
      checks.push({
        id: 'source-state',
        pass: Boolean(first),
        detail: first ? first.id : '',
      });

      const weak = [];
      for (let i = 1; i < chain.length; i++) {
        const prev = known(chain[i - 1].mechanism);
        const cur = known(chain[i].mechanism);
        if (!prev || !cur) continue;
        const legal = (CHAINS_TO.get(prev.id) || []).indexOf(cur.id) !== -1;
        if (!legal) weak.push(prev.id + ' → ' + cur.id);
      }
      checks.push({
        id: 'physical-cause',
        pass: chain.length > 0 && weak.length === 0,
        detail: weak.length ? weak.join(', ') : 'grammar holds on every link',
      });

      const entry = s.entryState || entryState();
      const lastExit = chain.length && chain[chain.length - 1].exit
        ? chain[chain.length - 1].exit
        : null;
      const seam = lastExit ? checkSeam(lastExit, entry) : [];
      checks.push({
        id: 'exit-state',
        pass: Boolean(lastExit) && lastExit.velocity !== 0,
        detail: lastExit
          ? lastExit.camera + ' · v' + fmtSigned(lastExit.velocity)
          : '',
      });

      const curve = densityCurve({ duration, mode: s.mode || 'high-impact', steps: 96 });
      const density = curve.map((p) => p.density);
      const inversions = countSwing(density, 0.4);
      checks.push({
        id: 'contrast',
        pass: inversions >= 2,
        detail: Math.min.apply(null, density).toFixed(2) + '–' + Math.max.apply(null, density).toFixed(2) + ' · ' + inversions + ' swings',
      });

      const positive = prompt.split(/RULE:/)[0] || prompt;
      const found = [];
      for (const m of MECHANISMS) {
        if (m.tier !== 'reject') continue;
        const needle = m.id.replace(/^reject-/, '');
        if (new RegExp('\\b' + needle, 'i').test(positive)) found.push(needle);
      }
      checks.push({
        id: 'no-cliche',
        pass: found.length === 0,
        detail: found.length ? found.join(', ') : 'positive prompt is clean',
      });

      const words = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
      checks.push({
        id: 'compact',
        pass: words === 0 || words <= 320,
        detail: words + ' words',
      });

      const passed = checks.filter((c) => c.pass).length;
      return {
        pass: checks.every((c) => c.pass),
        score: Math.round((passed / checks.length) * 100),
        checks,
        seam,
      };
    }

    function fmtSigned(n) {
      const v = Number(n);
      if (!isFinite(v)) return '—';
      return v > 0 ? '+' + round1(v) : String(round1(v));
    }

    function buildScript(brief, params) {
      const p = params || {};
      const parsed = parseBrief(brief);
      const beats = clamp(p.beats == null ? 5 : p.beats, 3, 8);
      const duration = clamp(p.duration == null ? parsed.duration : p.duration, 4, 15);
      const seed = p.seed && String(p.seed).trim() ? String(p.seed).trim() : 'ascii-h3:' + hash32(brief || 'untitled').toString(36);
      const heroText = String(p.heroText || '').split(/[,/|]/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
      const chain = planChain({ startForm: 'void', count: beats, duration, seed });

      const script = {
        concept: parsed.concept,
        keywords: parsed.keywords,
        cliches: parsed.cliches,
        mode: parsed.mode,
        chain,
        seed,
        duration,
        ratio: RATIOS.indexOf(p.ratio) !== -1 ? p.ratio : parsed.ratio,
        palette: PALETTES[p.palette] ? p.palette : parsed.palette,
        ramp: RAMPS[p.ramp] ? p.ramp : parsed.ramp,
        heroText: heroText.length ? heroText : parsed.heroText.slice(0, 3),
        title: parsed.keywords.slice(0, 4).join(' / ') || 'untitled',
      };
      script.prompt = composePrompt(script);
      script.review = review(script);
      return script;
    }

    /* ================================================================== *
     * Small formatting helpers
     * ================================================================== */

    function dash(v) {
      if (v === null || v === undefined) return '—';
      const s = String(v).trim();
      return s ? s : '—';
    }

    function fmtSeconds(n) {
      const v = Number(n);
      if (!isFinite(v)) return '—';
      return round1(v) + 's';
    }

    /* ================================================================== *
     * Theme tokens — the only colors the chrome may use
     * ================================================================== */

    const TOKEN = {
      bgBase: 'var(--dsw-alias-bg-base)',
      bgLayer1: 'var(--dsw-alias-bg-layer-1)',
      bgLayer2: 'var(--dsw-alias-bg-layer-2)',
      bgOverlay: 'var(--dsw-alias-bg-overlay)',
      borderL1: 'var(--dsw-alias-border-l1)',
      borderL2: 'var(--dsw-alias-border-l2)',
      brand: 'var(--dsw-alias-brand-primary)',
      label1: 'var(--dsw-alias-label-primary)',
      label2: 'var(--dsw-alias-label-secondary)',
      error: 'var(--dsw-alias-state-error-primary)',
      idle: 'var(--dsw-alias-state-idle-primary)',
      success: 'var(--dsw-alias-state-success-primary)',
      warn: 'var(--dsw-alias-state-warn-primary)',
      sidebar: 'var(--dsw-specific-sidebar-fill)',
    };

    const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

    const PANEL_CSS = [
      '.ah3-scope{box-sizing:border-box}',
      '.ah3-scope *,.ah3-scope *::before,.ah3-scope *::after{box-sizing:border-box}',
      '.ah3-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,420px);gap:16px;align-items:start}',
      '@media (max-width: 900px){.ah3-grid{grid-template-columns:minmax(0,1fr)}}',
      '.ah3-btn{font:inherit;cursor:pointer;border-radius:8px;padding:7px 13px;line-height:1.25;transition:opacity .15s ease, background-color .15s ease}',
      '.ah3-btn:hover:not(:disabled){opacity:.86}',
      '.ah3-btn:disabled{opacity:.5;cursor:default}',
      '.ah3-btn:focus-visible,.ah3-field:focus-visible,.ah3-seg:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.ah3-field{font:inherit;color:inherit;border-radius:8px;padding:7px 9px;width:100%;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}',
      '.ah3-seg{font:inherit;cursor:pointer;border-radius:6px;padding:4px 8px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.ah3-card{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:12px}',
      '.ah3-chain{display:grid;grid-template-columns:repeat(auto-fill,minmax(184px,1fr));gap:10px}',
      '.ah3-pre{margin:0;overflow-x:auto;white-space:pre;letter-spacing:0;tab-size:1}',
      '.ah3-chip{font-family:' + FONT_MONO + ';font-size:11px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:1px 6px;white-space:nowrap}',
      '.ah3-row{display:flex;align-items:flex-start;gap:9px}',
      '.ah3-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
    ].join('\n');

    /* ================================================================== *
     * Primitives
     * ================================================================== */

    function StyleTag() {
      return h('style', { 'data-ah3-client': 'true', dangerouslySetInnerHTML: { __html: PANEL_CSS } });
    }

    function Card(props) {
      return h('section', {
        className: 'ah3-card',
        style: Object.assign({
          padding: '14px 15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minWidth: 0,
        }, props.style || {}),
        'aria-label': props.ariaLabel,
      }, props.children);
    }

    function SectionTitle(props) {
      return h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' } }, [
        h('h2', {
          key: 'title',
          style: {
            margin: 0,
            fontSize: '13px',
            fontWeight: 650,
            letterSpacing: '0.01em',
            color: TOKEN.label1,
          },
        }, props.title),
        props.aside
          ? h('span', { key: 'aside', style: { fontSize: '11px', color: TOKEN.label2, fontFamily: FONT_MONO } }, props.aside)
          : null,
      ]);
    }

    function Btn(props) {
      const variant = props.variant === 'primary' ? 'primary' : 'secondary';
      const style = variant === 'primary'
        ? { background: TOKEN.brand, color: TOKEN.bgBase, border: '1px solid transparent', fontWeight: 600 }
        : { background: TOKEN.bgLayer2, color: TOKEN.label1, border: '1px solid ' + TOKEN.borderL1 };
      return h('button', {
        type: 'button',
        className: 'ah3-btn',
        'aria-label': props.ariaLabel || props.label,
        disabled: Boolean(props.disabled),
        onClick: props.onClick,
        style: Object.assign(style, props.style || {}),
      }, props.label);
    }

    function Field(props) {
      const id = props.id;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 } }, [
        h('label', {
          key: 'label',
          htmlFor: id,
          style: { fontSize: '11px', letterSpacing: '0.03em', textTransform: 'uppercase', color: TOKEN.label2 },
        }, props.label),
        h('input', {
          key: 'input',
          id,
          className: 'ah3-field',
          type: props.type || 'text',
          value: props.value,
          placeholder: props.placeholder,
          min: props.min,
          max: props.max,
          step: props.step,
          spellCheck: false,
          'aria-label': props.ariaLabel || props.label,
          onChange: (e) => props.onChange(e.target.value),
          style: Object.assign({ fontFamily: FONT_MONO, fontSize: '12px' }, props.style || {}),
        }),
      ]);
    }

    function Select(props) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 } }, [
        h('label', {
          key: 'label',
          htmlFor: props.id,
          style: { fontSize: '11px', letterSpacing: '0.03em', textTransform: 'uppercase', color: TOKEN.label2 },
        }, props.label),
        h('select', {
          key: 'select',
          id: props.id,
          className: 'ah3-field',
          value: props.value,
          'aria-label': props.ariaLabel || props.label,
          onChange: (e) => props.onChange(e.target.value),
          style: { fontFamily: FONT_MONO, fontSize: '12px' },
        }, props.options.map((opt) => h('option', { key: opt.value, value: opt.value }, opt.label))),
      ]);
    }

    function Segmented(props) {
      const name = props.label;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 } }, [
        h('span', {
          key: 'label',
          id: props.id + '-label',
          style: { fontSize: '11px', letterSpacing: '0.03em', textTransform: 'uppercase', color: TOKEN.label2 },
        }, name),
        h('div', {
          key: 'group',
          role: 'group',
          'aria-labelledby': props.id + '-label',
          style: {
            display: 'inline-flex',
            gap: '3px',
            padding: '3px',
            borderRadius: '9px',
            background: TOKEN.bgLayer1,
            border: '1px solid ' + TOKEN.borderL1,
            alignSelf: 'flex-start',
            flexWrap: 'wrap',
          },
        }, props.options.map((opt) => {
          const on = opt.value === props.value;
          return h('button', {
            key: opt.value,
            type: 'button',
            className: 'ah3-seg',
            'aria-pressed': on,
            'aria-label': name + ': ' + opt.label,
            onClick: () => props.onChange(opt.value),
            style: on
              ? { background: TOKEN.brand, color: TOKEN.bgBase, fontWeight: 600, border: '1px solid transparent' }
              : { color: TOKEN.label2 },
          }, opt.label);
        })),
      ]);
    }

    function DList(props) {
      return h('dl', {
        style: {
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(96px, 128px) minmax(0,1fr)',
          rowGap: '6px',
          columnGap: '10px',
          fontSize: '12px',
        },
      }, props.rows.map((row, i) => [
        h('dt', {
          key: 't' + i,
          style: { color: TOKEN.label2, letterSpacing: '0.02em' },
        }, row.term),
        h('dd', {
          key: 'd' + i,
          style: {
            margin: 0,
            color: TOKEN.label1,
            fontFamily: FONT_MONO,
            wordBreak: 'break-word',
            minWidth: 0,
          },
        }, row.value),
      ]));
    }

    function Banner(props) {
      const tone = props.tone === 'error' ? TOKEN.error : props.tone === 'success' ? TOKEN.success : TOKEN.warn;
      return h('div', {
        role: 'status',
        style: {
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '12px',
          color: TOKEN.label2,
          border: '1px solid ' + TOKEN.borderL1,
          borderLeft: '3px solid ' + tone,
          borderRadius: '8px',
          padding: '8px 10px',
          background: TOKEN.bgLayer1,
          fontFamily: FONT_MONO,
          wordBreak: 'break-word',
          minWidth: 0,
        },
      }, props.children);
    }

    /* ================================================================== *
     * Error boundary — a thrown error must never blank the slot
     * ================================================================== */

    class Boundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
        this.reset = this.reset.bind(this);
      }

      static getDerivedStateFromError(error) {
        return { error };
      }

      componentDidCatch(error) {
        if (typeof console !== 'undefined' && console && typeof console.error === 'function') {
          console.error('[ascii-h3-director] client panel failed', error);
        }
      }

      reset() {
        this.setState({ error: null });
      }

      render() {
        const error = this.state.error;
        if (!error) return this.props.children;
        const t = this.props.t;
        const label = typeof t === 'function' ? t('error.title') : 'Director console failed';
        const retry = typeof t === 'function' ? t('error.retry') : 'Retry';
        return h('div', {
          role: 'alert',
          style: {
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid ' + TOKEN.borderL1,
            borderLeft: '3px solid ' + TOKEN.error,
            background: TOKEN.bgLayer1,
            color: TOKEN.label1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontFamily: FONT_MONO,
            fontSize: '12px',
          },
        }, [
          h('strong', { key: 'title', style: { fontFamily: 'inherit', fontSize: '13px' } }, label),
          h('span', { key: 'msg', style: { color: TOKEN.label2, wordBreak: 'break-word' } }, String(error && error.message ? error.message : error)),
          h('div', { key: 'actions' }, h(Btn, { label: retry, variant: 'secondary', onClick: this.reset, ariaLabel: retry })),
        ]);
      }
    }

    /* ================================================================== *
     * Preview canvas
     * ================================================================== */

    function PreviewCanvas(props) {
      const t = props.t;
      const [playing, setPlaying] = React.useState(true);
      const [time, setTime] = React.useState(0);
      const duration = Number(props.duration) > 0 ? Number(props.duration) : 15;
      const latest = React.useRef({ duration });
      latest.current.duration = duration;

      React.useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(() => {
          setTime((prev) => {
            const next = prev + 1 / 12;
            const d = latest.current.duration;
            return next >= d ? 0 : next;
          });
        }, 1000 / 12);
        return () => clearInterval(id);
      }, [playing]);

      const u = duration > 0 ? clamp(time / duration, 0, 1) : 0;

      let frame = null;
      try {
        frame = renderFrame({
          cols: GRID_COLS,
          rows: GRID_ROWS,
          u,
          duration,
          mechanism: props.mechanism,
          palette: props.palette,
          ramp: props.ramp,
          seed: props.seed,
          heroText: props.heroText,
        });
      } catch (err) {
        frame = null;
      }

      const fallbackRows = [];
      for (let i = 0; i < GRID_ROWS; i++) fallbackRows.push('');
      const rows = frame ? frame.rows : fallbackRows;

      const tLabel = typeof t === 'function' ? t : (k) => k;

      return h(Card, { ariaLabel: tLabel('preview') }, [
        h(SectionTitle, {
          key: 'head',
          title: tLabel('preview'),
          aside: timecodeOf(time) + ' / ' + timecodeOf(duration),
        }),
        h('div', {
          key: 'stage',
          /* the one surface allowed a literal color: it is the artwork's paper,
           * not chrome. Marked so the rule stays auditable. */
          'data-artwork': 'stage',
          style: {
            position: 'relative',
            borderRadius: '10px',
            border: '1px solid ' + TOKEN.borderL1,
            background: frame ? frame.bg : PALETTES[DEFAULT_PALETTE].bg,
            overflow: 'hidden',
            padding: '8px 6px',
          },
        }, h('pre', {
          className: 'ah3-pre',
          'aria-hidden': true,
          style: {
            fontFamily: FONT_MONO,
            fontSize: '12px',
            lineHeight: '12px',
            color: frame && frame.inks && frame.inks[0] ? frame.inks[0] : '#f2f4f5',
            margin: 0,
          },
        }, frame ? frameToSpans(frame) : rows.join('\n'))),
        h('div', {
          key: 'controls',
          style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' },
        }, [
          h(Btn, {
            key: 'play',
            label: playing ? tLabel('pause') : tLabel('play'),
            variant: playing ? 'secondary' : 'primary',
            onClick: () => setPlaying((p) => !p),
            ariaLabel: playing ? tLabel('pause') : tLabel('play'),
          }),
          h('div', {
            key: 'scrub',
            style: { flex: '1 1 160px', minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '4px' },
          }, [
            h('label', {
              key: 'l',
              htmlFor: 'ah3-scrub',
              className: 'ah3-sr',
            }, tLabel('scrub')),
            h('input', {
              key: 'i',
              id: 'ah3-scrub',
              className: 'ah3-field',
              type: 'range',
              min: 0,
              max: Math.max(0.1, duration),
              step: 0.05,
              value: Number(time.toFixed(2)),
              'aria-label': tLabel('scrub'),
              'aria-valuetext': timecodeOf(time),
              onChange: (e) => setTime(clamp(parseFloat(e.target.value), 0, duration)),
              style: { padding: 0, background: 'transparent', border: 'none' },
            }),
          ]),
          h('span', {
            key: 'tc',
            className: 'ah3-chip',
            style: { color: TOKEN.label1 },
            'aria-label': tLabel('timecode'),
          }, timecodeOf(time)),
        ]),
        h('div', {
          key: 'meta',
          style: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
        }, [
          h('span', { key: 'm', className: 'ah3-chip', style: { color: TOKEN.label2 } }, dash(props.mechanismName)),
          h('span', { key: 'p', className: 'ah3-chip', style: { color: TOKEN.label2 } }, 'palette: ' + dash(props.palette)),
          h('span', { key: 'r', className: 'ah3-chip', style: { color: TOKEN.label2 } }, 'ramp: ' + dash(props.ramp)),
          h('span', { key: 'f', className: 'ah3-chip', style: { color: TOKEN.label2 } }, GRID_COLS + '×' + GRID_ROWS + ' · 12fps'),
        ]),
      ]);
    }

    /* ================================================================== *
     * Chain strip
     * ================================================================== */

    function ChainStrip(props) {
      const t = props.t;
      const chain = Array.isArray(props.chain) ? props.chain : [];
      const activeIndex = chain.length ? Math.min(chain.length - 1, Math.floor(props.u * chain.length)) : -1;

      if (!chain.length) {
        return h(Card, { ariaLabel: t('chain') }, h(SectionTitle, { title: t('chain'), aside: '0' }),
          h('p', { style: { margin: 0, fontSize: '12px', color: TOKEN.label2 } }, t('chain.empty')));
      }

      return h(Card, { ariaLabel: t('chain') }, [
        h(SectionTitle, { key: 'head', title: t('chain'), aside: chain.length + ' × ' + fmtSeconds(props.duration / chain.length) }),
        h('ol', { key: 'list', className: 'ah3-chain', style: { listStyle: 'none', margin: 0, padding: 0 } },
          chain.map((link, i) => {
            const m = known(link.mechanism);
            const active = i === activeIndex;
            return h('li', {
              key: (link.mechanism || 'link') + i,
              className: 'ah3-card',
              'aria-current': active ? 'step' : undefined,
              style: {
                padding: '10px 11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
                background: TOKEN.bgLayer1,
                borderColor: active ? TOKEN.brand : TOKEN.borderL1,
                minWidth: 0,
              },
            }, [
              h('div', { key: 'top', style: { display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 } }, [
                h('span', {
                  key: 'n',
                  style: {
                    fontFamily: FONT_MONO,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: active ? TOKEN.bgBase : TOKEN.label2,
                    background: active ? TOKEN.brand : TOKEN.bgLayer2,
                    border: '1px solid ' + TOKEN.borderL1,
                    borderRadius: '5px',
                    padding: '0 5px',
                    lineHeight: '17px',
                  },
                }, String(i + 1)),
                h('span', {
                  key: 'beat',
                  className: 'ah3-chip',
                  style: { color: TOKEN.label2 },
                }, dash(link.beat)),
                h('span', {
                  key: 'tier',
                  className: 'ah3-chip',
                  style: {
                    marginLeft: 'auto',
                    color: m && m.tier === 'canonical' ? TOKEN.success : m && m.tier === 'strong' ? TOKEN.label1 : TOKEN.label2,
                  },
                }, m ? t('tier.' + m.tier) : '—'),
              ]),
              h('div', {
                key: 'name',
                style: { fontSize: '12px', fontWeight: 600, color: TOKEN.label1, lineHeight: 1.35, minWidth: 0 },
              }, m ? m.name : dash(link.mechanism)),
              h('div', {
                key: 'emits',
                style: { fontSize: '11px', color: TOKEN.label2, fontFamily: FONT_MONO },
              }, t('emits') + ': ' + dash(m && m.emits)),
            ]);
          })),
      ]);
    }

    /* ================================================================== *
     * Quality gate
     * ================================================================== */

    function GateCard(props) {
      const t = props.t;
      const result = props.result;
      const score = result && isFinite(result.score) ? result.score : null;
      const bar = score === null ? 0 : clamp(score, 0, 100);
      const tone = result ? (result.pass ? TOKEN.success : score >= 60 ? TOKEN.warn : TOKEN.error) : TOKEN.idle;

      return h(Card, { ariaLabel: t('gate') }, [
        h(SectionTitle, {
          key: 'head',
          title: t('gate'),
          aside: result ? t('gate.score') + ' ' + bar + '/100' : null,
        }),
        result
          ? h('div', { key: 'score', style: { display: 'flex', alignItems: 'baseline', gap: '10px' } }, [
            h('span', {
              key: 'n',
              style: { fontSize: '38px', fontWeight: 700, lineHeight: 1, color: tone, fontFamily: FONT_MONO },
            }, String(bar)),
            h('span', { key: 'u', style: { fontSize: '12px', color: TOKEN.label2 } }, '/ 100'),
            h('span', {
              key: 'v',
              style: { marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: tone },
            }, result.pass ? t('gate.pass') : t('gate.fail')),
          ])
          : h('p', { key: 'empty', style: { margin: 0, fontSize: '12px', color: TOKEN.label2 } }, t('gate.empty')),
        h('div', {
          key: 'track',
          role: 'progressbar',
          'aria-label': t('gate.score'),
          'aria-valuenow': bar,
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          style: {
            height: '6px',
            borderRadius: '999px',
            background: TOKEN.bgLayer1,
            border: '1px solid ' + TOKEN.borderL1,
            overflow: 'hidden',
          },
        }, h('div', {
          style: {
            width: bar + '%',
            height: '100%',
            background: tone,
            transition: 'width .25s ease',
          },
        })),
        result
          ? h('ul', {
            key: 'checks',
            style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
          }, result.checks.map((check) => h('li', {
            key: check.id,
            className: 'ah3-row',
          }, [
            h('span', {
              key: 'g',
              'aria-hidden': true,
              style: {
                fontFamily: FONT_MONO,
                fontSize: '13px',
                lineHeight: '16px',
                color: check.pass ? TOKEN.success : TOKEN.error,
                width: '13px',
                flex: '0 0 auto',
              },
            }, check.pass ? '✓' : '✕'),
            h('span', { key: 'b', style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' } }, [
              h('span', {
                key: 'l',
                style: { fontSize: '12px', color: TOKEN.label1, lineHeight: 1.35 },
              }, typeof t === 'function' ? t('check.' + check.id) : check.id),
              h('span', {
                key: 'd',
                style: { fontSize: '11px', color: check.pass ? TOKEN.label2 : TOKEN.error, fontFamily: FONT_MONO, wordBreak: 'break-word' },
              }, dash(check.detail)),
            ]),
          ])))
          : null,
        result && result.seam && result.seam.length
          ? h('div', {
            key: 'seam',
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '11px',
              color: TOKEN.warn,
              fontFamily: FONT_MONO,
            },
          }, [
            h('span', { key: 'h', style: { color: TOKEN.label2 } }, t('gate.seam')),
            ...result.seam.map((s, i) => h('span', { key: 's' + i }, '! ' + s)),
          ])
          : null,
      ]);
    }

    /* ================================================================== *
     * Motion-state inspector
     * ================================================================== */

    function MotionInspector(props) {
      const t = props.t;
      const exit = props.exit || exitState();
      const entry = props.entry || entryState();

      return h(Card, { ariaLabel: t('motion') }, [
        h(SectionTitle, { key: 'head', title: t('motion'), aside: props.lastName || '—' }),
        h(DList, {
          key: 'exit',
          rows: [
            { term: t('field.form'), value: dash(exit.form) },
            { term: t('field.camera'), value: dash(exit.camera) },
            { term: t('field.velocity'), value: exit.velocity === 0 ? t('trend.hold') : fmtSigned(exit.velocity) },
            { term: t('field.rotation'), value: Number(exit.rotation) ? round1(exit.rotation) + ' turns/s' : '0' },
            { term: t('field.scaleTrend'), value: trendWords(t, exit.scaleTrend) },
            { term: t('field.densityTrend'), value: trendWords(t, exit.densityTrend) },
            { term: t('field.unresolved'), value: dash(exit.unresolved) },
          ],
        }),
        h('div', { key: 'entry', className: 'ah3-row', style: { alignItems: 'center', gap: '6px', flexWrap: 'wrap' } }, [
          h('span', { key: 'l', style: { fontSize: '11px', color: TOKEN.label2, textTransform: 'uppercase', letterSpacing: '0.03em' } }, t('entry')),
          h('span', { key: 'c', className: 'ah3-chip', style: { color: TOKEN.label1 } }, dash(entry.camera)),
          h('span', { key: 'p', className: 'ah3-chip', style: { color: TOKEN.label2 } }, dash(entry.palette)),
          h('span', { key: 'r', className: 'ah3-chip', style: { color: TOKEN.label2 } }, dash(entry.ramp)),
        ]),
      ]);
    }

    function trendWords(t, value) {
      const v = Number(value);
      if (!isFinite(v) || v === 0) return t('trend.hold');
      return (v > 0 ? '+' : '−') + Math.abs(round1(v)) + ' ' + (v > 0 ? t('trend.up') : t('trend.down'));
    }

    /* ================================================================== *
     * Brief composer
     * ================================================================== */

    function Composer(props) {
      const t = props.t;
      const p = props.params;
      const briefId = 'ah3-brief';

      return h(Card, { ariaLabel: t('brief') }, [
        h(SectionTitle, { key: 'head', title: t('brief'), aside: props.keywords.length ? props.keywords.slice(0, 3).join(' · ') : null }),
        h('div', { key: 'brief', style: { display: 'flex', flexDirection: 'column', gap: '5px' } }, [
          h('label', {
            key: 'l',
            htmlFor: briefId,
            style: { fontSize: '11px', letterSpacing: '0.03em', textTransform: 'uppercase', color: TOKEN.label2 },
          }, t('brief.label')),
          h('textarea', {
            key: 'a',
            id: briefId,
            className: 'ah3-field',
            rows: 4,
            value: props.brief,
            placeholder: t('brief.placeholder'),
            'aria-label': t('brief.label'),
            spellCheck: false,
            onChange: (e) => props.onBrief(e.target.value),
            style: { resize: 'vertical', minHeight: '84px', fontSize: '12px', lineHeight: 1.5 },
          }),
        ]),
        h('div', {
          key: 'params',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: '10px', alignItems: 'end' },
        }, [
          h('div', { key: 'beats', style: { display: 'flex', flexDirection: 'column', gap: '5px' } }, [
            h('label', {
              key: 'l',
              htmlFor: 'ah3-beats',
              style: { fontSize: '11px', letterSpacing: '0.03em', textTransform: 'uppercase', color: TOKEN.label2 },
            }, t('beats') + ': ' + p.beats),
            h('input', {
              key: 'i',
              id: 'ah3-beats',
              type: 'range',
              min: 3,
              max: 8,
              step: 1,
              value: p.beats,
              'aria-label': t('beats'),
              'aria-valuetext': String(p.beats),
              onChange: (e) => props.onParam('beats', clamp(parseInt(e.target.value, 10), 3, 8)),
              style: { width: '100%' },
            }),
          ]),
          h('div', { key: 'duration', style: { display: 'flex', flexDirection: 'column', gap: '5px' } }, [
            h('label', {
              key: 'l',
              htmlFor: 'ah3-duration',
              style: { fontSize: '11px', letterSpacing: '0.03em', textTransform: 'uppercase', color: TOKEN.label2 },
            }, t('duration') + ': ' + p.duration + 's'),
            h('input', {
              key: 'i',
              id: 'ah3-duration',
              type: 'range',
              min: 4,
              max: 15,
              step: 1,
              value: p.duration,
              'aria-label': t('duration'),
              'aria-valuetext': p.duration + 's',
              onChange: (e) => props.onParam('duration', clamp(parseInt(e.target.value, 10), 4, 15)),
              style: { width: '100%' },
            }),
          ]),
          h(Segmented, {
            key: 'ratio',
            id: 'ah3-ratio',
            label: t('ratio'),
            value: p.ratio,
            options: RATIOS.map((r) => ({ value: r, label: r })),
            onChange: (v) => props.onParam('ratio', v),
          }),
          h(Select, {
            key: 'palette',
            id: 'ah3-palette',
            label: t('palette'),
            value: p.palette,
            options: PALETTE_IDS.map((id) => ({ value: id, label: dash(t('pal.' + id.replace(/-/g, '_'))) })),
            onChange: (v) => props.onParam('palette', v),
          }),
          h(Select, {
            key: 'ramp',
            id: 'ah3-ramp',
            label: t('ramp'),
            value: p.ramp,
            options: RAMP_IDS.map((id) => ({ value: id, label: id })),
            onChange: (v) => props.onParam('ramp', v),
          }),
          h(Field, {
            key: 'hero',
            id: 'ah3-hero',
            label: t('heroText'),
            value: p.heroText,
            placeholder: 'OPEN / VOID',
            onChange: (v) => props.onParam('heroText', v),
          }),
          h(Field, {
            key: 'seed',
            id: 'ah3-seed',
            label: t('seed'),
            value: p.seed,
            placeholder: 'ascii-h3',
            onChange: (v) => props.onParam('seed', v),
          }),
        ]),
        h('div', { key: 'stats', style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, [
          h('span', { key: 'w', className: 'ah3-chip', style: { color: TOKEN.label2 } }, props.words + ' ' + t('brief.words')),
          h('span', { key: 'k', className: 'ah3-chip', style: { color: TOKEN.label2 } }, t('brief.title') + ': ' + dash(props.title)),
        ]),
      ]);
    }

    /* ================================================================== *
     * Panel icon (sidebar)
     * ================================================================== */

    function PanelIcon(props) {
      const size = props && Number(props.size) > 0 ? Number(props.size) : 18;
      const active = Boolean(props && props.active);
      const stroke = active ? 'currentColor' : 'currentColor';
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 20 20',
        'aria-hidden': true,
        style: { display: 'block', opacity: active ? 1 : 0.82, overflow: 'visible' },
      }, [
        h('rect', {
          key: 'frame',
          x: 1.5,
          y: 2.5,
          width: 17,
          height: 15,
          rx: 2.5,
          fill: 'none',
          stroke,
          strokeWidth: 1.3,
        }),
        h('path', {
          key: 'a',
          d: 'M4.6 12.6 L7.4 8.2 L10.2 12.6',
          fill: 'none',
          stroke,
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'b',
          d: 'M11.6 8.2 L11.6 12.6 L15.4 12.6',
          fill: 'none',
          stroke,
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('circle', { key: 'c', cx: 15.4, cy: 6.6, r: 1.5, fill: stroke, opacity: 0.9 }),
      ]);
    }

    /* ================================================================== *
     * Director console
     * ================================================================== */

    const DEFAULT_BRIEF = 'a void that assembles into a glyph sphere and collapses into a cursor mid-dive, 12 seconds, phosphor terminal';

    function DirectorConsole(props) {
      const t = props && typeof props.t === 'function' ? props.t : (k) => k;

      const [brief, setBrief] = React.useState(DEFAULT_BRIEF);
      const [params, setParams] = React.useState({
        beats: 5,
        duration: 12,
        ratio: '21:9',
        palette: 'phosphor',
        ramp: 'phosphor',
        heroText: 'VOID',
        seed: '',
      });
      const [planned, setPlanned] = React.useState(null);
      const [gate, setGate] = React.useState(null);
      const [status, setStatus] = React.useState(null);

      const onParam = React.useCallback((key, value) => {
        setParams((prev) => Object.assign({}, prev, { [key]: value }));
        setPlanned(null);
        setGate(null);
      }, []);

      const onBrief = React.useCallback((value) => {
        setBrief(value);
        setPlanned(null);
        setGate(null);
      }, []);

      const words = React.useMemo(() => {
        const trimmed = String(brief || '').trim();
        return trimmed ? trimmed.split(/\s+/).length : 0;
      }, [brief]);

      const preview = React.useMemo(() => {
        try {
          return buildScript(brief, params);
        } catch (err) {
          return null;
        }
      }, [brief, params]);

      const chain = planned ? planned.chain : preview ? preview.chain : [];
      const duration = planned ? planned.duration : params.duration;
      const palette = planned ? planned.palette : params.palette;
      const ramp = planned ? planned.ramp : params.ramp;
      const seed = planned ? planned.seed : preview ? preview.seed : '';
      const heroText = planned ? planned.heroText : String(params.heroText || '').split(/[,/|]/)[0];
      const keywords = planned ? planned.keywords : preview ? preview.keywords : [];
      const title = planned ? planned.title : preview ? preview.title : '';

      const lastLink = chain.length ? chain[chain.length - 1] : null;
      const lastMech = lastLink ? known(lastLink.mechanism) : null;
      const plannedExit = lastLink && lastLink.exit ? lastLink.exit : exitState();
      const entry = React.useMemo(
        () => entryState({
          form: plannedExit.form,
          camera: plannedExit.camera,
          velocity: plannedExit.velocity,
          rotation: plannedExit.rotation,
          scaleTrend: plannedExit.scaleTrend,
          densityTrend: plannedExit.densityTrend,
          unresolved: '',
          palette,
          ramp,
        }),
        [plannedExit.form, plannedExit.camera, plannedExit.velocity, plannedExit.rotation, plannedExit.scaleTrend, plannedExit.densityTrend, palette, ramp],
      );

      const [scrubU, setScrubU] = React.useState(0);
      const currentIndex = chain.length ? Math.min(chain.length - 1, Math.floor(scrubU * chain.length)) : -1;
      const currentMech = currentIndex >= 0 ? known(chain[currentIndex].mechanism) : null;

      const plan = React.useCallback(() => {
        try {
          const script = buildScript(brief, params);
          setPlanned(script);
          setGate(null);
          setStatus({ text: t('status.planned', { n: script.chain.length, s: script.seed }), tone: 'success' });
        } catch (err) {
          setStatus({ text: t('status.error') + ' ' + String(err && err.message ? err.message : err), tone: 'error' });
        }
      }, [brief, params, t]);

      const runGate = React.useCallback(() => {
        try {
          const script = planned && planned.prompt ? planned : buildScript(brief, params);
          const result = review(script);
          setPlanned(script);
          setGate(result);
          setStatus({
            text: result.pass
              ? t('status.gatePass', { score: result.score })
              : t('status.gateFail', { score: result.score }),
            tone: result.pass ? 'success' : 'warn',
          });
        } catch (err) {
          setStatus({ text: t('status.error') + ' ' + String(err && err.message ? err.message : err), tone: 'error' });
        }
      }, [brief, params, planned, t]);

      const copyPrompt = React.useCallback(() => {
        let text = '';
        try {
          const script = planned && planned.prompt ? planned : buildScript(brief, params);
          text = script.prompt || '';
        } catch (err) {
          text = '';
        }
        if (!text) {
          setStatus({ text: t('status.error'), tone: 'error' });
          return;
        }
        const done = () => setStatus({ text: t('status.copied'), tone: 'success' });
        const failed = () => setStatus({ text: t('status.copyFailed'), tone: 'error' });
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            const p = navigator.clipboard.writeText(text);
            if (p && typeof p.then === 'function') {
              p.then(done, failed);
              return;
            }
            done();
            return;
          }
          failed();
        } catch (err) {
          failed();
        }
      }, [brief, params, planned, t]);

      return h('div', {
        className: 'ah3-scope',
        style: {
          height: '100%',
          minHeight: 0,
          overflow: 'auto',
          background: TOKEN.bgBase,
          color: TOKEN.label1,
          padding: '20px clamp(14px, 2.2vw, 28px) 32px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: '13px',
        },
      }, [
        h(StyleTag, { key: 'style' }),

        h('header', {
          key: 'header',
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: '10px',
            paddingBottom: '14px',
            marginBottom: '16px',
            borderBottom: '1px solid ' + TOKEN.borderL1,
          },
        }, [
          h('div', { key: 'titles', style: { minWidth: 0, flex: '1 1 260px' } }, [
            h('h1', {
              key: 'h1',
              style: { margin: 0, fontSize: '19px', fontWeight: 650, letterSpacing: '-0.01em', lineHeight: 1.2 },
            }, t('title')),
            h('p', {
              key: 'sub',
              style: { margin: '5px 0 0', fontSize: '12px', color: TOKEN.label2, lineHeight: 1.45 },
            }, t('subtitle')),
          ]),
          h('span', {
            key: 'version',
            className: 'ah3-chip',
            style: { color: TOKEN.label2, fontFamily: FONT_MONO },
            'aria-label': t('version'),
          }, 'v1.0.0 · client'),
        ]),

        h('div', { key: 'grid', className: 'ah3-grid' }, [
          h('div', { key: 'left', style: { display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 } }, [
            h(Composer, {
              key: 'composer',
              t,
              brief,
              params,
              words,
              keywords,
              title,
              onBrief,
              onParam,
            }),
            h('div', { key: 'actions', style: { display: 'flex', flexWrap: 'wrap', gap: '9px' } }, [
              h(Btn, { key: 'plan', label: t('action.plan'), variant: 'primary', onClick: plan, ariaLabel: t('action.plan') }),
              h(Btn, { key: 'gate', label: t('action.gate'), variant: 'secondary', onClick: runGate, ariaLabel: t('action.gate') }),
              h(Btn, { key: 'copy', label: t('action.copy'), variant: 'secondary', onClick: copyPrompt, ariaLabel: t('action.copy') }),
            ]),
            status
              ? h(Banner, { key: 'status', tone: status.tone }, status.text)
              : null,
            h(ChainStrip, {
              key: 'chain',
              t,
              chain,
              duration,
              u: chain.length ? (currentIndex + 0.5) / chain.length : 0,
            }),
          ]),

          h('div', { key: 'right', style: { display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 } }, [
            h(GateCard, { key: 'gatecard', t, result: gate }),
            h(MotionInspector, {
              key: 'motion',
              t,
              exit: plannedExit,
              entry,
              lastName: lastMech ? lastMech.name : '',
            }),
            h(PreviewCanvas, {
              key: 'preview',
              t,
              duration,
              mechanism: currentMech ? currentMech.id : chain.length ? chain[0].mechanism : 'field',
              mechanismName: currentMech ? currentMech.name : lastMech ? lastMech.name : '',
              palette,
              ramp,
              seed,
              heroText,
            }),
          ]),
        ]),

        h('footer', {
          key: 'footer',
          style: {
            marginTop: '18px',
            paddingTop: '12px',
            borderTop: '1px solid ' + TOKEN.borderL1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            fontSize: '11px',
            color: TOKEN.label2,
            fontFamily: FONT_MONO,
          },
        }, [
          h('span', { key: 'a' }, t('footer.chain') + ' ' + (chain.length || 0)),
          h('span', { key: 'b' }, '· ' + t('footer.grammar') + ' ' + MECHANISMS.filter((m) => m.tier !== 'reject').length),
          h('span', { key: 'c' }, '· ' + t('footer.seed') + ' ' + dash(seed)),
          h('button', {
            key: 'scrub',
            type: 'button',
            className: 'ah3-seg',
            'aria-label': t('preview'),
            onClick: () => setScrubU((u) => (u >= 0.999 ? 0 : Math.min(1, u + 0.25))),
            style: { marginLeft: 'auto', color: TOKEN.label2, border: '1px solid ' + TOKEN.borderL1 },
          }, t('preview') + ' ' + Math.round(scrubU * 100) + '%'),
        ]),
      ]);
    }

    /* ================================================================== *
     * Locale dictionaries
     * ================================================================== */

    const DICT_EN = {
      title: 'ASCII H3 Director',
      subtitle: 'Brief → transformation chain → compact H3 prompt → quality gate. Written for time, not as prose.',
      version: 'Client version',
      brief: 'Brief',
      'brief.label': 'Brief',
      'brief.placeholder': 'Describe the transformation, not the look: what does each form become?',
      'brief.words': 'words',
      'brief.title': 'working title',
      beats: 'Beats',
      duration: 'Duration',
      ratio: 'Aspect ratio',
      palette: 'Palette',
      ramp: 'Glyph ramp',
      heroText: 'Hero text',
      seed: 'Seed',
      chain: 'Transformation chain',
      'chain.empty': 'No chain yet — plan one.',
      emits: 'emits',
      gate: 'Quality gate',
      'gate.score': 'Score',
      'gate.pass': 'PASS',
      'gate.fail': 'REVIEW',
      'gate.empty': 'Not run yet — the gate checks structure before you pay for a generation.',
      'gate.seam': 'continuity contract',
      motion: 'Motion state',
      entry: 'entry',
      'field.form': 'form',
      'field.camera': 'camera',
      'field.velocity': 'velocity',
      'field.rotation': 'rotation',
      'field.scaleTrend': 'scale trend',
      'field.densityTrend': 'density trend',
      'field.unresolved': 'unresolved',
      'trend.hold': 'hold',
      'trend.up': 'grow',
      'trend.down': 'shrink',
      preview: 'Preview',
      play: 'Play',
      pause: 'Pause',
      scrub: 'Scrub the clip',
      timecode: 'Timecode',
      'action.plan': 'Plan chain',
      'action.gate': 'Run quality gate',
      'action.copy': 'Copy H3 prompt',
      'status.planned': 'Chain planned — {n} beats, seed {s}.',
      'status.gatePass': 'Gate passed at {score}/100.',
      'status.gateFail': 'Gate needs review: {score}/100.',
      'status.copied': 'H3 prompt copied to the clipboard.',
      'status.copyFailed': 'Clipboard unavailable — select the prompt text manually.',
      'status.error': 'Something went wrong while building the script.',
      'tier.canonical': 'canonical',
      'tier.strong': 'strong',
      'tier.support': 'support',
      'tier.reject': 'reject',
      'check.single-chain': 'One legible transformation chain',
      'check.source-state': 'First shot has a clear source state',
      'check.physical-cause': 'Every transition has a physical cause',
      'check.exit-state': 'Final state is usable as the next clip’s input',
      'check.contrast': 'At least 2 strong scale/density contrasts',
      'check.no-cliche': 'Generic HUD / cyberpunk / glitch excluded',
      'check.compact': 'Prompt stays compact (written for time, not prose)',
      'pal.brutalist_digital': 'brutalist digital',
      'pal.minimal_signal': 'minimal signal',
      'pal.phosphor': 'phosphor',
      'pal.paper_terminal': 'paper terminal',
      'pal.monolith': 'monolith',
      'error.title': 'Director console failed',
      'error.retry': 'Retry',
      'footer.chain': 'chain',
      'footer.grammar': 'live mechanisms',
      'footer.seed': 'seed',
    };

    const DICT_ZH = {
      title: 'ASCII H3 导演台',
      subtitle: '简报 → 变换链 → 紧凑 H3 提示词 → 质量闸门。为时间而写，不写成散文。',
      version: '客户端版本',
      brief: '简报',
      'brief.label': '简报',
      'brief.placeholder': '描述变换过程，而不是外观：每一种形态变成了什么？',
      'brief.words': '词',
      'brief.title': '工作标题',
      beats: '节拍',
      duration: '时长',
      ratio: '画幅',
      palette: '调色板',
      ramp: '字符梯度',
      heroText: '主字',
      seed: '种子',
      chain: '变换链',
      'chain.empty': '还没有链条——先规划一条。',
      emits: '输出形态',
      gate: '质量闸门',
      'gate.score': '得分',
      'gate.pass': '通过',
      'gate.fail': '待审',
      'gate.empty': '尚未运行——闸门在花钱生成之前先检查结构。',
      'gate.seam': '连续性契约',
      motion: '运动状态',
      entry: '入场',
      'field.form': '形态',
      'field.camera': '镜头',
      'field.velocity': '速度',
      'field.rotation': '旋转',
      'field.scaleTrend': '尺度趋势',
      'field.densityTrend': '密度趋势',
      'field.unresolved': '未闭合',
      'trend.hold': '保持',
      'trend.up': '增长',
      'trend.down': '收缩',
      preview: '预览',
      play: '播放',
      pause: '暂停',
      scrub: '拖动时间轴',
      timecode: '时间码',
      'action.plan': '规划链条',
      'action.gate': '运行质量闸门',
      'action.copy': '复制 H3 提示词',
      'status.planned': '链条已规划——{n} 个节拍，种子 {s}。',
      'status.gatePass': '闸门通过，得分 {score}/100。',
      'status.gateFail': '闸门需要复核：{score}/100。',
      'status.copied': 'H3 提示词已复制到剪贴板。',
      'status.copyFailed': '剪贴板不可用——请手动选择提示词文本。',
      'status.error': '构建脚本时出错。',
      'tier.canonical': '经典',
      'tier.strong': '强',
      'tier.support': '辅助',
      'tier.reject': '拒绝',
      'check.single-chain': '存在一条清晰的变换链',
      'check.source-state': '首镜有明确的起始状态',
      'check.physical-cause': '每次转场都有物理成因',
      'check.exit-state': '结尾状态可作为下一段的输入',
      'check.contrast': '至少两次强烈的尺度／密度对比',
      'check.no-cliche': '排除通用 HUD／赛博朋克／随机故障',
      'check.compact': '提示词保持紧凑（为时间而写）',
      'pal.brutalist_digital': '粗野数字',
      'pal.minimal_signal': '极简信号',
      'pal.phosphor': '荧光绿',
      'pal.paper_terminal': '纸张终端',
      'pal.monolith': '巨石',
      'error.title': '导演台渲染失败',
      'error.retry': '重试',
      'footer.chain': '链条',
      'footer.grammar': '可用机制',
      'footer.seed': '种子',
    };

    const DICT_JA = {
      title: 'ASCII H3 ディレクター',
      subtitle: 'ブリーフ → 変換チェーン → コンパクトな H3 プロンプト → 品質ゲート。散文ではなく時間のために書く。',
      version: 'クライアント版',
      brief: 'ブリーフ',
      'brief.label': 'ブリーフ',
      'brief.placeholder': '見た目ではなく変換を書く：各形態は何になるのか？',
      'brief.words': '語',
      'brief.title': '作業タイトル',
      beats: 'ビート',
      duration: '尺',
      ratio: 'アスペクト比',
      palette: 'パレット',
      ramp: 'グリフランプ',
      heroText: 'ヒーローテキスト',
      seed: 'シード',
      chain: '変換チェーン',
      'chain.empty': 'チェーンがありません——まず計画してください。',
      emits: '出力形態',
      gate: '品質ゲート',
      'gate.score': 'スコア',
      'gate.pass': '合格',
      'gate.fail': '要確認',
      'gate.empty': '未実行——生成前にゲートが構造を検査します。',
      'gate.seam': '連続性コントラクト',
      motion: 'モーション状態',
      entry: '進入',
      'field.form': '形態',
      'field.camera': 'カメラ',
      'field.velocity': '速度',
      'field.rotation': '回転',
      'field.scaleTrend': 'スケール傾向',
      'field.densityTrend': '密度傾向',
      'field.unresolved': '未解決',
      'trend.hold': '維持',
      'trend.up': '拡大',
      'trend.down': '縮小',
      preview: 'プレビュー',
      play: '再生',
      pause: '一時停止',
      scrub: 'クリップをスクラブ',
      timecode: 'タイムコード',
      'action.plan': 'チェーンを計画',
      'action.gate': '品質ゲートを実行',
      'action.copy': 'H3 プロンプトをコピー',
      'status.planned': 'チェーンを計画しました——{n} ビート、シード {s}。',
      'status.gatePass': 'ゲート合格、スコア {score}/100。',
      'status.gateFail': 'ゲート要確認：{score}/100。',
      'status.copied': 'H3 プロンプトをクリップボードにコピーしました。',
      'status.copyFailed': 'クリップボードが使えません——手動で選択してください。',
      'status.error': 'スクリプト生成中にエラーが発生しました。',
      'tier.canonical': '正典',
      'tier.strong': '強',
      'tier.support': '補助',
      'tier.reject': '却下',
      'check.single-chain': '明快な変換チェーンが一つ',
      'check.source-state': '最初のショットに明確な初期状態がある',
      'check.physical-cause': 'すべての遷移に物理的な原因がある',
      'check.exit-state': '最終状態が次のクリップの入力として使える',
      'check.contrast': '強いスケール／密度の対比が最低 2 回',
      'check.no-cliche': '汎用 HUD／サイバーパンク／グリッチを排除',
      'check.compact': 'プロンプトが簡潔（時間のために書かれている）',
      'pal.brutalist_digital': 'ブリュタリスト・デジタル',
      'pal.minimal_signal': 'ミニマル信号',
      'pal.phosphor': 'リン光',
      'pal.paper_terminal': 'ペーパーターミナル',
      'pal.monolith': 'モノリス',
      'error.title': 'ディレクターコンソールの描画に失敗しました',
      'error.retry': '再試行',
      'footer.chain': 'チェーン',
      'footer.grammar': '有効なメカニズム',
      'footer.seed': 'シード',
    };

    /* ================================================================== *
     * Plugin
     * ================================================================== */

    /**
     * Every entry body is wrapped so a render throw degrades to a message
     * instead of blanking the slot.
     */
    function guarded(Component) {
      return function Guarded(props) {
        const t = props && typeof props.t === 'function' ? props.t : (k) => k;
        return h(Boundary, { t }, h(Component, props));
      };
    }

    const GuardedConsole = guarded(DirectorConsole);

    return {
      inject: ['slots', 'layout', 'locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register('asciiH3', { en: DICT_EN, zh: DICT_ZH, ja: DICT_JA }),
          'ascii-h3: locale',
        );

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'ascii-h3',
          locale: 'asciiH3',
        }, GuardedConsole));

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'ascii-h3',
          order: 30,
          locale: 'asciiH3',
          label: () => 'ASCII H3',
        }, PanelIcon));
      },
    };
  },
});
