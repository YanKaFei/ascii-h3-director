#!/usr/bin/env python3
"""
make-console-mockup.py — draws high-fidelity UI mockups of the
"ASCII H3 Director — Director Console" panel as PNGs, using Pillow only
(no browser, no headless Chrome).

Renders a 1600x1000 panel at 2x (3200x2000) and downscales with LANCZOS.

Outputs (into ../assets):
    console-dark.png    dark theme   (the canonical shot)
    console-light.png   light theme
    console.png         copy of the dark theme

Run:  python3 test/make-console-mockup.py
"""

from __future__ import annotations

import math
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --------------------------------------------------------------------------
# canvas / geometry constants (all in logical px, scaled by SS when drawing)
# --------------------------------------------------------------------------
SS = 2                      # supersample factor
W, H = 1600, 1000           # final logical size

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))

GUT = 24                    # page gutter
HEADER_H = 86               # header band height
BODY_TOP = HEADER_H + 22    # 108
COL_GAP = 20
ROW_GAP = 20
BOT = 24
LEFT_W = 820
RIGHT_W = W - 2 * GUT - COL_GAP - LEFT_W          # 712
PAD = 20                    # card inner padding
CARD_R = 12
CTRL_R = 8

LBL_H = 14                  # small uppercase section label row
CHK_ROW = 21
CHK_GAP = 7
MS_ROW = 22
MS_GAP = 6
TXT_H = 84
CTRL_BEATS = 44
CTRL_ROW = 56
CHAIN_MIN = 122
PREVIEW_MIN = 306

# --------------------------------------------------------------------------
# colour helpers
# --------------------------------------------------------------------------


def hx(s: str):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def mix(c1, c2, t: float):
    a = hx(c1) if isinstance(c1, str) else c1
    b = hx(c2) if isinstance(c2, str) else c2
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


THEMES = {
    "dark": dict(
        dark=True,
        app="#141517", card="#1c1e21", surface="#232629", border="#33373b",
        text="#f2f4f5", text2="#9aa0a6", brand="#7dff4a", success="#3ecf8e",
        track="#2c3034", hairline="#26292d",
        inset="#020604", inset_border="#143524", inset_text="#8dffb0",
        knob="#ffffff", knob_border="#0a0b0c",
        icon_bg="#0f1114", icon_border="#2c3136",
        tint_mix=0.17, success_mix=0.17,
        shadow_alpha=120, shadow_blur=9, shadow_dy=2,
        ctrl_ink="#0d1a07",
    ),
    "light": dict(
        dark=False,
        app="#fafafa", card="#ffffff", surface="#f4f5f6", border="#e2e4e7",
        text="#1a1c1e", text2="#6b7075", brand="#2f9e44", success="#218358",
        track="#e7e9eb", hairline="#eef0f2",
        inset="#020604", inset_border="#143524", inset_text="#8dffb0",
        knob="#ffffff", knob_border="#d0d4d8",
        icon_bg="#101215", icon_border="#dadde1",
        tint_mix=0.15, success_mix=0.13,
        shadow_alpha=40, shadow_blur=11, shadow_dy=3,
        ctrl_ink="#ffffff",
    ),
}


def expand(th):
    th = dict(th)
    th["brand_tint"] = mix(th["card"], th["brand"], th["tint_mix"])
    th["brand_text"] = th["brand"] if th["dark"] else mix(th["brand"], "#000000", 0.24)
    th["success_tint"] = mix(th["card"], th["success"], th["success_mix"])
    th["success_text"] = th["success"] if th["dark"] else mix(th["success"], "#000000", 0.26)
    th["inset_dim"] = mix(th["inset"], "#000000", 0.0)
    return th


# --------------------------------------------------------------------------
# fonts
# --------------------------------------------------------------------------
SANS_CANDIDATES = [
    ("/System/Library/Fonts/SFNS.ttf", 0),
    ("/System/Library/Fonts/Helvetica.ttc", 0),
    ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
    ("/Library/Fonts/Arial.ttf", 0),
]
MONO_CANDIDATES = [
    ("/System/Library/Fonts/Menlo.ttc", 0),
    ("/System/Library/Fonts/SFNSMono.ttf", 0),
    ("/System/Library/Fonts/Supplemental/Courier New.ttf", 0),
]

WARNINGS = []


