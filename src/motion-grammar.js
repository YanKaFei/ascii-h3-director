/**
 * ASCII motion grammar — the structural vocabulary of the world.
 *
 * A clip is not a style; it is a *transformation chain*. Characters change
 * function over time: text becomes pattern, pattern becomes particles,
 * particles become geometry, geometry becomes space, space becomes
 * typography again. This module owns that grammar and the continuity
 * contract between successive clips.
 *
 * Zero dependencies.
 */

/* ------------------------------------------------------------------ *
 * Mechanisms — the smallest named unit of ASCII motion.
 * ------------------------------------------------------------------ */

/**
 * @typedef {Object} Mechanism
 * @property {string} id
 * @property {string} name
 * @property {'canonical'|'strong'|'support'|'reject'} tier
 * @property {string} material   what the audience sees moving
 * @property {string} action     what actually happens
 * @property {string} emits      the form this mechanism leaves behind
 * @property {string[]} chainsTo mechanism ids that inherit its motion well
 */

/** @type {Mechanism[]} */
export const MECHANISMS = [
  {
    id: 'boot-signal',
    name: 'Boot Signal',
    tier: 'strong',
    material: 'a single cursor and a handful of glyphs on an empty field',
    action: 'a sparse constellation of marks ignites and self-organises into a legible structure',
    emits: 'letterform',
    chainsTo: ['assemble', 'type-wall', 'tunnel'],
  },
  {
    id: 'assemble',
    name: 'Assemble from Sparse Field',
    tier: 'canonical',
    material: 'thousands of loose characters drifting in void',
    action: 'characters converge along their own velocity vectors until a solid form snaps into legibility',
    emits: 'solid-form',
    chainsTo: ['type-wall', 'glyph-sphere', 'density-dissolve'],
  },
  {
    id: 'density-dissolve',
    name: 'Density Dissolve',
    tier: 'canonical',
    material: 'a solid glyph mass',
    action: 'the form dematerialises because its glyph ramp slides toward emptiness while its silhouette holds',
    emits: 'field',
    chainsTo: ['tunnel', 'glyph-sphere', 'cursor-vortex'],
  },
  {
    id: 'structural-decay',
    name: 'Structural Decay',
    tier: 'canonical',
    material: 'a built environment made of typography',
    action: 'the environment is lost in stages — edges first, then surfaces, then the ground itself',
    emits: 'fragments',
    chainsTo: ['shockwave', 'implosion', 'field'],
  },
  {
    id: 'letter-fragmentation',
    name: 'Diegetic Letter-Topology Fragmentation',
    tier: 'canonical',
    material: 'one short word, still readable',
    action: 'the word breaks along its own letter topology; strokes separate into strokes before the word stops meaning anything',
    emits: 'fragments',
    chainsTo: ['cursor-vortex', 'implosion', 'shockwave'],
  },
  {
    id: 'contour-migration',
    name: 'Contour Migration',
    tier: 'strong',
    material: 'a glyph silhouette with a migrating edge',
    action: 'the outline itself travels across the form, so the shape appears to pour in one direction',
    emits: 'solid-form',
    chainsTo: ['type-wall', 'tunnel', 'assemble'],
  },
  {
    id: 'tunnel',
    name: 'ASCII Tunnel',
    tier: 'strong',
    material: 'concentric rings of characters receding to a point',
    action: 'the camera travels forward through the rings while they stretch into long perspective trails',
    emits: 'space',
    chainsTo: ['type-wall', 'spatial-fold', 'glyph-sphere'],
  },
  {
    id: 'type-wall',
    name: 'Typographic Wall',
    tier: 'strong',
    material: 'giant cropped letters standing as architecture',
    action: 'the camera punches through each wall without cutting; the wall shatters from the point of impact outward',
    emits: 'fragments',
    chainsTo: ['glyph-sphere', 'shockwave', 'spatial-fold'],
  },
  {
    id: 'glyph-sphere',
    name: 'Glyph Sphere',
    tier: 'strong',
    material: 'a sphere whose every surface is a character',
    action: 'thousands of characters orbit a tiny focal mark, then all orbits converge',
    emits: 'solid-form',
    chainsTo: ['implosion', 'spatial-fold', 'type-wall'],
  },
  {
    id: 'implosion',
    name: 'Implosion',
    tier: 'canonical',
    material: 'a dense orbiting mass collapsing inward',
    action: 'the mass is sucked into a focal glyph; density spikes to a point, then releases as a wave',
    emits: 'void',
    chainsTo: ['shockwave', 'cursor-vortex', 'giant-word'],
  },
  {
    id: 'shockwave',
    name: 'Command Shockwave',
    tier: 'canonical',
    material: 'a white ring of operators expanding past frame',
    action: 'the release from compression travels outward as a single readable command, dragging microtype in its wake',
    emits: 'space',
    chainsTo: ['giant-word', 'field', 'tunnel'],
  },
  {
    id: 'giant-word',
    name: 'Giant Cropped Typography',
    tier: 'strong',
    material: 'one or two words far larger than frame',
    action: 'the word grows from microscopic to beyond the frame edge, so the audience reads it with their body before their eye',
    emits: 'letterform',
    chainsTo: ['letter-fragmentation', 'spatial-fold', 'cursor-vortex'],
  },
  {
    id: 'spatial-fold',
    name: 'Spatial Fold',
    tier: 'strong',
    material: 'a plane of characters',
    action: 'the plane folds 180 degrees through itself, turning the flat field into a volume without a cut',
    emits: 'space',
    chainsTo: ['tunnel', 'glyph-sphere', 'density-dissolve'],
  },
  {
    id: 'cursor-vortex',
    name: 'Cursor Vortex',
    tier: 'canonical',
    material: 'a small cursor mark with everything spiralling into it',
    action: 'the whole frame is drawn backward into a cursor-shaped drain, and the clip ends mid-dive',
    emits: 'void',
    chainsTo: ['boot-signal', 'tunnel', 'assemble'],
  },
  {
    id: 'field',
    name: 'Character Field',
    tier: 'support',
    material: 'a wide, even plane of characters',
    action: 'the field pulses as one material, carrying whatever motion the previous state handed it',
    emits: 'field',
    chainsTo: ['assemble', 'density-dissolve', 'type-wall'],
  },
  {
    id: 'mask',
    name: 'Text Mask',
    tier: 'support',
    material: 'a character field constrained inside letterforms',
    action: 'the field is only visible where the mask allows it, so type becomes a window onto the motion',
    emits: 'letterform',
    chainsTo: ['giant-word', 'letter-fragmentation', 'density-dissolve'],
  },

  /* --- rejected: kept in the grammar so the reviewer can name the failure --- */
  {
    id: 'reject-hud',
    name: 'Decorative HUD',
    tier: 'reject',
    material: 'unmotivated interface chrome',
    action: 'readouts animate because the frame looked empty',
    emits: 'cliche',
    chainsTo: [],
  },
  {
    id: 'reject-city',
    name: 'Generic Cyberpunk City',
    tier: 'reject',
    material: 'neon skyline',
    action: 'a city appears because the brief said science fiction',
    emits: 'cliche',
    chainsTo: [],
  },
  {
    id: 'reject-glitch',
    name: 'Meaningless Glitch',
    tier: 'reject',
    material: 'random displacement',
    action: 'the image is damaged for texture rather than by a physical cause',
    emits: 'cliche',
    chainsTo: [],
  },
  {
    id: 'reject-particles',
    name: 'Unmotivated Particles',
    tier: 'reject',
    material: 'floating dots with no source',
    action: 'particles drift to add production value',
    emits: 'cliche',
    chainsTo: [],
  },
  {
    id: 'reject-smoke',
    name: 'Smoke / Liquid Wipe',
    tier: 'reject',
    material: 'soft organic transition',
    action: 'a wipe hides the fact that two states do not connect',
    emits: 'cliche',
    chainsTo: [],
  },
];

