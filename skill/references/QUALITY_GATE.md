# Quality Gate

The seven questions a director must be able to answer **yes** to before paying
for a generation. The gate lives in `review()` in `src/director.js`, and it is
what lets this project run as a contract instead of as a matter of taste.

```bash
node src/cli.js review "<brief>"          # human-readable, with the prompt
node src/cli.js review "<brief>" --json   # { pass, score, checks[] }
node src/cli.js plan   "<brief>"          # chain + exit states + gate in one call
```

`review()` returns `{ pass, score, checks }`. `score` is
`round(passed / 7 × 100)` — every check is worth the same — and `pass` is true
only when **all seven** pass. A 100/100 is not a compliment; it is the minimum
price of admission.

| # | id | question |
| --- | --- | --- |
| 1 | `single-chain` | Is there one legible transformation chain? |
| 2 | `source-state` | Does the first shot have a clear source state? |
| 3 | `physical-cause` | Does every transition have a physical cause? |
| 4 | `contrast` | Are there at least 2 strong scale/density contrasts? |
| 5 | `exit-state` | Is the final state usable as the next clip's input? |
| 6 | `no-cliche` | Are the generic HUD / cyberpunk / glitch clichés excluded? |
| 7 | `compact` | Is the prompt compact — written for time, not prose? |

---

## The doctrine: fix, do not decorate

Every check is a statement about **structure**. There is no check that can be
satisfied by better adjectives, because adjectives are not what goes wrong.

When a check fails, the only permitted repairs are structural:

1. change the **transformation chain** (swap a mechanism, reorder the beats);
2. change the **scale contrast** (add or remove a microscopic↔gigantic event);
3. change the **density curve** (move the peaks, change the mode);
4. change the **camera vector** (punch-through, dive, fold, drain);
5. change the **hero object** (what the type is doing, not what it says);
6. change the **end state** (leave a different action unresolved).

Adding "beautifully", "dynamically" or "with stunning detail" changes nothing any
check measures, and it moves check 7 closer to failing. `review()` prints the
doctrine itself when the gate fails:

```
Fix, do not decorate: change the transformation chain, the scale contrast,
the density curve, the camera vector, the hero object, or the end state.
```

---

## 1. `single-chain` — one legible transformation chain

**What it means.** The clip is summarisable as one arrow line of mechanisms, and
that line has at least **3 beats**. The detail line prints the chain itself:
`5 beat(s): assemble → type-wall → shockwave → tunnel → glyph-sphere`. An empty
chain reports `0 beat(s): none`.

**Why it exists.** *If a 15-second prompt cannot be summarised as one
transformation chain, it is too diffuse.* A two-beat clip has no room for a
contrast inversion, and a clip with no stated chain is a mood board. Three beats
is the smallest structure that can hold a beginning, a transformation and an
unresolved end.

**How to detect a failure by eye.** Watch once at 4× and try to say what happens
in one sentence with arrows. If the sentence needs "and also", or if two adjacent
segments could be swapped without anyone noticing, the chain is not legible.

**The repair.** Choose the 3–7 states that are genuinely distinct and delete the
rest. Five 3-second beats is the default for a reason. If one beat is carrying
two ideas, split it and shorten the others — do not add a sixth beat to a
15-second clip without taking the time from somewhere.

> Worth knowing: `planChain({ count: n })` is bounded by the grammar. Past nine
> distinct mechanisms it returns a **shorter** chain rather than repeating one,
> because a repeat reads as a stall and the check counts beats, not intentions.

## 2. `source-state` — the first shot has a clear source state

**What it means.** `chain.length > 0`. The clip opens on a named mechanism, so
the audience has something concrete to watch transform:
`opens on "assemble"`.

**Why it exists.** The most common failure in a generated clip is a first second
that is still "arriving" — a drift-in, a fade, a title card. A source state is the
physical precondition of the whole chain: if you cannot say what exists before
the first transformation, the first transformation has nothing to act on.

