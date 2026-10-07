/**
 * The director: brief → transformation chain → compact H3 prompt → review.
 *
 * The governing constraint, learned from the prototype's iterations, is that
 * an H3 prompt is written *for time*, not as prose. A 15-second clip gets five
 * three-second blocks, one STYLE line and one RULE line, and nothing else.
 *
 * Zero dependencies.
 */

import { MECHANISMS, MECHANISM_BY_ID, FORM_SUCCESSORS, planChain, densityCurve, entryState, exitState, checkSeam } from './motion-grammar.js';

/* ------------------------------------------------------------------ *
 * Concept extraction
 * ------------------------------------------------------------------ */

const STOP = new Set(
  ('a an the and or of to in on for with without into from at by is are be as it its this that ' +
   'make create build generate produce clip video about using use please can you me my i want ' +
   'second seconds minute minutes long short').split(' '),
);

/** Words that reliably signal a rejected cliché. */
const CLICHE_HINTS = {
  cyberpunk: 'reject-city',
  neon: 'reject-city',
  city: 'reject-city',
  skyline: 'reject-city',
  hud: 'reject-hud',
  dashboard: 'reject-hud',
  interface: 'reject-hud',
  glitch: 'reject-glitch',
  smoke: 'reject-smoke',
  particle: 'reject-particles',
  particles: 'reject-particles',
  hologram: 'reject-hud',
};

/**
 * Parse a free-form brief into the director's own vocabulary.
 *
 * @param {string} brief
 * @returns {{concept:string, keywords:string[], duration:number, ratio:string,
 *   heroText:string[], cliches:string[], palette:string, ramp:string, mode:string}}
 */