class FontBook:
    """Loads a UI sans and a monospace face, with honest fallbacks."""

    def __init__(self):
        self.sans_spec = self._pick(SANS_CANDIDATES, "sans")
        self.mono_spec = self._pick(MONO_CANDIDATES, "mono")
        self._cache = {}
        self._variation_ok = {}

    def _pick(self, cands, kind):
        for path, idx in cands:
            if not os.path.exists(path):
                continue
            try:
                f = ImageFont.truetype(path, 24 * SS, index=idx)
                del f
                return (path, idx)
            except Exception as e:  # pragma: no cover
                WARNINGS.append(f"{kind}: could not load {path} ({e})")
        WARNINGS.append(
            f"{kind}: no usable TrueType face found — falling back to "
            "ImageFont.load_default() (output will look wrong)"
        )
        return None

    def _load(self, spec, size_px, weight):
        key = (spec, size_px, weight)
        if key in self._cache:
            return self._cache[key]
        if spec is None:
            f = ImageFont.load_default()
            self._cache[key] = f
            return f
        path, idx = spec
        try:
            f = ImageFont.truetype(path, size_px, index=idx)
        except Exception as e:  # pragma: no cover
            WARNINGS.append(f"fallback: {path}@{size_px} failed ({e})")
            f = ImageFont.load_default()
            self._cache[key] = f
            return f

        if weight and weight != "Regular":
            applied = False
            try:
                names = [
                    n.decode("utf-8", "ignore") if isinstance(n, bytes) else n
                    for n in f.get_variation_names()
                ]
                if weight in names:
                    f.set_variation_by_name(weight)
                    applied = True
                    self._variation_ok[path] = True
            except Exception:
                pass
            if not applied:
                # static collections: index+1 is the Bold face for Helvetica/Menlo
                try:
                    fb = ImageFont.truetype(path, size_px, index=idx + 1)
                    if weight in ("Bold", "Semibold", "Heavy", "Medium"):
                        f = fb
                        applied = True
                except Exception:
                    pass
                if not applied and path not in self._variation_ok:
                    WARNINGS.append(
                        f"weight '{weight}' unavailable for {os.path.basename(path)}; "
                        "using Regular"
                    )
                    self._variation_ok[path] = False
        self._cache[key] = f
        return f

    def sans(self, size, weight="Regular"):
        return self._load(self.sans_spec, max(6, int(round(size * SS))), weight)

    def mono(self, size, weight="Regular"):
        return self._load(self.mono_spec, max(6, int(round(size * SS))), weight)


# --------------------------------------------------------------------------
# drawing primitives (logical coords in, device coords out)
# --------------------------------------------------------------------------


def RR(d, box, r=12, fill=None, outline=None, w=1):
    x0, y0, x1, y1 = [v * SS for v in box]
    if x1 <= x0 or y1 <= y0:
        return
    r = max(0, min(r * SS, (x1 - x0) / 2, (y1 - y0) / 2))
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill, outline=outline,
                        width=max(1, int(round(w * SS))))


def CIRC(d, cx, cy, rad, fill=None, outline=None, w=1):
    d.ellipse([(cx - rad) * SS, (cy - rad) * SS, (cx + rad) * SS, (cy + rad) * SS],
              fill=fill, outline=outline, width=max(1, int(round(w * SS))))


def T(d, x, y, s, font, fill, anchor="la"):
    d.text((x * SS, y * SS), s, font=font, fill=fill, anchor=anchor)


def TW(font, s):
    return font.getlength(s) / SS


def TLS(d, x, y, s, font, fill, ls=1.2, anchor="la"):
    """Letter-spaced text (drawn glyph by glyph)."""
    cx = x * SS
    for ch in s:
        d.text((cx, y * SS), ch, font=font, fill=fill, anchor=anchor)
        cx += font.getlength(ch) + ls * SS


def TLSW(font, s, ls=1.2):
    if not s:
        return 0.0
    return (sum(font.getlength(c) for c in s) + ls * SS * (len(s) - 1)) / SS


def baseline_center(font, s, cy):
    """Baseline y so that the ink of `s` is vertically centred on cy."""
    bb = font.getbbox(s, anchor="ls")
    return cy - (bb[1] + bb[3]) / 2.0 / SS


def check_mark(d, x, y, s, color, lw=2.0):
    pts = [(x + s * 0.06, y + s * 0.52), (x + s * 0.34, y + s * 0.80),
           (x + s * 0.96, y + s * 0.10)]
    d.line([(px * SS, py * SS) for px, py in pts], fill=color,
           width=max(1, int(round(lw * SS))), joint="curve")


def chevron(d, x, y, w=5.0, h=3.0, color="#000", lw=1.5):
    pts = [(x, y - h / 2), (x + w / 2, y + h / 2), (x + w, y - h / 2)]
    d.line([(px * SS, py * SS) for px, py in pts], fill=color,
           width=max(1, int(round(lw * SS))), joint="curve")


def arrow_right(d, x0, x1, y, color, lw=1.4):
    d.line([(x0 * SS, y * SS), ((x1 - 4) * SS, y * SS)], fill=color,
           width=max(1, int(round(lw * SS))))
    d.polygon([((x1 - 4) * SS, (y - 2.6) * SS), (x1 * SS, y * SS),
               ((x1 - 4) * SS, (y + 2.6) * SS)], fill=color)