**How to detect a failure by eye.** Pause on frame 1. Can you name what is on
screen and what it is made of? If the honest answer is "some motion" or "the logo
coming in", the opening is undirected.

**The repair.** Choose the opening mechanism deliberately and let the brief say
so. `boot-signal` opens on almost nothing and builds a mark; `assemble` opens on a
loose field that converges; `tunnel` opens already inside a volume. The choice is
a statement about where the audience starts, not about visual density.

## 3. `physical-cause` — every transition has a physical cause

**What it means.** For every adjacent pair, either the predecessor declares the
successor in `chainsTo`, **or** the predecessor's emitted form admits the
successor in `FORM_SUCCESSORS`. Otherwise the pair is reported:
`weak links: implosion → density-dissolve`. An id that is not in the grammar at
all is reported as `unknown id`.

**Why it exists.** This is the difference between a transformation and a hard
cut. A transition with a cause means the camera or the material *arrived* there; a
transition without one is two unrelated shots spliced together, which is exactly
what this visual language forbids. It is also the check that catches a model
inventing its own connective tissue.

**How to detect a failure by eye.** Play the transition at 0.25× and ask what
physical event caused it. "The camera punched through the wall and the shards
became the sphere" is a cause. A wipe, a crossfade, a shake, or "it just changed"
is not.

**The repair.** Re-route through the grammar. `implosion` emits `void`, which
admits `boot-signal`, `assemble`, `cursor-vortex` and `tunnel` — so
`implosion → tunnel` is legal where `implosion → density-dissolve` is not. If you
genuinely need the illegal pair, insert the missing intermediate beat. See
`MOTION_GRAMMAR.md` §4 for the full table; note that a cliché has exactly one way
back into the grammar, `boot-signal`.

## 4. `contrast` — at least 2 strong scale/density contrasts

**What it means.** `densityCurve({ duration, mode })` is sampled and the number
of major directional swings above a 0.45 amplitude is counted:
`density spans 0.12–0.94 with 9 major swing(s)`. Two or more swings pass.

**Why it exists.** *Constant complexity is the enemy.* A clip that is dense from
start to finish has no peaks, because a peak needs a valley. The contrast check is
the mechanical enforcement of the rhythm grammar — minimal → dense → huge →
compressed → void — and it is what turns a technically correct chain into
something with a pulse.

**How to detect a failure by eye.** Watch with the sound off and notice when you
look away. If nothing makes you re-focus — no sudden emptiness, no scale
inversion, no impact — there are no peaks. A contact sheet makes it obvious:

```bash
node src/cli.js strip "<brief>" --frames 6 --out sheet.png
```

Look for two frames that are dramatically emptier and fuller than their
neighbours.

**The repair.** In `high-impact` mode the curve is derived from the duration,
with a major perceptual change roughly every 2–3 seconds (`everySeconds`
defaults to 3). So the fix is either to move the peaks — reorder the chain so a
compression lands next to a release — or to stop suppressing the contrast
(`--mode high-impact` rather than `minimal-data`). Do not try to fix it by adding
detail inside a beat; peaks are made by taking things away.

> Worth knowing: this check depends only on `duration` and `mode`, not on the
> chain. With the default `high-impact` mode it passes with 9 swings at any
> duration. It fails under `minimal-data`, or on a script built with a much
> longer duration. It is a guard rail, not a substitute for looking at the sheet.

## 5. `exit-state` — Final state is usable as the next clip’s input

**What it means.** The last link declares a non-empty `exit.unresolved`, **or**
the prompt matches `/mid-|unresolved|continues/i`:
`ends unresolved: the orbits are still converging on the focal mark`. An empty
string is not a declared exit state — the check tests truthiness, not presence.

**Why it exists.** *The ending state is the deliverable.* A clip that resolves
completely is a dead end: there is nothing left to inherit, so a sequel has to
restart, so the seam breaks. Every mechanism carries its own unresolved sentence
(`MOTION_GRAMMAR.md` §2), which is why a planned chain passes this check for free
and a hand-written chain usually does not.

