/**
 * generate-og-image.js
 * Generates a 1200x630 pixel-art OG image for acampos.dev
 * Usage: npm install canvas && node scripts/generate-og-image.js
 * Output: public/og-image.png
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;

// -- palette (from desk-scene.js) --
const VOID     = '#050505';
const GOLD     = '#b8965a';
const DIM_GOLD = '#d4a843';
const GOLD_DK  = '#8a7040';
const AMBER    = '#cc8844';

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// -- fill void --
ctx.fillStyle = VOID;
ctx.fillRect(0, 0, W, H);

// ── 5x7 pixel font ──
// Each character is a 5-wide, 7-tall bitmap stored as 7 rows of 5 bits.
const FONT = {
  a: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  b: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  c: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  d: [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
  e: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  f: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  g: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  h: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  i: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  j: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  l: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  m: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  n: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  o: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  r: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  s: [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  t: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  u: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  v: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  x: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0b00100, 0b00100],
  ',': [0, 0, 0, 0, 0, 0b00100, 0b01000],
  '-': [0, 0, 0, 0b01110, 0, 0, 0],
  '\'': [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
};

function drawPixelText(text, x, y, scale, color) {
  ctx.fillStyle = color;
  const chars = text.toLowerCase().split('');
  let cx = x;
  for (const ch of chars) {
    const glyph = FONT[ch];
    if (!glyph) { cx += 4 * scale; continue; }
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (1 << (4 - col))) {
          ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
        }
      }
    }
    cx += 6 * scale; // 5 px char + 1 px gap
  }
}

function measurePixelText(text, scale) {
  return text.length * 6 * scale - scale; // subtract trailing gap
}

// ── corner decorations ──
// Small L-shaped brackets in each corner
function drawCorners(inset, len, thickness, color) {
  ctx.fillStyle = color;
  // top-left
  ctx.fillRect(inset, inset, len, thickness);
  ctx.fillRect(inset, inset, thickness, len);
  // top-right
  ctx.fillRect(W - inset - len, inset, len, thickness);
  ctx.fillRect(W - inset - thickness, inset, thickness, len);
  // bottom-left
  ctx.fillRect(inset, H - inset - thickness, len, thickness);
  ctx.fillRect(inset, H - inset - len, thickness, len);
  // bottom-right
  ctx.fillRect(W - inset - len, H - inset - thickness, len, thickness);
  ctx.fillRect(W - inset - thickness, H - inset - len, thickness, len);
}

// ── subtle scanline texture ──
for (let y = 0; y < H; y += 4) {
  ctx.fillStyle = 'rgba(255,255,255,0.008)';
  ctx.fillRect(0, y, W, 1);
}

// ── corner brackets (two layers for depth) ──
drawCorners(24, 60, 3, GOLD_DK);
drawCorners(28, 48, 2, GOLD);

// ── thin horizontal rule above the text block ──
const ruleY = H - 190;
ctx.fillStyle = GOLD_DK;
ctx.fillRect(60, ruleY, 320, 2);

// ── a small pixel-art diamond/dot cluster (decorative) ──
// Positioned right of the rule as a minimal motif
function drawDiamond(cx, cy, size, color) {
  ctx.fillStyle = color;
  for (let row = 0; row < size * 2 - 1; row++) {
    const dist = Math.abs(row - (size - 1));
    const w = size - dist;
    for (let col = 0; col < w; col++) {
      ctx.fillRect(cx - (w - 1) * 2 + col * 4, cy + row * 4, 3, 3);
    }
  }
}
drawDiamond(420, ruleY - 10, 4, GOLD_DK);
drawDiamond(420, ruleY - 10, 3, AMBER);

// ── small pixel desk silhouette (very simplified) ──
// A minimal desk + monitor outline in the upper-right area
const deskX = 780;
const deskY = 160;
const ps = 4; // pixel scale

function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(deskX + x * ps, deskY + y * ps, w * ps, h * ps);
}

// monitor
px(12, 0, 20, 1, '#333333');   // top bezel
px(11, 1, 1, 14, '#2a2a2a');   // left bezel
px(32, 1, 1, 14, '#2a2a2a');   // right bezel
px(12, 15, 20, 1, '#333333');  // bottom bezel
px(12, 1, 20, 14, '#0d1117');  // screen
// screen content lines
px(14, 3, 8, 1, '#5BF29B');    // green line
px(14, 5, 12, 1, GOLD_DK);    // gold line
px(14, 7, 6, 1, '#6a8aaa');    // blue line
px(14, 9, 10, 1, '#5BF29B');   // green line
px(14, 11, 4, 1, '#c75050');   // red line
px(14, 13, 9, 1, GOLD_DK);    // gold line
// monitor stand
px(20, 16, 4, 3, '#333333');
px(17, 19, 10, 1, '#2a2a2a');

// desk surface
px(0, 22, 44, 2, '#5c3d2e');   // desk top
px(0, 24, 44, 1, '#4a3222');   // desk shadow
// desk legs
px(2, 25, 2, 8, '#3d2818');
px(40, 25, 2, 8, '#3d2818');

// keyboard
px(14, 20, 14, 2, '#1a1a1a');
px(15, 20, 12, 1, '#252525');

// mug
px(34, 19, 3, 3, '#1e1e1e');
px(37, 20, 1, 1, '#2a2a2a');

// small plant
px(5, 18, 3, 4, '#2d5a27');
px(6, 17, 2, 1, '#4a7a3a');
px(5, 16, 1, 1, '#5a8a4a');
px(8, 17, 1, 1, '#4a7a3a');
px(5, 22, 3, 1, '#6b4a2a');

// CRT monitor (small, left side of desk)
px(2, 12, 8, 1, '#333333');
px(1, 13, 1, 8, '#2a2a2a');
px(10, 13, 1, 8, '#2a2a2a');
px(2, 21, 8, 1, '#333333');
px(2, 13, 8, 8, '#0a1a0a');
// CRT text
px(3, 14, 4, 1, GOLD);
px(3, 16, 6, 1, GOLD_DK);
px(3, 18, 3, 1, GOLD);

// lamp glow (subtle)
ctx.fillStyle = 'rgba(204, 136, 68, 0.04)';
for (let r = 60; r > 0; r -= 4) {
  ctx.beginPath();
  ctx.arc(deskX + 22 * ps, deskY - 2 * ps, r, 0, Math.PI * 2);
  ctx.fill();
}

// ── main text ──
const nameScale = 5;
const nameText = 'alexander campos';
const nameX = 60;
const nameY = ruleY + 20;
drawPixelText(nameText, nameX, nameY, nameScale, GOLD);

// ── tagline ──
const tagScale = 3;
const tagText = 'building things to protect how we think.';
const tagX = 62;
const tagY = nameY + 7 * nameScale + 16;
drawPixelText(tagText, tagX, tagY, tagScale, DIM_GOLD);

// ── output ──
const buf = canvas.toBuffer('image/png');
writeFileSync(OUT, buf);
console.log('wrote', OUT, '(' + buf.length + ' bytes)');
