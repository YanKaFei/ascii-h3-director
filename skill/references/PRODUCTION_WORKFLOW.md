# Production Workflow

Six stages. Four of them are free and offline; only the fifth costs money, and
it is gated on the fourth.

```
A. REFERENCE  →  B. CHAIN  →  C. PROMPT  →  D. GATE  →  E. GENERATE  →  F. EDIT
   (optional)     (free)       (free)       (free)      (paid)          (free)
                      └──────────┴────────────┘
                    chain, prompt, gate AND PREVIEW
                    all run offline, deterministically
```

The commands below are written `ascii-h3 <subcommand>`, which is the installed
binary (`bin/ascii-h3`). From a source checkout the equivalent is
`node src/cli.js <subcommand>`; the packaged wrappers in `skill/scripts/` resolve
the engine themselves and work from either layout.

## A. Reference analysis

When a reference is supplied, **do not imitate its surface.** Extract nine
things:

1. format, aspect ratio and duration
2. the visual materials it is physically made of
3. typography behaviour — how type moves, not how it looks
4. camera behaviour, named with the camera grammar
5. the density curve over time, with rough timestamps
6. the transformation chain — what becomes what
7. recurring transition mechanisms, named in this plugin's grammar
8. the peak frames, and the mechanism that produced each
9. the ending state, written as a state a sequel could open from

Return a short `STYLE DNA` block before writing anything new. The bundled engine
does this:

```bash
ascii-h3 reference observations.json          # STYLE DNA + CHAIN + notes
ascii-h3 reference observations.json --json   # the same, machine-readable
```

It is deterministic: the same observation file always produces the same STYLE
DNA and the same chain. `REFERENCE_ANALYSIS.md` documents the file's shape, the
field defaults, and a filled-in example with its real output.

Stages A and B are where the judgement lives. Everything after them is
mechanical.

## B. Concept → transformation chain

Translate the idea into 5–7 concrete states. Each state must be a **mechanism**
from the grammar, not an adjective:

```
? → glyph tunnel → type wall → ASCII sphere → implosion → command shockwave → cursor vortex
```

```bash
ascii-h3 chain "15s ASCII film about memory collapsing into language"
ascii-h3 plan  "…" --beats 5 --seed shoot-01      # chain + exit states + gate, in one call
```

Two hard rules at this stage:

- **One chain.** If the idea needs the word "meanwhile", it is two films.
- **Legality is physical, not decorative.** Each mechanism's emitted form must
  be admitted by the next one (`FORM_SUCCESSORS`), or the predecessor must
  declare it in `chainsTo`. `planChain` walks this mechanically; a hand-authored
  chain is checked by `review`'s `physical-cause` check. Never bridge an illegal
  transition with a wipe — insert the missing intermediate state.

## C. The H3 prompt

Write **for time**. Five three-second blocks, one `STYLE` line, one `RULE` line,
and nothing else:

```bash
ascii-h3 prompt "…" --out prompt.txt
```

- Keep visible text short — 1–8 characters or 1–2 words.
- Each beat is one sentence naming a **physical cause**. "Walls shred because
  the camera punches through them", not "beautifully chaotic transformation".
- State explicitly that there are no normal cuts and that each transformation
  physically emerges from the previous state.
- The last beat states the unresolved action, so the clip is continuable.
- Prompt **syntax** (as opposed to direction) follows the official
  `h3-prompt-writing` skill when it is available; see `GENERATION.md`.

`composePrompt` builds this shape for you: one line per chain link taken from the
mechanism's own `action`, a `STYLE` line assembled from palette, ramp, ratio and
hero text, and a `RULE` line that bans the clichés the brief triggered plus the
standing default set. It also suppresses a final beat whose exit sentence merely
restates its own action.

## D. The gate — and the preview

Before spending anything, answer all seven checks:

```bash
ascii-h3 review "…"
ascii-h3 review --brief "…" --out existing-prompt.txt    # judge a prompt you wrote by hand
ascii-h3 review "…" --json                               # the checks as data
```

`PASS` at 100/100 is the bar. One failure is a real defect; three failures
usually means the chain is wrong rather than the wording.