**How to detect a failure by eye.** Look at the last 12 frames. Is something
still *in progress* — mid-dive, mid-fold, mid-convergence? Or has the image
settled into a finished composition, held, and faded? The second is a complete
thought with nowhere to go.

**The repair.** End on a mechanism that leaves motion on the table: `tunnel`,
`type-wall`, `implosion`, `cursor-vortex`, `glyph-sphere`, `giant-word`. If the
ending is already right but the prompt does not say so, the fix is to say it —
`The clip ends mid-dive into the cursor.` Fixing the sentence is legitimate here
precisely because the check asks whether the state is *declared*, and the declared
state is what the continuation will be planned from.

## 6. `no-cliche` — the rejected vocabulary is absent

**What it means.** The **positive** half of the prompt — everything before the
first `RULE:` — is searched for the names of the five rejected mechanisms: `hud`,
`city`, `glitch`, `particles`, `smoke`. Any hit fails:
`found in the positive prompt: city`.

**Why it exists.** This visual language is brutalist computational motion design,
not neon-city science fiction. The failure mode is specific and predictable: a
generator with nothing physical to draw reaches for skyline, HUD chrome, random
glitch and floating particles. The reject tier exists so the diagnosis has a name;
this check is where the name is used. The `RULE:` line is exempt because a
negative instruction is allowed to name what it forbids — that is exactly what
`ruleLine()` assembles.

**How to detect a failure by eye.** Look for anything on screen that is neither
made of characters nor caused by the chain: a skyline, a fake readout, a scanline
wipe, dust motes with no source. Then look for anything that *is* made of
characters but is decorative — a HUD drawn in glyphs is still a HUD.

**The repair.** Replace the cliché with the mechanism it was standing in for. A
neon skyline is usually a failed attempt at `structural-decay` (an environment
lost in stages). A HUD is usually a failed `mask` or `field`. Floating particles
are usually a failed `density-dissolve`. If the brief itself demands the cliché,
the brief and the language disagree, and the cliché belongs in the `RULE:` line,
not in the positive prompt.

## 7. `compact` — the prompt is written for time, not prose

**What it means.** The prompt is at most **320 words**. A prompt with no text yet
is not penalised, and reports `no prompt composed yet`. The detail line otherwise
prints the count: `143 words` or `381 words`.

**Why it exists — the prototype lesson.** The first continuation prompt this
project produced ran long, and it was **explicitly rejected by the user**. It had
stopped being a timeline and become an essay: nested clauses, restated adjectives,
several near-identical descriptions of the same transformation. H3 is a video
model: its prompt is a *schedule*, and a schedule buried under 600 words of prose
has no readable timing. The fix that worked was to force the shape — **five time
blocks plus one `STYLE` line and one `RULE` line** — and cap it. The ceiling is
generous (320 words against a real-world prompt of 140–160) because it exists to
catch the failure mode, not to make writers count.

**How to detect a failure by eye.** Count the colons. A prompt written for time
is mostly `0–3s:`, `3–6s:`, … A prompt written as prose is a paragraph. Then read
it aloud: if you cannot say where the 6-second mark is, the model cannot either.

**The repair.** Delete, do not rewrite. Each beat gets **one sentence naming a
physical cause**; the final beat may add its unresolved state. Anything that is
not a transformation becomes a noun phrase in the `STYLE:` line, or disappears.
The composer already does this: `composePrompt` emits one line per link from the
mechanism's own `action`, and suppresses a final beat whose exit sentence merely
restates its own action.

---

## A worked example: a failing plan and its repair

Both runs below are real CLI output.

### The failure

A two-beat plan. Everything except the chain length is healthy — which is the
point: a gate failure rarely looks like a disaster.

```bash
node src/cli.js plan "ascii film about a collapsing star" --beats 2 --seed fail
```

