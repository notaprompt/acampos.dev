// Hit counter — real unique-IP counter via server API
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

  // Register this visit + get total count
  fetch('/api/hits', { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.count != null) render(data.count);
    })
    .catch(function () {
      // Fallback: show cached count from localStorage
      var cached = localStorage.getItem('campos-hits-cache');
      if (cached) render(parseInt(cached, 10));
    });
})();
