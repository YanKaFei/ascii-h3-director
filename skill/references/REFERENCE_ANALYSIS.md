# Reference Analysis

How to watch a reference film so that what comes out the other side is a
*grammar* you can reuse, not a mood you can only imitate.

```bash
node src/cli.js reference observations.json          # STYLE DNA + chain + notes
node src/cli.js reference observations.json --json   # the same, machine-readable
./skill/scripts/reference.sh observations.json       # the packaged wrapper
```

The observation file is consumed by `analyzeReference()` in `src/director.js`.
A realistic, working example lives at [`test/reference.json`](../../test/reference.json).

---

## 1. Why surface imitation fails

The instinct on seeing a reference is to describe **appearance**: dark field,
green monospace, glowing cursor, glitchy, wide aspect, "cyberpunk terminal".
Write that into a prompt and you get a still image with a suggestion of motion.
The generation has been told what the frame *looks like* and nothing about what
happens between frames — so it invents its own transitions, and its transitions
are the same generic ones every model reaches for: a cut, a dissolve, a camera
shake.

Surface imitation fails for three specific reasons:

1. **The style adjectives are all satisfiable without motion.** "Green
   monospace on black" is a description of frame 1. Nothing in it constrains
   frame 200.
2. **A style cannot be inherited across a seam.** A continuation that carries
   "green monospace" across two clips still cuts, because what was missing was
   never style — it was the camera vector, the velocity and the unresolved
   action.
3. **It cannot be reviewed.** "Feels cyberpunk" is not a yes/no question. "Does
   the transition from `fragments` to `space` have a physical cause?" is.

Functional analysis asks a different question of every element: **what does it
*become* over time?** The cursor in the reference is not a decorative cursor; it
is a drain that the frame is pulled into. The letters are not a font; they are a
wall the camera punches through and shatters. Once you can say what each element
becomes, you have mechanisms — and mechanisms are directional, reviewable, and
legal to chain.

The test for whether you have finished analysing: **could you re-shoot the
reference with a different palette, a different charset and a different subject,
and still recognise it?** If yes, you extracted the motion grammar. If no, you
extracted the skin.

---

## 2. The nine extraction points

These are the nine points from `PRODUCTION_WORKFLOW.md` §A, expanded. Work
through them in order; the early ones constrain the late ones.

1. **Format, aspect and duration.** How long is a beat, not just the clip? A
   14-second reference with three peaks is a 4–5 second beat, not a 3-second one.
2. **Visual materials.** What is the frame physically made of? Name the
   character classes: monospaced glyphs, mathematical operators, brackets and
   slashes, digits, microtype fragments, a single cursor. "Materials" is a list
   of nouns, never adjectives.
3. **Typography behaviour.** Where does type sit, and what happens to it? Is
   hero text cropped beyond frame? Built from microtype? Used as a mask? Is the
   visible word short (1–8 characters) or a full sentence? How long does a word
   survive before it stops being a word?
4. **Camera behaviour.** List the moves, in order, with rough timings. Name them
   with the camera grammar from `MOTION_GRAMMAR.md` §5: forward punch-through,
   rapid scale dive, orbital lock, spatial fold, tunnel travel, backward suction.
   A reference where the camera never resets its vector is a reference that has
   already solved continuity.
5. **Density curve.** How does the amount of ink change? Write it as peaks and
   releases with times: "three compressed peaks at roughly 0 s, 6 s and 12 s,
   each released into a near-empty field within 1.5 s". This sentence becomes the
   `DENSITY:` line and tells the planner where the contrasts must land.
6. **The transformation chain.** The backbone — see §3.
7. **Recurring transition mechanisms.** Which named mechanisms do you see more
   than once? These are the reference's signatures and the ones worth
   restricting your own plan to. The optional `transitions` array carries them.
8. **Peak frames.** For each peak: the timestamp, what is on screen, and the
   mechanism that produced it — see §5.
9. **Ending state.** The deliverable. The ending is not "it fades out"; it is the
   `MotionState` the next clip has to open from. Write it as a state, not as a
   picture: form, camera, velocity, unresolved action.

---

## 3. Finding the chain by watching what changes function

Do not write down what changes *appearance* ("the letters get bigger"). Write
down what changes **function** — what the characters are *for* at each moment.
The chain is the sequence of functions.

Watch for the moment a thing stops being one kind of material and becomes
another. Those moments are the beats:

