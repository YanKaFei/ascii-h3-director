# Architecture

> **The chain.** A brief becomes a transformation chain; the chain becomes a
> film spec; the film spec becomes a character grid; the character grid becomes
> a picture, a contact sheet, or a prompt that a video model will render.

```
                 brief: "15s ASCII film about memory collapsing into language, word VOID"
                   │
                   │  parseBrief()                    director.js
                   ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  ParsedBrief   duration · ratio · palette · ramp · mode ·         │
   │                heroText · keywords · cliches                      │
   └──────────────────────────────────────────────────────────────────┘
                   │
                   │  planChain()                     motion-grammar.js
                   ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Link[]        mechanism · beat · exit MotionState · description  │
   │                (the chain: assemble → type-wall → shockwave → …)  │
   └──────────────────────────────────────────────────────────────────┘
                   │
        ┌──────────┴───────────┐
        │                      │
        │ composePrompt()      │ planFilm()
        ▼                      ▼
   ┌──────────┐        ┌──────────────────────────────────────────────┐
   │  prompt  │        │  FilmSpec    shots[] · seed · palette · ramp  │
   │ 5 blocks │        │              each shot: primitives + timing   │
   │ STYLE    │        └──────────────────────────────────────────────┘
   │ RULE     │                      │
   └──────────┘                      │ compileScene()      renderer.js
        │                            ▼  (pure, seeded)
        │                  ┌──────────────────────────┐
        │                  │  Primitive[]  pts · meta  │
        │                  └──────────────────────────┘
        │                            │
        │                            │ evaluateFrame()
        │                            │ project → accumulate mass → quantise
        │                            ▼
        │                  ┌──────────────────────────┐
        │                  │  Grid   cols×rows         │
        │                  │  code + ink + depth       │
        │                  └──────────────────────────┘
        │                            │
        │              ┌─────────────┼─────────────┐
        │              ▼             ▼             ▼
        │         gridToText()  gridToSvg()   gridToRgb()
        │              │             │             │
        │              ▼             ▼             ▼
        │          terminal      .svg file     encodePng()
        │                                      .png file
        ▼
   review()  →  quality gate (7 checks, 0–100)
        │
        ▼
   provider contract  →  MiniMax H3 (the only paid, network stage)
```

## Module responsibilities

| Module | Owns | Purity |
|---|---|---|
| `core.js` | seeded RNG, vector math, easing, value noise, ramp and palette tables | pure |
| `glyph-atlas.js` | the 5×9 hand-authored bitmap font for 0x20–0x7E; the **only** module allowed to choose a character for shading | pure |
| `motion-grammar.js` | mechanisms, tiers, `FORM_SUCCESSORS`, camera grammar, the continuity contract (`entryState`/`exitState`/`inherit`/`checkSeam`), `planChain`, `densityCurve` | pure |
| `director.js` | brief parsing, chain → prompt composition, the 7-check quality gate, reference analysis, continuation planning | pure |
| `renderer.js` | `Grid`, `Camera`, primitive builders, `compileScene`, `evaluateFrame`, `planFilm`, `renderFilmFrame`, `stampText` | seeded / pure |
| `raster.js` | grid → SVG, grid → RGB, grid → text | pure |
| `png.js` | dependency-free PNG encoder (8-bit RGB, zlib deflate) | pure |
| `cli.js` | the command surface; file I/O and `process.exit` live only here | impure at the edge |
| `index.js` | the Cordis Host plugin: 7 agent tools + one system-prompt section | impure at the edge |
| `client.js` | the Cordis Client plugin: the Director Console page and sidebar entry | browser only |

## Design invariants

1. **ASCII only.** Every mark the renderer produces is a code point in
   `0x20–0x7E`. The glyph atlas is a fixed table, not a parsed font, so output is
   stable across machines, Node versions and platforms.
2. **Deterministic.** No `Math.random`, no wall-clock reads, no environment
   reads anywhere in the plan → render path. Every stochastic process is seeded.
   Re-rendering the same film produces byte-identical PNG and SVG files; this is
   asserted in `test/engine.test.js`.
3. **One chooser.** `pickGlyph()` in `glyph-atlas.js` is the only function that
   may select a character for shading. Nothing else invents a glyph, so a ramp
   change is a one-line change with global effect.