/** @type {Map<string, Mechanism>} */
export const MECHANISM_BY_ID = new Map(MECHANISMS.map((m) => [m.id, m]));

export function mechanism(id) {
  const m = MECHANISM_BY_ID.get(id);
  if (!m) throw new Error(`unknown mechanism: ${id}`);
  return m;
}

/* ------------------------------------------------------------------ *
 * Forms — what a mechanism leaves behind, and what may legally follow.
 * ------------------------------------------------------------------ */

/** Legal transitions keyed by the form the previous state emitted. */
export const FORM_SUCCESSORS = {
  'void': ['boot-signal', 'assemble', 'cursor-vortex', 'tunnel'],
  'field': ['assemble', 'density-dissolve', 'type-wall', 'glyph-sphere'],
  'particles': ['assemble', 'glyph-sphere', 'field'],
  'fragments': ['shockwave', 'implosion', 'cursor-vortex', 'letter-fragmentation'],
  'letterform': ['giant-word', 'letter-fragmentation', 'mask', 'spatial-fold'],
  'solid-form': ['density-dissolve', 'contour-migration', 'implosion', 'type-wall'],
  'geometry': ['spatial-fold', 'glyph-sphere', 'tunnel'],
  'space': ['type-wall', 'tunnel', 'spatial-fold', 'glyph-sphere'],
  'cliche': ['boot-signal'],
};

