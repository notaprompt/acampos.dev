// Hit counter — unique visitor counter via server API
// Uses a persistent browser fingerprint (localStorage) so VPN/IP changes don't inflate the count
(function () {
  var el = document.getElementById('hit-digits');
  if (!el) return;
  var DIGITS = 6;

  function render(count) {
    var str = String(count).padStart(DIGITS, '0');
    var spans = el.querySelectorAll('.digit');
    for (var i = 0; i < spans.length && i < str.length; i++) {
      spans[i].textContent = str[i];
    }
  }

  // Get or create a persistent visitor ID
  var VID_KEY = 'campos-visitor-id';
  var vid = localStorage.getItem(VID_KEY);
  if (!vid) {
    vid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VID_KEY, vid);
  }

  fetch('/api/hits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vid: vid }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.count != null) render(data.count);
    })
    .catch(function () {
      var cached = localStorage.getItem('campos-hits-cache');
      if (cached) render(parseInt(cached, 10));
    });
})();
