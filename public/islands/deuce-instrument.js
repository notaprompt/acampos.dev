// deuce-instrument — the machine, drawn. Interactive architecture of DEUCE:
// touch a station to see the engineering feat, the choice, and what it refuses.
// Live pulses ride the pipeline at a rate set by the real ledger (/api/deuce).
(function () {
  var host = document.getElementById('deuce-instrument');
  if (!host || window.__deuceInstr) return;
  window.__deuceInstr = true;

  var NODES = [
    { id: 'venues', x: 40,  label: 'VENUES', sub: 'polymarket · kalshi',
      plain: 'two exchanges where real money bets on live tennis. two books means prices disagree \u2014 and disagreement is where mispricing shows.',
      feat: 'Read adapters for two prediction-market venues, normalized into one schema.',
      choice: 'Reads first. A write path is not built until the ledger earns it.',
      refuses: 'Refuses venue lock-in — either book can vanish and the tape survives.' },
    { id: 'tape', x: 150, label: 'TAPE', sub: 'cross-venue · 5s',
      plain: 'one steady record of what every market charged, every five seconds. you cannot prove you beat a price you never wrote down \u2014 the tape is the ground truth the whole system is graded against.',
      feat: 'One coherent price tape across venues, polled on a 5-second cadence, hundreds of cycles without drift.',
      choice: 'Polling + normalization over websockets-first: boring, inspectable, restartable.',
      refuses: 'Refuses "real-time" theater — the cadence matches what the strategy can actually act on.' },
    { id: 'sensors', x: 260, label: 'SENSORS', sub: 'whales · winners · slips',
      plain: 'where big money moves, how favorites actually resolve, what execution really costs. the scoreboard shows none of this \u2014 and the bettor who ignores it is the one paying for everyone else\u2019s edge.',
      feat: 'A whale tripwire watching where size moves, a winner feed for how favorites resolve, a slip watcher for execution reality.',
      choice: 'Many weak signals stacked; none trusted alone. Each sensor is a separate daemon that can die alone.',
      refuses: 'Refuses a single oracle. No sensor gets to be the answer.' },
    { id: 'pricer', x: 380, label: 'PRICER', sub: 'fair value',
      plain: 'DEUCE forms its own opinion of the odds before seeing anyone else\u2019s. an opinion borrowed from the market can never beat the market \u2014 independence is what makes the grade mean anything.',
      feat: 'An independent probability for each side of an in-play match — a price arrived at before looking at the market’s.',
      choice: 'Model read + sensor stack + tour thesis (WTA/ITF favored-unders), combined into one number I can be graded on.',
      refuses: 'Refuses to use the market price as an input to itself — else the grade means nothing.' },
    { id: 'gate', x: 490, label: 'GATE', sub: 'reject-first',
      plain: 'a bouncer: most markets get turned away. models rarely die on the bets they make \u2014 they die on malformed markets they should never have touched. saying no is where the edge survives.',
      feat: 'A reject-first filter: markets must be cleanly scoreable and observable within their own latency, or DEUCE walks.',
      choice: '"No trade" is a position. Rejecting a badly-shaped market is half the job.',
      refuses: 'Refuses action bias. Most markets are left alone, on purpose.' },
    { id: 'sign', x: 590, label: 'SIGN', sub: 'ed25519 · append-only',
      plain: 'sealed in writing before the match ends. this is the difference between a story about being right and evidence of it \u2014 nobody, including me, can improve the record afterward.',
      feat: 'Every forecast committed to a tamper-evident ledger BEFORE resolution — probability, timestamp, market id, signed.',
      choice: 'Deletion is refused by SQL trigger. The schema itself will not let history be rewritten.',
      refuses: 'Refuses backdating — including mine. The record cannot be made to look sharper than it was.' },
    { id: 'grade', x: 700, label: 'GRADE', sub: 'CLV, not P&L',
      plain: 'was my number closer than the market\u2019s final one? profit can be luck for months; the closing line tells the truth in weeks. grading on the line keeps a lucky streak from being mistaken for skill.',
      feat: 'Gap accounting: each forecast graded on closing-line value — the gap between my price and the price the market settled toward.',
      choice: 'CLV over P&L: money is noisy and slow to teach; the closing line tells you if the edge is real first.',
      refuses: 'Refuses the good-week screenshot. P&L does not get to speak until CLV has.' },
    { id: 'capital', x: 810, label: 'CAPITAL', sub: 'locked', locked: true,
      plain: 'real money, still locked. most trading projects die by skipping this step. it unlocks on a proven record \u2014 never on a good feeling.',
      feat: 'Real money. Currently: zero at risk. Paper positions run against live markets and are marked every 10 minutes.',
      choice: 'One gate, in order: CLV-positive over a real paper sample opens this. Nothing else does.',
      refuses: 'Refuses optimism as a key. The ledger decides when this unlocks — not a good mood.' },
    { id: 'mind', x: 380, y: 190, wide: true, label: 'SOVEREIGN MIND', sub: 'an organ of CREATURE',
      plain: 'DEUCE\u2019s memory and judgment run on my machine, inside the same private system as everything else I build. an edge and a track record are exactly the things you do not want living on someone else\u2019s computer.',
      feat: 'DEUCE runs on the same local substrate as everything else: ForgeFrame memory holds the theses and their history; the judgment kernel scores any move that touches money.',
      choice: 'Money is a local-only lane — thesis documents, positions and grades never leave the machine.',
      refuses: 'Refuses cloud custody of financial cognition. The mind that prices is the mind you own.' }
  ];

  var W = 900, H = 252, NY = 50, NW = 88, NH = 46;
  function nx(n) { return n.x; }
  function ny(n) { return n.y || NY; }

  var svgParts = [];
  svgParts.push('<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="DEUCE architecture">');
  // pipeline edges
  for (var i = 0; i < 7; i++) {
    var a = NODES[i], b = NODES[i + 1];
    svgParts.push('<line class="di-edge" x1="' + (nx(a) + NW) + '" y1="' + (NY + NH / 2) +
      '" x2="' + nx(b) + '" y2="' + (NY + NH / 2) + '"/>');
  }
  // substrate feeds
  svgParts.push('<path class="di-edge di-feed" d="M 420 190 L 420 ' + (NY + NH) + '"/>');
  svgParts.push('<path class="di-edge di-feed" d="M 500 190 C 510 160, 520 ' + (NY + NH + 24) + ', 528 ' + (NY + NH) + '"/>');
  // nodes
  NODES.forEach(function (n) {
    var w = n.wide ? 250 : NW, x = n.wide ? n.x - 40 : n.x, y = ny(n);
    svgParts.push('<g class="di-node' + (n.locked ? ' di-locked' : '') + '" data-id="' + n.id + '" tabindex="0">' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + NH + '" rx="3"/>' +
      '<text class="di-label" x="' + (x + w / 2) + '" y="' + (y + 19) + '">' + n.label + (n.locked ? ' ⊘' : '') + '</text>' +
      '<text class="di-sub" x="' + (x + w / 2) + '" y="' + (y + 35) + '">' + n.sub + '</text></g>');
  });
  // pulse dots (animated via JS)
  svgParts.push('<circle class="di-pulse" r="3" cx="-10" cy="' + (NY + NH / 2) + '"/>');
  svgParts.push('<circle class="di-pulse di-pulse2" r="3" cx="-10" cy="' + (NY + NH / 2) + '"/>');
  svgParts.push('</svg>');

  host.innerHTML =
    '<div class="di-head"><span class="di-title">the machine</span>' +
    '<span class="di-hint">touch a station — feat, choice, and what it refuses</span></div>' +
    '<div class="di-scroll">' + svgParts.join('') + '</div>' +
    '<div class="di-detail" id="di-detail"><span class="di-dim">cold read: people bet real money on live tennis through prediction markets. ' +
    'DEUCE forms its own opinion of the odds, seals that opinion in a signed record before the match ends, ' +
    'then checks who was closer — it, or the market. every box above is running code except the locked one, ' +
    'and the locked one is the point: no real money until the record proves it deserves any.</span></div>' +
    '<div class="di-ladder" id="di-ladder"></div>' +
    gapStrip();

  // gap accounting, drawn: every forecast is graded on the distance between
  // my price and the closing line. The axes are illustrative; the real gaps
  // live in the signed ledger, committed before resolution.
  function gapStrip() {
    var y = 34, x0 = 60, x1 = 840, mine = 0.62, close = 0.55;
    function px(v) { return x0 + (x1 - x0) * v; }
    return '<div class="di-gap"><div class="di-lhead">gap accounting — what a forecast is graded on</div>' +
      '<div class="di-drow di-plain">the market\u2019s final price is the best public guess. if my earlier, sealed price keeps landing closer to it, the edge is real — that, not profit, is the score that matters first.</div>' +
      '<div class="di-scroll"><svg viewBox="0 0 900 78" role="img" aria-label="closing line value diagram">' +
      '<line class="di-axis" x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '"/>' +
      '<text class="di-sub" x="' + x0 + '" y="' + (y + 18) + '">0%</text>' +
      '<text class="di-sub" x="' + x1 + '" y="' + (y + 18) + '">100%</text>' +
      '<rect class="di-gapband" x="' + px(close) + '" y="' + (y - 7) + '" width="' + (px(mine) - px(close)) + '" height="14"/>' +
      '<circle class="di-closemark" cx="' + px(close) + '" cy="' + y + '" r="4"/>' +
      '<text class="di-sub" x="' + px(close) + '" y="' + (y + 20) + '">closing line</text>' +
      '<path class="di-minemark" d="M ' + px(mine) + ' ' + (y - 12) + ' l 5 -8 l -10 0 z"/>' +
      '<text class="di-sub" x="' + px(mine) + '" y="' + (y - 24) + '">my price, signed first</text>' +
      '<text class="di-gaplabel" x="' + ((px(mine) + px(close)) / 2) + '" y="' + (y + 34) + '">the gap — CLV. positive over a real sample opens the capital gate</text>' +
      '</svg></div>' +
      '<div class="di-lfoot">P&amp;L is noisy and slow to teach; the closing line says whether the edge is real first. ' +
      'axes illustrative — the real gaps are in the ledger, committed before resolution.</div></div>';
  }

  var detail = document.getElementById('di-detail');
  function show(id) {
    var n = NODES.filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    detail.innerHTML =
      '<div class="di-dname">' + n.label + (n.locked ? ' — locked' : '') + '</div>' +
      (n.plain ? '<div class="di-drow di-plain">' + n.plain + '</div>' : '') +
      '<div class="di-drow"><b>the feat</b> ' + n.feat + '</div>' +
      '<div class="di-drow"><b>the choice</b> ' + n.choice + '</div>' +
      '<div class="di-drow"><b>it refuses</b> ' + n.refuses + '</div>';
  }
  host.querySelectorAll('.di-node').forEach(function (g) {
    ['mouseenter', 'focus', 'click'].forEach(function (ev) {
      g.addEventListener(ev, function () {
        host.querySelectorAll('.di-node').forEach(function (o) { o.classList.remove('di-on'); });
        g.classList.add('di-on');
        show(g.getAttribute('data-id'));
      });
    });
  });

  // the financing ladder — one gate, in order
  function ladder(d) {
    var stages = [
      { k: 'paper', t: 'PAPER', s: 'forecasts vs live markets, $0 at risk', now: true },
      { k: 'clv', t: 'CLV‑POSITIVE', s: 'calibration proven on a real signed sample' },
      { k: 'live', t: 'SMALL LIVE', s: 'capped risk bands, the ledger keeps grading' },
      { k: 'fleet', t: 'FLEET', s: 'many markets, covered books — earned, not claimed' }
    ];
    var eq = d && d.paper && typeof d.paper.equity === 'number'
      ? (d.paper.equity >= 0 ? '+' : '−') + '$' + Math.abs(d.paper.equity).toFixed(2) + ' paper all‑time' : '';
    document.getElementById('di-ladder').innerHTML =
      '<div class="di-lhead">the financing model — one gate, in order' +
      (eq ? ' <span class="di-leq">' + eq + '</span>' : '') + '</div>' +
      stages.map(function (s, i) {
        return '<div class="di-stage' + (s.now ? ' di-now' : '') + '">' +
          '<span class="di-sdot">' + (s.now ? '◉' : '○') + '</span>' +
          '<span class="di-st">' + s.t + '</span><span class="di-ss">' + s.s + '</span>' +
          (i < stages.length - 1 ? '<span class="di-gate-glyph">🔒</span>' : '') + '</div>';
      }).join('') +
      '<div class="di-lfoot">each lock opens only from the left. capital never skips the line. ' +
      'plainly: it is in practice mode on purpose, and promotion is earned by accuracy, not confidence.</div>';
  }

  // live pulses — rate from the real ledger
  var pulseMs = 4200;
  var p1 = host.querySelector('.di-pulse'), p2 = host.querySelector('.di-pulse2');
  var x0 = nx(NODES[0]) + NW, x1 = nx(NODES[6]) + NW;
  function animate(el, offset) {
    var t0 = performance.now() - offset;
    (function frame(t) {
      if (!document.body.contains(el)) return;
      var k = ((t - t0) % pulseMs) / pulseMs;
      el.setAttribute('cx', x0 + (x1 - x0) * k);
      el.style.opacity = k < 0.03 || k > 0.97 ? 0 : 0.9;
      requestAnimationFrame(frame);
    })(performance.now());
  }
  animate(p1, 0); animate(p2, pulseMs / 2);

  fetch('/api/deuce').then(function (r) { return r.json(); }).then(function (d) {
    ladder(d);
    if (d && d.h24) pulseMs = Math.max(1400, 6000 - Math.min(4000, d.h24 * 40));
  }).catch(function () { ladder(null); });
})();