**If the plan fails, do not add adjectives.** Change exactly one of:

- the transformation chain
- the scale contrast
- the density curve
- the camera vector
- the hero object
- the end state

Then re-gate. `QUALITY_GATE.md` lists, for every check, what it measures, how to
see the failure by eye, and the specific repair.

### Then look at it

The gate scores structure; it cannot see the picture. The engine can, offline
and for free:

```bash
ascii-h3 preview "…" --t 9 --cols 110 --rows 28    # one real frame, in the terminal
ascii-h3 png     "…" --t 9 --out outputs/beat.png  # one frame, as a file
ascii-h3 svg     "…" --t 9 --out outputs/beat.svg  # glyph outlines, no font needed
ascii-h3 strip   "…" --frames 6 --out outputs/sheet.png   # a contact sheet, no ffmpeg
```

This is the v3 change that matters most in practice: a plan is *data*, so any
beat can be rendered before it is paid for. Re-rendering the same spec produces
byte-identical frames — no `Math.random`, no clock, no network — which makes the
preview evidence rather than an impression. If a beat reads badly at 110×28
characters it will read badly at any resolution.

## E. Generation — the only paid stage

```bash
./skill/scripts/generate.sh prompt.txt outputs/fresh.mp4 15 21:9
```

The wrapper refuses to run without a prompt file and without the provider CLI,
prints the parameters it is about to use, and never installs anything or reads
credentials on your behalf. The provider contract — installation, authentication,
the exact model id, the aspect-ratio policy, and the instruction to verify the
flags with `mmx video generate --help` rather than trusting the doc — is in
`GENERATION.md`.

A continuation is a different production with the same shape:

```bash
# 1. derive the predecessor's exit state from the plan
ascii-h3 plan "<brief>" --json > outputs/plan.json
node -e "const p=require('./outputs/plan.json');console.log(JSON.stringify(p.chain.at(-1).exit))" \
  > outputs/exit.json

# 2. plan the sequel; the seam verdict prints above the gate
./skill/scripts/continue.sh outputs/exit.json "part two: the wall shatters into a sphere"

# 3. pull the final frame and pass it to the provider as the image input
ffmpeg -sseof -0.05 -i outputs/fresh.mp4 -frames:v 1 outputs/last.png
./skill/scripts/generate.sh outputs/part2-prompt.txt outputs/part2.mp4 15 21:9   # + image input
```

The seam is a contract, not a hope: `continue.sh` runs `checkSeam` with
`requireCamera` and `requirePalette` set, and prints `SEAM: holds` or
`SEAM: BROKEN` with the individual violations. A broken seam is a state problem —
fix the state, never the wording.

## F. Review and edit

Inspect the generated clip at the times the chain predicted:

- **first ~12 frames** — does it open on the declared source state and continue
  the predecessor's motion, or does it reset?
- **25% / 50% / 75%** — is each transition the mechanism the chain names, or has
  the model invented a cut?
- **final ~12 frames** — is the end state usable as the next clip's input? Write
  down the exit state you actually observed, even when it differs from the plan;
  the sequel is planned from what happened.
- hero-text fidelity: short, cropped, legible, no invented words
- accidental photoreal objects, HUD chrome, generic city, unmotivated particles
- motion continuity across every transition

If the generation fails *artistically*, go back to stage **D** — or to **B** —
and change a structural element. More adjectives in the prompt will not fix a
broken chain, and they actively make check 7 worse.

Then sound. See `MUSIC_GUIDE.md`: sound is the punctuation, the image is the
spectacle. Edit to the peaks the chain predicted, and let the silences land where
the density curve bottoms out.

## What each stage can be trusted to catch

| stage | catches | cannot catch |
| --- | --- | --- |
| A | a reference whose motion you misread | whether your own idea is any good |
| B | diffusion (more than one chain) and illegal links | a chain that is legal but dull |
| C | prose where a schedule belongs | a prompt the model simply ignores |
| D | structural defects, cheaply, before payment | whether the *rendered* picture is beautiful |
| preview | unreadable beats, wrong scale, dead frames | whether the beat serves the film |
| E | nothing — it spends money | anything the gate approved |
| F | everything else, expensively | — |
