// Guestbook — localStorage entries with XSS protection
(function () {
  const KEY = 'campos-site-guestbook';
  const MAX_ENTRIES = 100;

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  }

  function renderEntries(entries) {
    const container = document.getElementById('guestbook-entries');
    if (!container) return;

    if (entries.length === 0) {
      container.innerHTML = '<p class="gb-empty">no entries yet. be the first.</p>';
      return;
    }

    container.innerHTML = entries
      .map(
        (entry, i) => `
      <div class="gb-entry" style="background: var(--depth-${i % 2 === 0 ? '1' : '2'});">
        <div class="gb-entry-header">
          <span class="gb-name">${escapeHTML(entry.name)}</span>
          ${
            entry.website
              ? `<a href="${escapeHTML(entry.website)}" class="gb-website" target="_blank" rel="noopener noreferrer nofollow">${escapeHTML(entry.website)}</a>`
              : ''
          }
          <span class="gb-date">${escapeHTML(entry.date)}</span>
        </div>
        <p class="gb-message">${escapeHTML(entry.message)}</p>
      </div>
    `
      )
      .join('');
  }

  // Initial render
  const entries = loadEntries();
  renderEntries(entries);

  // Form handler
  const form = document.getElementById('guestbook-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = form.querySelector('#gb-name').value.trim();
    const website = form.querySelector('#gb-website').value.trim();
    const message = form.querySelector('#gb-message').value.trim();

    if (!name || !message) return;

    const entry = {
      name: name.slice(0, 50),
      website: website.slice(0, 200),
      message: message.slice(0, 500),
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    };

    const updated = [entry, ...loadEntries()].slice(0, MAX_ENTRIES);
    saveEntries(updated);
    renderEntries(updated);
    form.reset();
  });

  // Inject entry styles
  const style = document.createElement('style');
  style.textContent = `
    .gb-entry {
      padding: 0.75rem 1rem;
      margin-bottom: 0.25rem;
      border: 1px solid var(--white-04);
    }
    .gb-entry-header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 0.35rem;
    }
    .gb-name {
      font-family: var(--mono);
      font-size: 0.8rem;
      color: var(--gold-accent);
      font-weight: bold;
    }
    .gb-website {
      font-family: var(--mono);
      font-size: 0.65rem;
      color: var(--white-30);
    }
    .gb-date {
      font-family: var(--mono);
      font-size: 0.65rem;
      color: var(--white-20);
      margin-left: auto;
    }
    .gb-message {
      font-size: 0.9rem;
      color: var(--glow);
      margin: 0;
      line-height: 1.5;
    }
  `;
  document.head.appendChild(style);
})();
