// ForceAtlas2 (LinLog + strong gravity) over the connected core - the
// community-revealing layout fcose wouldn't give us.
const fs = require('fs');
const Graph = require('graphology');
const fa2 = require('graphology-layout-forceatlas2');

const topo = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const g = new Graph({ type: 'undirected', multi: true });
for (const n of topo.nodes) {
  if (n.d > 0) {
    // deterministic ring seed - FA2 needs initial positions
    const a = (n.i * 2654435761 % 4294967296) / 4294967296 * Math.PI * 2;
    const r = 100 + (n.i * 40503 % 997);
    g.addNode(n.i, { x: Math.cos(a) * r, y: Math.sin(a) * r, size: 1 + n.s });
  }
}
let skipped = 0;
topo.edges.forEach(([a, b, w]) => {
  if (g.hasNode(a) && g.hasNode(b)) g.addEdge(a, b, { weight: w });
  else skipped++;
});
console.error(`graph: ${g.order} nodes ${g.size} edges (${skipped} skipped)`);

const t0 = Date.now();
const positions = fa2(g, {
  iterations: 800,
  settings: {
    linLogMode: true,
    gravity: 1.0,
    strongGravityMode: false,
    scalingRatio: 10,
    outboundAttractionDistribution: true,
    edgeWeightInfluence: 1,
    barnesHutOptimize: true,
    barnesHutTheta: 0.6,
    slowDown: 5,
  },
});
console.error('fa2 done in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
const out = {};
for (const [id, p] of Object.entries(positions)) {
  out[id] = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.error('positions written:', process.argv[3]);
