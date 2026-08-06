#!/usr/bin/env python3
"""Bake public/creature/constellation.json from the anonymized topology.

Inputs (produce them with export_topology.py + fa2.cjs, see headers there):
  $TMPDIR/graph-topology.json   - {nodes:[{i,s,p,d}], edges:[[a,b,w]]}
  $TMPDIR/graph-positions.json  - {i: [x, y]} for the connected core

Output is quantized for the wire: positions as 0-4095 ints, strength 0-99,
edges index into the core array. Isolated memories ship as a bare count -
the client scatters them deterministically. No content anywhere.
"""
import json
import os

TMPDIR = os.environ.get("TMPDIR", "/tmp")
topo = json.load(open(os.path.join(TMPDIR, "graph-topology.json")))
pos = json.load(open(os.path.join(TMPDIR, "graph-positions.json")))

xs = sorted(p[0] for p in pos.values())
ys = sorted(p[1] for p in pos.values())
lo, hi = int(len(xs) * 0.01), int(len(xs) * 0.99)
minx, maxx, miny, maxy = xs[lo], xs[hi], ys[lo], ys[hi]
sx = 4095 / (maxx - minx)
sy = 4095 / (maxy - miny)

core = []
index = {}
for n in topo["nodes"]:
    p = pos.get(str(n["i"]))
    if p is None:
        continue
    index[n["i"]] = len(core)
    core.append([
        max(0, min(4095, int((p[0] - minx) * sx))),
        max(0, min(4095, int((p[1] - miny) * sy))),
        int(round(n["s"] * 99)),
        n["p"],
        n["d"],
    ])

edges = [[index[a], index[b], int(round(min(w, 2) * 50))]
         for a, b, w in topo["edges"] if a in index and b in index]
iso = sum(1 for n in topo["nodes"] if n["d"] == 0)

out = {"v": 1, "core": core, "edges": edges, "iso": iso}
path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "public", "creature", "constellation.json")
json.dump(out, open(path, "w"), separators=(",", ":"))
print(path, len(core), "core /", len(edges), "edges /", iso, "iso /",
      os.path.getsize(path) // 1024, "KB")
