# Production Workflow

Six stages. Only the fifth costs money, and it is gated on the fourth.

```
A. REFERENCE   →   B. CHAIN   →   C. PROMPT   →   D. GATE   →   E. GENERATE   →   F. EDIT
   (optional)        (free)        (free)         (free)        (paid)            (free)
                                        └──────────┴──────────────┘
                                     all of this runs offline
```

## A. Reference analysis

When a reference is supplied, **do not imitate its surface.** Extract nine things:

1. format, aspect ratio and duration
2. the visual materials it is physically made of
3. typography behaviour — how type moves, not how it looks
4. camera behaviour
5. the density curve over time
6. the transformation chain — what becomes what
7. recurring transition mechanisms, named in this plugin's grammar
8. the peak frames, and the mechanism that produced each
9. the ending state

Return a short `STYLE DNA` block before writing anything new. The bundled engine
does this:

```bash
ascii-h3 reference observations.json
```

See `REFERENCE_ANALYSIS.md` for the observation file's shape.

## B. Concept → transformation chain

Translate the idea into 5–7 concrete states. Example:

```
? → glyph tunnel → type wall → ASCII sphere → implosion → command shockwave → cursor vortex
```

This chain is the backbone. Adjectives are secondary and largely decorative.

```bash
ascii-h3 chain "15s ASCII film about memory collapsing into language"
```

## C. The H3 prompt

Write **for time**. Five three-second blocks, one `STYLE` line, one `RULE` line,
and nothing else.

- Keep visible text short — 1–8 characters or 1–2 words.
- State explicitly that there are no normal cuts and that each transformation
  physically emerges from the previous state.
- Name the physical cause of each transition. "Walls shred because the camera
  punches through them" — not "beautifully chaotic transformation".

```bash
ascii-h3 prompt "…" --out prompt.txt
```

## D. The gate

Before spending anything, answer all seven checks. The engine scores them:

```bash
ascii-h3 review "…"
```

`PASS` at 100/100 is the bar. One failure is a real defect; three failures usually
means the chain is wrong rather than the wording.

**If the plan fails, do not add adjectives.** Change exactly one of:

- the transformation chain
- the scale contrast
- the density curve
- the camera vector
- the hero object
- the end state

Then re-gate.

## E. Generation — the only paid stage

```bash
ascii-h3 generate prompt.txt out.mp4 15 21:9
```

`generate.sh` refuses to run without a prompt file and without the provider CLI,
and never installs or reads credentials on your behalf. See `GENERATION.md`.

Fresh generation:

```bash
./scripts/generate.sh prompt.txt outputs/fresh.mp4 15 21:9
```

Continuation (passes the predecessor's last frame as the image input):

```bash
ascii-h3 plan "<brief>" --json > plan.json
python3 -c "import json;print(json.dumps(json.load(open('plan.json'))['chain'][-1]['exit']))" > exit.json
./scripts/continue.sh exit.json next-prompt.txt outputs/part2.mp4 15 21:9
```

## F. Review and edit

Inspect the generated clip:

- **first 12 frames** — does it continue, or does it reset?
- **25% / 50% / 75%** — is each transformation legible at that instant?
- **final 12 frames** — is the end state usable as the next input?
- hero text fidelity
- accidental photoreal objects, HUD clichés, generic city
- motion continuity across every transition

If the generation fails *artistically*, go back to stage D and change a
structural element. More adjectives in the prompt will not fix a broken chain.

Then sound. See `MUSIC_GUIDE.md`: the image supplies spectacle, sound supplies
weight and punctuation. Edit to the peaks the chain predicted.