```
QUALITY GATE  FAIL  (86/100)
────────────────────────────────────────────────────────────────
  ✖ One legible transformation chain
      2 beat(s): assemble → type-wall
  ✔ First shot has a clear source state
      opens on "assemble"
  ✔ Every transition has a physical cause
      all links follow the mechanism grammar
  ✔ At least 2 strong scale/density contrasts
      density spans 0.12–0.94 with 9 major swing(s)
  ✔ Final state is usable as the next clip's input
      ends unresolved: the camera is still punching through the last wall
  ✔ Generic HUD / cyberpunk / random glitch excluded
      no rejected vocabulary in the positive prompt
  ✔ Prompt stays compact (written for time, not prose)
      89 words

Fix, do not decorate: change the transformation chain, the scale contrast,
the density curve, the camera vector, the hero object, or the end state.
```

The diagnosis is exact: six of seven checks pass, and the one that fails says
`2 beat(s)`. Note what a bad repair would look like — adding "an epic, sweeping
transformation" to the prompt. It would change no check, and it would move the
prompt closer to failing check 7. Only the six structural repairs are permitted.

### The repair

Add structure, not words: five beats over the same 15 seconds.

```bash
node src/cli.js plan "ascii film about a collapsing star" --seed fail
```

```
   1. 0–3s       Assemble from Sparse Field  [canonical]
      characters converge along their own velocity vectors until a solid form snaps into legibility
      exit → form=solid-form camera=forward-punch-through v=1
   2. 3–6s       Typographic Wall  [strong]
      the camera punches through each wall without cutting; the wall shatters from the point of impact outward
      exit → form=fragments camera=forward-punch-through v=1
   3. 6–9s       Command Shockwave  [canonical]
      the release from compression travels outward as a single readable command, dragging microtype in its wake
      exit → form=space camera=forward-punch-through v=1
   4. 9–12s      ASCII Tunnel  [strong]
      the camera travels forward through the rings while they stretch into long perspective trails
      exit → form=space camera=forward-punch-through v=1
   5. 12–15s     Glyph Sphere  [strong]
      thousands of characters orbit a tiny focal mark, then all orbits converge
      exit → form=solid-form camera=forward-punch-through v=1
```

```
QUALITY GATE  PASS  (100/100)
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

### A second failure, for contrast

The same healthy five-beat chain, with the prompt padded by prose — the exact
failure the prototype hit:

```
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
  ✖ Prompt stays compact (written for time, not prose)
      381 words
```

A 381-word prompt describes a worse film than the 143-word prompt it was padded
from, because the timing has been buried. The repair is to delete the padding, not
to rebalance it.

### Reading a failing gate as a work order

| failing check | the structural change it is asking for |
| --- | --- |
| `single-chain` | fewer, clearer states (3–7), each a different mechanism |
| `source-state` | name what exists at frame 1 and make the brief open on it |
| `physical-cause` | re-route the link through `FORM_SUCCESSORS`, or insert the missing beat |
| `contrast` | put a compression next to a release; stop suppressing the curve |
| `exit-state` | end on a mechanism that is still in motion, and declare it |
| `no-cliche` | replace the cliché with the mechanism it was standing in for |
| `compact` | delete prose until each beat is one causal sentence |

---

## Using the gate from an agent

The Harness plugin exposes the same function as a tool:

```
ascii_h3_review({ brief: "…" })                          # compose, then judge
ascii_h3_review({ brief: "…", prompt: "<existing prompt>" })   # judge a prompt you have
```

Report the score and every failing check to the user, with the detail line. **Do
not proceed to a paid generation on a failing gate without saying so explicitly**
— the gate is the only thing between a direction and money, and a silent failure
makes it decorative.

## After the gate passes

Re-run the gate, then **look at the picture** before you look at the score:

```bash
node src/cli.js preview "<brief>" --t <peak> --cols 110 --rows 28
node src/cli.js strip   "<brief>" --frames 6 --out sheet.png
```

The gate can only check what it can measure, and a 100/100 plan is still capable
of being dull. The preview is free, offline and deterministic, so there is no
reason to discover a dead beat by paying for it.
