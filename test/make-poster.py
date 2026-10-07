#!/usr/bin/env python3
"""
Generate the repository's hero poster and social card.

The ASCII artwork is produced by the plugin's own deterministic engine (via
`node src/cli.js svg`), then composed into a designed poster with Pillow. The
poster therefore shows real engine output, not an illustration of it.
"""
import os
import re
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
TMP = os.path.join(ROOT, ".poster-tmp")
os.makedirs(ASSETS, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

W, H = 2400, 1260
BG = (5, 5, 6)
PANEL = (13, 14, 16)
PANEL2 = (18, 20, 23)
BORDER = (38, 42, 47)
TEXT = (242, 244, 245)
MUTED = (138, 145, 152)
GREEN = (125, 255, 74)
BLUE = (62, 166, 255)
RED = (255, 47, 69)

SANS_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
]
MONO_CANDIDATES = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
    "/Library/Fonts/Courier New.ttf",
]
MONO_SYSTEM = [
    "/System/Library/Fonts/SFNSMono.ttf",
    "/System/Library/Fonts/Supplemental/Andale Mono.ttf",
]


def load(candidates, size, index=0):
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size, index=index)
            except Exception:
                continue
    print(f"  ! no font from {candidates[:2]} — using default", file=sys.stderr)
    return ImageFont.load_default()


def run_engine(brief, out_svg, t, cols=132, rows=34, beats=5):
    """Render one real frame with the plugin's own engine."""
    node = subprocess.run(
        ["node", "src/cli.js", "svg", brief,
         "--t", str(t), "--cols", str(cols), "--rows", str(rows),
         "--beats", str(beats), "--cellW", "1", "--cellH", "2",
         "--out", out_svg],
        cwd=ROOT, capture_output=True, text=True,
    )
    if node.returncode != 0:
        raise SystemExit(f"engine failed: {node.stderr}")
    return out_svg


def svg_to_image(svg_path, scale=2.0):
    """Unused placeholder retained for API stability; see engine_png()."""
    raise NotImplementedError


def engine_png(brief, out_png, t, cols=132, rows=34, beats=5, cell_w=7, cell_h=13):
    """Render one real frame with the plugin's own engine, straight to PNG."""
    node = subprocess.run(
        ["node", "src/cli.js", "png", brief,
         "--t", str(t), "--cols", str(cols), "--rows", str(rows),
         "--beats", str(beats), "--cellW", str(cell_w), "--cellH", str(cell_h),
         "--out", out_png],
        cwd=ROOT, capture_output=True, text=True,
    )
    if node.returncode != 0:
        raise SystemExit(f"engine failed: {node.stderr}")
    return out_png


def hexrgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    n = int(h[:6], 16)
    return (n >> 16 & 255, n >> 8 & 255, n & 255)


def apply_opacity(rgb, alpha):
    return tuple(int(BG[i] + (rgb[i] - BG[i]) * alpha) for i in range(3))


