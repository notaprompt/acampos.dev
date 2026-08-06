#!/usr/bin/env python3
"""Export anonymized memory-graph topology for the constellation bake.

Reads ~/.forgeframe/memory.db READ-ONLY. Ships integer indices, strength,
degree, and a principle-tier flag - never content, tags, or ids.
Run me, then fa2.cjs (needs graphology devDeps), then export.py.
"""
import json
import os
import sqlite3

db = sqlite3.connect(f"file:{os.path.expanduser('~/.forgeframe/memory.db')}?mode=ro", uri=True)
rows = list(db.execute("SELECT id, strength, (tags LIKE '%principle%' OR tags LIKE '%voice%') FROM memories"))
idx = {r[0]: i for i, r in enumerate(rows)}
nodes = [{"i": i, "s": round(r[1] or 0.5, 2), "p": int(r[2])} for i, r in enumerate(rows)]
edges = [[idx[s], idx[t], round(w, 2)] for s, t, w in
         db.execute("SELECT source_id, target_id, weight FROM memory_edges") if s in idx and t in idx]
deg = [0] * len(nodes)
for a, b, _ in edges:
    deg[a] += 1
    deg[b] += 1
for n in nodes:
    n["d"] = deg[n["i"]]
out = os.path.join(os.environ.get("TMPDIR", "/tmp"), "graph-topology.json")
json.dump({"nodes": nodes, "edges": edges}, open(out, "w"))
print(out, len(nodes), "nodes", len(edges), "edges")
