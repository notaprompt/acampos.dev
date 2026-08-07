#!/usr/bin/env python3
"""The memory constellation, painted directly with Pillow - no browser.

Topology only: positions from fcose, strength/degree/principle flags. Nothing
readable in the frame. 2x supersample for antialiasing; gold glow via a
blurred underlayer; sigils from Apple Symbols on the strongest principle hubs.
"""
import json, math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

TMPDIR = os.environ.get("TMPDIR", "/tmp")
topo = json.load(open(os.path.join(TMPDIR, "graph-topology.json")))
pos = json.load(open(os.path.join(TMPDIR, "graph-positions.json")))

SS = 2                     # supersample factor
W, H = 2400 * SS, 1500 * SS
MARGIN = 130 * SS

xs = sorted(p[0] for p in pos.values())
ys = sorted(p[1] for p in pos.values())
# frame on the 1st-99th percentile so FA2 outliers don't shrink the core
lo, hi = int(len(xs) * 0.01), int(len(xs) * 0.99)
minx, maxx, miny, maxy = xs[lo], xs[hi], ys[lo], ys[hi]
s = min((W - 2 * MARGIN) / (maxx - minx), (H - 2 * MARGIN) / (maxy - miny))
ox = (W - (maxx - minx) * s) / 2
oy = (H - (maxy - miny) * s) / 2

placed = {}   # topo index -> (x, y, strength, principle, degree)
for n in topo["nodes"]:
    p = pos.get(str(n["i"]))
    if p:
        placed[n["i"]] = ((p[0] - minx) * s + ox, (p[1] - miny) * s + oy,
                          n["s"], n["p"], n["d"])

cx, cy = W / 2, H / 2
core_r = max(math.hypot(v[0] - cx, v[1] - cy) for v in placed.values())

base = Image.new("RGB", (W, H), (8, 8, 8))
draw = ImageDraw.Draw(base, "RGBA")

# edges - the threads carry the structure now, weight-scaled
for a, b, w in topo["edges"]:
    if a in placed and b in placed:
        na, nb = placed[a], placed[b]
        alpha = int(255 * min(0.13, 0.035 + min(w, 2) * 0.04))
        draw.line([na[0], na[1], nb[0], nb[1]], fill=(226, 204, 164, alpha), width=SS)

# dust halo - isolated memories drifting outside the core
for n in topo["nodes"]:
    if n["d"] == 0:
        rnd = random.Random(n["i"] * 2654435761 % 2**32)
        ang = rnd.random() * math.tau
        rr = core_r * (1.12 + rnd.random() * 0.45)
        x = cx + math.cos(ang) * rr * 1.12
        y = cy + math.sin(ang) * rr * 0.78
        if not (8 * SS < x < W - 8 * SS and 8 * SS < y < H - 8 * SS):
            continue
        a = int(255 * (0.04 + rnd.random() * 0.07))
        r = (0.7 + rnd.random() * 0.6) * SS
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(232, 220, 200, a))

# sigil assignment: strongest principle-tier hubs, spread out - greedy
# spatial de-dup so the glyphs don't pile up in one community
principled = sorted((v for v in placed.values() if v[3]),
                    key=lambda v: -(v[4] + v[2] * 3))
sigil_nodes = []
MIN_D = 70 * SS
for v in principled:
    if len(sigil_nodes) >= 46:
        break
    if all(math.hypot(v[0] - u[0], v[1] - u[1]) > MIN_D for u in sigil_nodes):
        sigil_nodes.append(v)
sigil_set = {(v[0], v[1]) for v in sigil_nodes}

# glow underlayer: gold blur beneath principle nodes and sigils
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow, "RGBA")
for x, y, st, p, d in placed.values():
    if p and (x, y) not in sigil_set:
        r = (2.2 + st * 2.0) * SS
        gd.ellipse([x - r, y - r, x + r, y + r], fill=(184, 150, 90, 110))
for x, y, st, p, d in sigil_nodes:
    r = 7 * SS
    gd.ellipse([x - r, y - r, x + r, y + r], fill=(184, 150, 90, 150))
glow = glow.filter(ImageFilter.GaussianBlur(4 * SS))
from PIL import ImageChops
base = ImageChops.add(base, glow)
draw = ImageDraw.Draw(base, "RGBA")

# nodes
for x, y, st, p, d in placed.values():
    if (x, y) in sigil_set:
        continue
    if p:
        col = (200, 166, 104, int(255 * (0.30 + st * 0.45)))
        r = (0.9 + st * 1.5) * SS
    else:
        col = (232, 220, 200, int(255 * (0.10 + st * 0.26)))
        r = (0.7 + st * 1.3) * SS
    draw.ellipse([x - r, y - r, x + r, y + r], fill=col)

# one faint circle around the strongest hub - a hint, not a statement
if sigil_nodes:
    hx, hy = sigil_nodes[0][0], sigil_nodes[0][1]
    for rr, a in [(34, 26), (52, 13)]:
        r = rr * SS
        draw.ellipse([hx - r, hy - r, hx + r, hy + r],
                     outline=(184, 150, 90, a), width=SS)

# sigils - small, gold, quiet
SIGILS = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ☉☽☿♀♂♃♄"
FONT = "/System/Library/Fonts/Apple Symbols.ttf"
for si, (x, y, st, p, d) in enumerate(sigil_nodes):
    rnd = random.Random(si * 40503 + 77)
    glyph = SIGILS[si % len(SIGILS)]
    size = int((16 + rnd.random() * 7) * SS)
    font = ImageFont.truetype(FONT, size)
    a = int(255 * (0.72 + rnd.random() * 0.24))
    bbox = draw.textbbox((0, 0), glyph, font=font)
    gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x - gw / 2 - bbox[0], y - gh / 2 - bbox[1]), glyph,
              font=font, fill=(216, 184, 122, a))

# vignette
vig = Image.new("L", (240, 150), 0)
vp = vig.load()
for j in range(150):
    for i in range(240):
        dist = math.hypot((i - 120) / 120, (j - 75) / 75 * 0.72)
        t = max(0.0, min(1.0, (dist - 0.45) / 0.75))
        vp[i, j] = int(140 * t * t)
vig = vig.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(30 * SS))
base = ImageChops.subtract(base, Image.merge("RGB", (vig, vig, vig)))

final = base.resize((W // SS, H // SS), Image.LANCZOS)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "graph-shot.png")
final.save(out)
print(out, final.size, f"{len(placed)} placed / {len(sigil_nodes)} sigils / core_r={core_r/SS:.0f}")
