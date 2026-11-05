# ASCII H3 Director

**Turn a thought into a transforming chain of characters.**

ASCII H3 Director is a director tool for **MiniMax H3**: it compiles a free description into a transformation chain, a compact prompt written for time rather than prose, and a quality gate that can stop you before you pay. It is both a **DeepSeek Harness (DSH) plugin** and a portable **Agent Skill**.

[中文](README.md) · **English** · [한국어](README.ko.md) · [日本語](README.ja.md) · [Français](README.fr.md)

## What it does

- 21-mechanism motion grammar
- deterministic ASCII preview engine (5×9 bitmap font, zero runtime dependencies)
- seam-checked continuation from the previous last frame
- Director Console for DSH
- 7-point quality gate before generation

## Install

```bash
dsh plugin --profile web add @yankafei/ascii-h3-director
```

Or use the portable `SKILL.md` in a compatible agent environment.

## Use

Describe a shot, a transformation, or a sequence. The skill returns a FilmSpec, a prompt package and a preview plan. It does **not** call a video model by itself and never claims an image/video was generated.

## Links

- [中文 README](README.md)
- [한국어](README.ko.md)
- [日本語](README.ja.md)
- [Français](README.fr.md)

## Licence

MIT. See [LICENSE](LICENSE).
