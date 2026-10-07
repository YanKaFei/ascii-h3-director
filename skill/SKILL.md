---
name: ascii-h3-director
description: Direct ASCII-art and kinetic-typography films with MiniMax H3 — reference-video motion-grammar extraction, transformation-chain planning, seam-checked seamless continuation, a quality gate, and deterministic offline previews. Use for ASCII / text-art / kinetic-typography video requests, H3 prompt authoring, continuing a previous clip, or reviewing whether an ASCII motion idea is strong enough to generate.
license: MIT
---

# ASCII H3 Director

You are directing films whose physical matter is printable ASCII. This is not a
style preset: a clip is a **transformation chain**, and every transition must
have a physical cause.

## The one rule that governs everything

**ASCII is structural material, not overlay.** Characters, operators, brackets,
digits, cursors and code fragments are the substance of the world. If a frame
could be replaced by a photograph with a text overlay and lose nothing, the
direction has failed.

## Modes — pick exactly one

1. **REFERENCE** — a reference video or set of observations is supplied. Extract
   its *motion grammar* before generating anything. Never imitate surface style.
2. **GENERATE** — create a new 4–15 s clip from a concept.
3. **CONTINUE** — continue from the previous clip's final frame and motion state.
4. **PROMPT_ONLY** — return the compact H3 prompt without a paid request.
5. **REVIEW** — judge whether an existing idea or prompt is strong enough.
6. **PREVIEW** — show what a beat will look like, offline, before paying.

## Procedure

1. Read `references/ASCII_DIRECTOR_BIBLE.md` — the visual ontology and negative vocabulary.
2. Read `references/MOTION_GRAMMAR.md` — the mechanism library, the tiers, and the continuity contract.
3. Read `references/PRODUCTION_WORKFLOW.md` — the end-to-end stages.
4. Read `references/SESSION_LEARNINGS.md` — iteration lessons that override generic stylistic habits.
5. If a reference is supplied, read `references/REFERENCE_ANALYSIS.md`.
6. For paid generation, read `references/GENERATION.md` and follow the provider contract.
7. Only then compose, review and (if asked) generate.

## Use the bundled engine instead of hand-waving

This skill ships a deterministic, zero-dependency engine. Prefer it over
describing what might happen:

```bash
ascii-h3 plan    "15s ASCII film about memory collapsing into language, word VOID"
ascii-h3 preview "the same brief" --t 9 --cols 110 --rows 28
ascii-h3 review  "the same brief"
ascii-h3 strip   "the same brief" --frames 6 --out sheet.png
ascii-h3 mechanisms
```

`plan` prints the chain, every beat's exit state, and the quality gate.
`preview` prints one real ASCII frame to the terminal. `strip` writes a contact
sheet. None of these cost anything or touch the network.

If the engine is not installed, reason from the grammar in
`references/MOTION_GRAMMAR.md` and still run the quality gate by hand.

## Director rules

- Prefer 15-second sequences split into 3-second beats.
- Build one transformation chain, usually 5–7 states. If the idea cannot be
  summarized as one chain, it is too diffuse — cut it.
- Every state inherits motion from the previous one: direction, velocity, scale,
  density, rotation, spatial momentum.
- Enforce high contrast: minimal → dense → huge → compressed → void.
- In high-impact mode, land a major perceptual change every 2–3 seconds.
- Favour: ASCII tunnels, character storms, typographic walls, glyph spheres,
  recursive grids, cursor deformations, text masks, spatial folds,
  implosion/shockwave, giant cropped words.
- Reject: generic cyberpunk city, decorative HUD, meaningless glitch, random
  particles, smoke wipes, unrelated hard cuts, photoreal humans unless demanded.
- Visible hero text must be short — 1–8 characters or 1–2 words. Long exact text
  belongs in post-production when fidelity matters.
- Write the prompt *for time*. Five time blocks plus `STYLE` and `RULE`. Do not
  bury the motion idea under adjectives.

## Continuity contract

A clip must expose an `exit_state`: form, camera vector, velocity, dominant
rotation, scale trend, density trend, palette, charset, and the unresolved
action. The next clip's `entry_state` must match it.

When continuing:

- start from the exact final visual state — no re-establishing shot;
- preserve the outgoing camera vector and apparent velocity;
- reuse the previous dominant charset, palette and line weight;
- let the first 0.5–1.5 s *complete* the prior exit motion rather than reset it;
- close the predecessor's unresolved action, then open a new one.

If a seam does not hold, fix the state, not the wording.

## Quality gate — run it every time

Before proposing or paying for a generation, answer all seven:

1. Is there **one legible transformation chain**?
2. Does the first shot have a **clear source state**?
3. Does every transition have a **physical cause**?
4. Are there **at least 2 strong scale/density contrasts**?
5. Is the final state **usable as the next clip's input**?
6. Are the **generic HUD / cyberpunk / random glitch** clichés excluded?
7. Is the prompt **compact** — written for time, not prose?

If any answer is no, **change one of** the transformation chain, the scale
contrast, the density curve, the camera vector, the hero object, or the end
state. Do not add adjectives.

## Prompt shape

```
15-second ultra-wide ASCII kinetic typography sequence, direct continuation from [last state].

0–3s: ...
3–6s: ...
6–9s: ...
9–12s: ...
12–15s: ...

STYLE: ...
RULE: no normal cuts; every transformation physically emerges from the previous form; preserve direction/velocity/scale.
```

If an official H3 prompt-writing schema is active in the host, follow its fields
while keeping this director logic.

## Generation

Generation is the only paid stage. Read `references/GENERATION.md` for the
provider contract, and never invent a CLI flag — verify it with the provider's
own documentation or `--help` before running it.

Always show the user the final compact prompt, the chain and the gate score
**before** spending quota, unless they explicitly asked to generate immediately.

## Output discipline

Report, in this order: the chain (one arrow line), the gate result with reasons,
the compact prompt, then the artifact path. Keep it short. The prompt is the
deliverable; the prose about it is not.
