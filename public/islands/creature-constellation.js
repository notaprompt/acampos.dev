// creature-constellation — the memory graph, touchable.
// Topology only (positions, strength, principle flags - no content exists in
// the file). Drag to pan, wheel/pinch to zoom, hover to light a memory.
// Perf shape: edges render into a cached offscreen layer in 4 batched style
// buckets (4 stroke calls, not 9k); panning blits the cache; hover uses a
// spatial hash. The static image stays until the first real frame succeeds.
(function () {
  var host = document.getElementById('creature-constellation');
  if (!host || window.__constInit) return;
  window.__constInit = true;

  var DPR = Math.min(1.5, window.devicePixelRatio || 1);
  var canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  var ctx = canvas.getContext('2d');
  var edgeLayer = document.createElement('canvas');
  var ectx = edgeLayer.getContext('2d');

  var W = 0, H = 0, data = null, sigils = [];
  var view = { x: 0, y: 0, k: 1 };
  var snap = null;              // view state the edge layer was rendered at
  var hover = -1;
  var grid = null, CELL = 160;  // spatial hash, world units
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
    H = Math.round(W * 0.66);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    edgeLayer.width = W * DPR; edgeLayer.height = H * DPR;
    if (data) { fit(); rebuildEdges(); }
    dirty = true;
  }

  function fit() {
    var m = 26;
    view.k = Math.min((W - 2 * m) / 4095, (H - 2 * m) / 4095);
    view.x = (W - 4095 * view.k) / 2;
    view.y = (H - 4095 * view.k) / 2;
  }

  function sx(x) { return x * view.k + view.x; }
  function sy(y) { return y * view.k + view.y; }

  function buildGrid() {
    grid = {};
    for (var i = 0; i < data.core.length; i++) {
      var n = data.core[i];
      var key = ((n[0] / CELL) | 0) + '_' + ((n[1] / CELL) | 0);
      (grid[key] = grid[key] || []).push(i);
    }
  }

  function nearest(mx, my) {
    var wx = (mx - view.x) / view.k, wy = (my - view.y) / view.k;
    var r = 14 / view.k, best = -1, bd = r * r;
    var c0x = ((wx - r) / CELL) | 0, c1x = ((wx + r) / CELL) | 0;
    var c0y = ((wy - r) / CELL) | 0, c1y = ((wy + r) / CELL) | 0;
    for (var gx = c0x; gx <= c1x; gx++) {
      for (var gy = c0y; gy <= c1y; gy++) {
        var cell = grid[gx + '_' + gy];
        if (!cell) continue;
        for (var c = 0; c < cell.length; c++) {
          var n = data.core[cell[c]];
          var dx = n[0] - wx, dy = n[1] - wy;
          var dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; best = cell[c]; }
        }
      }
    }
    return best;
  }

  function pickSigils() {
    var cand = [];
    for (var i = 0; i < data.core.length; i++) {
      var n = data.core[i];
      if (n[3]) cand.push([n[4] + n[2] / 33, i]);
    }
    cand.sort(function (a, b) { return b[0] - a[0]; });
    var out = [], MIN = 140;
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

  // edges in 4 alpha buckets - 4 stroke calls total. Density thins when far:
  // alpha scales with zoom so the fit view reads as texture, not hairball.
  function rebuildEdges() {
    snap = { x: view.x, y: view.y, k: view.k };
    ectx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ectx.clearRect(0, 0, W, H);
    var zoomFade = Math.max(0.3, Math.min(1, view.k / 0.5));
    var buckets = [[], [], [], []];
    for (var e = 0; e < data.edges.length; e++) {
      var ed = data.edges[e];
      buckets[Math.min(3, (ed[2] / 26) | 0)].push(ed);
    }
    var alphas = [0.028, 0.05, 0.08, 0.12];
    ectx.lineWidth = Math.max(0.35, Math.min(1, view.k * 5));
    for (var b = 0; b < 4; b++) {
      if (!buckets[b].length) continue;
      ectx.strokeStyle = 'rgba(226,204,164,' + (alphas[b] * zoomFade) + ')';
      ectx.beginPath();
      for (var i = 0; i < buckets[b].length; i++) {
        var g = buckets[b][i];
        var a = data.core[g[0]], c = data.core[g[1]];
        ectx.moveTo(sx(a[0]), sy(a[1]));
        ectx.lineTo(sx(c[0]), sy(c[1]));
      }
      ectx.stroke();
    }
  }

  var dirty = true, edgeTimer = 0;
  function scheduleEdges() {
    clearTimeout(edgeTimer);
    edgeTimer = setTimeout(function () { rebuildEdges(); dirty = true; }, 90);
  }

  function draw() {
    requestAnimationFrame(draw);
    if (!dirty || !data) return;
    dirty = false;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, H);

    // cached edge layer, blitted at the pan delta since it was rendered
    ctx.drawImage(edgeLayer,
      (view.x - snap.x) * (view.k / snap.k), (view.y - snap.y) * (view.k / snap.k),
      W * (view.k / snap.k), H * (view.k / snap.k));

    // hover's own edges, live and bright
    if (hover >= 0) {
      ctx.strokeStyle = 'rgba(224,185,87,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var e = 0; e < data.edges.length; e++) {
        var ed = data.edges[e];
        if (ed[0] !== hover && ed[1] !== hover) continue;
        var a = data.core[ed[0]], b = data.core[ed[1]];
        ctx.moveTo(sx(a[0]), sy(a[1]));
        ctx.lineTo(sx(b[0]), sy(b[1]));
      }
      ctx.stroke();
    }

    // nodes - plain rects when tiny, arcs when the zoom earns them
    var core = data.core;
    var nodeScale = Math.max(0.6, Math.min(2.4, view.k * 7));
    var useArcs = view.k > 0.24;
    for (var i = 0; i < core.length; i++) {
      var n = core[i];
      var x = sx(n[0]), y = sy(n[1]);
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
      var s = n[2] / 99;
      var r = (0.7 + s * 1.2) * nodeScale;
      ctx.fillStyle = n[3]
        ? 'rgba(200,166,104,' + (0.30 + s * 0.45) + ')'
        : 'rgba(232,220,200,' + (0.10 + s * 0.26) + ')';
      if (useArcs) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      } else {
        ctx.fillRect(x - r / 2, y - r / 2, r, r);
      }
    }

    // the hovered memory, lit
    if (hover >= 0) {
      var hn = core[hover];
      var hx = sx(hn[0]), hy = sy(hn[1]);
      ctx.shadowColor = '#e0b957'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#e0b957';
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // sigils
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var g2 = 0; g2 < sigils.length; g2++) {
      var sn = core[sigils[g2]];
      var gx = sx(sn[0]), gy = sy(sn[1]);
      if (gx < -20 || gx > W + 20 || gy < -20 || gy > H + 20) continue;
      var srnd = mulberry32(g2 * 40503 + 77);
      var fs = (11 + srnd() * 5) * Math.max(0.9, Math.min(2.4, view.k * 8));
      ctx.font = fs + 'px Georgia, serif';
      ctx.shadowColor = 'rgba(184,150,90,0.85)'; ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(216,184,122,' + (0.62 + srnd() * 0.25) + ')';
      ctx.fillText(SIGGLYPHS[g2 % SIGGLYPHS.length], gx, gy);
    }
    ctx.shadowBlur = 0;
  }

  // pointers: drag pan, hover, pinch
  var pointers = {}, lastPinch = 0, dragging = false;
  canvas.addEventListener('pointerdown', function (ev) {
    pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
    dragging = true;
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
        dirty = true;
        scheduleEdges();
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
    var nk = Math.max(0.05, Math.min(3, view.k * f));
    f = nk / view.k;
    view.x = mx - (mx - view.x) * f;
    view.y = my - (my - view.y) * f;
    view.k = nk;
    dirty = true;
    scheduleEdges();
  }
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    zoomAt(ev.offsetX, ev.offsetY, Math.pow(1.0015, -ev.deltaY));
  }, { passive: false });
  canvas.addEventListener('dblclick', function () { fit(); rebuildEdges(); dirty = true; });

  window.addEventListener('resize', size);

  fetch('/creature/constellation.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      data = d;
      sigils = pickSigils();
      buildGrid();
      // swap in only after one full frame renders without throwing
      W = host.clientWidth; H = Math.round(W * 0.66);
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      edgeLayer.width = W * DPR; edgeLayer.height = H * DPR;
      fit();
      rebuildEdges();
      var hint = document.createElement('div');
      hint.className = 'cc-hint';
      hint.textContent = 'drag to wander · scroll to lean in · double-click to reset';
      host.innerHTML = '';
      host.appendChild(canvas);
      host.appendChild(hint);
      dirty = true;
      requestAnimationFrame(draw);
    })
    .catch(function () { /* the static image stays - nothing breaks */ });
})();
