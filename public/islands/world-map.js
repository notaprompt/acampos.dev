// world-map — the model, facing its subject.
// A coordinate field of everyone who has visited, and then the machine tells the
// current visitor where it thinks they are. Peek inside the machine.
(function () {
  var host = document.getElementById('seen-map');
  if (!host || window.__seenInit) return;
  window.__seenInit = true;

  var reveal = document.getElementById('seen-reveal');
  var canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
  function size() {
    W = host.clientWidth;
    H = Math.round(W * 0.5); // equirectangular 2:1
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener('resize', function () { size(); });

  function project(lat, lon) {
    return { x: (lon + 180) / 360 * W, y: (90 - lat) / 180 * H };
  }

  var data = { you: null, world: [] };
  var t0 = null;

  function draw(ts) {
    if (t0 === null) t0 = ts;
    var t = (ts - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    // field
    ctx.fillStyle = '#0b0b08';
    ctx.fillRect(0, 0, W, H);
    // graticule
    ctx.strokeStyle = 'rgba(184,150,90,0.08)';
    ctx.lineWidth = 1;
    for (var lon = -150; lon <= 150; lon += 30) { var p = project(0, lon); ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke(); }
    for (var lat = -60; lat <= 60; lat += 30) { var q = project(lat, 0); ctx.beginPath(); ctx.moveTo(0, q.y); ctx.lineTo(W, q.y); ctx.stroke(); }
    // equator emphasis
    ctx.strokeStyle = 'rgba(184,150,90,0.14)';
    var eq = project(0, 0); ctx.beginPath(); ctx.moveTo(0, eq.y); ctx.lineTo(W, eq.y); ctx.stroke();

    // scan sweep
    var sweep = (t * 0.06) % 1;
    var sx = sweep * W;
    var grad = ctx.createLinearGradient(sx - 40, 0, sx, 0);
    grad.addColorStop(0, 'rgba(184,150,90,0)');
    grad.addColorStop(1, 'rgba(184,150,90,0.10)');
    ctx.fillStyle = grad; ctx.fillRect(sx - 40, 0, 40, H);

    // world dots (others) — coarse, no identity
    for (var i = 0; i < data.world.length; i++) {
      var w = data.world[i];
      if (w.lat == null) continue;
      var pt = project(w.lat, w.lon);
      var r = 1.6 + Math.min(4, w.c);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(200,180,120,0.55)';
      ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(184,150,90,0.25)';
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.stroke();
    }

    // you — pulsing gold
    if (data.you && data.you.lat != null) {
      var y = project(data.you.lat, data.you.lon);
      var pulse = 4 + Math.sin(t * 2.2) * 3 + 6;
      ctx.beginPath(); ctx.strokeStyle = 'rgba(224,185,87,' + (0.5 - (pulse - 4) / 40) + ')';
      ctx.lineWidth = 1.5; ctx.arc(y.x, y.y, pulse + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = '#e0b957';
      ctx.shadowColor = '#e0b957'; ctx.shadowBlur = 12;
      ctx.arc(y.x, y.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = '11px ui-monospace, monospace'; ctx.fillStyle = '#e0b957';
      ctx.fillText('you', y.x + 8, y.y - 6);
    }

    // grain
    requestAnimationFrame(draw);
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  function renderReveal() {
    if (!reveal) return;
    var y = data.you;
    var t = data.totals || {};
    var lines = [];
    if (y && y.city) {
      lines.push('the machine’s guess: you’re in <b>' + esc(y.city) + ', ' + esc(y.country) + '</b>.');
      lines.push('reading this on <b>' + esc(y.device) + '</b>, probably <b>' + esc(y.browser) + '</b>' + (y.visits ? ' · visit <b>#' + esc(y.visits) + '</b>' : '') + '.');
      lines.push('<span class="sr-note">it knew that before you finished this sentence. you just got to see the model - most systems build one and never show you.</span>');
    } else if (y) {
      lines.push('the machine lost your coordinates this time — a vpn, a proxy, or the edge of the map.');
      lines.push('it still clocked your device: <b>' + esc(y.device) + '</b>, ' + esc(y.browser) + '.');
      lines.push('<span class="sr-note">even the gap is part of the model.</span>');
    } else {
      lines.push('the machine is quiet right now.');
    }
    if (t.people) lines.unshift('<span class="sr-note">' + esc(t.people) + ' people, ' + esc(t.places) + ' places, have crossed this field.</span>');
    reveal.innerHTML = lines.map(function (l) { return '<p>' + l + '</p>'; }).join('');
  }

  var vid = localStorage.getItem('campos-visitor-id') || '';
  fetch('/api/seen?vid=' + encodeURIComponent(vid))
    .then(function (r) { return r.json(); })
    .then(function (d) { data = d; renderReveal(); })
    .catch(function () { if (reveal) reveal.innerHTML = '<p>the machine blinked. refresh to look again.</p>'; });

  requestAnimationFrame(draw);
})();
