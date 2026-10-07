# ASCII Director Bible

> **Status:** canonical for v3. Supersedes the v1 bible, which described a visual
> style. This describes a grammar of *function*.

## 1. Visual ontology

The world is built from monospaced letters, punctuation, mathematical operators,
brackets, slashes, arrows, cursors, digits, code fragments, dots and vector
lines.

ASCII is **structural material, not overlay.** If a frame could be swapped for a
photograph with a text layer over it and lose nothing, the direction has failed.

Corollary: do not "render a scene as ASCII". Build a world *out of* characters
that a camera flies through. The distinction decides whether the result feels
like a filter or a place.

## 2. Motion grammar — the core idea

The strongest transitions are **transformations of function**, not of
appearance. A character does not get bigger; it becomes a different kind of
thing.

```
text        →  pattern
pattern     →  particles
particles   →  geometry
geometry    →  space
space       →  giant typography
typography  →  fragments
fragments   →  symbol / cursor / void
```

Every mechanism in `src/motion-grammar.js` is one such transformation, written as
*material → action → emitted form*. A chain is legal when the previous
mechanism's emitted **form** is admitted by the next one — either the
predecessor's emitted form appears as a key in `FORM_SUCCESSORS` with the
successor in its list, or the predecessor declares the successor in `chainsTo`.
That is the whole structure, and `planChain` walks it mechanically. The full
table is in `MOTION_GRAMMAR.md` §4.

**Use inherited motion.** A symbol can stretch into a tunnel because the camera
is *already* moving into it. A typographic wall can fragment because the camera
*punches through* it. A sphere can implode because its orbits are *already*
converging. The cause precedes the effect and stays visible in the frame.

### The four tiers

Tier is a statement about structural weight, not about quality. It decides what
the planner reaches for first and how much a beat can carry on its own.

| tier | count | what it is | examples |
| --- | --- | --- | --- |
| **canonical** | 7 | load-bearing transformation; the film does not exist without events like these | `assemble`, `implosion`, `shockwave`, `cursor-vortex` |
| **strong** | 7 | a high-impact event that carries a beat alone: a punch-through, a scale inversion, a fold | `tunnel`, `type-wall`, `giant-word`, `spatial-fold` |
| **support** | 2 | material that carries motion handed to it; it never causes a transformation | `field`, `mask` |
| **reject** | 5 | a named failure mode, kept in the grammar so the gate can name it | `reject-city`, `reject-hud` |

The reject tier is not a graveyard, it is a **diagnostic vocabulary**. Five named
failures (`reject-hud`, `reject-city`, `reject-glitch`, `reject-particles`,
`reject-smoke`) let the gate say *which* cliché appeared instead of reporting a
vague unease, and let the `RULE:` line ban a finite, reviewable set. Each one is
terminal — `chainsTo: []`, `emits: 'cliche'` — and `FORM_SUCCESSORS.cliche`
contains exactly one mechanism, `boot-signal`: the only way back into the grammar
from a cliché is to start again from a single mark.

### The formalism, in one paragraph

A clip is a chain of links. Each link is
`{ mechanism, beat, from, to, exit, description }`, where `exit` is a full
`MotionState` whose `form` is the mechanism's `emits` and whose `unresolved` is
that mechanism's own sentence ("the camera is still inside the tunnel with speed
left over"). The chain is planned by `planChain`, reviewed by `review`, and
rendered by `planFilm` — one shot per link, lazily compiled to point primitives.
Nothing about the chain is stochastic: the same options always return the same
chain, and the same chain always renders byte-identical frames.

## 3. Rhythm grammar

Avoid constant complexity. Complexity is only legible against its opposite:

```
void        →  boot signal
sparse      →  acceleration
dense       →  extreme density
microscopic →  gigantic
chaos       →  compression
impact      →  silence
```

High-impact default: a major perceptual change roughly every 2–3 seconds. The
density curve in `densityCurve()` formalises this as an alternating envelope; the
quality gate asserts at least two major swings.

## 4. Camera grammar

The camera is **graphic, never handheld.**

Favour:

- forward punch-through
- rapid scale dive
- orbital lock
- 180° spatial fold
- planar-to-volume transition
- sudden freeze
- continuous tunnel travel
- backward suction

Avoid decorative camera shake entirely. Shake is a way of adding energy when the
motion grammar has none.

## 5. Typography grammar

Hero words are short: 1–8 characters, or 1–2 words. They may be:

- cropped beyond frame
- built from microtype
- used as spatial walls
- used as masks
- shattered into glyphs
- folded into rings, ribbons, grids

A word longer than the frame is read with the body before the eye. That is the
effect to aim for. Long exact text — a brand name, a legal line, a URL — belongs
in post-production, where it can be set precisely and held.

## 6. Palette presets

The default is brutalist digital:

| role | colour | purpose |
|---|---|---|
| field | deep black | the void the world sits in |
| structure | white | what the audience reads |
| data | acid green | the second layer, information |
| secondary | electric blue | depth and distance |
| signal | minimal red | focal identity and warning only |

Red is the scarcest resource in the frame. If red is everywhere, nothing is
urgent. Other presets live in `src/core.js` `PALETTES`; a preset is a
background plus an ordered list of layer inks, nothing more.

## 7. Negative vocabulary

No generic neon city. No hologram dashboard. No random scanline abuse. No smoke.
No fantasy liquid morphs. No decorative circuitry unless it evolves from actual
type. No unrelated scene cuts. No photoreal humans unless explicitly demanded.