export function parseBrief(brief) {
  const text = String(brief ?? '').trim();
  const lower = text.toLowerCase();

  // Duration
  let duration = 15;
  const dm = lower.match(/(\d+(?:\.\d+)?)\s*(?:-|\s)?\s*(?:second|sec|s\b)/);
  if (dm) duration = Math.max(4, Math.min(15, parseFloat(dm[1])));

  // Aspect ratio
  let ratio = '21:9';
  const rm = lower.match(/\b(21:9|16:9|9:16|4:3|1:1|adaptive)\b/);
  if (rm) ratio = rm[1];

  // Explicit hero text: "with the word VOID" / 大字 "OPEN"
  const heroText = [];
  const quoted = text.match(/["“”'『「]([^"“”'』」]{1,12})["“”'『」]/g) ?? [];
  for (const q of quoted) heroText.push(q.replace(/["“”'『」]/g, ''));
  for (const m of text.matchAll(/\b(?:word|text|type|say|says|reads?)\s+([A-Z][A-Z0-9]{1,11})\b/g)) {
    heroText.push(m[1]);
  }

  // Cliché detection
  const cliches = [];
  for (const [hint, id] of Object.entries(CLICHE_HINTS)) {
    if (new RegExp(`\\b${hint}`, 'i').test(lower)) cliches.push(id);
  }

  // Palette / ramp selection from tonal words
  let palette = 'brutalist-digital';
  if (/\b(green|phosphor|terminal|matrix)\b/.test(lower)) palette = 'phosphor';
  else if (/\b(minimal|quiet|silent|monochrome|black and white|b\/w)\b/.test(lower)) palette = 'minimal-signal';
  else if (/\b(paper|archival|document|print)\b/.test(lower)) palette = 'paper-terminal';
  else if (/\b(monolith|pure|absolute|void)\b/.test(lower)) palette = 'monolith';

  let ramp = 'brutalist';
  if (/\b(minimal|sparse|quiet|silent)\b/.test(lower)) ramp = 'minimal';
  else if (/\b(code|source|operator|syntax)\b/.test(lower)) ramp = 'operators';
  else if (/\b(binary|bit|boot|zero|one)\b/.test(lower)) ramp = 'binary';
  else if (/\b(green|phosphor|terminal|matrix)\b/.test(lower)) ramp = 'phosphor';
  else if (/\b(letter|word|type|typograph)/.test(lower)) ramp = 'typographic';

  const mode = /\b(minimal|quiet|calm|restrained|subtle)\b/.test(lower) ? 'minimal-data' : 'high-impact';

  // Keywords: the concept's own nouns, minus filler.
  const keywords = [
    ...new Set(
      lower
        .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)),
    ),
  ].slice(0, 8);

  const concept = text || 'an ASCII transformation about nothing becoming something';

  return { concept, keywords, duration, ratio, heroText, cliches, palette, ramp, mode };
}

/* ------------------------------------------------------------------ *
 * Chain → prompt
 * ------------------------------------------------------------------ */

/**
 * Render a transformation chain as the five-block compact H3 prompt.
 *
 * @param {object} script
 * @param {ReturnType<typeof planChain>} script.chain
 * @param {number} [script.duration]
 * @param {string} [script.ratio]
 * @param {string} [script.palette]
 * @param {string} [script.ramp]
 * @param {string} [script.style]
 * @param {string[]} [script.avoid]
 * @param {string} [script.entry]
 * @param {string[]} [script.heroText]
 * @param {boolean} [script.continuation]
 * @returns {string}
 */
export function composePrompt(script) {
  const duration = script.duration ?? 15;
  const chain = script.chain ?? [];
  const blocks = blocksPerChain(chain.length, duration);

  const lines = [];
  const lead = script.continuation
    ? `${duration}-second ultra-wide ASCII kinetic typography sequence, direct continuation from the previous clip.`
    : `${duration}-second ultra-wide ASCII kinetic typography sequence.`;
  lines.push(lead);
  if (script.entry) lines.push(`Begin exactly as ${script.entry}.`);
  lines.push('');

  chain.forEach((link, i) => {
    const m = MECHANISM_BY_ID.get(link.mechanism);
    const beat = blocks[i] ?? blocks.at(-1);
    const text = describeLink(m, link, i, chain.length);
    lines.push(`${beat}: ${text}`);
  });

  lines.push('');
  lines.push(`STYLE: ${styleLine(script)}`);
  lines.push(`RULE: ${ruleLine(script)}`);
  return lines.join('\n');
}

function blocksPerChain(n, duration) {
  if (n <= 0) return [];
  const span = duration / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(`${fmt(i * span)}–${fmt((i + 1) * span)}s`);
  }
  return out;
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * One beat's sentence. The sentence must name a *physical cause*, never an
 * adjective: "walls shred into a sphere because the camera punched through
 * them", not "beautifully chaotic transformation".
 */
function describeLink(m, link, index, total) {
  if (!m) return 'the previous motion continues and intensifies.';
  const isLast = index === total - 1;
  const action = sentenceCase(m.action) + '.';
  if (isLast && link.exit?.unresolved) {
    const unresolved = sentenceCase(link.exit.unresolved) + '.';
    // A beat's exit line often paraphrases its own action ("the form is still
    // snapping into legibility" after "characters converge until a solid form
    // snaps into legibility"). Saying both wastes the reader's attention, so
    // keep only the one that carries new information.
    if (sharesContent(action, unresolved)) return unresolved;
    return `${action} ${unresolved}`;
  }
  if (isLast) {
    return `${action} The clip ends mid-motion so another clip can continue.`;
  }
  return action;
}

const STOPWORDS = new Set(
  ('a an the is are was were be been being and or of to in on for with into from at by as it its ' +
   'this that still when has have not no more most').split(' '),
);

function contentWords(s) {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** True when two sentences share most of their meaning-bearing words. */
function sharesContent(a, b) {
  const wa = contentWords(a);
  const wb = contentWords(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.6;
}

/**
 * Capitalise the first letter only. `toLowerCase()` on a whole phrase would
 * destroy acronyms and destroy a writer's deliberate casing.
 */
function sentenceCase(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function styleLine(script) {
  const palette = script.palette ?? 'brutalist-digital';
  const ramp = script.ramp ?? 'brutalist';
  const bits = [
    `${palette.replace(/-/g, ' ')} palette`,
    `${ramp} character set`,
    'brutalist computational motion design',
    'extreme perspective and scale contrast',
    'monospaced glyphs as physical matter, not overlay',
  ];
  if (script.ratio) bits.push(`${script.ratio} frame`);
  if (script.heroText?.length) {
    bits.push(`hero text limited to ${script.heroText.map((t) => `"${t}"`).join(' / ')}`);
  }
  return bits.join('; ') + '.';
}

function ruleLine(script) {
  const avoid = new Set([
    'generic HUD',
    'cyberpunk city',
    'random glitch',
    'unmotivated particles',
    'smoke wipes',
    'photoreal humans',
  ]);
  for (const c of script.cliches ?? []) {
    const m = MECHANISM_BY_ID.get(c);
    if (m) avoid.add(m.name.toLowerCase());
  }
  for (const a of script.avoid ?? []) avoid.add(String(a).toLowerCase());

  return [
    'no normal cuts',
    'every transformation physically emerges from the previous form',
    'preserve direction, velocity and scale across every transition',
    `avoid ${[...avoid].join(', ')}`,
  ].join('; ') + '.';
}

/* ------------------------------------------------------------------ *
 * Quality gate
 * ------------------------------------------------------------------ */

/**
 * The gate the prototype converged on. Every check is a yes/no the director
 * must be able to answer before paying for a generation.
 *
 * @param {object} script
 * @returns {{pass:boolean, score:number, checks:Array<{id:string,label:string,pass:boolean,detail:string}>}}
 */
export function review(script) {
  const chain = script.chain ?? [];
  // A script that has not composed its prompt yet is normal — `buildScript`
  // returns the plan and lets the caller decide whether to render the prompt.
  // The prompt-dependent checks then describe what they could not evaluate
  // rather than inventing a failure.
  const prompt = script.prompt ?? '';
  const hasPrompt = prompt.trim().length > 0;
  // `buildScript` returns a plan without composing a prompt so the caller can
  // decide whether to render one. The two prompt-dependent checks (`compact`,
  // `no-cliche`) therefore report what they could not evaluate instead of
  // inventing a failure — a chain-only script can legitimately score 100/100.
  // Compose the prompt before gating anything that will be generated.
  const checks = [];

  const forms = chain.map((l) => MECHANISM_BY_ID.get(l.mechanism)?.emits).filter(Boolean);
  const distinctForms = new Set(forms);

  checks.push({
    id: 'single-chain',
    label: 'One legible transformation chain',
    pass: chain.length >= 3,
    detail: `${chain.length} beat(s): ${chain.map((l) => l.mechanism).join(' → ') || 'none'}`,
  });

  const startOk = chain.length > 0;
  checks.push({
    id: 'source-state',
    label: 'First shot has a clear source state',
    pass: startOk,
    detail: startOk ? `opens on "${chain[0].mechanism}"` : 'no opening state declared',
  });

  // Every transition after the first must be a legal successor. Two things
  // make a link legal: the predecessor declares it in `chainsTo`, or the
  // predecessor's emitted form admits it in FORM_SUCCESSORS. A link that
  // satisfies neither is an unrelated hard cut wearing a mechanism's name.
  const illegal = [];
  for (let i = 1; i < chain.length; i++) {
    const prev = MECHANISM_BY_ID.get(chain[i - 1].mechanism);
    const cur = MECHANISM_BY_ID.get(chain[i].mechanism);
    if (!prev || !cur) { illegal.push(`${chain[i - 1].mechanism} → ${chain[i].mechanism} (unknown id)`); continue; }
    const declared = prev.chainsTo.includes(cur.id);
    const byForm = (FORM_SUCCESSORS[prev.emits] ?? []).includes(cur.id);
    if (!declared && !byForm) illegal.push(`${prev.id} → ${cur.id}`);
  }
  checks.push({
    id: 'physical-cause',
    label: 'Every transition has a physical cause',
    pass: illegal.length === 0,
    detail: illegal.length ? `weak links: ${illegal.join(', ')}` : 'all links follow the mechanism grammar',
  });

  // Perceptual contrast: at least 2 strong scale/density inversions.
  const curve = densityCurve({ duration: script.duration ?? 15, mode: script.mode ?? 'high-impact' });
  const densities = curve.map((s) => s.density);
  const lo = Math.min(...densities);
  const hi = Math.max(...densities);
  const inversions = countSwing(densities, 0.45);
  checks.push({
    id: 'contrast',
    label: 'At least 2 strong scale/density contrasts',
    pass: inversions >= 2,
    detail: `density spans ${lo.toFixed(2)}–${hi.toFixed(2)} with ${inversions} major swing(s)`,
  });

  // End state must be usable as an input to the next clip. An empty string is
  // not a declared exit state, so this tests truthiness, not presence.
  const last = chain.at(-1);
  const declared = last?.exit?.unresolved;
  const endOk = Boolean(declared) || /mid-|unresolved|continues/i.test(prompt);
  checks.push({
    id: 'exit-state',
    label: 'Final state is usable as the next clip\u2019s input',
    pass: endOk,
    detail: endOk
      ? `ends unresolved: ${declared || 'declared in the prompt'}`
      : 'the clip resolves completely and cannot be continued',
  });

  // Rejected vocabulary must be absent from the positive prompt.
  const positive = hasPrompt ? (prompt.split(/RULE:/)[0] ?? prompt) : '';
  const found = [];
  for (const m of MECHANISMS) {
    if (m.tier !== 'reject') continue;
    const needle = m.id.replace(/^reject-/, '');
    if (new RegExp(`\\b${needle}`, 'i').test(positive)) found.push(needle);
  }
  checks.push({
    id: 'no-cliche',
    label: 'Generic HUD / cyberpunk / random glitch excluded',
    pass: found.length === 0,
    detail: found.length
      ? `found in the positive prompt: ${found.join(', ')}`
      : hasPrompt ? 'no rejected vocabulary in the positive prompt' : 'no prompt composed yet',
  });

  // Prompt compactness — the lesson from the rejected first continuation.
  const words = hasPrompt ? prompt.trim().split(/\s+/).length : 0;
  checks.push({
    id: 'compact',
    label: 'Prompt stays compact (written for time, not prose)',
    pass: !hasPrompt || words <= 320,
    detail: hasPrompt ? `${words} words` : 'no prompt composed yet',
  });

  const passed = checks.filter((c) => c.pass).length;
  return {
    pass: checks.every((c) => c.pass),
    score: Math.round((passed / checks.length) * 100),
    checks,
  };
}

/**
 * Count major directional swings in a 1-D signal: a swing is a reversal whose
 * amplitude exceeds `threshold`. A monotonically rising signal has zero.
 */
function countSwing(values, threshold) {
  if (values.length < 2) return 0;
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

/* ------------------------------------------------------------------ *
 * Reference analysis — motion grammar extraction, not style imitation
 * ------------------------------------------------------------------ */

/**
 * Given observations extracted from a reference (timings, materials, camera
 * behaviour), return a STYLE DNA block and the chain that reproduces the
 * *motion* rather than the surface look.
 *
 * @param {object} obs
 * @returns {{styleDNA:string, chain:ReturnType<typeof planChain>, notes:string[]}}
 */
export function analyzeReference(obs = {}) {
  const notes = [];
  const duration = obs.duration ?? 15;
  const aspects = obs.aspect ?? '21:9';

  const materials = obs.materials ?? ['monospaced glyphs', 'operators', 'cursors'];
  const camera = obs.camera ?? ['forward punch-through', 'scale dive'];
  const density = obs.densityCurve ?? 'alternating compression and release every 2–3 seconds';
  const typography = obs.typography ?? 'short hero words, cropped beyond frame';
  const transitions = obs.transitions ?? [];
  const ending = obs.ending ?? 'mid-motion, unresolved';

  notes.push(
    'Analyse function, not appearance: what does each element *become* over time?',
    'Record the peak frames and the exact mechanism that produced each one.',
    'The ending state is the deliverable — it is the next clip\u2019s input.',
  );

  const startForm = obs.startForm ?? inferStartForm(transitions);
  // Named transitions restrict the chain; an unrecognised list must still
  // yield a usable chain, so `allow` is only passed when it resolved to
  // something. An empty allow-list would plan nothing at all.
  const named = mapTransitions(transitions);
  const chain = planChain({
    startForm,
    count: obs.beats ?? 5,
    allow: named.length ? named : undefined,
  });

  const styleDNA = [
    `FORMAT: ${aspects}, ~${duration}s`,
    `MATERIALS: ${[].concat(materials).join(', ')}`,
    `CAMERA: ${[].concat(camera).join('; ')}`,
    `DENSITY: ${density}`,
    `TYPOGRAPHY: ${typography}`,
    `TRANSITION MECHANISMS: ${transitions.length ? transitions.join(', ') : 'inferred from the chain below'}`,
    `ENDING: ${ending}`,
    `CHAIN: ${chain.map((l) => l.mechanism).join(' → ')}`,
  ].join('\n');

  return { styleDNA, chain, notes };
}

/**
 * Whatever form a mechanism consumes is its start form. Walk back from the
 * reference's first named mechanism through the grammar to find a form that
 * legally leads into it.
 */
function inferStartForm(transitions) {
  if (!transitions.length) return 'void';
  const first = mapTransitions([transitions[0]])[0];
  if (!first) return 'void';
  for (const [form, ids] of Object.entries(FORM_SUCCESSORS)) {
    if (ids.includes(first) && form !== 'cliche') return form;
  }
  return 'void';
}

function mapTransitions(list) {
  const ids = [];
  for (const t of list) {
    const needle = String(t).toLowerCase().replace(/\s+/g, '-');
    const hit = MECHANISMS.find(
      (m) => m.id === needle || m.name.toLowerCase().replace(/\s+/g, '-') === needle,
    );
    if (hit) ids.push(hit.id);
  }
  return ids;
}

/* ------------------------------------------------------------------ *
 * Continuation
 * ------------------------------------------------------------------ */

/**
 * Build the continuation script: inherit the predecessor's exit state and
 * close its unresolved action before opening a new one.
 *
 * @param {object} prevExit
 * @param {string} brief
 * @param {object} [opts]
 */
export function planContinuation(prevExit, brief, opts = {}) {
  const parsed = parseBrief(brief);
  const chain = planChain({
    startForm: prevExit?.form ?? 'void',
    count: opts.beats ?? 5,
    allow: opts.allow,
    block: opts.block,
  });
  // The entry state inherits the predecessor's unresolved action so the
  // continuation can close it. `checkSeam` verifies that inheritance held.
  const entry = entryState({
    ...prevExit,
    ...(opts.entryOverrides ?? {}),
  });
  const seam = checkSeam(prevExit ?? exitState(), entry, { requireCamera: true, requirePalette: true });
  const script = {
    ...parsed,
    chain,
    continuation: true,
    entry: prevExit?.unresolved
      ? `the previous clip's unresolved ${prevExit.form} completes its exit motion`
      : 'the previous clip\u2019s final state',
    palette: prevExit?.palette ?? parsed.palette,
    ramp: prevExit?.ramp ?? parsed.ramp,
  };
  script.prompt = composePrompt(script);
  script.review = review(script);
  script.seam = seam;
  script.entryState = entry;
  return script;
}
