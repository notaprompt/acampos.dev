// creature-constellation — the memory graph, touchable.
// Loads the quantized topology (positions, strength, principle flags - no
// content exists in the file), renders the same constellation as the bake,
// and lets you pan, zoom, and hover. Drag to move; wheel or pinch to zoom.
(function () {
  var host = document.getElementById('creature-constellation');
  if (!host || window.__constInit) return;
  window.__constInit = true;

  var canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  var hint = document.createElement('div');
  hint.className = 'cc-hint';
  hint.textContent = 'the memory graph, live topology - drag to wander, scroll to lean in';
  var ctx = canvas.getContext('2d');

  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var W = 0, H = 0;
  var data = null;
  var view = { x: 0, y: 0, k: 1 };     // world offset + scale
  var hover = -1;
  var adj = null;                       // node -> edge list, built once
  var sigils = null;
  var SIGGLYPHS = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ☉☽☿♀♂♃♄';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function size() {
    W = host.clientWidth;
    H = Math.round(W * 0.625);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (data) fit();
    dirty = true;
  }

  function fit() {
    var m = 30;
    view.k = (W - 2 * m) / 4095;
    view.x = m;
    view.y = (H - 4095 * view.k) / 2;
  }

  function sx(x) { return x * view.k + view.x; }
  function sy(y) { return y * view.k + view.y; }

  function pickSigils() {
    var cand = [];
    for (var i = 0; i < data.core.length; i++) {
      var n = data.core[i];
      if (n[3]) cand.push([n[4] + n[2] / 33, i]);
    }
    cand.sort(function (a, b) { return b[0] - a[0]; });
    var out = [];
    var MIN = 140; // world units
    for (var c = 0; c < cand.length && out.length < 46; c++) {
      var i2 = cand[c][1], ok = true;
      for (var o = 0; o < out.length; o++) {
        var a = data.core[i2], b = data.core[out[o]];
        var dx = a[0] - b[0], dy = a[1] - b[1];
        if (dx * dx + dy * dy < MIN * MIN) { ok = false; break; }
      }
      if (ok) out.push(i2);
    }
    return out;
  }

  var dirty = true;
  function draw() {
    requestAnimationFrame(draw);
    if (!dirty || !data) return;
    dirty = false;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, H);

    var core = data.core, edges = data.edges;
    // edges
    ctx.lineWidth = Math.max(0.4, 0.6 * view.k * 8);
    for (var e = 0; e < edges.length; e++) {
      var ed = edges[e];
      var a = core[ed[0]], b = core[ed[1]];
      var na = hover === ed[0] || hover === ed[1];
      var alpha = na ? 0.5 : Math.min(0.13, 0.035 + ed[2] / 100 * 0.08);
      ctx.strokeStyle = na ? 'rgba(224,185,87,' + alpha + ')' : 'rgba(226,204,164,' + alpha + ')';
      ctx.beginPath();
      ctx.moveTo(sx(a[0]), sy(a[1]));
      ctx.lineTo(sx(b[0]), sy(b[1]));
      ctx.stroke();
    }
    // dust halo
    var rnd = mulberry32(77);
    var cx = sx(2048), cy = sy(2048);
    var R = 2400 * view.k;
    for (var d0 = 0; d0 < data.iso; d0++) {
      var ang = rnd() * Math.PI * 2;
      var rr = R * (1.05 + rnd() * 0.4);
      var px = cx + Math.cos(ang) * rr * 1.15;
      var py = cy + Math.sin(ang) * rr * 0.8;
      if (px < 0 || px > W || py < 0 || py > H) { rnd(); continue; }
      ctx.fillStyle = 'rgba(232,220,200,' + (0.04 + rnd() * 0.06) + ')';
      ctx.fillRect(px, py, 1, 1);
    }
    // nodes
    for (var i = 0; i < core.length; i++) {
      var n = core[i];
      var x = sx(n[0]), y = sy(n[1]);
      if (x < -8 || x > W + 8 || y < -8 || y > H + 8) continue;
      var s = n[2] / 99;
      var r = (0.7 + s * 1.3) * Math.max(0.7, view.k * 9);
      if (i === hover) {
        ctx.shadowColor = '#e0b957'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#e0b957';
        ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        continue;
      }
      if (n[3]) {
        ctx.fillStyle = 'rgba(200,166,104,' + (0.30 + s * 0.45) + ')';
      } else {
        ctx.fillStyle = 'rgba(232,220,200,' + (0.10 + s * 0.26) + ')';
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // sigils
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var g = 0; g < sigils.length; g++) {
      var sn = core[sigils[g]];
      var gx = sx(sn[0]), gy = sy(sn[1]);
      if (gx < -20 || gx > W + 20 || gy < -20 || gy > H + 20) continue;
      var srnd = mulberry32(g * 40503 + 77);
      var fs = (11 + srnd() * 5) * Math.max(0.8, Math.min(2.2, view.k * 14));
      ctx.font = fs + 'px Georgia, serif';
      ctx.shadowColor = 'rgba(184,150,90,0.85)'; ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(216,184,122,' + (0.62 + srnd() * 0.25) + ')';
      ctx.fillText(SIGGLYPHS[g % SIGGLYPHS.length], gx, gy);
    }
    ctx.shadowBlur = 0;
  }

  function nearest(mx, my) {
    if (!data) return -1;
    var best = -1, bd = 12 * 12;
    for (var i = 0; i < data.core.length; i++) {
      var n = data.core[i];
      var dx = sx(n[0]) - mx, dy = sy(n[1]) - my;
      var dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }

  // pointer: drag pan / hover / pinch
  var pointers = {}, lastPinch = 0, dragging = false, moved = false;
  canvas.addEventListener('pointerdown', function (ev) {
    pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
    dragging = true; moved = false;
    canvas.setPointerCapture(ev.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', function (ev) {
    var ids = Object.keys(pointers);
    if (dragging && ids.length === 1) {
      var p = pointers[ev.pointerId];
      if (p) {
        view.x += ev.offsetX - p[0];
        view.y += ev.offsetY - p[1];
        pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
        moved = true; dirty = true;
      }
    } else if (ids.length === 2) {
      pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (lastPinch) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, dist / lastPinch);
      lastPinch = dist;
    } else if (!dragging) {
      var h = nearest(ev.offsetX, ev.offsetY);
      if (h !== hover) { hover = h; dirty = true; }
    }
  });
  function endPointer(ev) {
    delete pointers[ev.pointerId];
    if (!Object.keys(pointers).length) { dragging = false; lastPinch = 0; }
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', function () { if (!dragging) { hover = -1; dirty = true; } });

  function zoomAt(mx, my, f) {
    f = Math.max(0.5, Math.min(2, f));
    var nk = Math.max(0.02, Math.min(2.5, view.k * f));
    f = nk / view.k;
    view.x = mx - (mx - view.x) * f;
    view.y = my - (my - view.y) * f;
    view.k = nk;
    dirty = true;
  }
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    zoomAt(ev.offsetX, ev.offsetY, Math.pow(1.0015, -ev.deltaY));
  }, { passive: false });
  canvas.addEventListener('dblclick', function () { fit(); dirty = true; });

  window.addEventListener('resize', size);

  fetch('/creature/constellation.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      data = d;
      sigils = pickSigils();
      host.innerHTML = '';
      host.appendChild(canvas);
      host.appendChild(hint);
      size();
      fit();
      dirty = true;
      requestAnimationFrame(draw);
    })
    .catch(function () {
      host.querySelectorAll('.cc-loading').forEach(function (el) {
        el.textContent = 'the graph would not load - refresh to try again.';
      });
    });
})();
