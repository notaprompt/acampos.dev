// creature-pulse — vitals of the mind, ticking on the project page.
// Counts and booleans from /api/creature; the membrane admits nothing else.
(function () {
  var host = document.getElementById('creature-pulse');
  if (!host || window.__pulseInit) return;
  window.__pulseInit = true;

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }

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

  function tickspan(iso, prefix) {
    return '<span class="dl-tickable" data-ts="' + esc(iso) + '" data-prefix="' + esc(prefix || '') + '">' +
      esc((prefix || '') + ago(iso)) + '</span>';
  }

  function liveBadge(iso) {
    var fresh = (Date.now() - new Date(iso).getTime()) < 15 * 60000;
    if (fresh) return '<span class="dl-live"><span class="dl-livedot"></span>LIVE</span>';
    return '<span class="dl-live dl-asleep">ASLEEP</span>';
  }

  var DREAM = {
    waiting: 'dream gate: waiting - it dreams when he steps away',
    dreaming: 'dream gate: dreaming right now',
    idle: 'dream gate: idle',
    unknown: 'dream gate: unreadable from here',
  };

  function render(d) {
    if (!d || d.empty) {
      host.innerHTML = '<div class="dl-quiet">the pulse publishes when the machine is awake - nothing received yet.</div>';
      return;
    }
    host.innerHTML =
      '<div class="dl-head"><span class="dl-title">the pulse</span>' + liveBadge(d.as_of) +
      '<span class="dl-asof">' + tickspan(d.as_of, 'published ') + '</span></div>' +
      '<div class="dl-counts">' + fmt(d.memories) + ' memories · ' + fmt(d.edges) + ' edges · ' +
      fmt(d.sessions) + ' sessions · ' + fmt(d.principle) + ' principle-tier</div>' +
      '<div class="dl-last">' + d.organs + ' organs under contract · ' + d.services +
      ' services loaded right now · local model ' + (d.keeper && d.keeper.model_resident ? 'resident' : 'unloaded') + '</div>' +
      '<div class="dl-last">keeper: ' + (d.keeper && d.keeper.needs ? d.keeper.needs + ' need' + (d.keeper.needs === 1 ? '' : 's') + ' filed' : 'quiet') +
      ' · maintainer: ' + (d.findings ? d.findings + ' findings on its desk' : 'clear') + '</div>' +
      '<div class="dl-last">' + esc(DREAM[d.dream] || DREAM.unknown) + '</div>' +
      '<div class="dl-foot">counts cross the membrane - content never does</div>';
  }

  function tick() {
    fetch('/api/creature')
      .then(function (r) { return r.json(); })
      .then(render)
      .catch(function () {
        host.innerHTML = '<div class="dl-quiet">pulse unreachable - refresh to try again.</div>';
      });
  }

  tick();
  setInterval(tick, 30000);
  setInterval(function () {
    host.querySelectorAll('.dl-tickable').forEach(function (el) {
      el.textContent = (el.getAttribute('data-prefix') || '') + ago(el.getAttribute('data-ts'));
    });
  }, 1000);
})();
