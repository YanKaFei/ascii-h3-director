# The Quality Gate

Seven checks, scored 0–100. Run it before every paid generation.

```bash
ascii-h3 review "15s ASCII film about memory collapsing into language, word VOID"
```

```
QUALITY GATE  PASS  (100/100)
────────────────────────────────────────────────────────────
  ✔ One legible transformation chain
      5 beat(s): assemble → type-wall → shockwave → tunnel → glyph-sphere
  ✔ First shot has a clear source state
      opens on "assemble"
  ✔ Every transition has a physical cause
      all links follow the mechanism grammar
  ✔ At least 2 strong scale/density contrasts
      density spans 0.12–0.94 with 9 major swing(s)
  ✔ Final state is usable as the next clip's input
      ends unresolved: the orbits are still converging on the focal mark
  ✔ Generic HUD / cyberpunk / random glitch excluded
      no rejected vocabulary in the positive prompt
  ✔ Prompt stays compact (written for time, not prose)
      143 words
```

## The doctrine

> **Fix, do not decorate.**

When the gate fails, adding adjectives feels productive and is not. Every real
improvement in this project's history came from changing one **structural**
thing. The gate's checks are all structural for exactly that reason.

## The seven checks

### 1. `single-chain` — One legible transformation chain

At least three mechanisms that form one chain. Below that there is no
transformation, only a shot.

*Detect by eye:* you cannot describe the clip as a single arrow line.

*Repair:* cut the concept until one chain remains. If two ideas are fighting, make
two clips and join them with a continuation, not a cut.

### 2. `source-state` — First shot has a clear source state

The first beat must be a *thing that exists*, not a mood. `assemble` opens on
loose characters; `boot-signal` opens on a cursor and a few marks; `tunnel` opens
inside rings.

*Detect by eye:* the first frame could be the middle of any other clip.

*Repair:* name the opening form explicitly. "Begins on a sparse field of loose
operators that has not yet resolved" is a source state.

### 3. `physical-cause` — Every transition has a physical cause

Each mechanism must legally follow the previous one, either because the
predecessor declares it in `chainsTo` or because the predecessor's emitted form
admits it.

*Detect by eye:* a transition that happens *to* the frame rather than *because of*
the previous state. This is what a hard cut looks like when it is hiding.

*Repair:* reorder the chain along the grammar, or insert the missing intermediate
mechanism. Never bridge an illegal transition with a wipe.

### 4. `contrast` — At least 2 strong scale/density contrasts

The density envelope must swing at least twice. Constant complexity is
unreadable; contrast is what makes density legible.

*Detect by eye:* scrub the timeline. If no moment feels noticeably emptier than
another, there is no rhythm.

*Repair:* change the density curve, or replace a mid-density mechanism with a
pair — one near-empty, one maximal. `minimal-data` mode reduces the swing
deliberately; use it only when you mean to.

### 5. `exit-state` — Final state is usable as the next clip's input

The last beat must declare an `unresolved` action, or the prompt must state that
the clip ends mid-motion.

*Detect by eye:* the clip resolves. Nothing is left in flight.

*Repair:* end on an action in progress — mid-dive, mid-collapse, orbits still
converging. A completely resolved clip cannot be continued, and a sequence of
resolved clips is a slideshow.

### 6. `no-cliche` — Generic HUD / cyberpunk / random glitch excluded

No rejected vocabulary in the **positive** part of the prompt. The `RULE` line may
name what it forbids; that is its job.

*Detect by eye:* a neon skyline, an unmotivated readout, damage with no cause.

*Repair:* each cliché replaces a cause with a texture. Find the cause you skipped
and write it. "Neon city" is usually a missing `structural-decay` or `type-wall`.

### 7. `compact` — Prompt stays compact (≤ 320 words)

> This check exists because it was learned the hard way. The first continuation
> prompt was rejected by the user for being too long. Every subsequent "fix" had
> added a clause. The lesson is not that long prompts are rude — it is that a
> prompt needing 500 words to describe 15 seconds is not describing one film.

*Detect by eye:* the prompt has more clauses than the chain has beats.

*Repair:* delete every adjective that does not name a physical cause. Keep the
five time blocks, `STYLE`, `RULE`. If information is genuinely lost, it belonged
in the chain, not in the prose.

## A failing plan, repaired

**Fails** — `physical-cause`, `contrast`, `exit-state`:

```
chain: cursor-vortex → giant-word → type-wall
prompt: "15s ASCII sequence, cyberpunk city, neon HUD, particles everywhere,
         beautiful dramatic transformation, ends on the word VOID"
```

Three problems: `cursor-vortex` emits `void`, and `giant-word` does not legally
follow it, so the opening is an unmotivated hard cut. There is no low-density
moment, so there is no contrast. The clip resolves on a held word, so it cannot be
continued. And the positive prompt names two reject mechanisms.

**Passes** — same idea, structural repair:

```bash
ascii-h3 plan "15s ASCII film about a cursor draining the frame, word VOID"
```

```
chain: assemble → type-wall → shockwave → tunnel → glyph-sphere
gate : PASS (100/100)
```

Nothing was added. The chain was reordered along the grammar, the density curve
was allowed to swing, and the last beat was left unresolved.

## Using the gate from an agent

The Harness plugin exposes it as a tool:

```
ascii_h3_review({ brief: "…" })
ascii_h3_review({ brief: "…", prompt: "<an existing prompt to judge>" })
```

Report the score and the failing checks to the user. Do not proceed to a paid
generation on a failing gate without saying so explicitly.