/* ------------------------------------------------------------------ *
 * Camera grammar
 * ------------------------------------------------------------------ */

export const CAMERA_MOVES = [
  'forward-punch-through',
  'rapid-scale-dive',
  'orbital-lock',
  'spatial-fold-180',
  'planar-to-volume',
  'sudden-freeze',
  'tunnel-travel',
  'backward-suction',
];

/** Moves whose outgoing vector can be inherited without a reset. */
export const CONTINUABLE_CAMERA = new Set([
  'forward-punch-through',
  'rapid-scale-dive',
  'tunnel-travel',
  'orbital-lock',
]);

/* ------------------------------------------------------------------ *
 * The continuity contract
 * ------------------------------------------------------------------ */

/**
 * @typedef {Object} MotionState
 * @property {string} form              what object/form exists
 * @property {string} camera            camera move id
 * @property {number} velocity          signed apparent speed, roughly -3..3
 * @property {number} rotation          dominant rotation in turns/second
 * @property {number} scaleTrend        +1 growing, -1 shrinking, 0 static
 * @property {number} densityTrend      +1 densifying, -1 dissolving
 * @property {string} unresolved        the action the clip ends mid-way through
 * @property {string} palette
 * @property {string} ramp
 */

/** @returns {MotionState} */
export function entryState(over = {}) {
  return {
    form: 'void',
    camera: 'forward-punch-through',
    velocity: 1,
    rotation: 0,
    scaleTrend: 1,
    densityTrend: 0,
    unresolved: 'the camera is already moving into frame',
    palette: 'brutalist-digital',
    ramp: 'brutalist',
    ...over,
  };
}

/** @returns {MotionState} */
export function exitState(over = {}) {
  return {
    form: 'void',
    camera: 'backward-suction',
    velocity: 1,
    rotation: 0,
    scaleTrend: -1,
    densityTrend: -1,
    unresolved: 'the clip ends mid-dive, with speed left over',
    palette: 'brutalist-digital',
    ramp: 'brutalist',
    ...over,
  };
}

/**
 * Derive the entry state of a continuation from the exit state of its
 * predecessor. This is the production contract: the previous exit *becomes*
 * the next entry, rather than being re-established.
 *
 * @param {MotionState} prevExit
 * @param {{speedUp?:number, keepForm?:boolean}} [opts]
 * @returns {MotionState}
 */
export function inherit(prevExit, opts = {}) {
  const speedUp = opts.speedUp ?? 1.1;
  const form = opts.keepForm === false ? 'void' : prevExit.form;
  return entryState({
    form,
    camera: prevExit.camera,
    velocity: prevExit.velocity * speedUp,
    rotation: prevExit.rotation,
    scaleTrend: prevExit.scaleTrend,
    densityTrend: prevExit.densityTrend,
    // The unresolved action carries over so the continuation can close it.
    unresolved: prevExit.unresolved,
    palette: prevExit.palette,
    ramp: prevExit.ramp,
  });
}

/**
 * Does `next` legitimately inherit from `prev`? Returns a list of violations,
 * empty when the seam holds.
 *
 * @param {MotionState} prevExit
 * @param {MotionState} nextEntry
 * @param {{requireCamera?:boolean, requirePalette?:boolean}} [opts]
 * @returns {string[]}
 */
