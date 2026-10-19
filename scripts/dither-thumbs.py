"""Dithered project marks: one figure per system, drawn from the system itself.

Every project gets a one-bit animated mark: a loop of frames, each ordered-
dithered with an 8x8 Bayer matrix (plus engraved line hatching where a mark
asks for it), laid side by side in one sprite strip. The PNG is only a mask
(white dot = on, transparent = off); the page tints it with --gold-accent via
CSS mask-image, so one file is right in the dark and the light theme. Frame 0 is
the still; hovering the card plays the loop (src/components/DitherThumb.astro).

Where a system has real data on this machine, the mark is drawn from it. Only
numeric columns are read, nothing leaves the machine but dot positions, and no
mark encodes text, names, or amounts.

  forgeframe     the decay law: traces fall toward a 0.1 floor on a 7-day
                 half-life and jump back on retrieval; the principle line is flat
  creature       the anatomy: a spine with seven ribs, each carrying the real
                 organ count of its section (src/data/creature.json), inside the
                 governance membrane, engraved; one eye at the head
  deuce          DEUCE's own price against the market's mid over time, for its
                 busiest market (~/.deuce/crossvenue.db), the gap engraved and
                 sealed forecasts stamped along its line
  distillery     real resonance x novelty scores (~/distillery/distillery.db)
                 against the signal threshold curve; what passes is bright
  reframed       the five-axis confidence score, original shape to reframed
  guardian       the compression pipeline: raw -> summary -> pattern -> principle
  cipher         the escalation bands (brief < 5, text 5-8, call > 8); the one
                 event past 8 rings
  strudelvision  the infinite hall, its fourth render mode, zooming forever

Run after changing a project:  python3 scripts/dither-thumbs.py
Output: public/images/thumbs/<slug>-<grid>.png (grid 64 for home, 96 for
/projects, written at 2x) and public/images/thumbs/marks.json (figure captions).
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
HOME = Path.home()
PROJECTS = ROOT / "src/content/projects"
OUT = ROOT / "public/images/thumbs"
GRIDS = (64, 96)
FRAMES = 12
SCALE = 2

BAYER = np.array([
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]) / 64.0


# ── drawing ─────────────────────────────────────────────────────────────────

class Canvas:
    """Light over [-1, 1]^2 at grid n, plus a hatch layer of engraved lines."""

    def __init__(self, n: int):
        self.n = n
        self.Y, self.X = np.mgrid[0:n, 0:n] / (n - 1) * 2 - 1
        self.px = 2 / (n - 1)
        self.f = np.zeros((n, n))
        self.hatch = np.zeros((n, n), bool)

    def add(self, layer, level=1.0):
        self.f = np.maximum(self.f, np.clip(np.asarray(layer, float), 0, 1) * level)

    def engrave(self, tone, angle=0.785, spacing=3.0):
        """Line hatching: darker tone, thicker lines. Spacing is in grid cells."""
        u = (self.X * np.cos(angle) + self.Y * np.sin(angle)) / (self.px * spacing)
        frac = u - np.floor(u)
        self.hatch |= (frac < np.clip(tone, 0, 1) * 0.55) & (np.asarray(tone) > 0.04)

    def disc(self, cx, cy, r):
        return np.clip((r - np.hypot(self.X - cx, self.Y - cy)) / self.px + 0.5, 0, 1)

    def ring(self, cx, cy, r, w):
        d = np.abs(np.hypot(self.X - cx, self.Y - cy) - r)
        return np.clip((w / 2 - d) / self.px + 0.5, 0, 1)

    def ellipse(self, cx, cy, rx, ry):
        return np.hypot((self.X - cx) / rx, (self.Y - cy) / ry)

    def ellipse_ring(self, cx, cy, rx, ry, w):
        d = np.abs(self.ellipse(cx, cy, rx, ry) - 1) * min(rx, ry)
        return np.clip((w / 2 - d) / self.px + 0.5, 0, 1)

    def seg(self, ax, ay, bx, by, w):
        px, py, dx, dy = self.X - ax, self.Y - ay, bx - ax, by - ay
        h = np.clip((px * dx + py * dy) / (dx * dx + dy * dy + 1e-12), 0, 1)
        return np.clip((w / 2 - np.hypot(px - dx * h, py - dy * h)) / self.px + 0.5, 0, 1)

    def rect(self, x0, y0, x1, y1):
        ix = np.clip(np.minimum(self.X - x0, x1 - self.X) / self.px + 0.5, 0, 1)
        iy = np.clip(np.minimum(self.Y - y0, y1 - self.Y) / self.px + 0.5, 0, 1)
        return ix * iy

    def diamond(self, cx, cy, r):
        return np.clip((r - (np.abs(self.X - cx) + np.abs(self.Y - cy))) / self.px + 0.5, 0, 1)

    def poly(self, pts, outline=False, width=1.0):
        """Antialiased polygon via 4x supersampled raster."""
        s = 4
        im = Image.new("L", (self.n * s, self.n * s), 0)
        xy = [((x + 1) / 2 * (self.n - 1) * s + s / 2, (y + 1) / 2 * (self.n - 1) * s + s / 2) for x, y in pts]
        d = ImageDraw.Draw(im)
        if outline:
            d.line(xy + [xy[0]], fill=255, width=max(1, int(round(width * s))))
        else:
            d.polygon(xy, fill=255)
        return np.asarray(im.resize((self.n, self.n), Image.BOX), float) / 255

    def sphere(self, cx, cy, r, light=(-0.5, -0.6), lo=0.1, hi=0.72):
        dx, dy = (self.X - cx) / r, (self.Y - cy) / r
        d2 = dx ** 2 + dy ** 2
        dz = np.sqrt(np.clip(1 - d2, 0, 1))
        lx, ly = light
        lz = np.sqrt(max(0.0, 1 - lx * lx - ly * ly))
        shade = np.clip(dx * lx + dy * ly + dz * lz, 0, 1)
        edge = np.clip((1 - np.sqrt(d2)) * r / self.px + 0.5, 0, 1)
        return (lo + (hi - lo) * shade ** 1.3) * edge


def seeded(slug: str) -> np.random.Generator:
    return np.random.default_rng(int(hashlib.sha1(slug.encode()).hexdigest()[:8], 16))


def pulse(phase: float, width: float = 0.12) -> float:
    p = phase % 1.0
    return float(np.exp(-(min(p, 1.0 - p) / width) ** 2))


def ease(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


# ── real data, read-only, numbers only ──────────────────────────────────────

def load_series() -> np.ndarray | None:
    db = HOME / ".deuce/crossvenue.db"
    if not db.exists():
        return None
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    top = con.execute(
        "select market_id from crossvenue_log where sharp_prob_a between 0 and 1 and poly_mid_a between 0 and 1 "
        "group by market_id order by count(*) desc limit 1"
    ).fetchone()
    rows = con.execute(
        "select sharp_prob_a, poly_mid_a from crossvenue_log where market_id = ? "
        "and sharp_prob_a between 0 and 1 and poly_mid_a between 0 and 1 order by ts", top
    ).fetchall() if top else []
    con.close()
    if len(rows) < 60:
        return None
    a = np.array(rows, float)
    idx = np.linspace(0, len(a) - 1, 240).round().astype(int)
    return a[idx]


def load_scores() -> np.ndarray | None:
    db = HOME / "distillery/distillery.db"
    if not db.exists():
        return None
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    rows = con.execute(
        "select resonance, novelty from distillations "
        "where resonance is not null and novelty is not null order by created_at"
    ).fetchall()
    con.close()
    return np.array(rows, float) if len(rows) >= 10 else None


SERIES = load_series()
SCORES = load_scores()


# ── marks ───────────────────────────────────────────────────────────────────

def forgeframe(c: Canvas, t: float, rng):
    """Strength over time: the decay law itself. 7-day half-life, 0.1 floor,
    retrieval reconsolidates to full, principles never decay."""
    x0, x1, ybot, ytop = -0.86, 0.86, 0.72, -0.62
    to_y = lambda v: ybot + (ytop - ybot) * v
    c.add(c.seg(x0, ybot, x1, ybot, c.px), 0.45)                          # time
    c.add(c.seg(x0, ybot, x0, ytop - 0.08, c.px), 0.45)                   # strength
    floor_y = to_y(0.1)
    for xx in np.arange(x0, x1, 0.06):                                    # the 0.1 floor, dotted
        c.add(c.disc(xx, floor_y, 0.012), 0.55)
    days = 28                                                             # four weeks in view
    xs = np.linspace(x0, x1, 160)
    traces = [(0.08, [0.15, 0.55]), (0.45, [0.3]), (0.7, [0.05, 0.62])]
    for k, (phase, hits) in enumerate(traces):
        # time scrolls one quarter-window per loop; retrieval events repeat with it
        tt = (np.linspace(0, 1, 160) + t * 0.25 + phase) % 1.0
        s_ = np.full(160, 0.1)
        for i, u in enumerate(tt):
            last = max([h for h in hits + [0.0] if h <= u], default=0.0)
            age_days = (u - last) * days
            s_[i] = 0.1 + 0.9 * 0.5 ** (age_days / 7)
        ys = to_y(s_)
        for i in range(159):
            if abs(ys[i + 1] - ys[i]) > 0.3:                               # retrieval: draw the jump as a tick
                c.add(c.seg(xs[i + 1], ys[i], xs[i + 1], ys[i + 1], c.px * 0.8), 0.5)
                c.add(c.disc(xs[i + 1], ys[i + 1], 0.04), 1.0)
                continue
            c.add(c.seg(xs[i], ys[i], xs[i + 1], ys[i + 1], c.px * 1.2), 0.62 + 0.1 * k)
    py = to_y(1.0)                                                        # principle tier: flat, forever
    c.engrave(c.rect(x0, py - 0.07, x1, py + 0.07) * 0.45, angle=0.785, spacing=3)
    c.add(c.seg(x0, py, x1, py, c.px * 1.8), 1.0)
    for xx in np.linspace(x0 + 0.12, x1 - 0.12, 5):
        c.add(c.diamond(xx, py, 0.06), 1.0)


def creature(c: Canvas, t: float, rng):
    sections = json.loads((ROOT / "src/data/creature.json").read_text())["sections"]
    counts = [len(s["organs"]) for s in sections]
    k = len(counts)
    membrane = c.ellipse(0, 0.04, 0.9, 0.95)
    inside = membrane < 1
    # engraved body: hatching that darkens toward the membrane wall
    c.engrave(np.where(inside, np.clip((membrane - 0.55) * 1.6, 0, 1) * 0.9, 0), angle=-0.62, spacing=3.2)
    c.add(c.ellipse_ring(0, 0.04, 0.9, 0.95, c.px * 1.1), 0.75)
    ys = np.linspace(-0.5, 0.82, k)
    c.add(c.seg(0, -0.6, 0, 0.9, c.px * 1.8), 0.85)                       # the spine
    head = (t * k) % k
    for i, (y, n) in enumerate(zip(ys, counts)):
        lit = 0.32 + 0.68 * pulse((head - i) / k, 0.08)
        for side, m in ((-1, (n + 1) // 2), (1, n // 2)):
            pts = [(side * (0.1 + j * 0.12), y + 0.02 * j * j) for j in range(m)]
            prev = (0.0, y)
            for x, yy in pts:
                c.add(c.seg(prev[0], prev[1], x, yy, c.px * 0.9), lit * 0.6)
                c.add(c.disc(x, yy, 0.038), lit)
                prev = (x, yy)
    blink = 1 - 0.95 * pulse(t - 0.93, 0.04)                             # the one eye at the head
    lid = c.ellipse(0, -0.74, 0.17, 0.085 * blink)
    c.add(np.clip((1 - lid) / (c.px * 6), 0, 1) * 0.25)
    c.add(c.ellipse_ring(0, -0.74, 0.17, max(0.085 * blink, 0.01), c.px * 1.2), 0.95)
    if blink > 0.4:
        c.add(c.disc(0, -0.74, 0.055 * blink), 1.0)
    c.add(c.disc(0, -0.6 + 1.5 * head / k, 0.06), 1.0)                    # the signal


def deuce(c: Canvas, t: float, rng):
    series = SERIES if SERIES is not None else np.cumsum(rng.normal(0, 0.01, (240, 2)), 0) + 0.5
    kernel = np.ones(7) / 7                                               # smooth the tick noise
    series = np.stack([np.convolve(series[:, i], kernel, mode='same') for i in range(2)], 1)[4:-4]
    lo, hi = np.percentile(series, 4), np.percentile(series, 96)          # typical range; spikes clip
    pad = (hi - lo) * 0.08 + 1e-6
    to_y = lambda v: np.clip(0.6 - (v - lo + pad) / (hi - lo + 2 * pad) * 1.18, -0.58, 0.66)
    win = 120
    start = int(t * (len(series) - win))                                 # the window slides through the book
    seg_ = series[start:start + win]
    xs = np.linspace(-0.86, 0.86, win)
    mine, market = to_y(seg_[:, 0]), to_y(seg_[:, 1])
    # the gap between my price and the market's, engraved
    band = np.zeros_like(c.f)
    for i in range(win - 1):
        top_, bot = sorted((mine[i], market[i]))
        band = np.maximum(band, c.rect(xs[i], top_, xs[i + 1], bot))
    c.engrave(band * 0.6, angle=0.785, spacing=3)
    for i in range(win - 1):
        c.add(c.seg(xs[i], market[i], xs[i + 1], market[i + 1], c.px * 1.0), 0.55)   # the market
        c.add(c.seg(xs[i], mine[i], xs[i + 1], mine[i + 1], c.px * 1.6), 1.0)        # mine
    for j in range(0, win, 20):                                          # each forecast sealed before resolution
        x, y = xs[j], mine[j]
        c.add(c.rect(x - 0.04, y - 0.04, x + 0.04, y + 0.04) - c.rect(x - 0.022, y - 0.022, x + 0.022, y + 0.022), 0.95)
    c.add(c.seg(-0.86, 0.74, 0.86, 0.74, c.px), 0.45)                     # time axis
    for j in range(9):
        c.add(c.seg(-0.86 + j * 0.215, 0.74, -0.86 + j * 0.215, 0.78, c.px), 0.45)
    r, cx, cy = 0.17, 0.7, -0.76                                         # the ball
    c.add(c.sphere(cx, cy, r, light=(-0.45, -0.55)))
    seam_y = cy + 0.5 * r * np.sin(np.pi * (c.X - cx) / r)
    c.f = np.where((np.hypot(c.X - cx, c.Y - cy) < r * 0.95) & (np.abs(c.Y - seam_y) < 0.03), 0, c.f)


def distillery(c: Canvas, t: float, rng):
    pts = SCORES if SCORES is not None else rng.random((40, 2))
    ox, oy, w = -0.78, 0.8, 1.6                                          # origin bottom-left, axes up and right
    c.add(c.seg(ox, oy, ox + w, oy, c.px * 1.1), 0.6)
    c.add(c.seg(ox, oy, ox, oy - w, c.px * 1.1), 0.6)
    for i in range(1, 5):
        c.add(c.seg(ox + w * i / 4, oy, ox + w * i / 4, oy + 0.04, c.px), 0.5)
        c.add(c.seg(ox - 0.04, oy - w * i / 4, ox, oy - w * i / 4, c.px), 0.5)
    rs = np.linspace(0.2, 1.0, 120)                                      # signal = resonance x novelty = 0.20
    curve = [(ox + r * w, oy - (0.2 / r) * w) for r in rs]
    for (ax, ay), (bx, by) in zip(curve, curve[1:]):
        c.add(c.seg(ax, ay, bx, by, c.px * 1.3), 0.9)
    above = (((c.X - ox) / w) * ((oy - c.Y) / w) >= 0.2) & (c.X > ox) & (c.Y < oy)
    c.engrave(np.where(above, 0.22, 0), angle=0.785, spacing=4)
    shown = max(1, int(round(len(pts) * ease(t * 1.15))))
    for i, (res, nov) in enumerate(pts[:shown]):
        x, y = ox + res * w, oy - nov * w
        passed = res * nov >= 0.2
        newest = i == shown - 1 and shown < len(pts)
        c.add(c.disc(x, y, 0.045 if passed else 0.028), 1.0 if (passed or newest) else 0.45)
        if newest:
            c.add(c.ring(x, y, 0.08, c.px), 0.8)


def reframed(c: Canvas, t: float, rng):
    k, R = 5, 0.78
    ang = [-np.pi / 2 + 2 * np.pi * i / k for i in range(k)]
    for s in (0.33, 0.66, 1.0):                                          # the web
        c.add(c.poly([(R * s * np.cos(a), R * s * np.sin(a) + 0.06) for a in ang], outline=True, width=0.6), 0.32)
    for a in ang:
        c.add(c.seg(0, 0.06, R * np.cos(a), R * np.sin(a) + 0.06, c.px * 0.7), 0.25)
    before = np.array([0.42, 0.7, 0.35, 0.55, 0.48])                     # five confidence axes
    after = np.array([0.82, 0.78, 0.74, 0.86, 0.7])
    m = ease((t - 0.1) / 0.6)
    v = before + (after - before) * m
    shape = [(R * v[i] * np.cos(a), R * v[i] * np.sin(a) + 0.06) for i, a in enumerate(ang)]
    c.engrave(c.poly(shape) * 0.55, angle=0.3, spacing=3)
    c.add(c.poly(shape, outline=True, width=1.3), 0.95)
    c.add(c.poly([(R * before[i] * np.cos(a), R * before[i] * np.sin(a) + 0.06) for i, a in enumerate(ang)], outline=True, width=0.6), 0.4)
    for x, y in shape:
        c.add(c.disc(x, y, 0.045), 1.0)


def guardian(c: Canvas, t: float, rng):
    stages = [(-0.78, 12), (-0.26, 6), (0.26, 3), (0.78, 1)]             # raw, summary, pattern, principle
    cols = []
    for x, n in stages:
        ys = np.linspace(-0.66, 0.66, n) if n > 1 else np.array([0.0])
        cols.append([(x, y) for y in ys])
    for (a_col, b_col) in zip(cols, cols[1:]):                           # each item compresses into one above it
        for i, (ax, ay) in enumerate(a_col):
            bx, by = b_col[min(int(i * len(b_col) / len(a_col)), len(b_col) - 1)]
            c.add(c.seg(ax, ay, bx, by, c.px * 0.8), 0.3)
            p = (t * 2 + i * 0.13) % 1.0                                # traffic moving rightward
            c.add(c.disc(ax + (bx - ax) * p, ay + (by - ay) * p, 0.025), 0.85)
    for j, col in enumerate(cols[:-1]):
        for x, y in col:
            c.add(c.disc(x, y, 0.032 + 0.012 * j), 0.6 + 0.12 * j)
    c.add(c.diamond(0.78, 0.0, 0.13), 1.0)                               # principle
    c.engrave(c.diamond(0.78, 0.0, 0.24) * 0.5, angle=-0.785, spacing=3)


def cipher(c: Canvas, t: float, rng):
    x0, x1, y = -0.82, 0.82, 0.5
    sx = lambda s: x0 + (x1 - x0) * s / 10
    c.add(c.seg(x0, y, x1, y, c.px * 1.2), 0.6)
    for s in range(11):
        c.add(c.seg(sx(s), y, sx(s), y + (0.08 if s in (5, 8) else 0.04), c.px), 0.6)
    c.engrave(c.rect(sx(5), y - 0.95, sx(8), y) * 0.25, angle=0.785, spacing=4)   # text band
    c.engrave(c.rect(sx(8), y - 0.95, sx(10), y) * 0.55, angle=0.785, spacing=3)  # call band
    c.add(c.seg(sx(8), y - 1.05, sx(8), y + 0.1, c.px * 1.3), 0.95)            # the threshold
    events = [(2.1, 0.0), (6.3, 0.18), (3.8, 0.33), (5.4, 0.5), (8.9, 0.62), (1.4, 0.8)]
    for score, at in events:
        p = (t - at) % 1.0
        drop = ease(p / 0.18)
        yy = (y - 1.25) + (1.25 - 0.05) * drop
        c.add(c.disc(sx(score), yy, 0.04), (0.95 if score > 8 else 0.55) * (1 - ease((p - 0.75) / 0.25)))
        if score > 8 and 0.18 < p < 0.7:                                        # past 8: it rings
            q = (p - 0.18) / 0.52
            c.add(c.ring(sx(score), y - 0.05, 0.06 + q * 0.32, c.px * 1.1), 0.85 * (1 - q))
    c.add(c.seg(x0, 0.78, x1, 0.78, c.px), 0.3)                                   # the morning brief, below


def strudelvision(c: Canvas, t: float, rng):
    for level in range(9):                                               # one level deeper per loop: seamless
        s = 0.06 * (1.38 ** (level + t))
        if s > 1.3:
            continue
        rot = 0.12 * (level + t)
        corners = [(s * np.cos(rot + a), s * np.sin(rot + a)) for a in (np.pi / 4, 3 * np.pi / 4, 5 * np.pi / 4, 7 * np.pi / 4)]
        bright = np.clip(s * 1.1, 0.15, 0.95)
        c.add(c.poly(corners, outline=True, width=0.9 + s), bright)
    c.add(np.clip(1 - np.hypot(c.X, c.Y) / 0.32, 0, 1) ** 1.5 * 0.8)          # the vanishing point


MARKS = {
    "forgeframe": (forgeframe, 0.0, "half-life 7d · floor 0.1"),
    "creature": (creature, 0.0, "anatomy · seven sections"),
    "deuce": (deuce, 0.0, "my price vs the market's"),
    "distillery": (distillery, 0.999, "signal = r × n ≥ 0.20"),
    "reframed": (reframed, 0.75, "five-axis confidence"),
    "guardian": (guardian, 0.0, "raw → principle"),
    "cipher": (cipher, 0.3, "call above 8 · text 5–8"),
    "strudelvision": (strudelvision, 0.0, "the infinite hall"),
}


def render(slug: str, grid: int) -> Image.Image:
    fn, hero, _ = MARKS.get(slug, MARKS["cipher"])
    threshold = np.tile(BAYER, (grid // 8, grid // 8))
    frames = []
    for i in range(FRAMES):
        c = Canvas(grid)
        fn(c, (hero + i / FRAMES) % 1.0, seeded(slug))
        frames.append((np.clip(c.f, 0, 1) > threshold) | c.hatch)
    alpha = (np.concatenate(frames, axis=1) * 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([np.full_like(alpha, 255)] * 3 + [alpha]))
    return img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    captions = {}
    for md in sorted(PROJECTS.glob("*.md*")):
        slug = md.stem
        for grid in GRIDS:
            render(slug, grid).save(OUT / f"{slug}-{grid}.png", optimize=True)
        captions[slug] = MARKS.get(slug, MARKS["cipher"])[2]
        print(f"{slug:<14} {captions[slug]}")
    (OUT / "marks.json").write_text(json.dumps({"frames": FRAMES, "captions": captions}, ensure_ascii=False, indent=1))
    print(f"data: series={'real' if SERIES is not None else 'seeded'}, scores={'real' if SCORES is not None else 'seeded'}")


if __name__ == "__main__":
    main()