| what you see | what actually changed | function before → after | form emitted |
| --- | --- | --- | --- |
| letters stop being readable and start tiling | legibility is traded for coverage | text → pattern | `field` |
| the coverage starts moving as a body | the pattern gains mass and direction | pattern → particles | `particles` |
| the particles resolve into a lit volume | the mass gains a surface | particles → geometry | `solid-form` |
| the volume stops being an object and becomes somewhere | the surface gains depth | geometry → space | `space` |
| the space resolves into a word larger than frame | depth collapses back into type | space → typography | `letterform` |
| the word breaks along its own strokes | type is traded for fragments | typography → fragments | `fragments` |
| the fragments drain into one mark and stop | everything becomes a point | fragments → symbol / void | `void` |

That table is the classic circuit from `ASCII_DIRECTOR_BIBLE.md`, written as
function changes. Most strong references are a traversal of it — possibly
incomplete, possibly looping, but always in this vocabulary.

Three practical rules for the analysis pass:

- **Watch at 0.25× speed once, then at 4× once.** Slow for the order of events,
  fast for the shape of the clip. The chain is obvious at 4×; the exact
  transition moments are obvious at 0.25×.
- **Mark every moment the camera resets.** A reference that never resets is
  telling you the whole film is one unbroken move; a reference that resets
  frequently is telling you it is a montage, and copying its transitions will
  produce exactly the hard cuts you are trying to avoid.
- **Ignore colour on the first pass.** Colour is the easiest thing to copy and
  the least useful. Write the chain first, then note the palette as one line.

---

## 4. Naming what you observe, using the grammar

Every observation should end up as a mechanism id. The grammar in
`MOTION_GRAMMAR.md` has 16 usable mechanisms, and each has a one-line `action`
written as a physical cause. Match what you saw to an `action`; the id follows.

| if the reference shows… | the mechanism is |
| --- | --- |
| sparse marks igniting and organising into something legible | `boot-signal` |
| loose characters converging until a form snaps into legibility | `assemble` |
| a solid form sliding toward emptiness while its silhouette holds | `density-dissolve` |
| an environment lost in stages: edges, then surfaces, then ground | `structural-decay` |
| one word breaking along its own letter topology | `letter-fragmentation` |
| an outline travelling across a form so it appears to pour | `contour-migration` |
| concentric rings receding to a point while the camera travels | `tunnel` |
| giant cropped letters used as architecture the camera punches through | `type-wall` |
| a sphere of characters orbiting a focal mark until the orbits converge | `glyph-sphere` |
| a mass sucked into a focal glyph, spiking then releasing as a wave | `implosion` |
| a white ring of operators expanding past frame as one readable command | `shockwave` |
| one word growing from microscopic to beyond the frame edge | `giant-word` |
| a plane folding through itself, flat becoming volume without a cut | `spatial-fold` |
| the whole frame drawn backward into a cursor-shaped drain | `cursor-vortex` |
| a wide even plane of characters pulsing as one material | `field` |
| a character field visible only inside letterforms | `mask` |