export function checkSeam(prevExit, nextEntry, opts = {}) {
  const v = [];
  // Camera, palette and charset are checked only when the caller states that
  // the entry was derived from the exit. Two independently constructed states
  // may legitimately differ; a declared continuation may not.
  const requireCamera = opts.requireCamera === true;
  const requirePalette = opts.requirePalette === true;

  if (requireCamera && nextEntry.camera !== prevExit.camera) {
    v.push(
      `camera vector resets: predecessor exits on "${prevExit.camera}" but the continuation enters on "${nextEntry.camera}"`,
    );
  }
  if (prevExit.velocity !== 0 && nextEntry.velocity === 0) {
    v.push('apparent velocity is dropped to zero, which reads as a hard reset');
  }
  if (
    prevExit.velocity !== 0 &&
    nextEntry.velocity !== 0 &&
    Math.sign(prevExit.velocity) !== Math.sign(nextEntry.velocity)
  ) {
    v.push('apparent velocity reverses direction across the seam');
  }
  if (requirePalette && nextEntry.palette !== prevExit.palette) {
    v.push(
      `palette changes across the seam ("${prevExit.palette}" → "${nextEntry.palette}"), which breaks material continuity`,
    );
  }
  if (requirePalette && nextEntry.ramp !== prevExit.ramp) {
    v.push(`dominant charset changes across the seam ("${prevExit.ramp}" → "${nextEntry.ramp}")`);
  }
  return v;
}

/* ------------------------------------------------------------------ *
 * Chain construction
 * ------------------------------------------------------------------ */

/**
 * @typedef {Object} Link
 * @property {string} mechanism
 * @property {string} beat        time block, e.g. "0-3s"
 * @property {number} from
 * @property {number} to
 * @property {MotionState} exit
 * @property {string} description
 */

/**
 * Walk the grammar from a start form and pick `count` mechanisms that chain
 * legally, preferring canonical and strong tiers.
 *
 * @param {{startForm?:string, count?:number, seed?:string, allow?:string[], block?:string[]}} opts
 * @returns {Link[]}
 */
export function planChain(opts = {}) {
  const count = opts.count ?? 6;
  const duration = opts.duration ?? 15;
  const startForm = opts.startForm ?? 'void';
  const allow = opts.allow ? new Set(opts.allow) : null;
  const block = new Set(opts.block ?? []);
  const tiers = new Set(['canonical', 'strong', 'support']);
  const pool = MECHANISMS.filter(
    (m) => tiers.has(m.tier) && !block.has(m.id) && (!allow || allow.has(m.id)),
  );

  const links = [];
  let form = startForm;
  let preferred = null;
  const used = new Set();

  for (let i = 0; i < count; i++) {
    const legal = FORM_SUCCESSORS[form] ?? [];
    // The opening beat is chosen freely from the pool (respecting `allow` and
    // `block`), because a caller who restricts the pool is stating what the
    // film is about, and a `void` start form would otherwise reject all but a
    // handful of mechanisms.
    let candidates = i === 0
      ? [...pool]
      : pool.filter((m) => legal.includes(m.id));
    if (preferred) {
      const pref = candidates.filter((m) => predecessorRank(preferred, m.id) === 0);
      if (pref.length) candidates = pref;
    }
    // A chain must not repeat a mechanism: repetition reads as a stall. When
    // the grammar offers nothing new that legally follows, the honest answer
    // is a shorter chain, not a loop back to something already used.
    const unused = candidates.filter((m) => !used.has(m.id));
    if (unused.length) {
      candidates = unused;
    } else {
      const fresh = pool.filter((m) => !used.has(m.id));
      const legalFresh = fresh.filter((m) => legal.includes(m.id));
      if (legalFresh.length) candidates = legalFresh;
      else break;
    }
    if (!candidates.length) break;

    // Prefer mechanisms that emit a form with the most onward options, so the
    // chain does not paint itself into a corner in its final beats.
    candidates.sort((a, b) => {
      const oa = (FORM_SUCCESSORS[a.emits] ?? []).length;
      const ob = (FORM_SUCCESSORS[b.emits] ?? []).length;
      if (oa !== ob) return ob - oa;
      const ta = a.tier === 'canonical' ? 0 : a.tier === 'strong' ? 1 : 2;
      const tb = b.tier === 'canonical' ? 0 : b.tier === 'strong' ? 1 : 2;
      return ta - tb;
    });

    const pick = candidates[i % Math.min(candidates.length, 2)];
    const from = (links.at(-1)?.to ?? 0);
    const span = duration / count;
    const to = from + span;
    links.push({
      mechanism: pick.id,
      beat: `${round1(from)}–${round1(to)}s`,
      from,
      to,
      exit: exitState({
        form: pick.emits,
        camera: pick.id === 'cursor-vortex' ? 'backward-suction' : 'forward-punch-through',
        velocity: pick.id === 'sudden-freeze' ? 0 : 1,
        rotation: pick.id === 'glyph-sphere' ? 0.6 : 0,
        scaleTrend: ['giant-word', 'shockwave'].includes(pick.id) ? 1 : -1,
        densityTrend: ['density-dissolve', 'structural-decay'].includes(pick.id) ? -1 : 1,
        unresolved: unresolvedFor(pick),
      }),
      description: `${pick.name}: ${pick.action}`,
    });
    form = pick.emits;
    preferred = pick.id;
    used.add(pick.id);
  }
  return links;
}

