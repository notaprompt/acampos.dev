(function () {
  'use strict';
  if (window.__deskSceneInit) return;
  window.__deskSceneInit = true;

  var canvas = document.getElementById('desk-scene');
  if (!canvas) return;
  var tooltip = document.getElementById('ds-tooltip');

  // ── Grid dimensions ──
  var COLS = 240;
  var ROWS = 110;
  var PX = 3;
  canvas.width = COLS * PX;
  canvas.height = ROWS * PX;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ── Offscreen buffer ──
  var off = document.createElement('canvas');
  off.width = COLS;
  off.height = ROWS;
  var bx = off.getContext('2d');

  // ── Scene pixel buffer (color index per cell) ──
  var scene = new Uint8Array(COLS * ROWS);

  // ── Palette ──
  var _ = 0;
  var sceneTheme = 'light'; // day = current palette, night = darkened
  var C_DAY = {
    0:  'transparent',
    // walls
    1:  '#4a5a3a',   // olive wall
    2:  '#3f4f32',   // olive wall shadow
    3:  '#354528',   // olive wall dark
    // floor
    4:  '#3a2a1a',   // dark hardwood
    5:  '#2e2015',   // hardwood shadow
    6:  '#453220',   // hardwood light plank
    // baseboard / trim
    7:  '#1a1a1a',   // matte black
    8:  '#141414',   // black shadow
    // desk
    9:  '#5c3d2e',   // walnut desk top
    10: '#4a3222',   // walnut desk shadow
    11: '#6b4a35',   // walnut desk highlight
    12: '#3d2818',   // desk leg dark
    // rug
    13: '#6b2d3a',   // burgundy
    14: '#7a3545',   // burgundy light
    15: '#5a2430',   // burgundy dark
    16: '#4a1c26',   // burgundy deepest
    // CRT monitor
    17: '#2a2a2a',   // CRT body dark
    18: '#333333',   // CRT body mid
    19: '#1e1e1e',   // CRT bezel
    20: '#0a1a0a',   // CRT screen dark
    21: '#b8965a',   // CRT text gold (--gold-accent)
    22: '#8a7040',   // CRT text dim gold
    // ultrawide monitor
    23: '#1a1a1a',   // ultrawide bezel
    24: '#0d1117',   // ultrawide screen dark
    25: '#1a2332',   // ultrawide screen code bg
    26: '#5BF29B',   // code green (--alive)
    27: '#b8965a',   // code gold
    28: '#c75050',   // code red
    29: '#6a8aaa',   // code blue
    // chair
    30: '#1a1a1a',   // black leather
    31: '#222222',   // leather highlight
    32: '#b8b8b8',   // chrome
    33: '#9a9a9a',   // chrome shadow
    // bookshelf / wood
    34: '#8a6a3a',   // light wood
    35: '#5a4020',   // medium wood
    36: '#6b5030',   // shelf mid
    // book spines
    37: '#6b2d3a',   // burgundy book
    38: '#2a3a4a',   // navy book
    39: '#3a4a2a',   // olive book
    40: '#d4c8a8',   // cream book
    41: '#5c3d2e',   // brown book
    42: '#8a3030',   // red book
    43: '#2a2a3a',   // dark blue book
    44: '#c8b888',   // tan book
    // speakers
    45: '#1a1a1a',   // speaker cabinet
    46: '#222222',   // speaker detail
    47: '#b8b8b8',   // silver driver
    48: '#8a8a8a',   // driver shadow
    49: '#333333',   // driver cone
    // plants
    50: '#2d5a27',   // dark green
    51: '#4a7a3a',   // medium green
    52: '#5a8a4a',   // light green
    53: '#6b4a2a',   // pot brown
    54: '#5a3a1e',   // pot dark
    // 3D printer
    55: '#2a2a2a',   // printer frame
    56: '#333333',   // printer body
    57: '#cc8844',   // amber LED / hot end glow
    58: '#e8aa55',   // amber glow bright
    // desk accessories
    59: '#1a1a1a',   // keyboard black
    60: '#252525',   // keycaps
    61: '#1e1e1e',   // mug body
    62: '#2a2a2a',   // mug highlight
    // lamp
    63: '#1a1a1a',   // lamp arm black
    64: '#cc8844',   // lamp light amber
    65: '#e8c080',   // lamp glow
    // pendant light
    66: '#2a2a2a',   // pendant fixture
    67: '#cc8844',   // pendant glow
    68: '#e8c080',   // pendant bright
    // wall art
    69: '#5c3d2e',   // frame wood
    70: '#6b2d3a',   // art burgundy
    71: '#d4c8a8',   // art cream
    72: '#1a1a1a',   // art black
    73: '#cc8844',   // art amber
    // window
    74: '#1a1a1a',   // window frame
    75: '#1a2a3a',   // night sky
    76: '#2a3a50',   // moonlight blue
    77: '#3a4a60',   // light blue
    // server / homelab
    78: '#1a1a1a',   // server case
    79: '#222222',   // server face
    80: '#2a8a4a',   // server LED green
    81: '#cc8844',   // server LED amber
    // hi-fi receiver
    82: '#1a1a1a',   // receiver body
    83: '#222222',   // receiver face
    84: '#2a8a4a',   // receiver LED
    85: '#b8b8b8',   // receiver knob
    // credenza
    86: '#5c3d2e',   // walnut credenza
    87: '#4a3222',   // credenza shadow
    // dog (fawn French bulldog)
    88: '#c4a070',   // fawn base
    89: '#a88860',   // fawn shadow
    90: '#8a7050',   // fawn dark
    91: '#111111',   // dog nose/eyes
    92: '#d4b888',   // fawn highlight
    // subwoofer
    93: '#1a1a1a',   // sub cabinet
    94: '#2a2a2a',   // sub face
    95: '#444444',   // sub driver
    // switch plate
    96: '#d4d4d4',   // white plate
    97: '#bbb',      // plate shadow
    // cables
    98: '#1a1a1a',   // cable dark
    99: '#222222',   // cable mid
    // notebook
    100: '#2a2a2a',  // notebook cover
    101: '#d4c8a8',  // notebook pages
    // monitor arm
    102: '#1a1a1a',  // arm black
    // extra detail
    103: '#cc8844',  // warm amber accent
    104: '#e0d8c8',  // warm white label
    // void tunnel
    105: '#040408',  // void black
    106: '#0a0a1a',  // void deep
    107: '#141428',  // void mid
    108: '#1e1e3a',  // void ring dark
    109: '#2a2a50',  // void ring mid
    110: '#3a3a6a',  // void ring light
    111: '#5a4a8a',  // void purple
    112: '#8a6ab0',  // void lavender
    113: '#b8965a',  // void gold (accent)
  };

  // Night palette — same room, darker, amber lamp glow, night window
  var C_NIGHT = {};
  (function buildNightPalette() {
    // start with a copy of day
    for (var k in C_DAY) C_NIGHT[k] = C_DAY[k];

    // darken helper — shift hex toward black by factor (0=black, 1=original)
    function dim(hex, factor) {
      var r = parseInt(hex.slice(1,3),16);
      var g = parseInt(hex.slice(3,5),16);
      var b = parseInt(hex.slice(5,7),16);
      r = Math.round(r * factor);
      g = Math.round(g * factor);
      b = Math.round(b * factor);
      return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
    }
    // warm tint — shift toward amber
    function amber(hex, factor, warmth) {
      var r = parseInt(hex.slice(1,3),16);
      var g = parseInt(hex.slice(3,5),16);
      var b = parseInt(hex.slice(5,7),16);
      r = Math.min(255, Math.round(r * factor + warmth * 30));
      g = Math.min(255, Math.round(g * factor + warmth * 15));
      b = Math.round(b * factor * 0.7);
      return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
    }

    // walls — dark, warm amber wash (not green-tinted)
    C_NIGHT[1] = '#2a2218';
    C_NIGHT[2] = '#231c14';
    C_NIGHT[3] = '#1c1610';
    // floor — dark, warm
    C_NIGHT[4] = amber('#3a2a1a', 0.45, 0.3);
    C_NIGHT[5] = amber('#2e2015', 0.40, 0.2);
    C_NIGHT[6] = amber('#453220', 0.45, 0.3);
    // baseboard
    C_NIGHT[7] = '#0e0e0e';
    C_NIGHT[8] = '#0a0a0a';
    // desk — warm amber reflection
    C_NIGHT[9]  = amber('#5c3d2e', 0.55, 0.5);
    C_NIGHT[10] = amber('#4a3222', 0.45, 0.4);
    C_NIGHT[11] = amber('#6b4a35', 0.55, 0.5);
    C_NIGHT[12] = dim('#3d2818', 0.5);
    // rug — darker
    C_NIGHT[13] = dim('#6b2d3a', 0.5);
    C_NIGHT[14] = dim('#7a3545', 0.5);
    C_NIGHT[15] = dim('#5a2430', 0.45);
    C_NIGHT[16] = dim('#4a1c26', 0.45);
    // CRT — stays bright (it's a screen)
    // ultrawide — stays bright
    // chair — slightly darker
    C_NIGHT[30] = '#0e0e0e';
    C_NIGHT[31] = '#161616';
    // bookshelf wood — amber-lit
    C_NIGHT[34] = amber('#8a6a3a', 0.50, 0.4);
    C_NIGHT[35] = amber('#5a4020', 0.45, 0.3);
    C_NIGHT[36] = amber('#6b5030', 0.45, 0.3);
    // book spines — dimmed
    C_NIGHT[37] = dim('#6b2d3a', 0.55);
    C_NIGHT[38] = dim('#2a3a4a', 0.55);
    C_NIGHT[39] = dim('#3a4a2a', 0.55);
    C_NIGHT[40] = dim('#d4c8a8', 0.50);
    C_NIGHT[41] = dim('#5c3d2e', 0.55);
    C_NIGHT[42] = dim('#8a3030', 0.55);
    C_NIGHT[43] = dim('#2a2a3a', 0.55);
    C_NIGHT[44] = dim('#c8b888', 0.50);
    // speakers — darker
    C_NIGHT[45] = '#0e0e0e';
    C_NIGHT[46] = '#141414';
    // plants — dimmed
    C_NIGHT[50] = dim('#2d5a27', 0.45);
    C_NIGHT[51] = dim('#4a7a3a', 0.45);
    C_NIGHT[52] = dim('#5a8a4a', 0.45);
    C_NIGHT[53] = dim('#6b4a2a', 0.50);
    C_NIGHT[54] = dim('#5a3a1e', 0.50);
    // 3D printer — dimmed
    C_NIGHT[55] = '#181818';
    C_NIGHT[56] = '#202020';
    // lamp/pendant — GLOW warm and bright at night, cozy radiating light
    C_NIGHT[64] = '#f0b050'; // lamp amber — warm bright
    C_NIGHT[65] = '#f8d898'; // lamp glow — hot warm white
    C_NIGHT[67] = '#f0b050'; // pendant glow — warm
    C_NIGHT[68] = '#f8d898'; // pendant bright — hot
    // window — night sky
    C_NIGHT[75] = '#0a1018'; // deep night
    C_NIGHT[76] = '#141e30'; // moonlight blue
    C_NIGHT[77] = '#1e2e48'; // lighter blue
    // server — LEDs stay bright
    // hi-fi — dimmed body, LEDs stay
    C_NIGHT[82] = '#0e0e0e';
    C_NIGHT[83] = '#141414';
    // credenza — amber-lit
    C_NIGHT[86] = amber('#5c3d2e', 0.50, 0.4);
    C_NIGHT[87] = amber('#4a3222', 0.45, 0.3);
    // wall art — dimmed
    C_NIGHT[69] = dim('#5c3d2e', 0.5);
    C_NIGHT[70] = dim('#6b2d3a', 0.5);
    C_NIGHT[71] = dim('#d4c8a8', 0.45);
    C_NIGHT[72] = '#0e0e0e';
    C_NIGHT[73] = amber('#cc8844', 0.6, 0.3);
    // desk accessories
    C_NIGHT[59] = '#0e0e0e';
    C_NIGHT[60] = '#161616';
    C_NIGHT[61] = '#121212';
    C_NIGHT[62] = '#181818';
    // warm accent — glows at night
    C_NIGHT[103] = '#e8a040';
  })();

  // active palette — mutable copy, starts as day
  var C = {};
  for (var ck in C_DAY) C[ck] = C_DAY[ck];

  function setSceneTheme(theme) {
    sceneTheme = theme;
    // swap palette reference, keep dynamic vault slots
    var base = theme === 'light' ? C_DAY : C_NIGHT;
    for (var k in base) {
      if (k >= 115 && k <= 123) continue; // skip dynamic vault colors
      C[k] = base[k];
    }
    rgbCache = {};
    render();
  }
  window.__setDeskSceneTheme = setSceneTheme;

  // ── Hex to RGB cache ──
  var rgbCache = {};
  function hexToRgb(str) {
    if (rgbCache[str]) return rgbCache[str];
    var r, g, b;
    if (str.charAt(0) === '#') {
      r = parseInt(str.slice(1, 3), 16);
      g = parseInt(str.slice(3, 5), 16);
      b = parseInt(str.slice(5, 7), 16);
    } else {
      var m = str.match(/\d+/g);
      r = parseInt(m[0]); g = parseInt(m[1]); b = parseInt(m[2]);
    }
    rgbCache[str] = [r, g, b];
    return rgbCache[str];
  }

  // ── Object registry (for hit detection) ──
  var objects = [];
  var hoveredObj = null;

  function registerObject(id, x, y, w, h, url, label, external) {
    objects.push({ id: id, x: x, y: y, w: w, h: h, url: url, label: label, external: !!external });
  }

  // ── Scene compositing ──
  function fillRect(x, y, w, h, colorIdx) {
    for (var r = y; r < y + h && r < ROWS; r++) {
      for (var c = x; c < x + w && c < COLS; c++) {
        if (r >= 0 && c >= 0) scene[r * COLS + c] = colorIdx;
      }
    }
  }

  function placeSprite(sprite, ox, oy) {
    for (var r = 0; r < sprite.length; r++) {
      var row = sprite[r];
      for (var c = 0; c < row.length; c++) {
        var v = row[c];
        if (v !== 0) {
          var sr = oy + r;
          var sc = ox + c;
          if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS) {
            scene[sr * COLS + sc] = v;
          }
        }
      }
    }
  }

  // ── Render scene buffer to canvas ──
  function render() {
    var img = bx.createImageData(COLS, ROWS);
    var d = img.data;
    for (var i = 0; i < COLS * ROWS; i++) {
      var ci = scene[i];
      if (ci === 0) {
        d[i * 4 + 3] = 0;
      } else {
        var hex = C[ci];
        if (!hex) { d[i * 4 + 3] = 0; continue; }
        var rgb = hexToRgb(hex);
        d[i * 4] = rgb[0];
        d[i * 4 + 1] = rgb[1];
        d[i * 4 + 2] = rgb[2];
        d[i * 4 + 3] = 255;
      }
    }

    // hover glow
    if (hoveredObj) {
      var o = hoveredObj;
      for (var r = o.y - 1; r <= o.y + o.h; r++) {
        for (var c = o.x - 1; c <= o.x + o.w; c++) {
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
          var inside = r >= o.y && r < o.y + o.h && c >= o.x && c < o.x + o.w;
          if (!inside) {
            // glow border pixel
            var pi = (r * COLS + c) * 4;
            var gold = hexToRgb('#b8965a');
            d[pi] = Math.min(255, d[pi] + gold[0] * 0.35);
            d[pi + 1] = Math.min(255, d[pi + 1] + gold[1] * 0.35);
            d[pi + 2] = Math.min(255, d[pi + 2] + gold[2] * 0.35);
            d[pi + 3] = 255;
          } else {
            // subtle brighten interior
            var pi2 = (r * COLS + c) * 4;
            d[pi2] = Math.min(255, d[pi2] + 12);
            d[pi2 + 1] = Math.min(255, d[pi2 + 1] + 10);
            d[pi2 + 2] = Math.min(255, d[pi2 + 2] + 6);
          }
        }
      }
    }

    // night mode — shadow-casting light from lamps
    if (sceneTheme === 'dark') {
      var lampSources = [
        { x: LAMP_X + 4, y: LAMP_Y + 3, r: 50, strength: 0.22, cr: 245, cg: 190, cb: 100 }, // desk lamp
        { x: 120, y: 10, r: 65, strength: 0.18, cr: 240, cg: 180, cb: 90 },                   // pendant — reaches floor for chair shadow
        { x: 21, y: 21, r: 15, strength: 0.06, cr: 91, cg: 242, cb: 155 },                    // server LED glow
        { x: Math.round(WIN_X + WIN_W / 2), y: Math.round(WIN_Y + WIN_H / 2), r: 35, strength: 0.08, cr: 140, cg: 170, cb: 220 }, // moonlight spill
      ];

      // light-blocking check — opaque objects cast shadows
      // transparent (0) and wall tones (1-3) don't block; everything else does
      function isOpaque(sx, sy) {
        if (sx < 0 || sx >= COLS || sy < 0 || sy >= ROWS) return false;
        var ci = scene[sy * COLS + sx];
        return ci !== 0 && ci !== 1 && ci !== 2 && ci !== 3 && ci !== 75 && ci !== 76 && ci !== 77;
      }

      // ray march from pixel back to light source — returns true if unblocked
      function hasLineOfSight(px, py, lxs, lys) {
        var dx = lxs - px, dy = lys - py;
        var steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps < 2) return true;
        var sx = dx / steps, sy = dy / steps;
        // sample every 2 pixels for performance
        for (var t = 1; t < steps; t += 2) {
          var cx = Math.round(px + sx * t);
          var cy = Math.round(py + sy * t);
          if (cx === lxs && cy === lys) break;
          if (isOpaque(cx, cy)) return false;
        }
        return true;
      }

      for (var ls = 0; ls < lampSources.length; ls++) {
        var src = lampSources[ls];
        for (var ly = Math.max(0, src.y - src.r); ly <= Math.min(ROWS - 1, src.y + src.r); ly++) {
          for (var lx = Math.max(0, src.x - src.r); lx <= Math.min(COLS - 1, src.x + src.r); lx++) {
            var ldx = (lx - src.x) / src.r;
            var ldy = (ly - src.y) / src.r;
            var ld = Math.sqrt(ldx * ldx + ldy * ldy);
            if (ld > 1) continue;

            // shadow check — does this pixel have line of sight to the light?
            if (!hasLineOfSight(lx, ly, src.x, src.y)) continue;

            var lf = Math.pow(1 - ld, 2) * src.strength;
            var lpi = (ly * COLS + lx) * 4;
            d[lpi]     = Math.min(255, d[lpi]     + Math.round(src.cr * lf));
            d[lpi + 1] = Math.min(255, d[lpi + 1] + Math.round(src.cg * lf));
            d[lpi + 2] = Math.min(255, d[lpi + 2] + Math.round(src.cb * lf));
          }
        }
      }
    }

    // portal glow cast into room
    castRoomGlow(d);

    bx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }

  // ══════════════════════════════════════════════════════════════
  //  SCENE CONSTRUCTION
  // ══════════════════════════════════════════════════════════════

  // ── Background: ceiling + walls ──
  function drawWalls() {
    for (var r = 0; r < 60; r++) {
      for (var c = 0; c < COLS; c++) {
        // subtle wall texture variation
        var hash = ((c * 17 + r * 31) & 0xFF);
        if (hash < 30) scene[r * COLS + c] = 2;
        else if (hash < 50) scene[r * COLS + c] = 3;
        else scene[r * COLS + c] = 1;
      }
    }
    // baseboard (rows 57-59)
    fillRect(0, 57, COLS, 3, 7);
    // baseboard top edge highlight
    fillRect(0, 57, COLS, 1, 8);
  }

  // ── Floor: dark hardwood planks ──
  function drawFloor() {
    for (var r = 60; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        // plank pattern: alternating shade every ~30 cols, staggered per row
        var plankOffset = ((r - 60) % 2) * 15;
        var plankPos = (c + plankOffset) % 30;
        if (plankPos === 0) {
          scene[r * COLS + c] = 5; // plank gap
        } else {
          var hash = ((c * 7 + r * 13) & 0xFF);
          if (hash < 40) scene[r * COLS + c] = 6;
          else if (hash < 70) scene[r * COLS + c] = 5;
          else scene[r * COLS + c] = 4;
        }
      }
    }
  }

  // ── Rug: burgundy area rug centered under desk zone ──
  function drawRug() {
    var rugL = 40, rugR = 200, rugT = 68, rugB = 100;
    for (var r = rugT; r < rugB; r++) {
      for (var c = rugL; c < rugR; c++) {
        // border
        if (r === rugT || r === rugB - 1 || c === rugL || c === rugR - 1) {
          scene[r * COLS + c] = 15;
        } else if (r === rugT + 1 || r === rugB - 2 || c === rugL + 1 || c === rugR - 1 - 1) {
          scene[r * COLS + c] = 16;
        } else {
          // inner pattern
          var hash = ((c * 11 + r * 23) & 0xFF);
          if ((c - rugL) % 16 < 2 || (r - rugT) % 12 < 2) {
            scene[r * COLS + c] = hash < 128 ? 15 : 16;
          } else {
            scene[r * COLS + c] = hash < 60 ? 14 : 13;
          }
        }
      }
    }
    // rug fringe top and bottom
    for (var c = rugL + 2; c < rugR - 2; c += 2) {
      if (rugT - 1 >= 0) scene[(rugT - 1) * COLS + c] = 13;
      if (rugB < ROWS) scene[rugB * COLS + c] = 13;
    }
  }

  // ── Pendant light (ceiling) ──
  function drawPendant() {
    // cord
    for (var r = 0; r < 8; r++) fillRect(119, r, 2, 1, 66);
    // fixture
    fillRect(115, 8, 10, 2, 66);
    fillRect(116, 10, 8, 2, 67);
    // glow handled by shadow-casting light system in render()
  }

  // ── Window with blinds (right side of wall) ──
  var WIN_X = 195, WIN_Y = 10, WIN_W = 30, WIN_H = 35;
  function drawWindow() {
    // frame
    fillRect(WIN_X, WIN_Y, WIN_W, WIN_H, 74);
    // inner pane
    fillRect(WIN_X + 2, WIN_Y + 2, WIN_W - 4, WIN_H - 4, 75);
    // moonlight gradient
    for (var r = WIN_Y + 2; r < WIN_Y + WIN_H - 2; r++) {
      for (var c = WIN_X + 2; c < WIN_X + WIN_W - 2; c++) {
        var hr = (r - WIN_Y - 2) / (WIN_H - 4);
        if (hr < 0.3) scene[r * COLS + c] = 77;
        else if (hr < 0.5) scene[r * COLS + c] = 76;
      }
    }
    // blinds (horizontal lines)
    for (var r = WIN_Y + 3; r < WIN_Y + WIN_H - 2; r += 3) {
      fillRect(WIN_X + 2, r, WIN_W - 4, 1, 74);
    }
    // sill
    fillRect(WIN_X - 1, WIN_Y + WIN_H, WIN_W + 2, 2, 7);
  }

  // ── Abstract wall art (left wall) ──
  var ART1_X = 20, ART1_Y = 14, ART1_W = 24, ART1_H = 18;
  function drawWallArt() {
    // frame
    fillRect(ART1_X, ART1_Y, ART1_W, ART1_H, 69);
    // canvas interior
    fillRect(ART1_X + 2, ART1_Y + 2, ART1_W - 4, ART1_H - 4, 71);
    // abstract brushstrokes — earth tones, burgundy, black, cream
    var art = [
      [71,71,72,72,71,71,71,73,73,71,71,71,70,70,71,71,71,72,71,71],
      [71,72,72,72,70,71,71,73,73,73,71,70,70,70,71,71,72,72,71,71],
      [72,72,72,70,70,70,71,71,73,73,70,70,70,71,71,72,72,72,72,71],
      [72,72,70,70,70,71,71,71,71,73,70,70,71,71,72,72,72,41,41,71],
      [71,70,70,70,71,71,71,72,71,71,70,71,71,72,72,41,41,41,41,71],
      [71,70,70,71,71,72,72,72,72,71,71,71,72,72,41,41,41,71,71,71],
      [70,70,71,71,72,72,72,72,72,72,71,72,72,41,41,71,71,71,71,71],
      [70,71,71,72,72,73,73,72,72,72,72,72,41,41,71,71,71,70,70,71],
      [71,71,72,72,73,73,73,73,72,72,72,41,41,71,71,70,70,70,70,71],
      [71,72,72,73,73,73,73,73,73,72,41,41,71,71,70,70,70,70,71,71],
      [72,72,73,73,73,72,72,73,73,41,41,71,71,70,70,70,70,71,71,71],
      [72,73,73,73,72,72,72,72,41,41,71,71,70,70,70,71,71,71,71,71],
      [73,73,73,72,72,71,71,41,41,71,71,70,70,71,71,71,71,72,72,71],
      [73,73,72,72,71,71,71,41,71,71,70,70,71,71,71,72,72,72,71,71],
    ];
    placeSprite(art, ART1_X + 2, ART1_Y + 2);
  }

  // ── Switch plate on wall ──
  function drawSwitchPlate() {
    fillRect(56, 32, 3, 5, 96);
    fillRect(57, 33, 1, 1, 97);
    fillRect(57, 35, 1, 1, 97);
  }

  // ── Cadovius wall shelving system ──
  var SHELF_X = 138, SHELF_Y = 10;
  function drawShelving() {
    // vertical uprights (2 uprights, teak)
    fillRect(SHELF_X, SHELF_Y, 2, 48, 35);
    fillRect(SHELF_X + 42, SHELF_Y, 2, 48, 35);
    // notches in uprights
    for (var r = SHELF_Y; r < SHELF_Y + 48; r += 4) {
      scene[r * COLS + SHELF_X] = 36;
      scene[r * COLS + SHELF_X + 43] = 36;
    }

    // shelf 1 (top) — small plants
    var s1y = SHELF_Y + 4;
    fillRect(SHELF_X + 2, s1y, 40, 2, 34);
    fillRect(SHELF_X + 2, s1y + 1, 40, 1, 35); // shelf shadow

    // shelf 2 — books
    var s2y = SHELF_Y + 16;
    fillRect(SHELF_X + 2, s2y, 40, 2, 34);
    fillRect(SHELF_X + 2, s2y + 1, 40, 1, 35);

    // shelf 3 — more books + small speaker
    var s3y = SHELF_Y + 28;
    fillRect(SHELF_X + 2, s3y, 40, 2, 34);
    fillRect(SHELF_X + 2, s3y + 1, 40, 1, 35);

    // shelf 4 — 3D printer
    var s4y = SHELF_Y + 40;
    fillRect(SHELF_X + 2, s4y, 40, 2, 34);
    fillRect(SHELF_X + 2, s4y + 1, 40, 1, 35);

    // ── Books on shelf 2 (between s1y+2 and s2y) ──
    var bookY = s1y + 2;
    var bookH = s2y - bookY;
    var booksRow1 = [37,37,38,38,38,40,40,39,39,41,41,41,42,42,43,43,40,40,44,44,37,37,38,38,39,39,41,41,42,42,43,43,40,40,37,37,38,38,39,39];
    for (var bc = 0; bc < 40; bc++) {
      var bci = booksRow1[bc] || 40;
      // books are different heights
      var bookTop = bookY + ((bc * 7 + 3) % 3);
      for (var br = bookTop; br < bookY + bookH; br++) {
        scene[br * COLS + (SHELF_X + 2 + bc)] = bci;
      }
    }

    // ── Books on shelf 3 ──
    var bookY2 = s2y + 2;
    var bookH2 = s3y - bookY2;
    var booksRow2 = [41,41,40,40,43,43,43,37,37,39,39,42,42,44,44,38,38,41,41,40,40,37,37,43,43,39,39,42,42,38,38,44,44,41,41,40,40,37,37,39,39];
    for (var bc2 = 0; bc2 < 40; bc2++) {
      var bci2 = booksRow2[bc2] || 40;
      var bookTop2 = bookY2 + ((bc2 * 5 + 1) % 3);
      for (var br2 = bookTop2; br2 < bookY2 + bookH2; br2++) {
        scene[br2 * COLS + (SHELF_X + 2 + bc2)] = bci2;
      }
    }

    // ── Bookshelf speaker on shelf 3 (right side) ──
    fillRect(SHELF_X + 32, s3y - 8, 8, 8, 45);
    fillRect(SHELF_X + 34, s3y - 7, 4, 3, 49); // driver
    fillRect(SHELF_X + 35, s3y - 6, 2, 1, 47); // driver center
    fillRect(SHELF_X + 34, s3y - 3, 4, 2, 49); // tweeter
    fillRect(SHELF_X + 35, s3y - 2, 2, 1, 47); // tweeter center

    // ── Small plants on top shelf ──
    // plant 1 (left)
    var p1x = SHELF_X + 6;
    var p1y = s1y - 8;
    var plant1 = [
      [_,_,_,52,_,_,_],
      [_,_,52,51,52,_,_],
      [_,52,51,50,51,52,_],
      [_,51,50,50,50,51,_],
      [_,_,50,50,50,_,_],
      [_,_,_,50,_,_,_],
      [_,_,53,53,53,_,_],
      [_,_,54,53,54,_,_],
    ];
    placeSprite(plant1, p1x, p1y);

    // plant 2 (right) — taller succulent
    var p2x = SHELF_X + 28;
    var p2y = s1y - 9;
    var plant2 = [
      [_,_,_,52,_,_],
      [_,_,52,51,_,_],
      [_,52,51,50,52,_],
      [_,51,50,50,51,_],
      [52,50,50,50,50,52],
      [51,50,50,50,50,51],
      [_,50,50,50,50,_],
      [_,_,53,53,_,_],
      [_,_,54,53,_,_],
    ];
    placeSprite(plant2, p2x, p2y);

    // ── 3D printer on shelf 4 ──
    var prX = SHELF_X + 8, prY = s4y - 14;
    var printer = [
      [_,_,55,55,55,55,55,55,55,55,55,55,55,_,_],
      [_,55,56,56,56,56,56,56,56,56,56,56,56,55,_],
      [_,55,56,_,_,_,_,_,_,_,_,_,56,55,_],
      [_,55,56,_,_,_,_,_,_,_,_,_,56,55,_],
      [_,55,56,_,_,_,57,58,57,_,_,_,56,55,_],
      [_,55,56,_,_,_,_,57,_,_,_,_,56,55,_],
      [_,55,56,_,_,_,_,_,_,_,_,_,56,55,_],
      [_,55,56,56,56,56,56,56,56,56,56,56,56,55,_],
      [_,55,55,55,55,55,55,55,55,55,55,55,55,55,_],
      [_,55,56,56,56,56,56,56,56,56,56,56,56,55,_],
      [55,55,55,55,55,55,55,55,55,55,55,55,55,55,55],
      [55,_,_,_,_,_,_,_,_,_,_,_,_,_,55],
      [55,_,_,_,_,_,_,_,_,_,_,_,_,_,55],
      [55,55,55,55,55,55,55,55,55,55,55,55,55,55,55],
    ];
    placeSprite(printer, prX, prY);
    registerObject('printer', prX, prY, 15, 14, '/projects', 'projects', false);

    // ── Books as clickable object — toggles influences list ──
    registerObject('books', SHELF_X + 2, SHELF_Y + 6, 40, 22, null, 'influences', false);
  }

  // ── Tower speakers (floor-standing, B&W style) ──
  function drawTowerSpeakers() {
    // Left tower
    var ltx = 10, lty = 22;
    for (var r = 0; r < 36; r++) {
      fillRect(ltx, lty + r, 10, 1, 45);
    }
    // top detail
    fillRect(ltx + 1, lty + 1, 8, 1, 46);
    // woofer (large driver)
    fillRect(ltx + 2, lty + 5, 6, 6, 49);
    fillRect(ltx + 3, lty + 6, 4, 4, 48);
    fillRect(ltx + 4, lty + 7, 2, 2, 47);
    // midrange
    fillRect(ltx + 3, lty + 14, 4, 4, 49);
    fillRect(ltx + 4, lty + 15, 2, 2, 47);
    // tweeter
    fillRect(ltx + 4, lty + 21, 2, 2, 47);
    fillRect(ltx + 4, lty + 21, 2, 1, 48);
    // port
    fillRect(ltx + 3, lty + 27, 4, 2, 8);
    // feet
    fillRect(ltx, lty + 35, 2, 1, 32);
    fillRect(ltx + 8, lty + 35, 2, 1, 32);

    // Right tower (mirror)
    var rtx = 222, rty = 22;
    for (var r = 0; r < 36; r++) {
      fillRect(rtx, rty + r, 10, 1, 45);
    }
    fillRect(rtx + 1, rty + 1, 8, 1, 46);
    fillRect(rtx + 2, rty + 5, 6, 6, 49);
    fillRect(rtx + 3, rty + 6, 4, 4, 48);
    fillRect(rtx + 4, rty + 7, 2, 2, 47);
    fillRect(rtx + 3, rty + 14, 4, 4, 49);
    fillRect(rtx + 4, rty + 15, 2, 2, 47);
    fillRect(rtx + 4, rty + 21, 2, 2, 47);
    fillRect(rtx + 4, rty + 21, 2, 1, 48);
    fillRect(rtx + 3, rty + 27, 4, 2, 8);
    fillRect(rtx, rty + 35, 2, 1, 32);
    fillRect(rtx + 8, rty + 35, 2, 1, 32);

    registerObject('speakers', ltx, lty, 10, 36, null, 'audio', false);
    registerObject('speakers-r', rtx, rty, 10, 36, null, 'audio', false);
  }

  // ── Hi-fi credenza + receiver (left side, low) ──
  var CRED_X = 3, CRED_Y = 50;
  function drawCredenza() {
    // credenza body
    fillRect(CRED_X, CRED_Y, 32, 8, 86);
    fillRect(CRED_X, CRED_Y, 32, 1, 11); // top highlight
    fillRect(CRED_X, CRED_Y + 7, 32, 1, 87); // bottom shadow
    // legs
    fillRect(CRED_X + 2, CRED_Y + 8, 2, 2, 12);
    fillRect(CRED_X + 28, CRED_Y + 8, 2, 2, 12);
    // receiver on top
    fillRect(CRED_X + 4, CRED_Y - 5, 24, 5, 82);
    fillRect(CRED_X + 5, CRED_Y - 4, 22, 3, 83);
    // receiver LEDs
    fillRect(CRED_X + 7, CRED_Y - 3, 1, 1, 84);
    fillRect(CRED_X + 9, CRED_Y - 3, 1, 1, 84);
    fillRect(CRED_X + 11, CRED_Y - 3, 1, 1, 81);
    // receiver knobs
    fillRect(CRED_X + 18, CRED_Y - 3, 2, 2, 85);
    fillRect(CRED_X + 22, CRED_Y - 3, 2, 2, 85);

    registerObject('hifi', CRED_X, CRED_Y - 5, 32, 13, null, 'audio', false);
  }

  // ── Desk (wide walnut MCM) ──
  var DESK_X = 45, DESK_Y = 48, DESK_W = 165, DESK_H = 7;
  function drawDesk() {
    // desk top surface
    for (var r = DESK_Y; r < DESK_Y + 2; r++) {
      for (var c = DESK_X; c < DESK_X + DESK_W; c++) {
        var hash = ((c * 13 + r * 7) & 0xFF);
        scene[r * COLS + c] = hash < 80 ? 11 : (hash < 150 ? 9 : 10);
      }
    }
    // desk front face
    fillRect(DESK_X, DESK_Y + 2, DESK_W, DESK_H - 2, 10);
    // desk front edge highlight
    fillRect(DESK_X, DESK_Y + 2, DESK_W, 1, 9);
    // tapered legs
    // left leg
    fillRect(DESK_X + 4, DESK_Y + DESK_H, 3, 12, 12);
    fillRect(DESK_X + 5, DESK_Y + DESK_H + 11, 1, 1, 10);
    // right leg
    fillRect(DESK_X + DESK_W - 7, DESK_Y + DESK_H, 3, 12, 12);
    fillRect(DESK_X + DESK_W - 6, DESK_Y + DESK_H + 11, 1, 1, 10);
    // middle support
    fillRect(DESK_X + Math.floor(DESK_W / 2) - 1, DESK_Y + DESK_H, 3, 10, 12);
  }

  // ── CRT Monitor (left side of desk) ──
  var CRT_X = 55, CRT_Y = 28;
  function drawCRT() {
    // CRT body — chunky retro shape
    var crt = [
      [_,_,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,_,_],
      [_,17,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,17,_],
      [17,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,19,19,18,17],
      [17,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,19,18,17],
      [_,17,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,17,_],
      [_,17,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,17,_],
      [_,_,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,_,_],
      [_,_,_,_,_,_,_,17,18,18,18,18,18,18,17,_,_,_,_,_,_,_],
      [_,_,_,_,_,17,17,17,17,17,17,17,17,17,17,17,17,_,_,_,_,_],
      [_,_,_,_,17,18,18,18,18,18,18,18,18,18,18,18,18,17,_,_,_,_],
    ];
    placeSprite(crt, CRT_X, CRT_Y);

    // power LED
    scene[(CRT_Y + 14) * COLS + (CRT_X + 3)] = 84;

    registerObject('crt', CRT_X, CRT_Y, 22, 19, '/about', 'about', false);
  }

  // ── CRT screen text: "ACAMPOS" in tiny pixel font ──
  function drawCRTText() {
    var sx = CRT_X + 4, sy = CRT_Y + 5;
    // pixel font letters for "ACAMPOS" — 3x5 each, 1px gap
    var letters = {
      A: [[_,21,_],[21,_,21],[21,21,21],[21,_,21],[21,_,21]],
      C: [[21,21,21],[21,_,_],[21,_,_],[21,_,_],[21,21,21]],
      M: [[21,_,21],[21,21,21],[21,21,21],[21,_,21],[21,_,21]],
      P: [[21,21,21],[21,_,21],[21,21,21],[21,_,_],[21,_,_]],
      O: [[21,21,21],[21,_,21],[21,_,21],[21,_,21],[21,21,21]],
      S: [[21,21,21],[21,_,_],[21,21,21],[_,_,21],[21,21,21]],
    };
    var word = ['A','C','A','M','P','O','S'];
    var cx = sx;
    for (var w = 0; w < word.length; w++) {
      var letter = letters[word[w]];
      if (!letter) continue;
      placeSprite(letter, cx, sy);
      cx += 4; // 3 wide + 1 gap but we're tight, use just shift of 2
    }
    // dim scanline effect on screen
    for (var r = CRT_Y + 3; r < CRT_Y + 12; r += 2) {
      for (var c = CRT_X + 3; c < CRT_X + 18; c++) {
        if (scene[r * COLS + c] === 20) scene[r * COLS + c] = 20;
      }
    }
  }

  // ── Ultrawide monitor on arm (center desk) ──
  var UW_X = 88, UW_Y = 27;
  function drawUltrawide() {
    // monitor arm (behind)
    fillRect(UW_X + 22, UW_Y + 18, 2, 5, 102);
    fillRect(UW_X + 18, UW_Y + 22, 10, 2, 102);

    // ultrawide body
    var uw_w = 48, uw_h = 18;
    fillRect(UW_X, UW_Y, uw_w, uw_h, 23);
    // screen
    fillRect(UW_X + 2, UW_Y + 2, uw_w - 4, uw_h - 4, 25);

    // code on screen — scattered colored dots simulating code
    for (var r = UW_Y + 3; r < UW_Y + uw_h - 3; r++) {
      var lineLen = 8 + ((r * 17) % 20);
      for (var c = UW_X + 4; c < UW_X + 4 + lineLen && c < UW_X + uw_w - 4; c++) {
        var hash = ((c * 31 + r * 47) & 0xFF);
        if (hash < 30) scene[r * COLS + c] = 26; // green
        else if (hash < 50) scene[r * COLS + c] = 27; // gold
        else if (hash < 60) scene[r * COLS + c] = 28; // red
        else if (hash < 75) scene[r * COLS + c] = 29; // blue
        else if (hash < 95) scene[r * COLS + c] = 24; // dark (space)
      }
    }

    // chin logo dot
    scene[(UW_Y + uw_h - 2) * COLS + (UW_X + Math.floor(uw_w / 2))] = 32;

    registerObject('ultrawide', UW_X, UW_Y, uw_w, uw_h, 'https://github.com/notaprompt', 'github', true);
  }

  // ── Mechanical keyboard ──
  var KB_X = 95, KB_Y = 46;
  function drawKeyboard() {
    fillRect(KB_X, KB_Y, 22, 4, 59);
    // keycap rows
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 20; c += 2) {
        fillRect(KB_X + 1 + c, KB_Y + r + 1, 1, 1, 60);
      }
    }
    registerObject('keyboard', KB_X, KB_Y, 22, 4, 'https://github.com/notaprompt', 'github', true);
  }

  // ── Coffee mug ──
  var MUG_X = 85, MUG_Y = 44;
  function drawMug() {
    var mug = [
      [_,61,61,61,_],
      [_,61,62,61,_],
      [_,61,62,61,61],
      [_,61,62,61,61],
      [_,61,61,61,_],
    ];
    placeSprite(mug, MUG_X, MUG_Y);
    // steam
    scene[(MUG_Y - 1) * COLS + MUG_X + 2] = 99;
    scene[(MUG_Y - 2) * COLS + MUG_X + 1] = 99;
    registerObject('mug', MUG_X, MUG_Y, 5, 5, '/resume', 'resume', false);
  }

  // ── Desk lamp (architect style, right side) ──
  var LAMP_X = 175, LAMP_Y = 32;
  function drawLamp() {
    // base
    fillRect(LAMP_X + 2, DESK_Y - 1, 6, 1, 63);
    fillRect(LAMP_X + 3, DESK_Y - 2, 4, 1, 63);
    // arm segments
    fillRect(LAMP_X + 5, LAMP_Y + 6, 1, DESK_Y - LAMP_Y - 7, 63);
    fillRect(LAMP_X + 3, LAMP_Y + 4, 1, 3, 63);
    fillRect(LAMP_X + 4, LAMP_Y + 3, 2, 2, 63);
    // shade
    fillRect(LAMP_X, LAMP_Y, 8, 3, 63);
    fillRect(LAMP_X + 1, LAMP_Y + 3, 6, 1, 64);
    // lamp glow
    fillRect(LAMP_X + 2, LAMP_Y + 3, 4, 1, 65);
  }

  // ── Notebook on desk ──
  var NB_X = 160, NB_Y = 46;
  function drawNotebook() {
    fillRect(NB_X, NB_Y, 12, 3, 100);
    fillRect(NB_X + 1, NB_Y, 10, 1, 101); // pages edge
    // pen on top
    fillRect(NB_X + 2, NB_Y - 1, 8, 1, 7);
    scene[(NB_Y - 1) * COLS + NB_X + 2] = 21; // pen tip gold

    registerObject('notebook', NB_X, NB_Y - 1, 12, 4, 'https://linkedin.com/in/alexandercampos', 'linkedin', true);
  }

  // ── Second wall art piece (smaller, right of pendant) ──
  var ART2_X = 75, ART2_Y = 16, ART2_W = 14, ART2_H = 10;
  function drawWallArt2() {
    fillRect(ART2_X, ART2_Y, ART2_W, ART2_H, 69);
    fillRect(ART2_X + 1, ART2_Y + 1, ART2_W - 2, ART2_H - 2, 72);
    // minimalist abstract — cream and amber on black
    for (var r = ART2_Y + 2; r < ART2_Y + ART2_H - 2; r++) {
      for (var c = ART2_X + 2; c < ART2_X + ART2_W - 2; c++) {
        var h = ((c * 23 + r * 37) & 0xFF);
        if (h < 30) scene[r * COLS + c] = 71;
        else if (h < 50) scene[r * COLS + c] = 73;
      }
    }
    registerObject('art', ART1_X, ART1_Y, ART1_W, ART1_H, 'https://instagram.com/notaprompt', 'instagram', true);
  }

  // ── Eames Aluminum Group desk chair (rear 3/4, facing 10 o'clock) ──
  // Left side closer to viewer — left arm visible dropping 90deg down
  // Right side recedes — foreshortened. Back brace crossbar visible.
  var CHAIR_X = 121, CHAIR_Y = 67;
  function drawChair() {
    var A = 32, S = 33, L = 30, H = 31;

    // Eames Aluminum Group — 3/4 rear (~9-10 o'clock), scaled up ~15%

    // ── BACK — 13px wide leather, 12px tall ──
    fillRect(CHAIR_X + 3, CHAIR_Y, 13, 1, A);         // top chrome arch
    fillRect(CHAIR_X + 2, CHAIR_Y + 1, 1, 11, A);    // left rail (near)
    fillRect(CHAIR_X + 1, CHAIR_Y + 2, 1, 9, S);     // left rail shadow
    fillRect(CHAIR_X + 16, CHAIR_Y + 1, 1, 11, A);   // right rail (far)
    fillRect(CHAIR_X + 3, CHAIR_Y + 1, 13, 11, L);   // leather
    fillRect(CHAIR_X + 3, CHAIR_Y + 2, 13, 1, H);    // rib
    fillRect(CHAIR_X + 3, CHAIR_Y + 4, 13, 1, H);    // rib
    fillRect(CHAIR_X + 3, CHAIR_Y + 6, 13, 1, H);    // rib
    fillRect(CHAIR_X + 3, CHAIR_Y + 8, 13, 1, H);    // rib
    fillRect(CHAIR_X + 3, CHAIR_Y + 10, 13, 1, H);   // rib
    fillRect(CHAIR_X + 2, CHAIR_Y + 6, 15, 1, A);    // back brace
    fillRect(CHAIR_X + 2, CHAIR_Y + 12, 15, 1, A);   // bottom rail

    // ── LEFT ARM — thin chrome tube, curved J-shape ──
    fillRect(CHAIR_X + 1, CHAIR_Y + 7, 1, 1, A);     // exits back at brace
    fillRect(CHAIR_X, CHAIR_Y + 8, 1, 1, A);          // curves out + down
    fillRect(CHAIR_X - 1, CHAIR_Y + 9, 1, 1, A);     // continues curve
    fillRect(CHAIR_X - 1, CHAIR_Y + 10, 1, 4, A);    // drops to seat
    fillRect(CHAIR_X - 2, CHAIR_Y + 10, 1, 3, S);    // shadow on drop

    // ── RIGHT ARM — stub ──
    fillRect(CHAIR_X + 16, CHAIR_Y + 6, 1, 1, S);

    // ── GAP + hinge ──
    fillRect(CHAIR_X + 2, CHAIR_Y + 13, 1, 1, A);

    // ── SEAT — sliver visible from left ──
    fillRect(CHAIR_X, CHAIR_Y + 14, 16, 1, A);        // front rail
    fillRect(CHAIR_X + 1, CHAIR_Y + 15, 15, 2, L);   // leather
    fillRect(CHAIR_X + 1, CHAIR_Y + 16, 15, 1, H);   // rib
    fillRect(CHAIR_X, CHAIR_Y + 17, 16, 1, A);        // rear rail
    fillRect(CHAIR_X - 1, CHAIR_Y + 14, 1, 4, A);    // left seat edge
    fillRect(CHAIR_X - 2, CHAIR_Y + 15, 1, 2, S);    // seat edge shadow

    // ── PEDESTAL ──
    fillRect(CHAIR_X + 7, CHAIR_Y + 18, 2, 2, A);
    fillRect(CHAIR_X + 7, CHAIR_Y + 20, 2, 1, S);

    // ── 5-STAR BASE with casters ──
    // center hub
    fillRect(CHAIR_X + 6, CHAIR_Y + 21, 4, 1, A);
    // 5 spokes radiating out
    fillRect(CHAIR_X + 1, CHAIR_Y + 22, 5, 1, A);    // spoke left-front
    fillRect(CHAIR_X + 10, CHAIR_Y + 22, 5, 1, A);   // spoke right-front
    fillRect(CHAIR_X + 7, CHAIR_Y + 22, 2, 1, A);    // spoke center-front
    fillRect(CHAIR_X + 3, CHAIR_Y + 21, 3, 1, S);    // spoke left-rear
    fillRect(CHAIR_X + 10, CHAIR_Y + 21, 3, 1, S);   // spoke right-rear
    // casters (small wheels at spoke tips)
    fillRect(CHAIR_X, CHAIR_Y + 23, 2, 1, S);         // caster 1
    fillRect(CHAIR_X + 7, CHAIR_Y + 23, 2, 1, S);    // caster 2
    fillRect(CHAIR_X + 14, CHAIR_Y + 23, 2, 1, S);   // caster 3
    fillRect(CHAIR_X + 3, CHAIR_Y + 22, 1, 1, S);    // caster 4 (rear)
    fillRect(CHAIR_X + 12, CHAIR_Y + 22, 1, 1, S);   // caster 5 (rear)
  }

  // ── Subwoofer under desk ──
  function drawSubwoofer() {
    var sx = 65, sy = 56;
    fillRect(sx, sy, 12, 10, 93);
    fillRect(sx + 1, sy + 1, 10, 8, 94);
    fillRect(sx + 3, sy + 2, 6, 6, 95);
    fillRect(sx + 5, sy + 4, 2, 2, 48);
  }

  // ── Server / homelab stack (right corner) ──
  var SRV_X = 196, SRV_Y = 42;
  function drawServer() {
    // case stack (2 units)
    fillRect(SRV_X, SRV_Y, 18, 8, 78);
    fillRect(SRV_X + 1, SRV_Y + 1, 16, 3, 79);
    fillRect(SRV_X + 1, SRV_Y + 5, 16, 2, 79);
    // LEDs
    scene[(SRV_Y + 2) * COLS + SRV_X + 2] = 80;
    scene[(SRV_Y + 2) * COLS + SRV_X + 4] = 80;
    scene[(SRV_Y + 2) * COLS + SRV_X + 6] = 81;
    scene[(SRV_Y + 6) * COLS + SRV_X + 2] = 80;
    scene[(SRV_Y + 6) * COLS + SRV_X + 4] = 81;
    // ventilation dots
    for (var c = SRV_X + 10; c < SRV_X + 16; c += 2) {
      scene[(SRV_Y + 2) * COLS + c] = 8;
      scene[(SRV_Y + 6) * COLS + c] = 8;
    }
  }


  // ── Desk plant (right side) ──
  function drawDeskPlant() {
    var dpx = 192, dpy = 40;
    var dplant = [
      [_,_,_,52,_,_],
      [_,_,52,51,52,_],
      [_,52,51,50,51,52],
      [_,51,50,50,50,51],
      [_,_,50,50,50,_],
      [_,_,53,53,53,_],
      [_,_,54,53,54,_],
      [_,_,54,54,54,_],
    ];
    placeSprite(dplant, dpx, dpy);
  }

  // ── Signature: "alexander campos" bottom-left ──
  function drawSignature() {
    // 5x7 pixel font — each letter is [row][col], 5 wide, 7 tall
    var G = 21; // gold
    var D = 22; // dim gold
    var font = {
      a: [
        [_,G,G,G,_],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,G,G,G,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
      ],
      l: [
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,G,G,G,G],
      ],
      e: [
        [G,G,G,G,G],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,G,G,G,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,G,G,G,G],
      ],
      x: [
        [G,_,_,_,G],
        [_,G,_,G,_],
        [_,_,G,_,_],
        [_,_,G,_,_],
        [_,_,G,_,_],
        [_,G,_,G,_],
        [G,_,_,_,G],
      ],
      n: [
        [G,_,_,_,G],
        [G,G,_,_,G],
        [G,_,G,_,G],
        [G,_,G,_,G],
        [G,_,_,G,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
      ],
      d: [
        [G,G,G,_,_],
        [G,_,_,G,_],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,G,_],
        [G,G,G,_,_],
      ],
      r: [
        [G,G,G,G,_],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,G,G,G,_],
        [G,_,G,_,_],
        [G,_,_,G,_],
        [G,_,_,_,G],
      ],
      c: [
        [_,G,G,G,_],
        [G,_,_,_,G],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,G],
        [_,G,G,G,_],
      ],
      m: [
        [G,_,_,_,G],
        [G,G,_,G,G],
        [G,_,G,_,G],
        [G,_,G,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
      ],
      p: [
        [G,G,G,G,_],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,G,G,G,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
        [G,_,_,_,_],
      ],
      o: [
        [_,G,G,G,_],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [G,_,_,_,G],
        [_,G,G,G,_],
      ],
      i: [
        [_,G,G,G,_],
        [_,_,G,_,_],
        [_,_,G,_,_],
        [_,_,G,_,_],
        [_,_,G,_,_],
        [_,_,G,_,_],
        [_,G,G,G,_],
      ],
      s: [
        [_,G,G,G,_],
        [G,_,_,_,G],
        [G,_,_,_,_],
        [_,G,G,G,_],
        [_,_,_,_,G],
        [G,_,_,_,G],
        [_,G,G,G,_],
      ],
    };

    var line1 = ['a','l','e','x','a','n','d','e','r'];
    var line2 = ['c','a','m','p','o','s'];

    var sx = 4;   // left margin
    var sy = 95;   // bottom area of scene

    // line 1: "alexander"
    var cx = sx;
    for (var i = 0; i < line1.length; i++) {
      var glyph = font[line1[i]];
      if (glyph) placeSprite(glyph, cx, sy);
      cx += 6; // 5 wide + 1 gap
    }

    // line 2: "campos" — below, same left margin
    cx = sx;
    for (var j = 0; j < line2.length; j++) {
      var glyph2 = font[line2[j]];
      if (glyph2) placeSprite(glyph2, cx, sy + 8);
      cx += 6;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  BUILD SCENE
  // ══════════════════════════════════════════════════════════════

  drawWalls();
  drawFloor();
  drawRug();
  drawPendant();
  drawWindow();
  drawSwitchPlate();
  drawWallArt();
  drawWallArt2();
  drawShelving();
  drawTowerSpeakers();
  drawCredenza();
  drawDesk();
  drawCRT();
  drawUltrawide();
  drawChair();
  drawKeyboard();
  drawMug();
  drawLamp();
  drawNotebook();
  drawSubwoofer();
  drawServer();
  drawDeskPlant();
  drawSignature();

  // ── Link speaker objects to music panel toggle ──
  objects.forEach(function (o) {
    if (o.label === 'audio') {
      o.action = function () {
        var toggle = document.querySelector('.mp-toggle');
        if (toggle) toggle.click();
      };
    }
    if (o.id === 'books') {
      o.action = function () {
        // toggle influences list
        var list = document.getElementById('influences-list');
        if (list) {
          list.classList.toggle('influences-hidden');
          list.classList.toggle('influences-visible');
        }
        // toggle vault
        if (!vaultOpen && !vaultAnimating) {
          openVault();
        } else if (vaultOpen && !vaultAnimating) {
          closeVault();
        }
      };
    }
  });

  // ── Vault animation ──
  var vaultOpen = false;
  var vaultAnimating = false;
  var vaultInterval = null;
  var vaultFrame = 0;
  // vault region: books area between shelf 1 and shelf 3
  var VX = SHELF_X + 2, VY = SHELF_Y + 6, VW = 40, VH = 22;
  // snapshot original book pixels
  var bookSnapshot = new Uint8Array(VW * VH);
  for (var vy = 0; vy < VH; vy++) {
    for (var vx = 0; vx < VW; vx++) {
      bookSnapshot[vy * VW + vx] = scene[(VY + vy) * COLS + (VX + vx)];
    }
  }

  // dynamic palette slots for music-synced vault colors
  var VAULT_DYN_START = 115; // palette indices 115-123
  var vaultMusicSync = false;

  function updateVaultPalette() {
    var mc = window.__musicColor;
    if (!mc) { vaultMusicSync = false; return; }
    vaultMusicSync = true;
    // parse rgb(r,g,b) from music panel
    var m = mc.match(/\d+/g);
    if (!m || m.length < 3) return;
    var mr = parseInt(m[0]), mg = parseInt(m[1]), mb = parseInt(m[2]);
    var energy = window.__musicEnergy || 0;
    var bass = window.__musicBass || 0;
    // build 9-step gradient from black -> music color, boosted by energy
    for (var i = 0; i < 9; i++) {
      var t = i / 8;
      var boost = 1 + energy * 0.8 + bass * 0.3;
      var r = Math.min(255, Math.round(mr * t * t * boost));
      var g = Math.min(255, Math.round(mg * t * t * boost));
      var b = Math.min(255, Math.round(mb * t * t * boost));
      var key = VAULT_DYN_START + i;
      if (C[key]) delete rgbCache[C[key]];
      C[key] = 'rgb(' + r + ',' + g + ',' + b + ')';
    }
  }

  // portal glow state — bleeds light into the room
  var portalGlowR = 90, portalGlowG = 70, portalGlowB = 140; // default purple

  function drawPortal(phase) {
    updateVaultPalette();
    var cx = VW / 2, cy = VH / 2;
    var energy = window.__musicEnergy || 0;
    var bass = window.__musicBass || 0;
    var breath = Math.sin(phase * 0.015) * 0.12 + 0.88;
    var spinSpeed = 0.025 + energy * 0.01;

    // R&M portal palette: pink, purple, gold — 3 color bands for spiral arms
    // When music plays, these shift toward the music color
    var arms = [
      { r: 200, g: 80, b: 140 },   // pink
      { r: 120, g: 50, b: 200 },   // purple
      { r: 200, g: 160, b: 70 },   // gold
    ];
    if (vaultMusicSync) {
      var mc = window.__musicColor;
      var m = mc && mc.match(/\d+/g);
      if (m) {
        var mr = parseInt(m[0]), mg = parseInt(m[1]), mb = parseInt(m[2]);
        // blend arm colors toward music color
        for (var ai = 0; ai < 3; ai++) {
          arms[ai].r = Math.round(arms[ai].r * 0.5 + mr * 0.5);
          arms[ai].g = Math.round(arms[ai].g * 0.5 + mg * 0.5);
          arms[ai].b = Math.round(arms[ai].b * 0.5 + mb * 0.5);
        }
      }
    }
    // smooth glow color for room bleed (average of arms)
    var avgR = (arms[0].r + arms[1].r + arms[2].r) / 3;
    var avgG = (arms[0].g + arms[1].g + arms[2].g) / 3;
    var avgB = (arms[0].b + arms[1].b + arms[2].b) / 3;
    portalGlowR += (avgR - portalGlowR) * 0.03;
    portalGlowG += (avgG - portalGlowG) * 0.03;
    portalGlowB += (avgB - portalGlowB) * 0.03;

    // R&M spiral: 3 thick arms with distinct color bands, rotating slowly
    for (var py = 0; py < VH; py++) {
      for (var px = 0; px < VW; px++) {
        var dx = (px - cx) / (VW / 2);
        var dy = (py - cy) / (VH / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);

        // spiral arm: angle wraps with distance for swirl
        var spiralAngle = angle + dist * 3.5 - phase * spinSpeed;
        // normalize to 0-1 across 3 arms
        var armPos = ((spiralAngle / (Math.PI * 2)) % 1 + 1) % 1;
        var armIdx = Math.floor(armPos * 3);
        var armBlend = (armPos * 3) % 1; // blend between adjacent arms

        // pick two arm colors and blend
        var a1 = arms[armIdx % 3];
        var a2 = arms[(armIdx + 1) % 3];
        var armR = a1.r + (a2.r - a1.r) * armBlend;
        var armG = a1.g + (a2.g - a1.g) * armBlend;
        var armB = a1.b + (a2.b - a1.b) * armBlend;

        // radial falloff — bright center, dimmer edges
        var radial = Math.pow(Math.max(0, 1 - dist * 0.65), 1.4) * breath;
        // center hot glow boost
        var center = Math.pow(Math.max(0, 1 - dist), 4) * (1.0 + energy * 0.6);

        var r = Math.min(255, Math.round(armR * radial + 200 * center * 0.4));
        var g = Math.min(255, Math.round(armG * radial + 180 * center * 0.3));
        var b = Math.min(255, Math.round(armB * radial + 180 * center * 0.35));

        var key = VAULT_DYN_START + Math.min(8, Math.floor(radial * 9));
        if (C[key]) delete rgbCache[C[key]];
        C[key] = 'rgb(' + r + ',' + g + ',' + b + ')';
        scene[(VY + py) * COLS + (VX + px)] = key;
      }
    }
    // blazing white-tinted core — 3x3
    var ccx = VX + Math.floor(cx), ccy = VY + Math.floor(cy);
    var coreI = breath * (1.3 + energy * 0.5);
    var coreKey = VAULT_DYN_START + 8;
    if (C[coreKey]) delete rgbCache[C[coreKey]];
    C[coreKey] = 'rgb(' + Math.min(255, Math.round(220 * coreI)) + ',' + Math.min(255, Math.round(190 * coreI)) + ',' + Math.min(255, Math.round(210 * coreI)) + ')';
    for (var cdy = -1; cdy <= 1; cdy++) {
      for (var cdx2 = -1; cdx2 <= 1; cdx2++) {
        var cy2 = ccy + cdy, cx2 = ccx + cdx2;
        if (cy2 >= VY && cy2 < VY + VH && cx2 >= VX && cx2 < VX + VW) {
          scene[cy2 * COLS + cx2] = coreKey;
        }
      }
    }
  }

  // cast glow outward from portal into surrounding room — neon bleed, eats the scene
  function castRoomGlow(imgData) {
    if (!vaultOpen) return;
    var breath = Math.sin(vaultFrame * 0.015) * 0.15 + 0.85;
    var energy = window.__musicEnergy || 0;
    var bass = window.__musicBass || 0;
    var nightBoost = sceneTheme === 'dark' ? 3.5 : 1.6;
    var strength = (0.3 + energy * 0.4 + bass * 0.2) * breath * nightBoost;
    var cr = portalGlowR, cg = portalGlowG, cb = portalGlowB;
    // massive glow radius — eats the scene
    var glowR = (sceneTheme === 'dark' ? 55 : 35) + Math.round(energy * 20);
    var vcx = VX + VW / 2, vcy = VY + VH / 2;
    for (var gy = Math.max(0, vcy - glowR); gy <= Math.min(ROWS - 1, vcy + glowR); gy++) {
      for (var gx = Math.max(0, vcx - glowR); gx <= Math.min(COLS - 1, vcx + glowR); gx++) {
        // skip pixels inside the vault itself
        if (gx >= VX && gx < VX + VW && gy >= VY && gy < VY + VH) continue;
        var ddx = (gx - vcx) / glowR;
        var ddy = (gy - vcy) / glowR;
        var dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd > 1) continue;
        var falloff = Math.pow(1 - dd, 2) * strength;
        var pi = (gy * COLS + gx) * 4;
        imgData[pi]     = Math.min(255, imgData[pi]     + Math.round(cr * falloff));
        imgData[pi + 1] = Math.min(255, imgData[pi + 1] + Math.round(cg * falloff));
        imgData[pi + 2] = Math.min(255, imgData[pi + 2] + Math.round(cb * falloff));
      }
    }
  }

  function openVault() {
    vaultAnimating = true;
    var step = 0;
    var maxSteps = 12;
    var anim = setInterval(function () {
      step++;
      // books slide apart: left half slides left, right half slides right
      var gap = Math.floor((VW / 2) * (step / maxSteps));
      // clear vault area
      for (var py = 0; py < VH; py++) {
        for (var px = 0; px < VW; px++) {
          scene[(VY + py) * COLS + (VX + px)] = 105; // void black
        }
      }
      // draw remaining book slivers on edges
      var leftW = Math.max(0, (VW / 2) - gap);
      var rightW = leftW;
      for (var py2 = 0; py2 < VH; py2++) {
        for (var lx = 0; lx < leftW; lx++) {
          scene[(VY + py2) * COLS + (VX + lx)] = bookSnapshot[py2 * VW + (VW / 2 - leftW + lx)];
        }
        for (var rx = 0; rx < rightW; rx++) {
          scene[(VY + py2) * COLS + (VX + VW - rightW + rx)] = bookSnapshot[py2 * VW + (VW / 2 + rx)];
        }
      }
      render();
      if (step >= maxSteps) {
        clearInterval(anim);
        vaultAnimating = false;
        vaultOpen = true;
        vaultFrame = 0;
        // start portal glow loop — slow breathing
        vaultInterval = setInterval(function () {
          vaultFrame++;
          drawPortal(vaultFrame);
          render();
        }, 250);
      }
    }, 40);
  }

  function closeVault() {
    vaultAnimating = true;
    if (vaultInterval) { clearInterval(vaultInterval); vaultInterval = null; }
    var step = 0;
    var maxSteps = 12;
    var anim = setInterval(function () {
      step++;
      var gap = Math.floor((VW / 2) * (1 - step / maxSteps));
      // clear vault area
      for (var py = 0; py < VH; py++) {
        for (var px = 0; px < VW; px++) {
          scene[(VY + py) * COLS + (VX + px)] = 105;
        }
      }
      // books slide back in
      var leftW = Math.max(0, (VW / 2) - gap);
      var rightW = leftW;
      for (var py2 = 0; py2 < VH; py2++) {
        for (var lx = 0; lx < leftW; lx++) {
          scene[(VY + py2) * COLS + (VX + lx)] = bookSnapshot[py2 * VW + (VW / 2 - leftW + lx)];
        }
        for (var rx = 0; rx < rightW; rx++) {
          scene[(VY + py2) * COLS + (VX + VW - rightW + rx)] = bookSnapshot[py2 * VW + (VW / 2 + rx)];
        }
      }
      render();
      if (step >= maxSteps) {
        clearInterval(anim);
        // restore all book pixels exactly
        for (var py3 = 0; py3 < VH; py3++) {
          for (var px3 = 0; px3 < VW; px3++) {
            scene[(VY + py3) * COLS + (VX + px3)] = bookSnapshot[py3 * VW + px3];
          }
        }
        render();
        vaultAnimating = false;
        vaultOpen = false;
      }
    }, 40);
  }

  // ── Apply stored theme before first render ──
  var storedTheme = localStorage.getItem('theme') || 'dark';
  if (storedTheme === 'dark') setSceneTheme('dark');

  // ── Initial render ──
  render();

  // ── Hint: repeating nudge until first interaction ──
  var hasInteracted = false;
  var hintInterval = null;
  function showHint() {
    if (hasInteracted || !tooltip) return;
    tooltip.textContent = 'hover to interact';
    tooltip.classList.add('visible');
    setTimeout(function () {
      if (!hasInteracted) tooltip.classList.remove('visible');
    }, 3500);
  }
  showHint();
  hintInterval = setInterval(showHint, 15000);

  // Server LED blink — staggered, async activity patterns
  var srvLeds = [
    { x: SRV_X + 2, y: SRV_Y + 2, on: 80, rate: 1200 },
    { x: SRV_X + 4, y: SRV_Y + 2, on: 80, rate: 2020 },
    { x: SRV_X + 6, y: SRV_Y + 2, on: 81, rate: 3000 },
    { x: SRV_X + 2, y: SRV_Y + 6, on: 80, rate: 1470 },
    { x: SRV_X + 4, y: SRV_Y + 6, on: 81, rate: 2420 },
  ];
  srvLeds.forEach(function (led) {
    var lit = true;
    setInterval(function () {
      lit = !lit;
      scene[led.y * COLS + led.x] = lit ? led.on : 79;
    }, led.rate);
  });

  // CRT blinking cursor — natural, it's a monitor
  var cursorOn = false;
  var cursorX = CRT_X + 5;
  var cursorY = CRT_Y + 8;
  setInterval(function () {
    cursorOn = !cursorOn;
    var idx = cursorY * COLS + cursorX;
    scene[idx] = cursorOn ? 21 : 20;
    scene[idx + 1] = cursorOn ? 21 : 20;
    render();
  }, 530);

  // Enchanted book — golden pulse + star sparkles across the spine
  var shimmerBookX = SHELF_X + 2 + 17; // book position
  var shimmerBookY = SHELF_Y + 6;
  var shimmerBookW = 4; // 4 pixels wide (a thick book)
  var shimmerBookH = 10;
  var shimmerOriginal = [];
  for (var si = 0; si < shimmerBookH; si++) {
    for (var sw = 0; sw < shimmerBookW; sw++) {
      shimmerOriginal.push(scene[(shimmerBookY + si) * COLS + shimmerBookX + sw]);
    }
  }
  var enchantTick = 0;
  var sparkleSlots = []; // active sparkle positions
  setInterval(function () {
    if (vaultOpen || vaultAnimating) return;
    enchantTick++;
    // restore all to original
    for (var si2 = 0; si2 < shimmerBookH; si2++) {
      for (var sw2 = 0; sw2 < shimmerBookW; sw2++) {
        scene[(shimmerBookY + si2) * COLS + shimmerBookX + sw2] = shimmerOriginal[si2 * shimmerBookW + sw2];
      }
    }
    // golden pulse — whole book pulses between original and gold
    var pulse = Math.sin(enchantTick * 0.06) * 0.5 + 0.5;
    if (pulse > 0.65) {
      // book glows gold when pulse is high
      for (var si3 = 0; si3 < shimmerBookH; si3++) {
        for (var sw3 = 0; sw3 < shimmerBookW; sw3++) {
          if (pulse > 0.8) {
            scene[(shimmerBookY + si3) * COLS + shimmerBookX + sw3] = 21; // full gold
          } else {
            scene[(shimmerBookY + si3) * COLS + shimmerBookX + sw3] = 22; // dim gold
          }
        }
      }
    }
    // spawn new sparkle every ~8 ticks
    if (enchantTick % 8 === 0) {
      sparkleSlots.push({
        x: Math.floor(Math.random() * shimmerBookW),
        y: Math.floor(Math.random() * shimmerBookH),
        life: 5
      });
    }
    // draw active sparkles — bright white star pixels
    for (var sp = sparkleSlots.length - 1; sp >= 0; sp--) {
      var s = sparkleSlots[sp];
      s.life--;
      if (s.life <= 0) { sparkleSlots.splice(sp, 1); continue; }
      var sx = shimmerBookX + s.x, sy = shimmerBookY + s.y;
      // center bright pixel
      scene[sy * COLS + sx] = s.life > 2 ? 104 : 21; // white flash -> gold fade
      // cross pattern for star effect (if in bounds)
      if (s.life > 3) {
        if (sy > shimmerBookY) scene[(sy - 1) * COLS + sx] = 21;
        if (sy < shimmerBookY + shimmerBookH - 1) scene[(sy + 1) * COLS + sx] = 21;
        if (sx > shimmerBookX) scene[sy * COLS + sx - 1] = 21;
        if (sx < shimmerBookX + shimmerBookW - 1) scene[sy * COLS + sx + 1] = 21;
      }
    }
  }, 80);

  // ══════════════════════════════════════════════════════════════
  //  INTERACTION
  // ══════════════════════════════════════════════════════════════

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = COLS * PX / rect.width;
    var scaleY = ROWS * PX / rect.height;
    var mx = Math.floor((e.clientX - rect.left) * scaleX / PX);
    var my = Math.floor((e.clientY - rect.top) * scaleY / PX);

    var found = null;
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (mx >= o.x && mx < o.x + o.w && my >= o.y && my < o.y + o.h) {
        // check non-transparent pixel
        var idx = my * COLS + mx;
        if (scene[idx] !== 0) {
          found = o;
          break;
        }
      }
    }

    if (found !== hoveredObj) {
      hoveredObj = found;
      canvas.style.cursor = found ? 'pointer' : 'default';
      if (found && !hasInteracted) {
        hasInteracted = true;
        if (hintInterval) clearInterval(hintInterval);
      }
      if (tooltip) {
        if (found) {
          tooltip.textContent = found.label;
          tooltip.classList.add('visible');
        } else {
          tooltip.classList.remove('visible');
        }
      }
      render();
    }
  });

  canvas.addEventListener('mouseleave', function () {
    if (hoveredObj) {
      hoveredObj = null;
      canvas.style.cursor = 'default';
      if (tooltip) tooltip.classList.remove('visible');
      render();
    }
  });

  canvas.addEventListener('click', function () {
    if (!hoveredObj) return;
    if (hoveredObj.action) {
      hoveredObj.action();
    } else if (hoveredObj.url) {
      if (hoveredObj.external) {
        window.open(hoveredObj.url, '_blank', 'noopener');
      } else {
        window.location.href = hoveredObj.url;
      }
    }
  });
})();
