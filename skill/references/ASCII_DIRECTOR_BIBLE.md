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

Every mechanism in `src/motion-grammar.js` is one such transformation, tagged
with the form it consumes and the form it emits. A chain is legal when each
mechanism's consumed form is the previous mechanism's emitted form. That is the
whole structure, and `planChain` walks it mechanically.

**Use inherited motion.** A symbol can stretch into a tunnel because the camera
is *already* moving into it. A typographic wall can fragment because the camera
*punches through* it. A sphere can implode because its orbits are *already*
converging. The cause precedes the effect and stays visible in the frame.

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

The next clip's `entry_state` must match it. `inherit()` derives that entry state
from the predecessor's exit state, and `checkSeam()` reports concrete violations —
a camera reset, a palette jump, a dropped or reversed velocity — rather than a
feeling that something is off.

**The ending is the deliverable.** A clip that resolves completely cannot be
continued, and a sequence assembled from resolved clips is a slideshow.

## 9. The single test

If a 15-second plan cannot be summarised as **one** transformation chain, it is
too diffuse. Cut it.

```
? → ASCII tunnel → type wall → glyph sphere → implosion → giant-word shockwave → cursor vortex
```

That is a film. Two unrelated chains is two films, and the audience will only
remember the seam.