function predecessorRank(fromId, toId) {
  const m = MECHANISM_BY_ID.get(fromId);
  if (!m) return 1;
  return m.chainsTo.includes(toId) ? 0 : 1;
}

/**
 * The action a mechanism leaves unfinished. This string is the seam the next
 * clip closes, and it is written as prose because it is copied verbatim into
 * the prompt and read by the model as a description, not as a grammar id.
 */
const UNRESOLVED = {
  'boot-signal': 'the signal has only just resolved into a legible mark',
  'assemble': 'the form is still snapping into legibility',
  'density-dissolve': 'the form is only half dissolved and its silhouette still holds',
  'structural-decay': 'the environment is collapsing and the ground has not gone yet',
  'letter-fragmentation': 'the word is still legible and has not finished breaking apart',
  'contour-migration': 'the contour is still travelling across the form',
  'tunnel': 'the camera is still inside the tunnel with speed left over',
  'type-wall': 'the camera is still punching through the last wall',
  'glyph-sphere': 'the orbits are still converging on the focal mark',
  'implosion': 'the mass has compressed to a point and has not released yet',
  'shockwave': 'the wave is still expanding past the frame edge',
  'giant-word': 'the word is still growing past the frame',
  'spatial-fold': 'the plane is halfway through folding onto itself',
  'cursor-vortex': 'the frame is still draining into the cursor',
  'field': 'the field is still carrying the motion it was handed',
  'mask': 'the mask is still cutting the field into letterforms',
};

function unresolvedFor(m) {
  return UNRESOLVED[m.id] ?? 'the motion is still resolving when the clip ends';
}

function round1(n) { return Math.round(n * 10) / 10; }

/* ------------------------------------------------------------------ *
 * Density curve — the perceptual contrast plan for a clip.
 * ------------------------------------------------------------------ */

/**
 * Build a density/scale envelope over a clip so that a major perceptual change
 * lands every `everySeconds`. Returns samples of {t, density, scale}.
 *
 * @param {{duration?:number, everySeconds?:number, mode?:'high-impact'|'minimal-data'}} opts
 */
export function densityCurve(opts = {}) {
  const duration = opts.duration ?? 15;
  const every = opts.everySeconds ?? 3;
  const mode = opts.mode ?? 'high-impact';
  const beats = Math.max(2, Math.round(duration / every));
  const out = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * duration;
    const phase = (t / duration) * beats;
    const local = phase - Math.floor(phase);
    // Alternate compression and release: high-impact favors the extremes.
    const swing = mode === 'high-impact'
      ? Math.pow(Math.abs(Math.sin(local * Math.PI)), 0.55)
      : 0.35 + 0.3 * Math.sin(local * Math.PI * 2);
    const density = 0.12 + 0.82 * swing;
    const scale = mode === 'high-impact'
      ? 1.4 - 1.1 * swing
      : 0.9 + 0.1 * Math.sin(local * Math.PI * 2);
    out.push({ t, density, scale });
  }
  return out;
}
