// deuce-live — the signed-forecast ledger, ticking on the project page.
// Reads /api/deuce (counts, hashed ids, timestamps - nothing else exists
// server-side) and renders a quiet terminal panel. Refreshes every 60s.
(function () {
  var host = document.getElementById('deuce-live');
  if (!host || window.__deuceLiveInit) return;
  window.__deuceLiveInit = true;

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  function ago(iso) {
    var ms = Date.now() - new Date(iso).getTime();
    if (!isFinite(ms) || ms < 0) return '';
    var m = Math.floor(ms / 60000);
    if (m < 1) return Math.max(1, Math.floor(ms / 1000)) + 's ago';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + (m - h * 60) + 'm ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  // a span whose text re-derives every second — the page visibly breathes
  function tickspan(iso, prefix) {
    return '<span class="dl-tickable" data-ts="' + esc(iso) + '" data-prefix="' + esc(prefix || '') + '">' +
      esc((prefix || '') + ago(iso)) + '</span>';
  }

  function liveBadge(iso) {
    var fresh = (Date.now() - new Date(iso).getTime()) < 15 * 60000;
    if (fresh) return '<span class="dl-live"><span class="dl-livedot"></span>LIVE</span>';
    return '<span class="dl-live dl-asleep">ASLEEP</span>';
  }

  var seenRows = null; // hashes seen last render — new arrivals get flashed

  function render(d) {
    if (!d || d.empty) {
      host.innerHTML = '<div class="dl-quiet">the ledger publishes when the machine is awake - nothing received yet.</div>';
      return;
    }
    var incoming = (d.tail || []).map(function (r) { return r.h; });
    var rows = (d.tail || []).map(function (r) {
      var isNew = seenRows && seenRows.indexOf(r.h) === -1;
      return '<div class="dl-row' + (isNew ? ' dl-arrived' : '') + '"><span class="dl-hash">' + esc(r.h) + '</span>' +
        '<span class="dl-time">' + esc(r.t) + '</span>' +
        '<span class="dl-state' + (r.open ? ' dl-open' : '') + '">' + (r.open ? 'open' : 'resolved') + '</span></div>';
    }).join('');
    var counts = d.resolved > 0
      ? fmt(d.total) + ' committed · ' + fmt(d.resolved) + ' resolved · ' + fmt(d.open) + ' open · ' + fmt(d.h24) + ' in the last 24h'
      : fmt(d.total) + ' committed · ' + fmt(d.h24) + ' in the last 24h · resolutions not recorded yet - the book only appends';
    seenRows = incoming;
    host.innerHTML =
      '<div class="dl-head"><span class="dl-title">signed-forecast ledger</span>' + liveBadge(d.as_of) +
      '<span class="dl-asof">' + tickspan(d.as_of, 'published ') + '</span></div>' +
      '<div class="dl-gloss">each row is a prediction sealed before the outcome was known — a track record being written in front of you, not a highlight reel assembled after.</div>' +
      '<div class="dl-counts">' + counts + '</div>' +
      (d.last_commit ? '<div class="dl-last">last commitment ' + tickspan(d.last_commit) + '</div>' : '') +
      '<div class="dl-rows">' + rows + '</div>' +
      '<div class="dl-foot">ed25519-signed · committed before resolution · ids shown hashed</div>' +
      paperSection(d.paper) +
      whaleSection(d.whales);
  }

  function signed(v) {
    if (v == null) return '<span class="dl-flat">—</span>';
    var cls = v > 0 ? 'dl-up' : v < 0 ? 'dl-down' : 'dl-flat';
    var txt = (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.abs(v).toFixed(2);
    return '<span class="' + cls + '">' + txt + '</span>';
  }

  function paperSection(p) {
    if (!p || typeof p.equity !== 'number') return '';
    var labels = [['m15', '15m'], ['h1', '1h'], ['d1', '24h'], ['d7', '7d'], ['d30', '30d'], ['d60', '60d']];
    var cells = labels.map(function (l) {
      return '<div class="dl-wcell"><span class="dl-wlabel">' + l[1] + '</span>' + signed(p.w ? p.w[l[0]] : null) + '</div>';
    }).join('');
    return '<div class="dl-head dl-whead"><span class="dl-title">paper book - live</span>' +
      '<span class="dl-asof">' + tickspan(p.mark, 'last mark ') + '</span></div>' +
      '<div class="dl-counts">' + signed(p.equity) + ' all-time paper · ' + p.open + ' open position' + (p.open === 1 ? '' : 's') + '</div>' +
      '<div class="dl-windows">' + cells + '</div>' +
      '<div class="dl-gloss">practice money, real markets, marked like real positions — so if real money is ever risked, the scoreboard it stands on was never hypothetical.</div>' +
      '<div class="dl-foot">consensus-follow book, marked every 10 minutes · paper only - no capital at risk</div>';
  }

  function whaleSection(w) {
    if (!w || !w.feed || !w.feed.length) return '';
    var rows = w.feed.map(function (r) {
      return '<div class="dl-row dl-wrow">' +
        '<span class="dl-time">' + esc(r.t) + '</span>' +
        '<span class="dl-hash">' + esc(r.w) + '</span>' +
        '<span class="dl-usd">$' + Number(r.usd).toLocaleString('en-US') + '</span>' +
        '<span class="dl-move">' + esc(r.s.toLowerCase()) + ' ' + esc(r.o) + ' @ ' + esc(r.p) + '</span>' +
        '<span class="dl-mkt">' + esc(r.m) + '</span></div>';
    }).join('');
    return '<div class="dl-head dl-whead"><span class="dl-title">sharp tape - live</span>' +
      '<span class="dl-asof">' + w.watched + ' validated wallet' + (w.watched === 1 ? '' : 's') + ' under watch</span></div>' +
      '<div class="dl-rows">' + rows + '</div>' +
      '<div class="dl-gloss">a few bettors are provably good, and their money moves before prices do — watching them is borrowing the market\u2019s sharpest eyes as one more input.</div>' +
      '<div class="dl-foot">live public flow of wallets the radar validated as sharp - their money, not mine · wallets shown hashed</div>';
  }

  function tick() {
    fetch('/api/deuce')
      .then(function (r) { return r.json(); })
      .then(render)
      .catch(function () {
        host.innerHTML = '<div class="dl-quiet">ledger unreachable - refresh to try again.</div>';
      });
  }

  tick();
  setInterval(tick, 30000);
  setInterval(function () { // the seconds tick — cheap, textContent only
    host.querySelectorAll('.dl-tickable').forEach(function (el) {
      el.textContent = (el.getAttribute('data-prefix') || '') + ago(el.getAttribute('data-ts'));
    });
  }, 1000);
})();