def truncate(font, s, maxw, tag=""):
    if TW(font, s) <= maxw:
        return s
    out = s
    while out and TW(font, out + "…") > maxw:
        out = out[:-1]
    WARNINGS.append(f"truncated text ({tag}): {s!r} -> {out + '…'!r}")
    return out + "…"


def wrap(font, s, maxw):
    lines, cur = [], ""
    for word in s.split(" "):
        trial = word if not cur else cur + " " + word
        if TW(font, trial) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


# --------------------------------------------------------------------------
# the ASCII tunnel art
# --------------------------------------------------------------------------


def tunnel_art(rows=14, cols=120, q=0.63, r_min=0.30, aspect=0.577,
               thick=0.13, tmin=0.5, seed=11, speck=0.009):
    """Concentric perspective rings: brackets + # * G 0 @ glyphs."""
    rnd = random.Random(seed)
    cx, cy = (cols - 1) / 2.0, (rows - 1) / 2.0
    ks = 1.0 / math.log(1.0 / q)
    cycle = ["@", "0", "G", "*", "#"]
    sec_map = {0: ")", 1: "\\", 2: "-", 3: "/", 4: "(",
               -1: "/", -2: "-", -3: "\\", -4: "("}
    grid, rad = [], []
    for y in range(rows):
        row, rrow = [], []
        for x in range(cols):
            dx = (x - cx) * aspect
            dy = y - cy
            r = math.hypot(dx, dy)
            ch = " "
            if r < r_min * 0.5:
                ch = "@"
            else:
                k = math.log(max(r, r_min) / r_min) * ks
                kf = int(round(k))
                rk = r_min * (1.0 / q) ** kf
                th_ = max(tmin, thick * r)
                if abs(r - rk) < th_ * 0.5:
                    sec = int(round(math.atan2(dy, dx) / (math.pi / 4)))
                    ch = sec_map[sec] if kf % 2 == 0 else cycle[(kf // 2) % 5]
                elif rnd.random() < speck:
                    ch = rnd.choice([".", ",", "'", ":", ";", "`"])
            row.append(ch)
            rrow.append(r)
        grid.append(row)
        rad.append(rrow)
    return grid, rad


ART_STOPS = [(0.00, (206, 255, 223)), (0.26, (141, 255, 176)),
             (0.60, (72, 152, 102)), (1.00, (30, 74, 48))]


def art_color(t):
    for i in range(len(ART_STOPS) - 1):
        a, ca = ART_STOPS[i]
        b, cb = ART_STOPS[i + 1]
        if t <= b or i == len(ART_STOPS) - 2:
            u = max(0.0, min(1.0, (t - a) / (b - a)))
            return tuple(round(ca[j] + (cb[j] - ca[j]) * u) for j in range(3))
    return ART_STOPS[-1][1]


# --------------------------------------------------------------------------
# layout
# --------------------------------------------------------------------------


def layout(fo):
    """Pure geometry: returns every rectangle the renderer needs."""
    L = {}
    L["header"] = (0, 0, W, HEADER_H)

    # ---- right column natural height ----
    qg_min = (PAD + LBL_H + 14 + 54 + 12 + 6 + 16
              + (7 * CHK_ROW + 6 * CHK_GAP) + PAD)
    ms_min = (PAD + LBL_H + 12 + (3 * MS_ROW + 2 * MS_GAP) + 8 + MS_ROW + PAD)
    right_min = qg_min + ROW_GAP + ms_min

    # ---- left column natural height ----
    controls = CTRL_BEATS + 16 + CTRL_ROW + 16 + CTRL_ROW
    left_min = (PAD + LBL_H + 10 + TXT_H + 18 + controls + 22 + LBL_H + 10
                + CHAIN_MIN + PAD)

    col_min = max(left_min, right_min)
    prev_min = PAD + LBL_H + 8 + 30 + 12 + 205 + PAD      # fits 14 ascii lines

    slack = H - (BODY_TOP + col_min + ROW_GAP + prev_min + BOT)
    if slack < 0:
        WARNINGS.append(f"layout overflows by {-slack}px; content will be cramped")
    col_extra = int(round(max(0, slack) * 0.60))
    prev_extra = max(0, slack) - col_extra

    col_h = col_min + col_extra
    prev_h = prev_min + prev_extra

    L["left"] = (GUT, BODY_TOP, GUT + LEFT_W, BODY_TOP + col_h)
    rx0 = GUT + LEFT_W + COL_GAP
    L["right_x"] = rx0
    L["right_w"] = RIGHT_W

    # right column split (extra goes mostly to the motion-state card)
    right_extra = col_h - right_min
    qg_h = qg_min + int(right_extra * 0.45)
    ms_h = col_h - ROW_GAP - qg_h
    L["qg"] = (rx0, BODY_TOP, rx0 + RIGHT_W, BODY_TOP + qg_h)
    L["ms"] = (rx0, BODY_TOP + qg_h + ROW_GAP, rx0 + RIGHT_W, BODY_TOP + col_h)

    # check rows / motion rows get the leftover breathing room
    L["qg_extra"] = max(0, qg_h - qg_min)
    L["ms_extra"] = max(0, ms_h - ms_min)

    L["preview"] = (GUT, BODY_TOP + col_h + ROW_GAP, W - GUT,
                    BODY_TOP + col_h + ROW_GAP + prev_h)
    L["preview_extra"] = max(0, prev_h - prev_min)
    L["shadow"] = [L["left"], L["qg"], L["ms"], L["preview"]]
    return L


# --------------------------------------------------------------------------
# component renderers
# --------------------------------------------------------------------------


def draw_card(d, th, box):
    RR(d, box, CARD_R, fill=th["card"], outline=th["border"], w=1)


def section_label(d, th, fo, x, y, s):
    TLS(d, x, y, s, fo.sans(10.5, "Semibold"), th["text2"], ls=1.35)
    return LBL_H


def draw_badge(d, th, fo, x, y, label, kind="neutral", h=16):
    f = fo.sans(9, "Semibold")
    tw = TLSW(f, label, 0.5)
    w = tw + 14
    if kind == "brand":
        RR(d, (x, y, x + w, y + h), h / 2, fill=th["brand_tint"],
           outline=mix(th["brand_tint"], th["brand"], 0.45), w=1)
        col = th["brand_text"]
    else:
        RR(d, (x, y, x + w, y + h), h / 2, fill=th["surface"],
           outline=th["border"], w=1)
        col = th["text2"]
    TLS(d, x + 7, y + (h - 9) / 2 - 1.2, label, f, col, ls=0.5)
    return w


def draw_button(d, th, fo, x, y, w, h, label, primary=False, icon=None,
                fsize=13, ls=0.0):
    if primary:
        RR(d, (x, y, x + w, y + h), CTRL_R, fill=th["brand"])
        col = th["ctrl_ink"]
        f = fo.sans(fsize, "Semibold")
    else:
        RR(d, (x, y, x + w, y + h), CTRL_R, fill=th["surface"],
           outline=th["border"], w=1)
        col = th["text"]
        f = fo.sans(fsize, "Medium")
    tx = x + w / 2
    if ls:
        tw = TLSW(f, label, ls)
    else:
        tw = TW(f, label)
    icon_w = 0
    if icon:
        icon_w = 21
    total = tw + icon_w
    start = tx - total / 2
    if icon == "copy":
        ix, iy = start, y + h / 2 - 6.5
        RR(d, (ix + 4.5, iy, ix + 13, iy + 11), 2.5, outline=col, w=1.3)
        RR(d, (ix, iy + 3.5, ix + 8.5, iy + 14.5), 2.5, fill=th["surface"],
           outline=col, w=1.3)
        start += icon_w
    elif icon == "pause":
        ix, iy = start, y + h / 2 - 5.5
        RR(d, (ix, iy, ix + 3.6, iy + 11), 1.2, fill=col)
        RR(d, (ix + 6.4, iy, ix + 10.0, iy + 11), 1.2, fill=col)
        start += icon_w
    if ls:
        TLS(d, start, y + h / 2 - fsize * 0.62, label, f, col, ls=ls)
    else:
        T(d, start, y + h / 2, label, f, col, anchor="lm")


def draw_segmented(d, th, fo, x, y, w, h, options, selected):
    RR(d, (x, y, x + w, y + h), CTRL_R, fill=th["surface"],
       outline=th["border"], w=1)
    inner_pad = 3
    n = len(options)
    seg_w = (w - inner_pad * 2) / n
    for i, opt in enumerate(options):
        sx = x + inner_pad + i * seg_w
        box = (sx, y + inner_pad, sx + seg_w, y + h - inner_pad)
        sel = (i == selected)
        if sel:
            RR(d, box, 6, fill=th["brand_tint"],
               outline=mix(th["brand_tint"], th["brand"], 0.5), w=1)
            col = th["brand_text"]
            f = fo.sans(12.5, "Semibold")
        else:
            col = th["text2"]
            f = fo.sans(12.5, "Regular")
        T(d, sx + seg_w / 2, y + h / 2, opt, f, col, anchor="mm")


def draw_select(d, th, fo, x, y, w, h, value):
    RR(d, (x, y, x + w, y + h), CTRL_R, fill=th["surface"],
       outline=th["border"], w=1)
    f = fo.sans(13, "Regular")
    T(d, x + 12, y + h / 2, truncate(f, value, w - 40, "select"), f,
      th["text"], anchor="lm")
    chevron(d, x + w - 17, y + h / 2, w=5.2, h=3.0, color=th["text2"], lw=1.4)


def draw_input(d, th, fo, x, y, w, h, value, mono=False):
    RR(d, (x, y, x + w, y + h), CTRL_R, fill=th["surface"],
       outline=th["border"], w=1)
    f = fo.mono(12.5) if mono else fo.sans(13, "Regular")
    T(d, x + 12, y + h / 2, truncate(f, value, w - 24, "input"), f,
      th["text"], anchor="lm")


def draw_slider(d, th, x, y, w, frac, knob_r=8, track_h=6, ticks=None,
                brand=None):
    cy = y + track_h / 2
    RR(d, (x, cy - track_h / 2, x + w, cy + track_h / 2), track_h / 2,
       fill=th["track"])
    kx = x + knob_r + frac * (w - knob_r * 2)
    if kx > x:
        RR(d, (x, cy - track_h / 2, kx, cy + track_h / 2), track_h / 2,
           fill=brand or th["brand"])
    if ticks:
        for t in ticks:
            tx = x + knob_r + t * (w - knob_r * 2)
            CIRC(d, tx, cy, 1.1, fill=mix(th["track"], th["text2"], 0.55))
    CIRC(d, kx, cy, knob_r, fill=th["knob"], outline=th["knob_border"], w=1)


def draw_progress(d, th, x, y, w, h, frac, color):
    RR(d, (x, y, x + w, y + h), h / 2, fill=th["track"])
    if frac > 0:
        RR(d, (x, y, x + max(h, w * frac), y + h), h / 2, fill=color)


# ---- header ---------------------------------------------------------------


def draw_icon(d, th, x, y, s=40):
    RR(d, (x, y, x + s, y + s), 11, fill=th["icon_bg"],
       outline=th["icon_border"], w=1)
    cx, cy = x + s / 2, y + s / 2
    rings = [(14.5, "#7dff4a", 2.0), (10.0, "#4aa8ff", 1.8), (5.5, "#ff4a5e", 1.6)]
    for rad, col, lw in rings:
        bb = [(cx - rad) * SS, (cy - rad) * SS, (cx + rad) * SS, (cy + rad) * SS]
        for i in range(8):
            a0 = i * 45 + 7
            a1 = i * 45 + 38
            d.arc(bb, a0, a1, fill=col, width=max(1, int(round(lw * SS))))
    RR(d, (cx - 1.6, cy - 3.2, cx + 1.6, cy + 3.2), 1.2, fill="#ff4a5e")


def draw_header(d, th, fo, L):
    x = GUT
    icon_s = 40
    draw_icon(d, th, x, (HEADER_H - icon_s) / 2)
    tx = x + icon_s + 14
    title_f = fo.sans(19, "Semibold")
    sub_f = fo.sans(12, "Regular")
    T(d, tx, 40, "ASCII H3 Director", title_f, th["text"], anchor="ls")
    T(d, tx, 59, "Motion-grammar direction for ASCII and kinetic typography · MiniMax H3",
      sub_f, th["text2"], anchor="ls")

    # right cluster, right-aligned
    right = W - GUT
    primary_f = fo.sans(13, "Semibold")
    sec_f = fo.sans(13, "Medium")
    pw = TW(primary_f, "Plan chain") + 34
    sw = TW(sec_f, "Copy H3 prompt") + 17 + 34
    badge_f = fo.mono(11.5)
    bw = TW(badge_f, "v3.0.0") + 22
    gap = 10
    by = (HEADER_H - 34) / 2
    bx = right - pw
    draw_button(d, th, fo, bx, by, pw, 34, "Plan chain", primary=True)
    bx -= gap + sw
    draw_button(d, th, fo, bx, by, sw, 34, "Copy H3 prompt", icon="copy")
    bx -= gap + bw
    RR(d, (bx, (HEADER_H - 24) / 2, bx + bw, (HEADER_H + 24) / 2), 12,
       fill=th["surface"], outline=th["border"], w=1)
    T(d, bx + bw / 2, HEADER_H / 2, "v3.0.0", badge_f, th["text2"], anchor="mm")
    d.line([(0, HEADER_H * SS), (W * SS, HEADER_H * SS)], fill=th["border"],
           width=SS)


# ---- left column ----------------------------------------------------------


BRIEF_TEXT = ("15-second ASCII film about memory collapsing into language. "
              "Hero word VOID. Phosphor green, 21:9, high impact — one "
              "transformation chain, no cuts.")

CHAIN = [
    (1, "assemble", "0–3s", "solid-form", "canonical"),
    (2, "type-wall", "3–6s", "fragments", "strong"),
    (3, "shockwave", "6–9s", "space", "canonical"),
    (4, "tunnel", "9–12s", "space", "strong"),
    (5, "glyph-sphere", "12–15s", "solid-form", "strong"),
]


def draw_brief_card(d, th, fo, box):
    x0, y0, x1, y1 = box
    ix, iw = x0 + PAD, (x1 - x0) - 2 * PAD
    y = y0 + PAD

    section_label(d, th, fo, ix, y, "BRIEF")
    y += LBL_H + 10

    # -- textarea (flexes with the available height)
    extra = max(0, (y1 - PAD) - (y + TXT_H + 18 + (CTRL_BEATS + 16 + CTRL_ROW * 2)
                                + 22 + LBL_H + 10 + CHAIN_MIN))
    txt_h = TXT_H + int(extra * 0.30)
    chain_h = (y1 - PAD) - (y + txt_h + 18 + (CTRL_BEATS + 16 + CTRL_ROW * 2)
                            + 22 + LBL_H + 10)
    RR(d, (ix, y, ix + iw, y + txt_h), CTRL_R, fill=th["surface"],
       outline=th["border"], w=1)
    tf = fo.sans(14, "Regular")
    lines = wrap(tf, BRIEF_TEXT, iw - 24)
    leading = 20
    ty = y + 12
    for ln in lines[:max(1, int((txt_h - 22) // leading))]:
        cx = ix + 12
        for word in ln.split(" "):
            core = word.rstrip(".,;:")
            tail = word[len(core):]
            col = th["brand_text"] if core == "VOID" else th["text"]
            T(d, cx, ty, core, tf, col)
            cx += TW(tf, core)
            if tail:
                T(d, cx, ty, tail, tf, th["text"])
                cx += TW(tf, tail)
            cx += TW(tf, " ")
        ty += leading
    y += txt_h + 18

    # -- beats slider
    lf = fo.sans(12.5, "Medium")
    vf = fo.mono(12)
    rf = fo.sans(10.5)
    T(d, ix, y + 9, "Beats", lf, th["text"], anchor="lm")
    chip_w, chip_h = 28, 18
    chip_x = ix + iw - chip_w
    RR(d, (chip_x, y, chip_x + chip_w, y + chip_h), 6, fill=th["surface"],
       outline=th["border"], w=1)
    T(d, chip_x + chip_w / 2, y + chip_h / 2, "5", vf, th["text"], anchor="mm")
    T(d, chip_x - 10, y + 9, "of 3–8", rf, th["text2"], anchor="rm")
    draw_slider(d, th, ix, y + 24, iw, 0.4, ticks=[i / 5 for i in range(6)])
    y += CTRL_BEATS + 16

    # -- duration / aspect
    cw = (iw - 16) / 2
    T(d, ix, y + 8, "Duration", lf, th["text"], anchor="lm")
    T(d, ix + cw + 16, y + 8, "Aspect", lf, th["text"], anchor="lm")
    draw_segmented(d, th, fo, ix, y + 16, cw, 34, ["4s", "8s", "12s", "15s"], 3)
    draw_segmented(d, th, fo, ix + cw + 16, y + 16, cw, 34,
                   ["21:9", "16:9", "9:16", "1:1"], 0)
    y += CTRL_ROW + 16

    # -- palette / ramp / hero text / seed
    cw4 = (iw - 3 * 14) / 4
    labels = ["Palette", "Ramp", "Hero text", "Seed"]
    for i, lb in enumerate(labels):
        T(d, ix + i * (cw4 + 14), y + 8, lb, lf, th["text"], anchor="lm")
    ys = y + 16
    draw_select(d, th, fo, ix, ys, cw4, 34, "phosphor")
    draw_select(d, th, fo, ix + cw4 + 14, ys, cw4, 34, "phosphor")
    draw_input(d, th, fo, ix + 2 * (cw4 + 14), ys, cw4, 34, "VOID")
    draw_input(d, th, fo, ix + 3 * (cw4 + 14), ys, cw4, 34, "ascii-h3:k2f9x", mono=True)
    y += CTRL_ROW + 22

    # -- transformation chain
    section_label(d, th, fo, ix, y, "TRANSFORMATION CHAIN")
    y += LBL_H + 10
    n = 5
    gap = 14
    cardw = (iw - gap * (n - 1)) / n
    for i, (idx, name, trange, emits, tier) in enumerate(CHAIN):
        cx = ix + i * (cardw + gap)
        draw_chain_card(d, th, fo, cx, y, cardw, chain_h, idx, name, trange,
                        emits, tier)
        if i < n - 1:
            mid = y + chain_h / 2
            arrow_right(d, cx + cardw + 3, cx + cardw + gap - 3, mid,
                        mix(th["border"], th["text2"], 0.55))


def draw_chain_card(d, th, fo, x, y, w, h, idx, name, trange, emits, tier):
    RR(d, (x, y, x + w, y + h), 10, fill=th["surface"],
       outline=th["border"], w=1)
    px = x + 12
    inner = w - 24
    cy = y + 12
    RR(d, (px, cy, px + 20, cy + 20), 6, fill=th["card"],
       outline=th["border"], w=1)
    T(d, px + 10, cy + 10, str(idx), fo.mono(11), th["text"], anchor="mm")

    tf = fo.sans(9, "Semibold")
    tw = TLSW(tf, tier, 0.5) + 14
    draw_badge(d, th, fo, x + w - 12 - tw, cy + 2, tier,
               "brand" if tier == "strong" else "neutral")

    slack = max(0, h - 113)
    g1 = 14 + slack * 0.42
    g2 = 7 + slack * 0.29
    g3 = 7 + slack * 0.29
    yy = cy + 20 + g1
    nf = fo.mono(12, "Bold")
    T(d, px, yy, truncate(nf, name, inner, "chain-name"), nf, th["text"])
    yy += 15 + g2
    T(d, px, yy, trange, fo.mono(10.5), th["text2"])
    yy += 13 + g3
    ef = fo.sans(8.5, "Semibold")
    TLS(d, px, yy + 1, "EMITS", ef, th["text2"], ls=0.7)
    ex = px + TLSW(ef, "EMITS", 0.7) + 6
    T(d, ex, yy, emits, fo.mono(10.5), th["text"])


# ---- right column ---------------------------------------------------------


CHECKS = [
    ("One legible transformation chain",
     "5 beats: assemble → type-wall → shockwave → tunnel → glyph-sphere"),
    ("First shot has a clear source state", 'opens on "assemble"'),
    ("Every transition has a physical cause",
     "all links follow the mechanism grammar"),
    ("At least 2 strong scale/density contrasts",
     "density spans 0.12–0.94 with 9 major swings"),
    ("Final state is usable as the next clip's input", "ends unresolved"),
    ("Generic HUD / cyberpunk / random glitch excluded", "no rejected vocabulary"),
    ("Prompt stays compact", "156 words"),
]

MOTION = [
    ("form", "solid-form"), ("camera", "forward-punch-through"),
    ("velocity", "1.10"), ("rotation", "0.00"),
    ("scaleTrend", "+1"), ("densityTrend", "+1"),
]
MOTION_LAST = ("unresolved", "the glyph sphere is still resolving")


def draw_quality_gate(d, th, fo, box, extra):
    x0, y0, x1, y1 = box
    ix, iw = x0 + PAD, (x1 - x0) - 2 * PAD
    y = y0 + PAD
    section_label(d, th, fo, ix, y, "QUALITY GATE")
    y += LBL_H + 14

    nf = fo.sans(54, "Bold")
    T(d, ix, baseline_center(nf, "100", y + 27), "100", nf, th["text"],
      anchor="ls")
    w100 = TW(nf, "100")
    sf = fo.sans(14)
    T(d, ix + w100 + 6, y + 40, "/100", sf, th["text2"], anchor="ls")

    pf = fo.sans(11.5, "Semibold")
    pw = TLSW(pf, "PASS", 0.9) + 34
    ph = 24
    px = ix + iw - pw
    py = y + 27 - ph / 2
    RR(d, (px, py, px + pw, py + ph), ph / 2, fill=th["success_tint"],
       outline=mix(th["success_tint"], th["success"], 0.45), w=1)
    check_mark(d, px + 10, py + 6, 12, th["success_text"], lw=1.8)
    TLS(d, px + 24, py + (ph - 11.5) / 2 - 1.4, "PASS", pf, th["success_text"],
        ls=0.9)
    y += 54 + 12

    draw_progress(d, th, ix, y, iw, 6, 1.0, th["success"])
    y += 6 + 16

    row_h = CHK_ROW + (extra / 7.0) * 0.5
    row_gap = CHK_GAP + (extra / 6.0) * 0.5
    lf = fo.sans(13, "Medium")
    df = fo.sans(11.5)
    for label, detail in CHECKS:
        myc = y + row_h / 2
        check_mark(d, ix + 2, myc - 7, 14, th["success_text"], lw=2.0)
        tw = TW(lf, label)
        tx = ix + 24
        maxlab = iw - 24 - 24 - TW(df, detail) - 14
        lab = truncate(lf, label, maxlab, "check-label")
        T(d, tx, myc, lab, lf, th["text"], anchor="lm")
        T(d, tx + TW(lf, lab) + 14, myc, detail, df, th["text2"], anchor="lm")
        y += row_h + row_gap


def draw_motion_state(d, th, fo, box, extra):
    x0, y0, x1, y1 = box
    ix, iw = x0 + PAD, (x1 - x0) - 2 * PAD
    y = y0 + PAD
    section_label(d, th, fo, ix, y, "MOTION STATE")
    y += LBL_H + 12

    lf = fo.mono(11.5)
    vf = fo.mono(12)
    row_h = MS_ROW + (extra / 7.0) * 0.45
    row_gap = MS_GAP + (extra / 7.0) * 0.55
    colw = (iw - 24) / 2
    lab_w = 118
    for i, (k, v) in enumerate(MOTION):
        r, c = divmod(i, 2)
        cx = ix + c * (colw + 24)
        cy = y + r * (row_h + row_gap) + row_h / 2
        T(d, cx, cy, k, lf, th["text2"], anchor="lm")
        T(d, cx + lab_w, cy, v, vf, th["text"], anchor="lm")
    ry = y + 3 * (row_h + row_gap)
    # hairline above the full-width row
    d.line([(ix * SS, (ry - 4) * SS), ((ix + iw) * SS, (ry - 4) * SS)],
           fill=th["hairline"], width=SS // 2 * 1)
    cy = ry + row_h / 2
    k, v = MOTION_LAST
    T(d, ix, cy, k, lf, th["text2"], anchor="lm")
    T(d, ix + lab_w, cy, v, vf, th["text"], anchor="lm")


# ---- preview --------------------------------------------------------------


def draw_preview(d, th, fo, box, extra):
    x0, y0, x1, y1 = box
    ix, iw = x0 + PAD, (x1 - x0) - 2 * PAD
    y = y0 + PAD
    section_label(d, th, fo, ix, y, "PREVIEW")
    y += LBL_H + 8

    # toolbar
    bar_h = 30
    bf = fo.sans(12.5, "Medium")
    pw = TW(bf, "Pause") + 17 + 30
    draw_button(d, th, fo, ix, y, pw, bar_h, "Pause", icon="pause", fsize=12.5)
    tcf = fo.mono(12)
    tcs = "09.0s / 15.0s"
    tcw = TW(tcf, tcs)
    sx = ix + pw + 16
    sw = iw - pw - 16 - tcw - 16
    draw_slider(d, th, sx, y + (bar_h - 5) / 2, sw, 0.60, knob_r=7, track_h=5)
    tc_x = ix + iw - tcw
    T(d, tc_x, y + bar_h / 2, tcs, tcf, th["text2"], anchor="lm")
    T(d, tc_x, y + bar_h / 2, "09.0s", tcf, th["text"], anchor="lm")
    y += bar_h + 12

    # inset
    ih = y1 - PAD - y
    RR(d, (ix, y, ix + iw, y + ih), 10, fill=th["inset"],
       outline=th["inset_border"], w=1)
    rows, cols = 14, 144
    grid, rad = tunnel_art(rows=rows, cols=cols)
    mf = fo.mono(12.5)
    adv = mf.getlength("M") / SS
    leading = 13.0
    rmax = max(max(r) for r in rad)
    art_w = cols * adv
    ax = ix + (iw - art_w) / 2
    ay = y + (ih - rows * leading) / 2
    for ry, row in enumerate(grid):
        for cxx, ch in enumerate(row):
            if ch == " ":
                continue
            t = (rad[ry][cxx] / rmax) ** 0.8
            T(d, ax + cxx * adv, ay + ry * leading, ch, mf, art_color(t))


# --------------------------------------------------------------------------
# build one theme
# --------------------------------------------------------------------------


def build(theme_name):
    th = expand(THEMES[theme_name])
    fo = FontBook()
    L = layout(fo)

    img = Image.new("RGB", (W * SS, H * SS), hx(th["app"]))

    # soft shadows, one blurred layer for all cards
    if th["shadow_alpha"] > 0:
        sh = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        for (bx0, by0, bx1, by1) in L["shadow"]:
            sd.rounded_rectangle(
                [bx0 * SS, (by0 + th["shadow_dy"]) * SS,
                 bx1 * SS, (by1 + th["shadow_dy"]) * SS],
                radius=CARD_R * SS, fill=(0, 0, 0, th["shadow_alpha"]))
        sh = sh.filter(ImageFilter.GaussianBlur(th["shadow_blur"] * SS / 2))
        img = Image.alpha_composite(img.convert("RGBA"), sh).convert("RGB")

    d = ImageDraw.Draw(img)
    draw_header(d, th, fo, L)

    for key in ("left", "qg", "ms", "preview"):
        draw_card(d, th, L[key])

    draw_brief_card(d, th, fo, L["left"])
    draw_quality_gate(d, th, fo, L["qg"], L["qg_extra"])
    draw_motion_state(d, th, fo, L["ms"], L["ms_extra"])
    draw_preview(d, th, fo, L["preview"], L["preview_extra"])

    out = img.resize((W, H), Image.LANCZOS)
    return out, L


def main():
    os.makedirs(ASSETS, exist_ok=True)
    dark, L = build("dark")
    light, _ = build("light")
    paths = {
        "console-dark.png": dark,
        "console-light.png": light,
        "console.png": dark,
    }
    for name, im in paths.items():
        p = os.path.join(ASSETS, name)
        im.save(p, "PNG")
        print(f"wrote {p}  {im.size[0]}x{im.size[1]}  "
              f"{os.path.getsize(p) / 1024:.1f} KB")
    print(f"left card   : {L['left']}")
    print(f"quality gate: {L['qg']}")
    print(f"motion state: {L['ms']}")
    print(f"preview     : {L['preview']}")
    if WARNINGS:
        print("\nWARNINGS:", file=sys.stderr)
        for w in sorted(set(WARNINGS)):
            print("  -", w, file=sys.stderr)
    else:
        print("no font/layout warnings")


if __name__ == "__main__":
    main()
