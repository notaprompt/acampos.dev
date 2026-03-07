// Hit counter — localStorage-based odometer
(function () {
  const KEY = 'campos-site-hits';
  const DIGITS = 6;

  let count = parseInt(localStorage.getItem(KEY) || '0', 10);
  count++;
  localStorage.setItem(KEY, String(count));

  const el = document.getElementById('hit-digits');
  if (!el) return;

  const str = String(count).padStart(DIGITS, '0');
  const spans = el.querySelectorAll('.digit');

  for (let i = 0; i < spans.length && i < str.length; i++) {
    spans[i].textContent = str[i];
  }
})();
