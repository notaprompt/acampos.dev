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

  // "dream gate" is internal shorthand. It consolidates memory on an idle
  // machine — say that, since a visitor has no way to know a dream is a
  // scheduled background pass rather than a metaphor.
  var DREAM = {
    waiting: 'idle — it reorganises its memory when Alex steps away from the machine',
    dreaming: 'reorganising its memory right now',
    idle: 'not currently reorganising',
    unknown: 'cannot tell from here',
  };

  function render(d) {
    if (!d || d.empty) {
      host.innerHTML = '<div class="dl-quiet">this reads live from Alex’s machine. Nothing received yet — it publishes when the machine is awake.</div>';
      return;
    }
    // Name the thing and say why the numbers exist. Previously this rendered a
    // bare "1,823 memories · 1,755 edges" under the heading "the pulse" — no
    // indication of what system it came from, that it was live rather than
    // decorative, or what a "memory" or "edge" is. A stranger reads an
    // unexplained number as ornament. Insider words (principle-tier, membrane,
    // organs under contract) made that worse by sounding like they meant
    // something without saying what.
    host.innerHTML =
      '<div class="dl-head"><span class="dl-title">CREATURE — live</span>' + liveBadge(d.as_of) +
      '<span class="dl-asof">' + tickspan(d.as_of, 'published ') + '</span></div>' +
      '<div class="dl-what">A synthetic memory system running on Alex’s own machine right now. ' +
      'These numbers are read from it live, not typed in.</div>' +
      '<div class="dl-counts">' + fmt(d.memories) + ' things it remembers · ' +
      fmt(d.edges) + ' links between them · ' + fmt(d.sessions) + ' conversations · ' +
      fmt(d.principle) + ' held as principles (never forgotten)</div>' +
      '<div class="dl-last">' + fmt(d.organs) + ' organs — separate programs it is built from — and ' +
      fmt(d.services) + ' running now · its local language model is ' +
      (d.keeper && d.keeper.model_resident ? 'loaded' : 'unloaded') + '</div>' +
      '<div class="dl-last">unmet needs it has filed for itself: ' +
      (d.keeper && d.keeper.needs ? fmt(d.keeper.needs) : 'none') +
      ' · problems flagged in its own code: ' + (d.findings ? fmt(d.findings) : 'none') + '</div>' +
      '<div class="dl-last">' + esc(DREAM[d.dream] || DREAM.unknown) + '</div>' +
      '<div class="dl-foot">Only counts leave the machine. Nothing it remembers is ever published — ' +
      'not to this page, not anywhere.</div>';
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
