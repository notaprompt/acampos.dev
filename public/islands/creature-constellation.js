// creature-constellation — the memory graph in three dimensions, touchable.
// Topology only (positions, strength, principle flags - no content exists in
// the file). Drag to orbit, wheel/pinch to approach, hover to light a memory.
// Raw WebGL - points and lines, no library. Left alone, it turns slowly.
// If WebGL or the fetch fails, the static image simply stays.
function initCreatureConstellation() {
  var host = document.getElementById('creature-constellation');
  // The guard has to live on the element, not on window. View transitions
  // swap the DOM but keep window, so a global flag meant this only ever woke
  // once per hard load — arrive here from anywhere else on the site and the
  // static image sat under "waking the constellation" forever.
  if (!host || host.dataset.ccInit) return;
  host.dataset.ccInit = '1';
  var stopped = false;

  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  var overlay = document.createElement('canvas'); // sigils + hover glow
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.width = '100%';
  overlay.style.pointerEvents = 'none';
  var gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) {
    // No WebGL: the static image stays, and the caption stops promising
    // something that is not coming.
    var noGl = host.querySelector('.cc-loading');
    if (noGl) noGl.remove();
    return;
  }

  var W = 0, H = 0, data = null, sigils = [];
  var yaw = 0.6, pitch = 0.25, dist = 2.2, autoSpin = true;
  var hover = -1, projected = null;
  var SIGGLYPHS = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ☉☽☿♀♂♃♄';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function compile(vsrc, fsrc) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(p);
    return p;
  }

  var lineProg = compile(
    'attribute vec3 aPos; attribute float aAlpha; uniform mat4 uMVP; varying float vA;' +
    'void main(){ gl_Position = uMVP * vec4(aPos,1.0); vA = aAlpha; }',
    'precision mediump float; varying float vA;' +
    'void main(){ gl_FragColor = vec4(0.886,0.800,0.643,1.0) * vA; }');
  var pointProg = compile(
    'attribute vec3 aPos; attribute vec4 aCol; attribute float aSize;' +
    'uniform mat4 uMVP; uniform float uScale; varying vec4 vC;' +
    'void main(){ vec4 p = uMVP * vec4(aPos,1.0); gl_Position = p;' +
    ' gl_PointSize = clamp(aSize * uScale / p.w, 1.0, 14.0); vC = aCol; }',
    'precision mediump float; varying vec4 vC;' +
    'void main(){ vec2 d = gl_PointCoord - vec2(0.5);' +
    ' float r = length(d); if (r > 0.5) discard;' +
    ' float soft = smoothstep(0.5, 0.18, r);' +
    ' gl_FragColor = vec4(vC.rgb, 1.0) * (vC.a * soft); }');

  var lineBuf, lineN = 0, nodeBuf, nodeN = 0, dustBuf, dustN = 0;
  var hoverLineBuf = gl.createBuffer(), hoverLineN = 0;

  function world(n) { // 0-4095 cube -> [-1,1]
    return [(n[0] - 2048) / 2048, (n[1] - 2048) / 2048, (n[2] - 2048) / 2048];
  }

  function buildBuffers() {
    var core = data.core, edges = data.edges;
    // edges: 2 verts x (pos + alpha)
    var la = new Float32Array(edges.length * 8);
    for (var e = 0; e < edges.length; e++) {
      var a = world(core[edges[e][0]]), b = world(core[edges[e][1]]);
      var al = 0.05 + (edges[e][2] / 100) * 0.10;
      la.set([a[0], a[1], a[2], al, b[0], b[1], b[2], al], e * 8);
    }
    lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, la, gl.STATIC_DRAW);
    lineN = edges.length * 2;

    // nodes: pos + rgba + size
    var na = new Float32Array(core.length * 8);
    for (var i = 0; i < core.length; i++) {
      var n = core[i], p = world(n), s = n[3] / 99;
      var o = i * 8;
      na[o] = p[0]; na[o + 1] = p[1]; na[o + 2] = p[2];
      if (n[4]) { na[o + 3] = 0.784; na[o + 4] = 0.651; na[o + 5] = 0.408; na[o + 6] = 0.30 + s * 0.5; }
      else { na[o + 3] = 0.910; na[o + 4] = 0.863; na[o + 5] = 0.784; na[o + 6] = 0.10 + s * 0.28; }
      na[o + 7] = 1.6 + s * 2.6;
    }
    nodeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, na, gl.STATIC_DRAW);
    nodeN = core.length;

    // dust: isolated memories on a far shell
    var rnd = mulberry32(77);
    var da = new Float32Array(data.iso * 8);
    for (var d0 = 0; d0 < data.iso; d0++) {
      var th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      var r = 1.25 + rnd() * 0.45;
      var o2 = d0 * 8;
      da[o2] = r * Math.sin(ph) * Math.cos(th);
      da[o2 + 1] = r * Math.cos(ph);
      da[o2 + 2] = r * Math.sin(ph) * Math.sin(th);
      da[o2 + 3] = 0.910; da[o2 + 4] = 0.863; da[o2 + 5] = 0.784;
      da[o2 + 6] = 0.05 + rnd() * 0.06;
      da[o2 + 7] = 1.2;
    }
    dustBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    gl.bufferData(gl.ARRAY_BUFFER, da, gl.STATIC_DRAW);
    dustN = data.iso;
  }

  function pickSigils() {
    var cand = [];
    for (var i = 0; i < data.core.length; i++) {
      var n = data.core[i];
      if (n[4]) cand.push([n[5] + n[3] / 33, i]);
    }
    cand.sort(function (a, b) { return b[0] - a[0]; });
    var out = [], MIN = 480;
    for (var c = 0; c < cand.length && out.length < 40; c++) {
      var i2 = cand[c][1], ok = true;
      for (var o = 0; o < out.length; o++) {
        var a = data.core[i2], b = data.core[out[o]];
        var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        if (dx * dx + dy * dy + dz * dz < MIN * MIN) { ok = false; break; }
      }
      if (ok) out.push(i2);
    }
    return out;
  }

  // minimal mat4: perspective * translate(0,0,-dist) * rotX(pitch) * rotY(yaw)
  function mvp() {
    var f = 1 / Math.tan(0.45), aspect = W / H;
    var near = 0.1, far = 20;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    // rotY then rotX applied to point, then translate z, then perspective
    // column-major out
    var m = new Float32Array(16);
    // combined rotation R = Rx * Ry
    var r00 = cy, r01 = 0, r02 = sy;
    var r10 = sp * sy, r11 = cp, r12 = -sp * cy;
    var r20 = -cp * sy, r21 = sp, r22 = cp * cy;
    var A = f / aspect, B = f;
    var C = (far + near) / (near - far), D = (2 * far * near) / (near - far);
    // proj * view; view z = R*p - dist
    m[0] = A * r00; m[4] = A * r01; m[8] = A * r02; m[12] = 0;
    m[1] = B * r10; m[5] = B * r11; m[9] = B * r12; m[13] = 0;
    m[2] = C * r20; m[6] = C * r21; m[10] = C * r22; m[14] = C * -dist + D;
    m[3] = -r20; m[7] = -r21; m[11] = -r22; m[15] = dist;
    return m;
  }

  function project(p, m) { // -> [sx, sy, w] in css px
    var x = p[0], y = p[1], z = p[2];
    var cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    var cy2 = m[1] * x + m[5] * y + m[9] * z + m[13];
    var cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy2 / cw * 0.5) * H, cw];
  }

  var octx = overlay.getContext('2d');
  var last = 0;

  function draw(ts) {
    // Leaving the page detaches this canvas but the loop would keep running
    // against a dead context, one leaked loop per visit.
    if (stopped) return;
    requestAnimationFrame(draw);
    var dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (autoSpin) yaw += dt * 0.12;

    var m = mvp();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.031, 0.031, 0.031, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // edges
    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(lineProg, 'uMVP'), false, m);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    var aPos = gl.getAttribLocation(lineProg, 'aPos');
    var aAlpha = gl.getAttribLocation(lineProg, 'aAlpha');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aAlpha);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 16, 12);
    gl.drawArrays(gl.LINES, 0, lineN);

    // hover edges, bright
    if (hover >= 0 && hoverLineN) {
      gl.bindBuffer(gl.ARRAY_BUFFER, hoverLineBuf);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 16, 12);
      gl.drawArrays(gl.LINES, 0, hoverLineN);
    }

    // nodes + dust
    gl.useProgram(pointProg);
    gl.uniformMatrix4fv(gl.getUniformLocation(pointProg, 'uMVP'), false, m);
    gl.uniform1f(gl.getUniformLocation(pointProg, 'uScale'), DPR * 1.9);
    var pPos = gl.getAttribLocation(pointProg, 'aPos');
    var pCol = gl.getAttribLocation(pointProg, 'aCol');
    var pSize = gl.getAttribLocation(pointProg, 'aSize');
    [[nodeBuf, nodeN], [dustBuf, dustN]].forEach(function (bn) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bn[0]);
      gl.enableVertexAttribArray(pPos);
      gl.enableVertexAttribArray(pCol);
      gl.enableVertexAttribArray(pSize);
      gl.vertexAttribPointer(pPos, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(pCol, 4, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(pSize, 1, gl.FLOAT, false, 32, 28);
      gl.drawArrays(gl.POINTS, 0, bn[1]);
    });

    // overlay: sigils + hover halo
    octx.setTransform(DPR, 0, 0, DPR, 0, 0);
    octx.clearRect(0, 0, W, H);
    octx.textAlign = 'center'; octx.textBaseline = 'middle';
    for (var g2 = 0; g2 < sigils.length; g2++) {
      var sp2 = project(world(data.core[sigils[g2]]), m);
      if (sp2[2] <= 0.2) continue;
      var srnd = mulberry32(g2 * 40503 + 77);
      var depth = Math.max(0.35, Math.min(1.4, 2.0 / sp2[2]));
      octx.font = ((10 + srnd() * 4) * depth) + 'px Georgia, serif';
      octx.shadowColor = 'rgba(184,150,90,0.85)';
      octx.shadowBlur = 8 * depth;
      octx.fillStyle = 'rgba(216,184,122,' + (0.5 + 0.4 * Math.min(1, depth)) + ')';
      octx.fillText(SIGGLYPHS[g2 % SIGGLYPHS.length], sp2[0], sp2[1]);
    }
    octx.shadowBlur = 0;
    if (hover >= 0) {
      var hp = project(world(data.core[hover]), m);
      if (hp[2] > 0.2) {
        octx.shadowColor = '#e0b957'; octx.shadowBlur = 16;
        octx.fillStyle = '#e0b957';
        octx.beginPath(); octx.arc(hp[0], hp[1], 3.5, 0, 7); octx.fill();
        octx.shadowBlur = 0;
      }
    }
  }

  function setHover(h) {
    if (h === hover) return;
    hover = h;
    if (h < 0) { hoverLineN = 0; return; }
    var segs = [];
    for (var e = 0; e < data.edges.length; e++) {
      var ed = data.edges[e];
      if (ed[0] !== h && ed[1] !== h) continue;
      var a = world(data.core[ed[0]]), b = world(data.core[ed[1]]);
      segs.push(a[0], a[1], a[2], 0.55, b[0], b[1], b[2], 0.55);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, hoverLineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segs), gl.DYNAMIC_DRAW);
    hoverLineN = segs.length / 4;
  }

  function nearest(mx, my) {
    var m = mvp(), best = -1, bd = 13 * 13;
    for (var i = 0; i < data.core.length; i++) {
      var p = project(world(data.core[i]), m);
      if (p[2] <= 0.2) continue;
      var dx = p[0] - mx, dy = p[1] - my;
      var dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }

  function size() {
    W = host.clientWidth;
    H = Math.round(W * 0.68);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.height = H + 'px';
    overlay.width = W * DPR; overlay.height = H * DPR;
    overlay.style.height = H + 'px';
  }
  window.addEventListener('resize', size);

  // pointers
  var pointers = {}, lastPinch = 0, dragging = false, idleTimer = 0;
  function wake() {
    autoSpin = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { autoSpin = true; }, 5000);
  }
  canvas.addEventListener('pointerdown', function (ev) {
    pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
    dragging = true;
    canvas.setPointerCapture(ev.pointerId);
    canvas.style.cursor = 'grabbing';
    wake();
  });
  canvas.addEventListener('pointermove', function (ev) {
    var ids = Object.keys(pointers);
    if (dragging && ids.length === 1) {
      var p = pointers[ev.pointerId];
      if (p) {
        yaw += (ev.offsetX - p[0]) * 0.006;
        pitch = Math.max(-1.4, Math.min(1.4, pitch + (ev.offsetY - p[1]) * 0.006));
        pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
        wake();
      }
    } else if (ids.length === 2) {
      pointers[ev.pointerId] = [ev.offsetX, ev.offsetY];
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var d2 = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (lastPinch) { dist = Math.max(0.7, Math.min(5, dist * lastPinch / d2)); wake(); }
      lastPinch = d2;
    } else if (!dragging) {
      setHover(nearest(ev.offsetX, ev.offsetY));
    }
  });
  function endPointer(ev) {
    delete pointers[ev.pointerId];
    if (!Object.keys(pointers).length) { dragging = false; lastPinch = 0; }
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', function () { if (!dragging) setHover(-1); });
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    dist = Math.max(0.7, Math.min(5, dist * Math.pow(1.0015, ev.deltaY)));
    wake();
  }, { passive: false });
  canvas.addEventListener('dblclick', function () { yaw = 0.6; pitch = 0.25; dist = 2.2; });

  fetch('/creature/constellation3d.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      data = d;
      sigils = pickSigils();
      buildBuffers();
      var hint = document.createElement('div');
      hint.className = 'cc-hint';
      hint.textContent = 'drag to turn it · scroll to approach · it drifts on its own';
      host.innerHTML = '';
      host.style.position = 'relative';
      host.appendChild(canvas);
      host.appendChild(overlay);
      host.appendChild(hint);
      size();
      requestAnimationFrame(draw);
    })
    .catch(function () {
      // The static image stays, but the caption must stop claiming it is
      // about to wake. A label that lies is worse than a still picture.
      var loading = host.querySelector('.cc-loading');
      if (loading) loading.remove();
      host.dataset.ccInit = '';
    });

  document.addEventListener('astro:before-swap', function stop() {
    stopped = true;
    window.removeEventListener('resize', size);
    document.removeEventListener('astro:before-swap', stop);
  }, { once: false });
}

// Fires on first load and after every view transition, so arriving here from
// anywhere else on the site wakes it the same way a refresh does.
document.addEventListener('astro:page-load', initCreatureConstellation);
if (document.readyState !== 'loading') initCreatureConstellation();
else document.addEventListener('DOMContentLoaded', initCreatureConstellation);