**How to write a transition you cannot name.** Describe the physical event
first ("the wall shatters from the point of impact outward, and the shards
converge into an orbiting sphere"), then look up which mechanism owns that
event (`type-wall`, which emits `fragments`, and `fragments` admits
`glyph-sphere`). If no mechanism matches, you have found a candidate for the
grammar — record it in the observation notes and consider adding it in the three
places listed in `MOTION_GRAMMAR.md` §8. Do not invent an id in the observation
file: `analyzeReference` only resolves real ids, by id or by display name, and
silently ignores strings it cannot match.

The `transitions` array is matched case-insensitively against both the id and the
display name, with whitespace folded to hyphens, so all of these work:

```json
"transitions": ["glyph sphere", "Implosion", "cursor-vortex", "typographic wall"]
```

An unrecognised list is not an error — `analyzeReference` plans an unrestricted
chain rather than an empty one. But a list that is *mostly* unrecognised means
your analysis vocabulary is drifting away from the engine's, and the STYLE DNA
you get back will quietly reflect the planner's taste instead of the reference's.

---

## 5. Peak frames

A peak is a frame the whole clip seems organised around. Record every peak as a
row of a small table — timestamp, what is on screen, and the mechanism that
produced it. This is the single most useful artefact of the analysis, because it
tells you which beats must not be weakened when you plan your own version.

```markdown
| t | peak | producing mechanism |
| --- | --- | --- |
| 0.4 s | a field of loose glyphs snaps into a legible slab | assemble |
| 4.8 s | the camera breaches the last wall; glyphs spray outward | type-wall |
| 8.1 s | the spray is sucked into a point and released as a ring | implosion |
| 11.6 s | giant cropped word fills every edge of frame | giant-word |
| 14.0 s | the frame drains into a cursor and the clip stops mid-dive | cursor-vortex |
```

Two rules for the table:

- **The mechanism column must be a real id.** If you cannot name it, the peak is
  not understood yet, and it will not survive into your own plan.
- **Every peak must be a different mechanism.** Two peaks produced by the same
  mechanism are one peak with a long tail. In a 15-second film, 4–6 peaks is
  right; more than that and the audience has no time to register any of them.

Peaks are how the `contrast` check in the quality gate is satisfied in practice:
`review()` verifies the density curve has at least two major swings, and the
peaks table is where those swings are placed deliberately rather than
accidentally.

---

## 6. The STYLE DNA block

`analyzeReference` returns a fixed eight-line block. It is deliberately short —
it is a *contract*, not an essay, and it is the thing you paste above your own
prompt.

```
FORMAT: <aspect>, ~<duration>s
MATERIALS: <what the film is physically made of>
CAMERA: <camera behaviours, separated by semicolons>
DENSITY: <the density curve as a sentence with times>
TYPOGRAPHY: <how type behaves>
TRANSITION MECHANISMS: <the named mechanisms you observed, or "inferred from the chain below">
ENDING: <the ending state>
CHAIN: <id → id → id → …>
```

Notes on writing a good one:

- **MATERIALS is a list of nouns.** "Monospaced glyphs, mathematical operators,
  brackets and slashes, a single blinking cursor, microtype fragments" — not
  "dark, technical, minimal".
- **CAMERA is a list of moves, not a feeling.** "Forward punch-through along +z;
  rapid scale dive into a focal glyph; slight roll during the tunnel travel".
- **DENSITY carries times.** Without times it cannot be planned against.
- **ENDING is a state you could open a clip from.** "Mid-dive into a
  cursor-shaped drain, with the camera still accelerating" is openable;
  "resolves beautifully" is not.
- **CHAIN is generated, not authored.** It is `planChain`'s answer for the
  mechanisms you named, restricted to those mechanisms and started from whatever
  form leads into the first one. Do not hand-edit it; if it is wrong, the
  `transitions` list is wrong.

The three `notes` lines that come back with it are the standing reminder of the
method, and they are worth leaving in the output:

```
NOTES:
  - Analyse function, not appearance: what does each element *become* over time?
  - Record the peak frames and the exact mechanism that produced each one.
  - The ending state is the deliverable — it is the next clip's input.
```

---

## 7. How `transitions` feeds `analyzeReference`

Everything in the observation file is optional, and every field has a default.
This is the exact contract (`src/director.js`):

| field | default | used for |
| --- | --- | --- |
| `duration` | `15` | the `FORMAT:` line only; it does not change the chain |
| `aspect` | `'21:9'` | the `FORMAT:` line |
| `materials` | `['monospaced glyphs', 'operators', 'cursors']` | `MATERIALS:` (a string is coerced into a one-element list) |
| `camera` | `['forward punch-through', 'scale dive']` | `CAMERA:` |
| `densityCurve` | `'alternating compression and release every 2–3 seconds'` | `DENSITY:` |
| `typography` | `'short hero words, cropped beyond frame'` | `TYPOGRAPHY:` |
| `transitions` | `[]` | `TRANSITION MECHANISMS:`, the start form, **and the chain restriction** |
| `ending` | `'mid-motion, unresolved'` | `ENDING:` |
| `beats` | `5` | how many links to plan |
| `startForm` | inferred from `transitions[0]` | override the inferred opening form |

The pipeline that turns observations into a chain:

```js
const named = mapTransitions(transitions);       // ids, in order, unknown strings dropped
const startForm = obs.startForm ?? inferStartForm(transitions);
const chain = planChain({
  startForm,
  count: obs.beats ?? 5,
  allow: named.length ? named : undefined,        // an empty allow-list would plan nothing
});
```

Three consequences worth knowing before you write an observation file:

1. **`transitions` is a restriction, not a timeline.** `planChain` is given the
   named mechanisms as an `allow` list, but it still walks the grammar itself:
   the *order* of your list does not determine the order of the chain, and a
   mechanism that no named list member can legally follow will not appear. List
   the reference's signatures; do not try to write the chain by hand.
2. **The first named transition sets the start form.** `inferStartForm` walks
   `FORM_SUCCESSORS` looking for a form that legally leads into the first named
   mechanism, and falls back to `'void'`. If you observed that the reference
   opens inside an existing volume, set `"startForm": "space"` explicitly.
3. **An unrecognised list degrades gracefully.** All-unknown strings leave
   `allow` undefined and produce an unrestricted chain — useful, but it means the
   STYLE DNA's `CHAIN:` line will no longer be evidence about the reference.

---

## 8. A filled-in example, and the STYLE DNA it produces

`test/reference.json` is exactly this file; the block below is the real CLI
output, not a mock-up.

### The observation file

```json
{
  "duration": 14,
  "aspect": "21:9",
  "materials": [
    "monospaced glyphs",
    "mathematical operators",
    "brackets and slashes",
    "a single blinking cursor",
    "microtype fragments"
  ],
  "camera": [
    "forward punch-through along +z",
    "rapid scale dive into a focal glyph",
    "slight roll during the tunnel travel"
  ],
  "densityCurve": "three compressed peaks at roughly 0s, 6s and 12s, each released into near-empty field within 1.5s",
  "typography": "one cropped hero word per peak, never more than 5 characters, always larger than frame",
  "transitions": [
    "assemble from sparse field",
    "ASCII tunnel",
    "typographic wall",
    "glyph sphere",
    "implosion",
    "cursor vortex"
  ],
  "ending": "mid-dive into a cursor-shaped drain, with the camera still accelerating",
  "notes": [
    "no cut is visible anywhere in the reference",
    "every transition is caused by the camera reaching the previous form",
    "the palette never changes: white structure, one green data layer, one red focal mark",
    "audio is sparse clicks and sub impacts, not music"
  ]
}
```

### `node src/cli.js reference test/reference.json`

```
FORMAT: 21:9, ~14s
MATERIALS: monospaced glyphs, mathematical operators, brackets and slashes, a single blinking cursor, microtype fragments
CAMERA: forward punch-through along +z; rapid scale dive into a focal glyph; slight roll during the tunnel travel
DENSITY: three compressed peaks at roughly 0s, 6s and 12s, each released into near-empty field within 1.5s
TYPOGRAPHY: one cropped hero word per peak, never more than 5 characters, always larger than frame
TRANSITION MECHANISMS: assemble from sparse field, ASCII tunnel, typographic wall, glyph sphere, implosion, cursor vortex
ENDING: mid-dive into a cursor-shaped drain, with the camera still accelerating
CHAIN: assemble → type-wall → implosion → cursor-vortex → tunnel

NOTES:
  - Analyse function, not appearance: what does each element *become* over time?
  - Record the peak frames and the exact mechanism that produced each one.
  - The ending state is the deliverable — it is the next clip's input.
```

### Reading the result honestly

- The six named transitions restricted the chain: every link in `CHAIN:` is one
  of the mechanisms you named, in an order the grammar allows.
- The chain is **not** the order in the observation file. `ASCII tunnel` was
  named second and planned fifth; the planner followed the forms, starting from
  the inferred `void` (because `assemble` is reachable from `void`) and ending on
  `tunnel`, which emits `space` — an ending you can hand to a sequel.
- The `notes` array in the observation file is **preserved as input but not
  echoed** into the STYLE DNA. It is documentation for the human analyst. If a
  note must influence the plan, it has to become a field: a camera note becomes
  an entry in `camera`, a palette note becomes your own `--palette` at plan time.

### From STYLE DNA to a plan

STYLE DNA is an input, not a finished prompt. The next step is to compose the
real prompt and put it through the gate:

```bash
node src/cli.js plan "15s 21:9 ASCII film, brutalist palette, one hero word per peak" \
  --seed ref-01 --beats 5
```

Then check the gate (`node src/cli.js review "<brief>"`), preview a beat
(`node src/cli.js preview "<brief>" --t 8`), and only then consider paying for a
generation. See `GENERATION.md` for the paid stage and `QUALITY_GATE.md` for what
a failing plan looks like and how to repair it.
