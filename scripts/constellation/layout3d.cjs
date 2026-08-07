// 3D force layout over the connected core - ngraph.forcelayout, dimensions: 3.
const fs = require('fs');
const createGraph = require('ngraph.graph');
const createLayout = require('ngraph.forcelayout');

const topo = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const g = createGraph();
for (const n of topo.nodes) if (n.d > 0) g.addNode(n.i);
for (const [a, b, w] of topo.edges) {
  if (g.getNode(a) && g.getNode(b)) g.addLink(a, b, { weight: w });
}
console.error(`graph: ${g.getNodesCount()} nodes ${g.getLinksCount()} links`);

const layout = createLayout(g, {
  dimensions: 3,
  springLength: 30,
  springCoefficient: 0.0009,
  gravity: -14,
  dragCoefficient: 0.05,
  timeStep: 18,
});
const t0 = Date.now();
for (let i = 0; i < 700; i++) layout.step();
console.error('layout done in', ((Date.now() - t0) / 1000).toFixed(1) + 's');

const out = {};
g.forEachNode((n) => {
  const p = layout.getNodePosition(n.id);
  out[n.id] = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, Math.round(p.z * 10) / 10];
});
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.error('positions written:', process.argv[3]);
