/**
 * Hidden playlist admin — triggered by double-clicking the hifi in the desk scene.
 * Password-gated. Reads/writes to /api/playlist (Neon DB-backed).
 */
(function () {
  'use strict';
  if (window.__playlistAdmin) return;

  var HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
  var overlay = null;
  var authenticated = false;
  var passwordRaw = '';
  var playlist = [];

  var DEFAULT_PROFILE = {
    hitThresh: 0.04, bendAmp: 1.3, steerSens: 1.8,
    midSnap: 2.5, flipThresh: 0.55, smoothing: 0.65
  };

  async function sha256(str) {
    var buf = new TextEncoder().encode(str);
    var hash = await crypto.subtle.digest('SHA-256', buf);
    var arr = new Uint8Array(hash);
    return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Save entire playlist to API
  async function saveToAPI() {
    var hash = await sha256(passwordRaw);
    try {
      await fetch('/api/playlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-hash': hash },
        body: JSON.stringify(playlist),
      });
      flash('saved', '#5BF29B');
    } catch (e) {
      flash('save failed', '#c75050');
    }
  }

  function flash(msg, color) {
    var list = document.getElementById('pa-list');
    if (!list) return;
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'font-size:9px;color:' + color + ';opacity:0.6;padding:4px 0;text-align:center;';
    list.prepend(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 1500);
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'playlist-admin-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(5,5,5,0.95);display:none;overflow-y:auto;font-family:JetBrains Mono,monospace;color:#E8DCC8;';
    overlay.innerHTML = '<div style="max-width:480px;margin:0 auto;padding:24px 16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
        '<span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.4;">playlist admin</span>' +
        '<button id="pa-close" style="background:none;border:none;color:#E8DCC8;font-size:18px;cursor:pointer;opacity:0.5;font-family:inherit;">\u00d7</button>' +
      '</div>' +
      '<div id="pa-auth" style="margin-bottom:20px;">' +
        '<input id="pa-pass" type="password" placeholder="password" style="width:100%;background:#0C0C0C;border:1px solid rgba(232,220,200,0.09);color:#E8DCC8;padding:8px 12px;font-family:inherit;font-size:12px;outline:none;" />' +
        '<div id="pa-err" style="font-size:10px;color:#c75050;margin-top:4px;display:none;"></div>' +
      '</div>' +
      '<div id="pa-content" style="display:none;">' +
        '<div id="pa-list"></div>' +
        '<div style="margin-top:16px;border-top:1px solid rgba(232,220,200,0.09);padding-top:16px;">' +
          '<span style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.3;display:block;margin-bottom:8px;">add track</span>' +
          '<input id="pa-artist" placeholder="artist" style="width:100%;background:#0C0C0C;border:1px solid rgba(232,220,200,0.09);color:#E8DCC8;padding:6px 10px;font-family:inherit;font-size:11px;margin-bottom:6px;outline:none;" />' +
          '<input id="pa-title" placeholder="title" style="width:100%;background:#0C0C0C;border:1px solid rgba(232,220,200,0.09);color:#E8DCC8;padding:6px 10px;font-family:inherit;font-size:11px;margin-bottom:6px;outline:none;" />' +
          '<input id="pa-url" placeholder="/audio/filename.mp3" style="width:100%;background:#0C0C0C;border:1px solid rgba(232,220,200,0.09);color:#E8DCC8;padding:6px 10px;font-family:inherit;font-size:11px;margin-bottom:8px;outline:none;" />' +
          '<button id="pa-add" style="background:#b8965a;color:#050505;border:none;padding:6px 16px;font-family:inherit;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;">add</button>' +
        '</div>' +
        '<div style="margin-top:16px;">' +
          '<button id="pa-reload" style="width:100%;background:none;border:1px solid rgba(232,220,200,0.09);color:#E8DCC8;padding:8px;font-family:inherit;font-size:10px;cursor:pointer;opacity:0.4;">reload from server</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(overlay);

    document.getElementById('pa-close').addEventListener('click', hide);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) hide(); });

    document.getElementById('pa-pass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tryAuth();
    });

    document.getElementById('pa-add').addEventListener('click', addTrack);
    document.getElementById('pa-reload').addEventListener('click', loadPlaylist);
  }

  async function tryAuth() {
    var pass = document.getElementById('pa-pass').value;
    var hash = await sha256(pass);
    if (hash === HASH) {
      authenticated = true;
      passwordRaw = pass;
      document.getElementById('pa-auth').style.display = 'none';
      document.getElementById('pa-content').style.display = 'block';
      loadPlaylist();
    } else {
      var err = document.getElementById('pa-err');
      err.textContent = 'wrong';
      err.style.display = 'block';
    }
  }

  async function loadPlaylist() {
    try {
      var res = await fetch('/api/playlist');
      playlist = await res.json();
    } catch (e) {
      try {
        var res2 = await fetch('/playlist.json?t=' + Date.now());
        playlist = await res2.json();
      } catch (e2) {
        playlist = [];
      }
    }
    renderList();
  }

  function renderList() {
    var list = document.getElementById('pa-list');
    if (!list) return;
    if (playlist.length === 0) {
      list.innerHTML = '<div style="font-size:11px;opacity:0.3;padding:16px 0;text-align:center;">no tracks</div>';
      return;
    }
    var html = '';
    playlist.forEach(function (t, i) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(232,220,200,0.06);">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:11px;color:#E8DCC8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(t.title) + '</div>' +
          '<div style="font-size:9px;opacity:0.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(t.artist) + '</div>' +
        '</div>' +
        '<button data-up="' + i + '" style="background:none;border:none;color:#E8DCC8;cursor:pointer;opacity:0.3;font-size:12px;padding:2px 4px;"' + (i === 0 ? ' disabled' : '') + '>\u25b2</button>' +
        '<button data-down="' + i + '" style="background:none;border:none;color:#E8DCC8;cursor:pointer;opacity:0.3;font-size:12px;padding:2px 4px;"' + (i === playlist.length - 1 ? ' disabled' : '') + '>\u25bc</button>' +
        '<button data-del="' + i + '" style="background:none;border:none;color:#c75050;cursor:pointer;opacity:0.4;font-size:10px;padding:2px 4px;">\u00d7</button>' +
      '</div>';
    });
    list.innerHTML = html;

    list.querySelectorAll('[data-up]').forEach(function (btn) {
      btn.addEventListener('click', function () { moveTrack(parseInt(btn.dataset.up), -1); });
    });
    list.querySelectorAll('[data-down]').forEach(function (btn) {
      btn.addEventListener('click', function () { moveTrack(parseInt(btn.dataset.down), 1); });
    });
    list.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteTrack(parseInt(btn.dataset.del)); });
    });
  }

  function moveTrack(idx, dir) {
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= playlist.length) return;
    var tmp = playlist[idx];
    playlist[idx] = playlist[newIdx];
    playlist[newIdx] = tmp;
    renderList();
    saveToAPI();
  }

  function deleteTrack(idx) {
    playlist.splice(idx, 1);
    renderList();
    saveToAPI();
  }

  function addTrack() {
    var artist = document.getElementById('pa-artist').value.trim();
    var title = document.getElementById('pa-title').value.trim();
    var url = document.getElementById('pa-url').value.trim();
    if (!artist || !title || !url) return;
    playlist.push({
      artist: artist,
      title: title,
      url: url,
      profile: Object.assign({}, DEFAULT_PROFILE)
    });
    document.getElementById('pa-artist').value = '';
    document.getElementById('pa-title').value = '';
    document.getElementById('pa-url').value = '';
    renderList();
    saveToAPI();
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function show() {
    if (!overlay) createOverlay();
    overlay.style.display = 'block';
    if (authenticated) {
      loadPlaylist();
    } else {
      document.getElementById('pa-auth').style.display = 'block';
      document.getElementById('pa-content').style.display = 'none';
      var input = document.getElementById('pa-pass');
      if (input) setTimeout(function () { input.focus(); }, 100);
    }
  }

  function hide() {
    if (overlay) overlay.style.display = 'none';
  }

  function toggle() {
    if (!overlay || overlay.style.display === 'none') show();
    else hide();
  }

  window.__playlistAdmin = { toggle: toggle, show: show, hide: hide };
})();
