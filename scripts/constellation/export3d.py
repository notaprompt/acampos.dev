#!/usr/bin/env python3
"""Bake public/creature/constellation3d.json - the 3D constellation wire format.

Inputs: $TMPDIR/graph-topology.json (export_topology.py) and
$TMPDIR/graph-positions3d.json (layout3d.cjs, ngraph 3D force layout).
Positions quantize to a 0-4095 cube centered on the layout's centroid;
strength 0-99; principle flag; degree. Counts only - content never existed here.
"""
import json
import os

TMPDIR = os.environ.get("TMPDIR", "/tmp")
topo = json.load(open(os.path.join(TMPDIR, "graph-topology.json")))
pos = json.load(open(os.path.join(TMPDIR, "graph-positions3d.json")))

pts = list(pos.values())
lo = [sorted(p[a] for p in pts)[int(len(pts) * 0.01)] for a in range(3)]
hi = [sorted(p[a] for p in pts)[int(len(pts) * 0.99)] for a in range(3)]
span = max(h - l for h, l in zip(hi, lo))
mid = [(h + l) / 2 for h, l in zip(hi, lo)]

def q(v, axis):
    return max(0, min(4095, int((v - mid[axis]) / span * 4095 + 2048)))

core = []
index = {}
for n in topo["nodes"]:
    p = pos.get(str(n["i"]))
    if p is None:
        continue
    index[n["i"]] = len(core)
    core.append([q(p[0], 0), q(p[1], 1), q(p[2], 2),
                 int(round(n["s"] * 99)), n["p"], n["d"]])

edges = [[index[a], index[b], int(round(min(w, 2) * 50))]
         for a, b, w in topo["edges"] if a in index and b in index]
iso = sum(1 for n in topo["nodes"] if n["d"] == 0)

out = {"v": 2, "core": core, "edges": edges, "iso": iso}
path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "public", "creature", "constellation3d.json")
json.dump(out, open(path, "w"), separators=(",", ":"))
print(path, len(core), "core /", len(edges), "edges /", iso, "iso /",
      os.path.getsize(path) // 1024, "KB")
