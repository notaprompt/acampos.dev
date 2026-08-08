// Hit counter — unique visitor counter via server API
// Uses a persistent browser fingerprint (localStorage) so VPN/IP changes don't inflate the count
(function () {
  var el = document.getElementById('hit-digits');
  if (!el) return;
  var DIGITS = 6;
  var CACHE_KEY = 'campos-hits-cache';
  var VID_KEY = 'campos-visitor-id';
  var REFRESH_MS = 60000;

  function render(count) {
    var str = String(count).padStart(DIGITS, '0');
    var spans = el.querySelectorAll('.digit');
    for (var i = 0; i < spans.length && i < str.length; i++) {
      spans[i].textContent = str[i];
    }
  }

  // Paint the last known count immediately. The markup ships as 000000, so
  // until the fetch resolved the counter read as a brand-new site with zero
  // visitors — and on a slow or failed request it stayed that way.
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) render(parseInt(cached, 10));

  var vid = localStorage.getItem(VID_KEY);
  if (!vid) {
    vid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VID_KEY, vid);
  }

  // POST once (registers this visitor), then GET to refresh. Re-POSTing on a
  // timer would be harmless server-side — the vid is deduped — but it is a
  // write on a read path, so only the first call posts.
  function update(method) {
    var opts = method === 'POST'
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: vid }) }
      : { method: 'GET' };
    return fetch('/api/hits', opts)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        // Belt as well as braces: never let an error payload or a zero
        // overwrite a real count. The API used to answer DB failures with
        // count: 0, and with polling that would have cached a zero.
        if (data && data.error) return;
        if (data && data.count === 0 && cached) return;
        if (data && data.count != null) {
          render(data.count);
          // The old code READ this key in its error branch but nothing ever
          // WROTE it, so the offline fallback could only ever read null and
          // silently do nothing. Writing it is what makes that branch real.
          try { localStorage.setItem(CACHE_KEY, String(data.count)); } catch (e) {}
        }
      })
      .catch(function () { /* cached value already painted above */ });
  }

  update('POST');

  // Previously this fetched exactly once per page load, so the number was
  // frozen until a manual refresh — while the creature-pulse card beside it
  // polled every 30s. Same page, two different ideas about staleness.
  setInterval(function () { update('GET'); }, REFRESH_MS);

  // Tab-switching back is the moment a stale number is most visible.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) update('GET');
  });
})();
