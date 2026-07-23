// me-mode — Alex's private editorial layer.
// Activate: visit any page with ?me=<token> (stored in localStorage). ?me=off to leave.
// Highlight text -> "note" -> type or dictate -> saved to the editorial queue
// that the next Claude Code pass reads via GET /api/annotate?token=...
(function () {
  if (window.__meModeInit) return;
  window.__meModeInit = true;

  var url = new URL(location.href);
  var param = url.searchParams.get('me');
  if (param === 'off') {
    localStorage.removeItem('me_mode');
    url.searchParams.delete('me');
    history.replaceState({}, '', url.pathname + url.search + url.hash);
    return;
  }
  if (param) {
    localStorage.setItem('me_mode', param);
    url.searchParams.delete('me');
    history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
  var token = localStorage.getItem('me_mode');
  if (!token) return;

  // ── styles ──
  var css = document.createElement('style');
  css.textContent = [
    '#mm-badge{position:fixed;bottom:12px;right:12px;z-index:99998;font-family:var(--mono,monospace);',
    'font-size:.6rem;letter-spacing:.1em;color:#b8965a;background:rgba(20,20,15,.85);',
    'border:1px solid rgba(184,150,90,.4);border-radius:4px;padding:5px 9px;cursor:pointer;backdrop-filter:blur(6px);}',
    '#mm-badge:hover{border-color:#b8965a;}',
    '#mm-fab{position:absolute;z-index:99999;font-family:var(--mono,monospace);font-size:.62rem;letter-spacing:.06em;',
    'color:#0d0d0c;background:#b8965a;border:none;border-radius:4px;padding:4px 9px;cursor:pointer;',
    'box-shadow:0 2px 8px rgba(0,0,0,.4);display:none;}',
    '#mm-pop{position:fixed;z-index:99999;width:300px;max-width:92vw;background:#141410;',
    'border:1px solid rgba(184,150,90,.4);border-radius:8px;padding:12px;font-family:var(--mono,monospace);',
    'box-shadow:0 8px 30px rgba(0,0,0,.6);display:none;}',
    '#mm-pop .mm-quote{font-size:.62rem;color:#8a8578;line-height:1.5;max-height:64px;overflow:auto;',
    'border-left:2px solid rgba(184,150,90,.4);padding-left:8px;margin-bottom:8px;}',
    '#mm-pop textarea{width:100%;box-sizing:border-box;min-height:64px;background:#0d0d0c;color:#d8d4c8;',
    'border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:7px;font-family:var(--mono,monospace);',
    'font-size:.72rem;outline:none;resize:vertical;}',
    '#mm-pop textarea:focus{border-color:#b8965a;}',
    '#mm-row{display:flex;gap:6px;margin-top:8px;align-items:center;}',
    '#mm-mic{font-size:.85rem;background:none;border:1px solid rgba(255,255,255,.12);border-radius:5px;',
    'color:#8a8578;cursor:pointer;padding:3px 8px;}',
    '#mm-mic.rec{color:#c75050;border-color:#c75050;animation:mmpulse 1s infinite;}',
    '@keyframes mmpulse{50%{opacity:.5;}}',
    '#mm-save{margin-left:auto;font-size:.65rem;color:#0d0d0c;background:#b8965a;border:none;',
    'border-radius:5px;padding:5px 12px;cursor:pointer;letter-spacing:.05em;}',
    '#mm-cancel{font-size:.65rem;color:#8a8578;background:none;border:none;cursor:pointer;}',
    '#mm-toast{position:fixed;bottom:48px;right:12px;z-index:99999;font-family:var(--mono,monospace);',
    'font-size:.6rem;color:#7c9070;background:rgba(20,20,15,.9);border:1px solid rgba(124,144,112,.4);',
    'border-radius:4px;padding:5px 9px;opacity:0;transition:opacity .3s;}',
  ].join('');
  document.head.appendChild(css);

  var badge = document.createElement('div');
  badge.id = 'mm-badge';
  badge.textContent = '✎ me-mode';
  badge.title = 'editorial mode on — click to leave';
  document.body.appendChild(badge);
  badge.addEventListener('click', function () {
    if (confirm('leave me-mode?')) { localStorage.removeItem('me_mode'); location.reload(); }
  });

  var fab = document.createElement('button');
  fab.id = 'mm-fab';
  fab.textContent = '✎ note';
  document.body.appendChild(fab);

  var pop = document.createElement('div');
  pop.id = 'mm-pop';
  var quote = document.createElement('div'); quote.className = 'mm-quote';
  var ta = document.createElement('textarea'); ta.placeholder = 'what should change here? (type or 🎤)';
  var row = document.createElement('div'); row.id = 'mm-row';
  var mic = document.createElement('button'); mic.id = 'mm-mic'; mic.textContent = '🎤'; mic.title = 'dictate';
  var cancel = document.createElement('button'); cancel.id = 'mm-cancel'; cancel.textContent = 'cancel';
  var save = document.createElement('button'); save.id = 'mm-save'; save.textContent = 'save note';
  row.appendChild(mic); row.appendChild(cancel); row.appendChild(save);
  pop.appendChild(quote); pop.appendChild(ta); pop.appendChild(row);
  document.body.appendChild(pop);

  var toast = document.createElement('div'); toast.id = 'mm-toast'; document.body.appendChild(toast);
  function flash(msg, ok) {
    toast.textContent = msg;
    toast.style.color = ok === false ? '#c75050' : '#7c9070';
    toast.style.borderColor = ok === false ? 'rgba(199,80,80,.4)' : 'rgba(124,144,112,.4)';
    toast.style.opacity = '1';
    setTimeout(function () { toast.style.opacity = '0'; }, 2200);
  }

  var currentSel = '';
  function hideFab() { fab.style.display = 'none'; }
  function onSelect() {
    if (pop.style.display === 'block') return;
    var sel = window.getSelection();
    var text = sel && sel.toString().trim();
    if (!text || text.length < 2) { hideFab(); return; }
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    currentSel = text;
    fab.style.left = (window.scrollX + rect.left) + 'px';
    fab.style.top = (window.scrollY + rect.bottom + 6) + 'px';
    fab.style.display = 'block';
  }
  document.addEventListener('mouseup', function () { setTimeout(onSelect, 10); });

  fab.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep selection
  fab.addEventListener('click', function () {
    hideFab();
    quote.textContent = currentSel;
    ta.value = '';
    pop.style.display = 'block';
    pop.style.left = Math.min(window.innerWidth - 312, Math.max(8, (parseFloat(fab.style.left) - window.scrollX))) + 'px';
    pop.style.top = Math.min(window.innerHeight - 200, Math.max(8, (parseFloat(fab.style.top) - window.scrollY))) + 'px';
    setTimeout(function () { ta.focus(); }, 60);
  });
  cancel.addEventListener('click', function () { pop.style.display = 'none'; });

  // ── voice dictation ──
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, listening = false;
  if (!Rec) { mic.style.display = 'none'; }
  mic.addEventListener('click', function () {
    if (!Rec) return;
    if (listening) { rec && rec.stop(); return; }
    rec = new Rec(); rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = true;
    rec.onstart = function () { listening = true; mic.classList.add('rec'); };
    rec.onend = function () { listening = false; mic.classList.remove('rec'); };
    rec.onerror = function () { listening = false; mic.classList.remove('rec'); };
    rec.onresult = function (ev) {
      var t = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      ta.value = (ta.value ? ta.value + ' ' : '') + t.trim();
    };
    rec.start();
  });

  save.addEventListener('click', function () {
    var note = ta.value.trim();
    if (!note) { ta.focus(); return; }
    if (listening && rec) rec.stop();
    save.textContent = 'saving…';
    fetch('/api/annotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, path: location.pathname, selection: currentSel, note: note }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        save.textContent = 'save note';
        pop.style.display = 'none';
        if (res.ok && res.d.ok) flash('noted ✓'); else flash((res.d && res.d.error) || 'failed', false);
      })
      .catch(function () { save.textContent = 'save note'; flash('network error', false); });
  });
})();