def rrect(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def main():
    print("rendering engine frame…")
    frame_png = os.path.join(TMP, "frame.png")
    engine_png(
        "ASCII tunnel, characters as physical space, phosphor green, high impact",
        frame_png, t=0.45, cols=170, rows=40, cell_w=7, cell_h=13, beats=3,
    )
    art = Image.open(frame_png).convert("RGB")
    print(f"  art {art.size}")

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # faint vertical gradient wash
    for y in range(H):
        a = int(10 * (1 - y / H))
        if a > 0:
            d.line([(0, y), (W, y)], fill=(BG[0] + a, BG[1] + a, BG[2] + a))

    f_display = load(SANS_CANDIDATES, 104, index=0)
    f_sub = load(SANS_CANDIDATES, 30, index=0)
    f_small = load(SANS_CANDIDATES, 25, index=0)
    f_mono = load(MONO_CANDIDATES, 30, index=0)
    f_mono_s = load(MONO_CANDIDATES, 24, index=0)
    f_mono_tag = load(MONO_CANDIDATES, 26, index=0)
    f_label = load(SANS_CANDIDATES, 20, index=0)

    M = 96

    # ── app icon: concentric dashed rings + cursor
    ix, iy, isz = M, 72, 104
    rrect(d, [ix, iy, ix + isz, iy + isz], 22, fill=PANEL2, outline=BORDER, width=2)
    cx, cy = ix + isz // 2, iy + isz // 2 - 4
    for r, col, dash in ((34, GREEN, 8), (25, BLUE, 7), (16, RED, 6)):
        draw_dashed_circle(d, cx, cy, r, col, dash, 2)
    d.rectangle([cx - 5, cy - 7, cx + 5, cy + 9], fill=RED)

    # ── wordmark
    wx = ix + isz + 34
    d.text((wx, iy - 10), "ASCII H3", font=f_display, fill=TEXT)
    adv = d.textlength("ASCII H3 ", font=f_display)
    d.text((wx + adv, iy - 10), "DIRECTOR", font=f_display, fill=GREEN)
    d.text(
        (wx + 4, iy + 106),
        "Motion-grammar direction for ASCII and kinetic typography  ·  MiniMax H3",
        font=f_sub, fill=MUTED,
    )

    # ── version + stack badges, right aligned
    badges = [("v3.0.0", GREEN), ("zero deps", BLUE), ("dsh-plugin", RED)]
    bx = W - M
    for label, col in reversed(badges):
        tw = d.textlength(label, font=f_mono_s)
        pad = 18
        box_w = tw + pad * 2
        bx -= box_w + 10
        rrect(d, [bx, iy + 104, bx + box_w, iy + 148], 22, fill=PANEL2, outline=col, width=2)
        d.text((bx + pad, iy + 114), label, font=f_mono_s, fill=col)

    # ── the ASCII frame panel
    py = 268
    pnl_h = 440
    rrect(d, [M, py, W - M, py + pnl_h], 18, fill=PANEL, outline=BORDER, width=2)

    d.text((M + 28, py + 20), "LIVE ENGINE OUTPUT", font=f_label, fill=GREEN)
    d.text(
        (M + 28 + d.textlength("LIVE ENGINE OUTPUT  ", font=f_label), py + 19),
        "deterministic · no API key · byte-reproducible",
        font=f_mono_s, fill=MUTED,
    )

    art_area = (M + 26, py + 62, W - M - 26, py + pnl_h - 26)
    fitted = art.resize(
        (art_area[2] - art_area[0], art_area[3] - art_area[1]), Image.LANCZOS
    )
    img.paste(fitted, (art_area[0], art_area[1]))
    d.rectangle(art_area, outline=BORDER, width=1)

    # ── transformation chain strip
    sy = py + pnl_h + 44
    d.text((M, sy), "TRANSFORMATION  CHAIN", font=f_label, fill=MUTED)

    steps = [
        ("01", "assemble", "0–3s", "solid-form", GREEN),
        ("02", "type-wall", "3–6s", "fragments", BLUE),
        ("03", "shockwave", "6–9s", "space", GREEN),
        ("04", "tunnel", "9–12s", "space", BLUE),
        ("05", "glyph-sphere", "12–15s", "solid-form", GREEN),
    ]
    card_w = (W - 2 * M - 4 * 26) // 5
    card_h = 158
    cy0 = sy + 40
    for i, (num, name, beat, emits, col) in enumerate(steps):
        x0 = M + i * (card_w + 26)
        rrect(d, [x0, cy0, x0 + card_w, cy0 + card_h], 14, fill=PANEL2, outline=BORDER, width=2)
        d.rectangle([x0, cy0, x0 + 4, cy0 + card_h], fill=col)
        d.text((x0 + 22, cy0 + 18), num, font=f_mono_s, fill=col)
        d.text((x0 + 22, cy0 + 52), name, font=f_mono, fill=TEXT)
        d.text((x0 + 22, cy0 + 96), beat, font=f_mono_s, fill=MUTED)
        d.text((x0 + 22, cy0 + 128), f"emits {emits}", font=f_mono_s, fill=MUTED)
        if i < len(steps) - 1:
            ax = x0 + card_w + 6
            ay = cy0 + card_h // 2
            d.line([(ax, ay), (ax + 14, ay)], fill=BORDER, width=3)
            d.polygon([(ax + 14, ay - 6), (ax + 14, ay + 6), (ax + 21, ay)], fill=BORDER)

    # ── footer: gate pill + installed-as pills
    fy = cy0 + card_h + 38
    rrect(d, [M, fy, M + 330, fy + 58], 29, fill=(14, 40, 26), outline=(62, 207, 142), width=2)
    d.text((M + 26, fy + 13), "QUALITY GATE", font=f_label, fill=(62, 207, 142))
    d.text(
        (M + 26 + d.textlength("QUALITY GATE  ", font=f_label), fy + 10),
        "100 / 100  PASS", font=f_mono, fill=(120, 240, 180),
    )

    pills = [("dsh plugin add @yankafei/ascii-h3-director", BLUE),
             ("~/.agents/skills/ascii-h3-director", GREEN)]
    px = M + 360
    for label, col in pills:
        tw = d.textlength(label, font=f_mono_s)
        rrect(d, [px, fy + 6, px + tw + 40, fy + 52], 23, fill=PANEL2, outline=BORDER, width=2)
        d.text((px + 20, fy + 15), label, font=f_mono_s, fill=col)
        px += tw + 56

    # ── corner registration marks: the engine's gridded feel
    for (mx, my) in ((M - 26, py - 26), (W - M + 26, py - 26),
                     (M - 26, cy0 + card_h + 26), (W - M + 26, cy0 + card_h + 26)):
        d.line([(mx - 9, my), (mx + 9, my)], fill=BORDER, width=2)
        d.line([(mx, my - 9), (mx, my + 9)], fill=BORDER, width=2)

    out = os.path.join(ASSETS, "hero.png")
    img.save(out, optimize=True)
    print(f"wrote {out} ({W}×{H}, {os.path.getsize(out)} bytes)")

    # ── social card, same language, 1200×630
    social = img.resize((1200, 630), Image.LANCZOS)
    out2 = os.path.join(ASSETS, "social-card.png")
    social.save(out2, optimize=True)
    print(f"wrote {out2} ({os.path.getsize(out2)} bytes)")


def draw_dashed_circle(d, cx, cy, r, color, dash, width):
    import math
    steps = 240
    on = True
    count = 0
    for i in range(steps + 1):
        a0 = 2 * math.pi * i / steps
        a1 = 2 * math.pi * (i + 1) / steps
        if on:
            d.line(
                [(cx + r * math.cos(a0), cy + r * math.sin(a0)),
                 (cx + r * math.cos(a1), cy + r * math.sin(a1))],
                fill=color, width=width,
            )
        count += 1
        if count >= dash:
            count = 0
            on = not on


if __name__ == "__main__":
    main()
