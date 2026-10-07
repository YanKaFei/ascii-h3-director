# Session Learnings

This is not a generic "ASCII style" prompt pack. It encodes the iteration path
that produced a useful result, so the same mistakes are not repeated.

Everything below was learned by making the mistake first. Where a lesson has been
turned into machinery, the machinery is named — a lesson that cannot be enforced
will be forgotten by the next session.

## 1. Surface style is insufficient

Early framing such as "hacker, ASCII, green code, terminal" describes appearance
but not motion. The useful abstraction is a **motion grammar**: characters change
function over time — text becomes pattern, pattern becomes space, space becomes
typography again.

**Fix:** describe what each element *becomes*, never what it looks like.

**Machinery:** the grammar in `src/motion-grammar.js`. A mechanism is
`material → action → emitted form`; the `action` strings are written as physical
causes so that a prompt beat can be lifted from them verbatim, and
`FORM_SUCCESSORS` decides which transformations may follow which. See
`MOTION_GRAMMAR.md`.

## 2. Prompt length is a defect, not a style

The first continuation prompt grew long as problems were "fixed" by adding
clauses. It was explicitly rejected. For H3, a compact timeline with concrete
transformations beats exhaustive prose every time.

**Fix:** five time blocks plus `STYLE` and `RULE`. A prompt that needs 500 words
to describe 15 seconds is not describing one film.

**Machinery:** `composePrompt` emits exactly that shape, and the gate's `compact`
check fails a prompt above 320 words with the count printed. The composer also
de-duplicates a final beat whose exit sentence only restates its own action,
because a clause that adds no information is where the drift starts.

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

**Machinery:** the `contrast` check, and `densityCurve()` — an alternating
compression/release envelope with a major perceptual change every 2–3 seconds in
`high-impact` mode. The tier system also encodes it: `canonical` and `strong`
mechanisms are the ones that can produce a peak, and `support` mechanisms exist
to make the previous peak visible.

## 4. Continuation is a production contract, not a request

A sequel must literally inherit the prior last frame. Do not start a new scene.
Carry forward camera vector, speed, rotation, palette and dominant glyph system.
The previous exit *becomes* the next entry.

**Fix:** `exit_state` → `inherit()` → `entry_state`, with `checkSeam()` reporting
violations. A camera reset across a seam is the single most common way a sequence
stops feeling like one film.

**Machinery:** every planned link carries a full `MotionState` as its `exit`,
including the mechanism's own `unresolved` sentence. `inherit()` carries the
state across and multiplies velocity by 1.1, so a sequel accelerates instead of
restarting. `planContinuation` refuses to let a declared continuation be silent
about a broken seam: `continue.sh` prints `SEAM: holds` or `SEAM: BROKEN` with
the individual violations, ahead of the gate.

## 5. Avoid the generic cyberpunk trap

This visual language is **brutalist computational motion design**, not neon city
/ HUD science fiction. "Cyberpunk" belongs in the negative prompt, not the brief.

**Fix:** the reject mechanisms exist so the gate can name the failure. A cliché
in the positive prompt fails a check rather than surviving to generation.

**Machinery:** five `reject` mechanisms (`reject-hud`, `reject-city`,
`reject-glitch`, `reject-particles`, `reject-smoke`) are kept in the grammar,
each terminal (`chainsTo: []`, `emits: 'cliche'`) with exactly one way back in —
`boot-signal`. The `no-cliche` check searches the positive half of the prompt for
their names; the `RULE:` line is exempt, because naming what is forbidden is its
job.

## 6. Music must not compete with image density

Glitch techno and IDM were rejected as defaults. When the picture is already at
maximum density, dense music produces noise rather than intensity.

**Fix:** sound-design-first scoring — silence, clicks, sub pressure, transients,
discontinuities. The visuals provide spectacle; audio provides mass and
punctuation.

**Machinery — none, deliberately.** This one is still taste. `MUSIC_GUIDE.md` is
a guide, and no check enforces it. Do not let a generator choose the score.

## 7. Fix structure, never wording

The most expensive lesson. When a generation fails, adding adjectives feels
productive and is not. Every real improvement came from changing one structural
thing: the chain, the scale contrast, the density curve, the camera vector, the
hero object, or the end state.

**Fix:** the quality gate asks about structure only, and its failure message says
so explicitly.

**Machinery:** all seven checks are structural, the repair list is printed when
the gate fails, and `QUALITY_GATE.md` maps each failing check to a structural work
order. When tempted to add a clause, re-read check 7.

## 8. Render before paying

A plan is data. Once the chain and the motion states exist, a *deterministic*
preview of any beat can be produced offline in milliseconds. There is no reason
to discover that a beat reads badly by paying for it.

**Fix:** the v3 engine renders real ASCII frames with no API key, no ffmpeg and no
network. `preview`, `svg`, `png` and `strip` are all free.

**Machinery:** `planFilm` turns a script into a `FilmSpec` of primitive *specs*
(compiled lazily, so a long spec stays cheap), and `renderFilmFrame` rasterizes
any time in the clip. The engine contains no `Math.random` and reads no clock, so
the same spec renders byte-identical frames on any machine — `node
test/engine.test.js` asserts this as the project's core promise.

## 9. Planning must not be a lottery

A planner that returns a different chain each run cannot be reviewed, cannot be
cached, and cannot be reasoned about. `planChain` never calls the RNG: the same
options always return the same chain, across start forms and across processes.
Where a chain would have to repeat a mechanism to reach the requested length, the
honest answer is a shorter chain — repetition reads as a stall. That is why
`planChain({ count: 40 })` returns the longest distinct legal path the grammar
admits (9 links today) instead of looping.

## 10. The quality heuristic

> If a 15-second prompt cannot be summarised as **one** transformation chain, it
> is too diffuse.

Good chain:

```
? → ASCII tunnel → type wall → glyph sphere → implosion → giant-word shockwave → cursor vortex
```

Bad: anything that needs the word "meanwhile".
