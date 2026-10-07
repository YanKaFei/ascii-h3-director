# Session Learnings

This is not a generic "ASCII style" prompt pack. It encodes the iteration path
that produced a useful result, so the same mistakes are not repeated.

Everything below was learned by making the mistake first.

## 1. Surface style is insufficient

Early framing such as "hacker, ASCII, green code, terminal" describes appearance
but not motion. The useful abstraction is a **motion grammar**: characters change
function over time — text becomes pattern, pattern becomes space, space becomes
typography again.

**Fix:** describe what each element *becomes*, never what it looks like.

## 2. Prompt length is a defect, not a style

The first continuation prompt grew long as problems were "fixed" by adding
clauses. It was explicitly rejected. For H3, a compact timeline with concrete
transformations beats exhaustive prose every time.

**Fix:** five time blocks plus `STYLE` and `RULE`. The gate now enforces a word
ceiling, because a prompt that needs 500 words to describe 15 seconds is not
describing one film.

## 3. A correct concept can still be weak

A binary/logical sequence was coherent and visually underpowered. The fix was not
more theory; it was stronger perceptual events:

- faster perspective travel
- giant cropped typography
- punch-through transitions
- implosion / shockwave
- freeze → suction
- large microscopic ↔ gigantic inversions

**Fix:** in high-impact mode, optimise for perceptual peaks first and conceptual
legibility second. Concept earns the second viewing; the peaks earn the first.

## 4. Continuation is a production contract, not a request

A sequel must literally inherit the prior last frame. Do not start a new scene.
Carry forward camera vector, speed, rotation, palette and dominant glyph system.
The previous exit *becomes* the next entry.

**Fix:** `exit_state` → `inherit()` → `entry_state`, with `checkSeam()` reporting
violations. A camera reset across a seam is the single most common way a
sequence stops feeling like one film.

## 5. Avoid the generic cyberpunk trap

This visual language is **brutalist computational motion design**, not neon city
/ HUD science fiction. "Cyberpunk" belongs in the negative prompt, not the brief.

**Fix:** the reject mechanisms exist so the gate can name the failure. A cliché
in the positive prompt now fails a check rather than surviving to generation.

## 6. Music must not compete with image density

Glitch techno and IDM were rejected as defaults. When the picture is already at
maximum density, dense music produces noise rather than intensity.

**Fix:** sound-design-first scoring — silence, clicks, sub pressure, transients,
discontinuities. The visuals provide spectacle; audio provides mass and
punctuation.

## 7. Fix structure, never wording

The most expensive lesson. When a generation fails, adding adjectives feels
productive and is not. Every real improvement came from changing one structural
thing: the chain, the scale contrast, the density curve, the camera vector, the
hero object, or the end state.

**Fix:** the quality gate asks about structure only, and its failure message says
so explicitly.

## 8. Render before paying

A plan is data. Once the chain and the motion states exist, a *deterministic
preview* of any beat can be produced offline in milliseconds. There is no reason
to discover that a beat reads badly by paying for it.

**Fix:** the v3 engine renders real ASCII frames with no API key, no ffmpeg and no
network. `preview`, `svg`, `png` and `strip` are all free.

## 9. The quality heuristic

> If a 15-second prompt cannot be summarised as **one** transformation chain, it
> is too diffuse.

Good chain:

```
? → ASCII tunnel → type wall → glyph sphere → implosion → giant-word shockwave → cursor vortex
```

Bad: anything that needs the word "meanwhile".
