// Guestbook — server-persisted entries, shared across all visitors
(function () {
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch (e) {
      return '';
    }
  }

  function renderEntries(entries) {
    var container = document.getElementById('guestbook-entries');
    if (!container) return;

    if (!entries || entries.length === 0) {
      container.innerHTML = '<p class="gb-empty">no entries yet. be the first.</p>';
      return;
    }

    container.innerHTML = entries.map(function (entry, i) {
      return '<div class="gb-entry" style="background: var(--depth-' + (i % 2 === 0 ? '1' : '2') + ');">' +
        '<div class="gb-entry-header">' +
          '<span class="gb-name">' + escapeHTML(entry.name) + '</span>' +
          (entry.website
            ? '<a href="' + escapeHTML(entry.website) + '" class="gb-website" target="_blank" rel="noopener noreferrer nofollow">' + escapeHTML(entry.website) + '</a>'
            : '') +
          '<span class="gb-date">' + formatDate(entry.created_at) + '</span>' +
        '</div>' +
        '<p class="gb-message">' + escapeHTML(entry.message) + '</p>' +
      '</div>';
    }).join('');
  }

  // Load entries from server
  fetch('/api/guestbook')
    .then(function (r) { return r.json(); })
    .then(renderEntries)
    .catch(function () {
      renderEntries([]);
    });

  // Form handler
  var form = document.getElementById('guestbook-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = form.querySelector('#gb-name').value.trim();
    var website = form.querySelector('#gb-website').value.trim();
    var message = form.querySelector('#gb-message').value.trim();
    if (!name || !message) return;

    var btn = form.querySelector('.gb-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'signing...'; }

    fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, website: website, message: message }),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
        // Reload entries
        return fetch('/api/guestbook').then(function (r2) { return r2.json(); });
      })
      .then(function (entries) {
        renderEntries(entries);
        form.reset();
      })
      .catch(function (err) {
        alert(err.message || 'Could not save. Try again.');
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'sign guestbook'; }
      });
  });

  // Inject entry styles
  var style = document.createElement('style');
  style.textContent = [
    '.gb-entry { padding: 0.75rem 1rem; margin-bottom: 0.25rem; border: 1px solid var(--white-04); }',
    '.gb-entry-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.75rem; margin-bottom: 0.35rem; }',
    '.gb-name { font-family: var(--mono); font-size: 0.8rem; color: var(--gold-accent); font-weight: bold; }',
    '.gb-website { font-family: var(--mono); font-size: 0.65rem; color: var(--white-30); }',
    '.gb-date { font-family: var(--mono); font-size: 0.65rem; color: var(--white-20); margin-left: auto; }',
    '.gb-message { font-size: 0.9rem; color: var(--glow); margin: 0; line-height: 1.5; }',
  ].join('\n');
  document.head.appendChild(style);
})();
