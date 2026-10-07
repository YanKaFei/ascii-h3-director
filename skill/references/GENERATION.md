# Generation — the provider contract

Generation is the **only** stage in this workflow that costs money and touches
the network. Everything before it — reference analysis, chain planning, prompt
composition, the quality gate, and every preview — is offline and free.

## The rule that matters most

**Verify the provider's flags before you run them.**

```bash
mmx video generate --help
```

Provider CLIs change. A flag documented here may be renamed. The pipeline this
plugin owns is the chain and the gate; the final call belongs to the provider, and
the provider's own `--help` is the authority. Never guess a flag and never invent
a prompt schema.

## The official path

```bash
npm install -g mmx-cli
mmx auth login --api-key YOUR_KEY          # or: export MINIMAX_API_KEY=...
```

Then, from a gated prompt:

```bash
./scripts/generate.sh prompt.txt out.mp4 15 21:9
```

`generate.sh`:

- refuses to run without a prompt file;
- refuses to run without the provider CLI, and prints the install command instead
  of installing anything itself;
- never reads a credential from an unexpected location;
- prints the model, duration, ratio and output path before calling out.

## The model argument

The model must be `MiniMax-H3`. Pass it explicitly:

```bash
mmx video generate --model MiniMax-H3 --prompt "…" --duration 15 --ratio 21:9 --download out.mp4
```

## Prompt syntax

Use the official H3 prompt-writing skill rather than an invented schema:

```bash
npx skills add https://github.com/MiniMax-AI/MiniMax-H3 --skill h3-prompt-writing
```

That skill owns H3-native structure and multimodal mode selection. This plugin
owns the *director logic* that fills the fields: the transformation chain, the
inheritance rules and the gate. When the official schema asks for structured
fields, supply them from the chain instead of rewriting the prompt as prose.

## Continuation

Continuation passes the predecessor's extracted last frame as the image input, so
the model starts from the exact final visual state:

```bash
./scripts/continue.sh exit-state.json next-prompt.txt part2.mp4 15 21:9
```

The script extracts the last frame, then sends it alongside the prompt. Produce
`exit-state.json` from a plan:

```bash
ascii-h3 plan "<brief>" --json > plan.json
python3 -c "import json;print(json.dumps(json.load(open('plan.json'))['chain'][-1]['exit']))" > exit-state.json
```

`skill/examples/exit-state.json` is a working example.

## Ratio

`21:9` is the conservative default for the CLI: it suits the brutalist,
architectural framing this grammar prefers and leaves room for cropped
typography. Use `adaptive` when a reference asset should drive the frame shape
instead.

## Adapters — swapping providers

The chain, the gate and the previews are **provider-independent**. Only the last
call changes. To target another video service:

1. Keep stages A–D exactly as they are. The prompt and the gate are the valuable
   part and they do not mention a vendor.
2. Write one adapter that takes `(promptText, duration, ratio, imagePath?)` and
   returns a downloaded file path.
3. Wire it into `scripts/generate.sh`, or call it from your own script and leave
   `generate.sh` alone.
4. Update the model identifier in the adapter, not in the prompt.

Because `exit_state` and the seam checks are data, a sequence generated across two
different providers still holds together as long as each adapter receives the
previous clip's last frame and the inherited entry state.

## Cost discipline

- One 15-second generation is one paid call. Plan the whole sequence first.
- Gate every clip. A failed gate is a free failure; a failed generation is not.
- Render the beat offline before paying for it:

```bash
ascii-h3 preview "<brief>" --t 9 --cols 110 --rows 28
ascii-h3 strip   "<brief>" --frames 6 --out sheet.png
```

- Generate in order. A continuation cannot be planned until its predecessor's
  exit state exists.
