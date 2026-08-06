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
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + (m - h * 60) + 'm ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function render(d) {
    if (!d || d.empty) {
      host.innerHTML = '<div class="dl-quiet">the ledger publishes when the machine is awake - nothing received yet.</div>';
      return;
    }
    var rows = (d.tail || []).map(function (r) {
      return '<div class="dl-row"><span class="dl-hash">' + esc(r.h) + '</span>' +
        '<span class="dl-time">' + esc(r.t) + '</span>' +
        '<span class="dl-state' + (r.open ? ' dl-open' : '') + '">' + (r.open ? 'open' : 'resolved') + '</span></div>';
    }).join('');
    host.innerHTML =
      '<div class="dl-head"><span class="dl-title">sf ledger - live</span>' +
      '<span class="dl-asof">published ' + esc(ago(d.as_of)) + '</span></div>' +
      '<div class="dl-counts">' + fmt(d.total) + ' committed · ' + fmt(d.resolved) + ' resolved · ' +
      fmt(d.open) + ' open · ' + fmt(d.h24) + ' in the last 24h</div>' +
      (d.last_commit ? '<div class="dl-last">last commitment ' + esc(ago(d.last_commit)) + '</div>' : '') +
      '<div class="dl-rows">' + rows + '</div>' +
      '<div class="dl-foot">ed25519-signed · committed before resolution · ids shown hashed</div>';
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
  setInterval(tick, 60000);
})();