These are not aesthetic preferences. Each replaces a *cause* with a *texture*,
which is exactly what the grammar exists to prevent. They are modelled as
`reject` mechanisms so the quality gate can name the failure instead of merely
disliking the result.

## 8. The continuity contract

A clip must expose an `exit_state`:

| field | meaning |
|---|---|
| `form` | what object or form exists at the last frame |
| `camera` | the film's outgoing camera move |
| `velocity` | signed apparent speed |
| `rotation` | dominant rotation, turns/second |
| `scaleTrend` | `+1` growing, `-1` shrinking, `0` static |
| `densityTrend` | `+1` densifying, `-1` dissolving |
| `palette` | the palette in use |
| `ramp` | the dominant charset |
| `unresolved` | the action still in flight when the clip ends |

The next clip's `entry_state` must match it. `inherit(prevExit)` derives that
entry state from the predecessor's exit state: it carries `form`, `camera`,
`rotation`, `scaleTrend`, `densityTrend`, `palette` and `ramp` across unchanged,
multiplies `velocity` by `speedUp` (1.1 by default, so a sequel accelerates
instead of restarting), and carries the `unresolved` action into the entry state
so the continuation knows what it is closing. `checkSeam(prevExit, entry,
{ requireCamera: true, requirePalette: true })` then reports concrete violations
— a camera reset, a palette or charset jump, a dropped or reversed velocity —
rather than a feeling that something is off. Each violation is a sentence you
can act on:

```
camera vector resets: predecessor exits on "tunnel-travel" but the continuation enters on "orbital-lock"
apparent velocity is dropped to zero, which reads as a hard reset
palette changes across the seam ("brutalist-digital" → "phosphor"), which breaks material continuity
dominant charset changes across the seam ("brutalist" → "minimal")
```

Camera, palette and charset are only compared when the caller says the entry was
*derived* from the exit (`requireCamera` / `requirePalette`), because two
independently built states may legitimately differ; velocity is always checked,
because a velocity break reads as a reset in any cut. `MOTION_GRAMMAR.md` §6 has
the worked example and the workings of `inherit()`.

**The ending is the deliverable.** A clip that resolves completely cannot be
continued, and a sequence assembled from resolved clips is a slideshow. The gate
enforces this as check 5: the last link must leave a non-empty `unresolved`
action, or the prompt must declare that the clip ends mid-motion.

## 9. See it before you pay for it

The v3 engine renders the plan itself. A `FilmSpec` is data — one shot per chain
link, each shot a set of seeded primitive *specs* compiled lazily at render time
— so any frame of any beat can be rasterized offline, in milliseconds, with no
API key, no ffmpeg and no network:

```bash
ascii-h3 preview "15s ASCII film about memory collapsing, word VOID" --t 9 --cols 110 --rows 28
ascii-h3 strip   "<the same brief>" --frames 6 --out sheet.png     # a contact sheet
ascii-h3 svg     "<the same brief>" --t 9 --out frame.svg          # real glyph outlines, no font
ascii-h3 png     "<the same brief>" --t 9 --out frame.png          # encoder built in
```

The renderer is a pinhole camera flying through a character point cloud: cells
hold one ASCII code point and one ink value, nothing else. It uses no
`Math.random` and reads no wall clock, so re-rendering the same spec produces
byte-identical frames — which is what makes a preview *evidence* rather than an
impression. `node test/engine.test.js` asserts this directly.

Two consequences for direction:

- **You cannot discover that a beat reads badly by paying for it.** Look at the
  beat. If a beat is unreadable at 110×28 characters, it will be unreadable at
  any resolution, because legibility here is a property of the glyph mass, not of
  the pixel count.
- **The preview is the argument, not the decoration.** Show the contact sheet
  when you report a plan. A chain plus a gate score plus a sheet is a decision;
  prose about the plan is not.

## 10. The quality gate

Seven checks, equal weight, scored 0–100, and `pass` only when all seven pass.
The gate is the only thing standing between a direction and a paid generation,
and every check is structural — which is why a failing gate can only be repaired
structurally. **Fix, do not decorate.**

| # | check | asks |
| --- | --- | --- |
| 1 | `single-chain` | is there one legible transformation chain of ≥ 3 beats? |
| 2 | `source-state` | does the first shot have a clear source state? |
| 3 | `physical-cause` | does every transition legally follow the previous form? |
| 4 | `contrast` | are there at least 2 strong scale/density contrasts? |
| 5 | `exit-state` | is the final state usable as the next clip's input? |
| 6 | `no-cliche` | is the rejected vocabulary absent from the positive prompt? |
| 7 | `compact` | is the prompt written for time rather than as prose? |

Run it with `node src/cli.js review "<brief>"`, or read it inside a full plan
(`node src/cli.js plan "<brief>"`). Check 7's
320-word ceiling is the prototype lesson: the first continuation prompt grew
until it was explicitly rejected, because a prompt that needs 500 words to
describe 15 seconds is not describing one film. `QUALITY_GATE.md` documents each
check with its failure mode, its repair, and a worked failing plan.

## 11. The single test

If a 15-second plan cannot be summarised as **one** transformation chain, it is
too diffuse. Cut it.

```
? → ASCII tunnel → type wall → glyph sphere → implosion → giant-word shockwave → cursor vortex
```

That is a film. Two unrelated chains is two films, and the audience will only
remember the seam.