4. **Mass, not nearest-neighbour.** `evaluateFrame` accumulates point mass per
   cell and then quantises it into a character. Picking a glyph from the nearest
   point's brightness makes every dense field saturate to `@`; accumulating mass
   is what lets a tunnel read as rings and a sphere read as a sphere.
5. **Framing is distance, not focal length.** The camera's `focal` stays at 1.0
   and `focusDistance` controls framing. Folding distance into focal
   double-counts it and yields a film that looks plausible but is subtly wrong.
6. **The chain is the source of truth.** Aesthetics live in
   `motion-grammar.js`; `renderer.js` only knows how to *realise* a mechanism, and
   `director.js` only knows how to *describe* one. Adding a new look means adding
   a mechanism and a scene builder, not editing the renderer.
7. **Generation is gated.** `composePrompt` output is the single input to the
   paid stage, and the quality gate runs on the same script object. An agent
   cannot spend quota on a plan that fails the gate without explicitly
   overriding it.

## Why the engine exists at all

The provider renders the film. The engine's job is to make the *decision*
inspectable before money is spent:

- **Direction is separable from rendering.** A chain, its motion states and its
  gate result are data. They can be reviewed, diffed and versioned.
- **A preview needs no provider.** `preview`, `svg`, `png` and `strip` are
  offline. A director can see the beat before authoring the prompt.
- **Continuity is checkable.** `checkSeam(prevExit, nextEntry)` returns concrete
  violations — a camera reset, a palette jump, a velocity sign flip — instead of
  a vibe.
- **Prompts are auditable.** Prompt shape, gate outcome and exit state all come
  from one object, so an agent's reasoning is reproducible from the session log.

## Extension points

**Add a mechanism.** Four edits: an entry in `MECHANISMS`, its outgoing form in
`FORM_SUCCESSORS`, a scene builder in `MECHANISM_SCENES`, and a camera move in
`cameraFor`. The chain planner, the gate and the prompt writer pick it up with no
further changes.

**Add a palette or ramp.** One entry in `PALETTES` or `RAMPS` in `core.js`, plus
the matching background in the Host plugin's `paletteBg()` table.

**Add a primitive.** One builder in `PRIMITIVE_BUILDERS` in `renderer.js`. A
builder receives a seeded `rand` and must return `{ pts, meta, count }`; it must
not mutate anything else.

**Add a provider.** The chain, the gate and the previews are
provider-independent. Only the final call changes — see
`skill/references/GENERATION.md`.

## Verification

```bash
node src/cli.js doctor          # engine self-check + a real render smoke test
node test/engine.test.js        # determinism and invariants
```

`doctor` renders a frame and asserts it produced cells, so a broken renderer
cannot report healthy.

## Two Harness facts worth writing down

Both were discovered by installing the plugin into a live profile, and both are
easy to get wrong.

### 1. A plugin that exports no `Config` is treated as though it *were* one

Cordis resolves a row's config with:

```js
function resolveConfig(runtime, config) {
  if (!runtime.Config) return config;            // no schema → pass raw config through
  const result = runtime.Config['~standard'].validate(config);   // Standard Schema v1
  ...
}
```

If the plugin exports no `Config`, the guard returns the **raw config object**
unchanged — and if that object came from the row's `config:` block, it is then
mistaken for a schema. The next consumer reads `config['~standard']` and throws
`Cannot read properties of undefined (reading 'validate')`.

The fix is to give the row no `config` block at all while the plugin exports no
`Config`. That is what `cordis.patch.yml` does here: every setting is optional
and defaulted, so the correct minimal row is `{id, name}`.

### 2. The `~standard` vendor must be `schemastery` for the Loader to see a schema

`cordis-plugin-loader` decides whether it understands a config schema with:

```js
function isSchemastery(schema) {
  return schema?.['~standard'].vendor === 'schemastery';
}
```

A schema declaring any other vendor is compared **raw** rather than field-by-field,
which only matters for schemas that declare volatile fields. This plugin
deliberately declares none, so it publishes its own vendor name and accepts raw
comparison. Consequently the tool config schema is exported as `configSchema`
rather than `Config`: `Config` would re-enter the path in fact 1.

### 3. The Client half is not a loader row

The Client page is discovered from the package manifest
(`dsh.client.platform: web` plus the `./client` export) and loaded into the Web
page. Adding a second `insert` row for `'<package>/client'` makes the Loader try
to import a browser module in Node, which fails. One Host row is the whole patch.
