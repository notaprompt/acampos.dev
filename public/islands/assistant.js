// Oliver — the site's resident clippy
// a dog who lives in his room, dances, and provides moral support
(function () {
  // Don't re-init on client-side navigation
  if (window.__oliverInit) return;
  window.__oliverInit = true;
  // Oliver works everywhere — desktop and mobile

  // ── Oliver's Pixel Sprite ───────────────────────────────────
  // French Bulldog as a CSS pixel grid — no text alignment issues
  // Each frame is a 2D array: 0=empty, 1=body, 2=dark, 3=eye, 4=nose, 5=tongue, 6=tail
  // Rendered as a grid of tiny divs
  // Colors: blue brindle French Bulldog with white chest patch
  var C = {
    0: 'transparent',
    1: '#6b7b8a',       // blue-grey base coat
    2: '#4a5662',       // dark brindle streaks
    3: '#3b4550',       // darker brindle / paws
    4: '#111111',       // black — eyes, nose
    5: '#c75050',       // tongue — pink/red
    6: '#6b7b8a',       // tail
    7: '#8a9aaa',       // lighter grey highlight (chest, brow)
    8: '#586878',       // mid brindle
    9: '#7d8d9c',       // light mid tone
    10: '#e0d8d0',      // white chest patch
    11: '#c4a090',      // inner ear pink
    17: '#53544e',      // rug — grey weave
    18: '#343730',      // rug — dark accent
    19: '#7d8075',      // rug — light fringe
    20: '#2d5a27',      // plant — dark green leaf
    21: '#5a8a3a',      // plant — light green edge
    22: '#a85030',      // plant — terracotta pot
    23: '#7a3820',      // plant — pot shadow
    24: '#e8dcc8',      // bone — light ivory
    25: '#c8b8a0',      // bone — shadow
  };
  var PX = 4; // pixel size — 4px x 20cols = 80px wide
  // 20 wide x 18 tall — detailed blue brindle frenchie
  // big bat ears, flat wrinkly face, wide chest, stubby legs, nub tail
  // _ = shorthand for building rows
  var _ = 0;
  var FRAMES = [
    // 0: idle — sitting, looking forward
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 1: tail wag right
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,6,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,6,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 2: tail wag left
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 3: happy squint
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 4: head tilt right
    [
      [_,_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_],
      [_,_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_],
      [_,_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_],
      [_,_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_],
      [_,_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_],
      [_,_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_],
      [_,_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_],
      [_,_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 5: blink
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 6: tongue out
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,5,5,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,5,5,7,7,1,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 7: paw wave — right paw up
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,_,1,1,3,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,_,_,3,3,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 8: wiggle left — whole body shifts
    [
      [_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_,_],
      [_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_,_],
      [_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_,_],
      [_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_,_],
      [_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_,_],
      [_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_,_],
      [_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_,_],
      [_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_,_],
      [_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_,_],
      [_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_,_],
      [_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_,_],
      [_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_,_],
      [_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_,_],
      [_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_,_],
      [_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_,_],
      [_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 9: wiggle right
    [
      [_,_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_],
      [_,_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_],
      [_,_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_],
      [_,_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_],
      [_,_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_],
      [_,_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_],
      [_,_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_],
      [_,_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_],
      [_,_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_],
      [_,_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_],
      [_,_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_],
      [_,_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_],
      [_,_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_],
      [_,_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_],
      [_,_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_],
      [_,_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 10: ear twitch left
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,11,1,_,_,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,2,1,1,1,1,10,1,1,1,2,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
    // 11: bounce up — body shifts up 1 row
    [
      [_,_,1,1,1,1,_,_,_,_,_,_,_,_,1,1,1,1,_,_],
      [_,_,1,11,11,1,1,_,1,1,1,1,_,1,1,11,11,1,_,_],
      [_,_,1,11,11,1,1,9,1,1,1,1,9,1,1,11,11,1,_,_],
      [_,_,1,8,1,1,9,1,1,1,1,1,1,9,1,1,8,1,_,_],
      [_,_,_,1,1,4,4,7,1,1,1,1,7,4,4,1,1,_,_,_],
      [_,_,_,1,1,4,4,1,1,1,1,1,1,4,4,1,1,_,_,_],
      [_,_,_,_,1,1,1,1,1,4,4,1,1,1,1,1,_,_,_,_],
      [_,_,_,_,_,1,1,1,1,1,1,1,1,1,1,_,_,_,_,_],
      [_,_,_,_,_,1,1,7,7,7,7,7,7,1,1,_,_,_,_,_],
      [_,_,_,_,1,2,8,1,9,1,1,9,1,8,2,1,_,_,_,_],
      [_,_,_,1,1,8,2,1,1,9,9,1,1,2,8,1,1,_,_,_],
      [_,_,_,1,2,8,1,8,2,2,2,2,8,1,8,2,1,_,_,_],
      [_,_,_,1,1,1,1,1,1,10,10,1,1,1,1,1,1,_,_,_],
      [_,_,_,1,1,8,1,_,_,_,_,_,_,1,8,1,1,_,_,_],
      [_,_,_,1,1,2,1,_,_,_,_,_,_,1,2,1,1,_,_,_],
      [_,_,_,3,3,3,3,_,_,_,_,_,_,3,3,3,3,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ],
  ];

  // ── Rug — woven pattern under Oliver ─────────────────────
  // Rug — separate element Oliver sits on
  // Generated procedurally to fill the panel width
  var RUG_COLS = 80; // 80 * 4px = 320px — fills most of 380px panel
  var RUG_ROWS = 14;
  var RUG = [];
  (function buildRug() {
    for (var r = 0; r < RUG_ROWS; r++) {
      var row = [];
      for (var c = 0; c < RUG_COLS; c++) {
        if (r === 0 || r === RUG_ROWS - 1) {
          // fringe rows — alternating 19 and empty
          row.push(c % 2 === 0 ? 19 : 0);
        } else if (r === 1 || r === RUG_ROWS - 2) {
          // border rows — more 18 accents
          row.push((c + r) % 2 === 0 ? 18 : 19);
        } else {
          // weave body — checkerboard of 17 and 19 with scattered 18
          var base = (c + r) % 2 === 0 ? 17 : 19;
          // occasional 18 accent
          if ((c * 7 + r * 13) % 23 === 0) base = 18;
          row.push(base);
        }
      }
      RUG.push(row);
    }
  })();

  // ── Snake Plant — 12 cols x 18 rows ──────────────────────
  var PLANT_COLS = 12;
  var PLANT = [
    [_,_,_,_,_,21,_,_,_,_,_,_],
    [_,_,_,_,_,20,_,_,_,_,_,_],
    [_,_,_,21,_,20,21,_,_,_,_,_],
    [_,_,_,20,_,20,20,_,_,_,_,_],
    [_,_,_,20,_,20,20,_,21,_,_,_],
    [_,_,_,20,21,20,20,_,20,_,_,_],
    [_,_,21,20,20,20,20,21,20,_,_,_],
    [_,_,20,20,21,20,20,20,20,_,_,_],
    [_,_,20,20,21,20,21,20,20,_,_,_],
    [_,_,20,20,21,20,21,20,20,_,_,_],
    [_,_,20,20,21,20,21,20,20,_,_,_],
    [_,_,_,20,20,20,20,20,_,_,_,_],
    [_,_,_,20,20,20,20,20,_,_,_,_],
    [_,_,22,22,22,22,22,22,22,_,_,_],
    [_,_,23,22,22,22,22,22,23,_,_,_],
    [_,_,_,23,22,22,22,23,_,_,_,_],
    [_,_,_,23,23,23,23,23,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_],
  ];

  // ── Speech ─────────────────────────────────────────────────
  // Small greetings, desk observations, and dog business, interleaved + shuffled.
  var SPEECH_GROUPS = [
    [ // greetings
      'hello. good to see you.',
      'i saved you a spot. it is mostly rug.',
      'take your time. i am comfortable.',
      'you can stay a while.',
      'my schedule is fairly open.',
    ],
    [ // around the desk
      'the plant and i have a quiet arrangement.',
      'that chair looks comfortable. i have made a note.',
      'nice day for an inside nap.',
      'i am keeping an eye on the snack situation.',
      'the music is good. my dancing is mostly ears.',
    ],
    [ // dog business
      '*moves two inches. settles back down.*',
      '*one ear up*',
      'woof.',
      'treat? just checking.',
      '*stretches. takes this very seriously.*',
    ],
  ];

  // ── Feature 1: Page-specific quotes ─────────────────────────
  var PAGE_SPEECH = {
    '/projects': [
      'you can look around. i will be here.',
      'i helped by not stepping on the keyboard.',
    ],
    '/about': [
      'that\'s alex. i\'m oliver.',
      'my version would have more walks.',
    ],
    '/writing': [
      'a good spot for a long read.',
      'i have not learned to turn pages. still hopeful.',
    ],
    '/links': [
      'more places to wander. come back for a visit.',
      'i prefer links that lead to snacks.',
    ],
    '/research': [
      'this is the longer read. get comfortable.',
      'i brought no footnotes. just paws.',
    ],
  };

  // ── Feature 2: Time-specific quotes ─────────────────────────
  var TIME_SPEECH = {
    late: [
      'the late shift on the rug is very quiet.',
      '*sleepy blink* hello.',
    ],
    morning: [
      '*big yawn* morning.',
      'good morning. breakfast is on my agenda.',
    ],
    afternoon: [
      'the afternoon nap is proceeding nicely.',
      'a quiet corner. very good.',
    ],
  };

  // ── Feature 7: Secret quotes (unlocked via easter egg) ──────
  var SECRET_SPEECH = [
    'you found the secret. i was hoping it was a biscuit.',
    'this is my very exclusive second nap spot.',
    'please keep the secret. the plant gets competitive.',
  ];

  // Build interleaved queue — round-robin across groups, shuffled within each
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // Insert items at random positions in an array
  function mixIn(queue, items) {
    for (var i = 0; i < items.length; i++) {
      var pos = Math.floor(Math.random() * (queue.length + 1));
      queue.splice(pos, 0, items[i]);
    }
  }

  // Get current time period
  function getTimePeriod() {
    var h = new Date().getHours();
    if (h >= 23 || h <= 4) return 'late';
    if (h >= 5 && h <= 11) return 'morning';
    if (h >= 12 && h <= 17) return 'afternoon';
    return null;
  }

  // Get page quotes for current path
  function getPageQuotes() {
    var path = window.location.pathname;
    var keys = Object.keys(PAGE_SPEECH);
    for (var i = 0; i < keys.length; i++) {
      if (path.indexOf(keys[i]) === 0) {
        // Pick 2-3 random quotes from the pool
        var pool = shuffle(PAGE_SPEECH[keys[i]].slice());
        var count = Math.min(pool.length, 2 + Math.floor(Math.random() * 2)); // 2 or 3
        return pool.slice(0, count);
      }
    }
    return [];
  }

  // Get time quotes
  function getTimeQuotes() {
    var period = getTimePeriod();
    if (!period || !TIME_SPEECH[period]) return [];
    var pool = shuffle(TIME_SPEECH[period].slice());
    var count = Math.min(pool.length, 1 + Math.floor(Math.random() * 2)); // 1 or 2
    return pool.slice(0, count);
  }

  var speechQueue = [];
  function refillSpeech() {
    var buckets = SPEECH_GROUPS.map(function(g) { return shuffle(g.slice()); });
    var maxLen = Math.max.apply(null, buckets.map(function(b) { return b.length; }));
    speechQueue = [];
    for (var i = 0; i < maxLen; i++) {
      for (var g = 0; g < buckets.length; g++) {
        if (i < buckets[g].length) speechQueue.push(buckets[g][i]);
      }
    }

    // Mix in page-specific quotes
    var pageQ = getPageQuotes();
    if (pageQ.length > 0) mixIn(speechQueue, pageQ);

    // Mix in time-specific quotes
    var timeQ = getTimeQuotes();
    if (timeQ.length > 0) mixIn(speechQueue, timeQ);

    // Mix in secret quotes if unlocked
    if (localStorage.getItem('oliver_secret_unlocked') === 'true') {
      var secretQ = shuffle(SECRET_SPEECH.slice());
      var secretCount = Math.min(secretQ.length, 2 + Math.floor(Math.random() * 2));
      mixIn(speechQueue, secretQ.slice(0, secretCount));
    }
  }
  refillSpeech();

  function nextSpeech() {
    if (speechQueue.length === 0) refillSpeech();
    return speechQueue.shift();
  }

  // ── Feature 5: Visitor Memory ───────────────────────────────
  var visitCount = parseInt(localStorage.getItem('oliver_visits') || '0', 10);
  if (!sessionStorage.getItem('oliver_counted')) {
    visitCount++;
    localStorage.setItem('oliver_visits', String(visitCount));
    sessionStorage.setItem('oliver_counted', 'true');
  }

  function getGreeting() {
    if (visitCount <= 1) return 'woof! welcome to my room!';
    if (visitCount <= 4) return 'oh hey. you came back. *tail wag*';
    if (visitCount <= 9) return 'you again. good. the rug missed you.';
    if (visitCount <= 19) return 'at this point we\'re in a relationship. i\'m comfortable with that.';
    if (visitCount <= 49) return 'you\'re a regular. i\'ve started saving your spot on the rug.';
    return 'i\'ve known you longer than most of his repos have survived. that means something.';
  }

  // ── Auto-spawn ────────────────────────────────────────────
  injectStyles();
  hidePrompt();
  spawnInRoom('oliver');

  function hidePrompt() {
    var p = document.getElementById('assistant-prompt');
    if (p) p.style.display = 'none';
  }

  // ── Spawn Oliver in his room ────────────────────────────────
  function spawnInRoom(name) {
    var isOliver = name.toLowerCase() === 'oliver';
    var startOpen = window.innerWidth > 1180;
    var roomOpen = startOpen;

    // ── Interaction state flag ──
    var interactionActive = false;

    // ── Feature: Mood states ──
    var mood = 'alert'; // alert -> relaxed -> sleepy
    var lastInteraction = Date.now();
    var moodFrameSkip = 0;

    function updateMood() {
      var elapsed = Date.now() - lastInteraction;
      var musicPlaying = !!window.__musicPlayerAnalyser;
      // Check if music is actually producing output
      if (musicPlaying) {
        var testData = new Uint8Array(window.__musicPlayerAnalyser.frequencyBinCount);
        window.__musicPlayerAnalyser.getByteFrequencyData(testData);
        var testSum = 0;
        for (var ti = 0; ti < testData.length; ti++) testSum += testData[ti];
        musicPlaying = testSum > 0;
      }
      if (elapsed > 480000) { // 8 min
        mood = musicPlaying ? 'relaxed' : 'sleepy'; // music prevents sleepy
      } else if (elapsed > 180000) { // 3 min
        mood = 'relaxed';
      } else {
        mood = 'alert';
      }
    }

    function resetMoodToAlert() {
      lastInteraction = Date.now();
      mood = 'alert';
    }

    // ── Feature: Ambient idle animations ──
    var nextAmbient = Date.now() + 20000 + Math.random() * 25000;
    var ambientQueue = []; // frames to play as micro-animation
    var ambientTick = 0;

    // ── Feature: Music reactivity state ──
    var wasMusicPlaying = false;

    // ── Room panel ──
    var panel = document.createElement('div');
    panel.id = 'oliver-room';
    panel.className = startOpen ? 'open' : '';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Oliver’s room');
    panel.inert = !startOpen;
    panel.innerHTML = [
      '<div class="or-titlebar">',
      '  <span class="or-title">' + esc(name) + '.exe</span>',
      '  <button class="or-close" aria-label="Close room">\u00D7</button>',
      '</div>',
      '<div class="or-stage">',
      '  <div class="or-bubble"></div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(panel);

    // ── Toggle button ──
    var toggle = document.createElement('button');
    toggle.id = 'or-toggle';
    toggle.className = startOpen ? 'shifted' : 'glow';
    toggle.textContent = esc(name);
    toggle.setAttribute('aria-label', 'Toggle ' + esc(name) + ' room');
    document.body.appendChild(toggle);

    // ── Element refs ──
    var stage = panel.querySelector('.or-stage');
    var bubbleEl = stage.querySelector('.or-bubble');
    var closeBtnEl = panel.querySelector('.or-close');

    // ── Build scene: Oliver + plant side by side, rug below ──
    var sceneRow = document.createElement('div');
    sceneRow.className = 'ol-scene-row';
    stage.appendChild(sceneRow);

    // Oliver sprite
    var spriteWrap = document.createElement('div');
    spriteWrap.className = 'ol-sprite';
    sceneRow.appendChild(spriteWrap);

    // Snake plant
    var plantWrap = document.createElement('div');
    plantWrap.className = 'ol-plant';
    plantWrap.style.gridTemplateColumns = 'repeat(' + PLANT_COLS + ', ' + PX + 'px)';
    plantWrap.style.gridTemplateRows = 'repeat(' + PLANT.length + ', ' + PX + 'px)';
    for (var pr = 0; pr < PLANT.length; pr++) {
      for (var pc = 0; pc < PLANT_COLS; pc++) {
        var pp = document.createElement('div');
        pp.style.gridRow = (pr + 1);
        pp.style.gridColumn = (pc + 1);
        pp.style.width = PX + 'px';
        pp.style.height = PX + 'px';
        pp.style.background = C[PLANT[pr][pc]] || 'transparent';
        plantWrap.appendChild(pp);
      }
    }
    sceneRow.appendChild(plantWrap);

    // Bone — pixel bone on the rug near Oliver's paws
    var BONE = [
      [_,24,24,_,_,_,_,_,_,24,24,_],
      [24,25,24,24,24,24,24,24,25,24,25,24],
      [_,24,24,_,_,_,_,_,_,24,24,_],
    ];
    var BONE_COLS = 12;
    var boneWrap = document.createElement('div');
    boneWrap.className = 'ol-bone';
    boneWrap.style.display = 'grid';
    boneWrap.style.gridTemplateColumns = 'repeat(' + BONE_COLS + ', ' + PX + 'px)';
    boneWrap.style.gridTemplateRows = 'repeat(' + BONE.length + ', ' + PX + 'px)';
    boneWrap.style.transform = 'rotate(-12deg)';
    boneWrap.style.pointerEvents = 'none';
    for (var br = 0; br < BONE.length; br++) {
      for (var bc = 0; bc < BONE_COLS; bc++) {
        var bp = document.createElement('div');
        bp.style.gridRow = (br + 1);
        bp.style.gridColumn = (bc + 1);
        bp.style.width = PX + 'px';
        bp.style.height = PX + 'px';
        bp.style.background = C[BONE[br][bc]] || 'transparent';
        boneWrap.appendChild(bp);
      }
    }
    // Rug below both
    var rugWrap = document.createElement('div');
    rugWrap.className = 'ol-rug';
    var rugRows = RUG.length;
    rugWrap.style.gridTemplateColumns = 'repeat(' + RUG_COLS + ', ' + PX + 'px)';
    rugWrap.style.gridTemplateRows = 'repeat(' + rugRows + ', ' + PX + 'px)';
    for (var rr = 0; rr < rugRows; rr++) {
      for (var rc = 0; rc < RUG_COLS; rc++) {
        var rp = document.createElement('div');
        rp.style.gridRow = (rr + 1);
        rp.style.gridColumn = (rc + 1);
        rp.style.width = PX + 'px';
        rp.style.height = PX + 'px';
        rp.style.background = C[RUG[rr][rc]] || 'transparent';
        rugWrap.appendChild(rp);
      }
    }
    stage.appendChild(rugWrap);

    var nameLabel = document.createElement('div');
    nameLabel.className = 'or-name';
    nameLabel.textContent = esc(name);
    stage.appendChild(nameLabel);

    // ── Feature 3: Treat button (bone replaces ~) ──
    var treatBtn = document.createElement('button');
    treatBtn.className = 'or-treat';
    treatBtn.appendChild(boneWrap);
    // If secret already unlocked, apply glow style
    if (localStorage.getItem('oliver_secret_unlocked') === 'true') {
      treatBtn.classList.add('or-treat-glow');
    }
    treatBtn.setAttribute('aria-label', 'Give Oliver a treat');
    stage.appendChild(treatBtn);

    // ── Chat: throw me a bone -> actually talk to Oliver ──
    var chatCta = document.createElement('button');
    chatCta.className = 'or-chat-cta';
    chatCta.textContent = 'psst — throw me a bone. ask me something →';
    stage.appendChild(chatCta);

    var chat = document.createElement('div');
    chat.className = 'or-chat';
    chat.innerHTML = [
      '<div class="or-chat-back">‹ back to the rug</div>',
      '<div class="or-chat-log"></div>',
      '<div class="or-chat-input-row">',
      '  <input class="or-chat-input" type="text" maxlength="600" aria-label="Ask Oliver about Alex" placeholder="ask oliver about alex…" />',
      '  <button class="or-chat-send" aria-label="Send message">→</button>',
      '</div>',
      '<p class="or-chat-note">Chat uses external model providers. Keep private details out.</p>',
    ].join('\n');
    stage.appendChild(chat);
    var chatLog = chat.querySelector('.or-chat-log');
    var chatInput = chat.querySelector('.or-chat-input');
    var chatSend = chat.querySelector('.or-chat-send');
    var chatBack = chat.querySelector('.or-chat-back');
    var chatHistory = [];
    var chatGreeted = false;
    var chatBusy = false;

    var rows = FRAMES[0].length;
    var cols = FRAMES[0][0].length;
    var pixels = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var px = document.createElement('div');
        px.className = 'ol-px';
        px.style.gridRow = (r + 1);
        px.style.gridColumn = (c + 1);
        spriteWrap.appendChild(px);
        pixels.push(px);
      }
    }
    spriteWrap.style.gridTemplateColumns = 'repeat(' + cols + ', ' + PX + 'px)';
    spriteWrap.style.gridTemplateRows = 'repeat(' + rows + ', ' + PX + 'px)';

    // ── Render frame ──
    function renderFrame(frame) {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var val = frame[r][c];
          var px = pixels[r * cols + c];
          px.style.background = C[val] || 'transparent';
        }
      }
    }
    renderFrame(FRAMES[0]);

    // ── Toggle room ──
    function toggleRoom() {
      roomOpen = !roomOpen;
      panel.classList.toggle('open', roomOpen);
      panel.inert = !roomOpen;
      toggle.setAttribute('aria-expanded', String(roomOpen));
      toggle.classList.toggle('shifted', roomOpen);
      toggle.classList.remove('glow');
    }

    toggle.addEventListener('click', function () {
      resetMoodToAlert();
      toggleRoom();
    });
    toggle.setAttribute('aria-controls', 'oliver-room');
    toggle.setAttribute('aria-expanded', String(startOpen));
    closeBtnEl.addEventListener('click', function () {
      if (roomOpen) { toggleRoom(); toggle.focus(); }
    });

    // Click sprite to trigger a speech bubble
    spriteWrap.addEventListener('click', function () {
      resetMoodToAlert();
      if (bubbleEl.style.opacity === '1') return;
      showBubble(nextSpeech());
    });

    // ── Dance sequence ──
    var SEQUENCE = [0,0,1,2,0,0,3,0,1,2,0,8,9,8,9,0,0,5,0,4,0,6,0,0,10,0,7,0,11,0,0,1,2,3,0];
    var seqIdx = 0;

    // ── Feature 6: Cursor tracking state ──
    var lastMouseX = -1;
    var panelRect = null;

    panel.addEventListener('mousemove', function (e) {
      lastMouseX = e.clientX;
      panelRect = panel.getBoundingClientRect();
    });

    panel.addEventListener('mouseleave', function () {
      lastMouseX = -1;
    });

    var cursorTrackReady = false;
    setInterval(function () {
      cursorTrackReady = true;
    }, 2000);

    setInterval(function () {
      if (interactionActive) return;

      // ── Mood update ──
      updateMood();

      // ── Mood-based frame skipping (simulates slower animation) ──
      if (mood === 'relaxed' && ++moodFrameSkip % 2 !== 0) return;
      if (mood === 'sleepy' && ++moodFrameSkip % 3 !== 0) return;

      // ── Music reactivity ──
      var analyser = window.__musicPlayerAnalyser;
      var musicEnergy = 0;
      if (analyser) {
        var freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        var third = Math.floor(freqData.length / 3);
        var bass = 0;
        for (var bi = 0; bi < third; bi++) bass += freqData[bi] / 255;
        musicEnergy = bass / third; // 0-1
      }

      // Track music state for wind-down
      var musicIsPlaying = musicEnergy > 0.05;
      var musicJustStopped = wasMusicPlaying && !musicIsPlaying;
      wasMusicPlaying = musicIsPlaying;

      // ── Ambient idle micro-animations ──
      if (ambientQueue.length > 0) {
        renderFrame(FRAMES[ambientQueue.shift()]);
        return;
      }

      if (!interactionActive && Date.now() > nextAmbient && musicEnergy < 0.3) {
        nextAmbient = Date.now() + 20000 + Math.random() * 25000;
        if (mood === 'sleepy') {
          // Sleepy: mostly blinks
          ambientQueue = [5, 0];
        } else {
          // Pick a random micro-animation
          var pick = Math.random();
          if (pick < 0.33) {
            // Ear twitch: frame 4 for one tick, then idle
            ambientQueue = [4, 0];
          } else if (pick < 0.66) {
            // Yawn: frame 10 for two ticks, then idle
            ambientQueue = [10, 10, 0];
          } else {
            // Weight shift: wiggle then settle
            ambientQueue = [8, 0];
          }
        }
        renderFrame(FRAMES[ambientQueue.shift()]);
        return;
      }

      var currentFrame = SEQUENCE[seqIdx];
      seqIdx = (seqIdx + 1) % SEQUENCE.length;
      var nextFrame = SEQUENCE[seqIdx];

      // ── Music reactivity: override idle frame selection ──
      if (nextFrame === 0 && musicIsPlaying) {
        if (musicEnergy > 0.7) {
          // Rapid tail wags — alternate between frames 1 and 2
          renderFrame(FRAMES[seqIdx % 2 === 0 ? 1 : 2]);
          return;
        } else if (musicEnergy > 0.5) {
          // Energetic: bias toward tail wags, wiggles, bounce
          var energeticFrames = [1, 2, 8, 9, 11, 1, 2];
          renderFrame(FRAMES[energeticFrames[Math.floor(Math.random() * energeticFrames.length)]]);
          return;
        }
      }

      // Music just stopped — settle to idle with occasional yawn
      if (nextFrame === 0 && musicJustStopped) {
        if (Math.random() < 0.3) {
          renderFrame(FRAMES[10]); // yawn/pant
          return;
        }
      }

      // ── Sleepy mood: mostly idle with occasional blink ──
      if (mood === 'sleepy' && nextFrame !== 0 && nextFrame !== 5) {
        // In sleepy mode, suppress most non-idle frames
        if (Math.random() < 0.7) {
          renderFrame(FRAMES[Math.random() < 0.3 ? 5 : 0]); // blink or idle
          return;
        }
      }

      // Feature 6: Cursor tracking — only override idle frames
      if (nextFrame === 0 && cursorTrackReady && lastMouseX >= 0 && panelRect) {
        var spriteBounds = spriteWrap.getBoundingClientRect();
        var spriteCenterX = spriteBounds.left + spriteBounds.width / 2;
        cursorTrackReady = false;
        if (lastMouseX < spriteCenterX - 10) {
          renderFrame(FRAMES[8]); // wiggle left
          return;
        } else if (lastMouseX > spriteCenterX + 10) {
          renderFrame(FRAMES[4]); // head tilt right
          return;
        }
      }

      renderFrame(FRAMES[nextFrame]);
    }, 350);

    // ── Speech bubbles ──
    function showBubble(text) {
      bubbleEl.textContent = text;
      bubbleEl.style.opacity = '1';
      setTimeout(function () {
        bubbleEl.style.opacity = '0';
      }, 9000);
    }

    // ── Feature 3: Treat button handler ──
    var TREAT_QUOTES = [
      'thank you. this is all any of us want. sustenance and someone who showed up.',
      'a treat. you are a good human. the best data point i have.',
      '*monch* ...where was i. oh right. the nature of consciousness. *monch*',
      'you fed me. therefore you exist. this is my ontology.',
      'i will remember this. unlike your browser. i will remember.',
    ];

    // Throw the bone -> Oliver lights up, scoots over, and opens the conversation.
    treatBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (interactionActive) return;
      resetMoodToAlert();

      // Count the bones (kept for flavor)
      var totalTreats = parseInt(localStorage.getItem('oliver_treats') || '0', 10);
      totalTreats++;
      localStorage.setItem('oliver_treats', String(totalTreats));

      // Happy animation, THEN open the chat
      var treatFrames = [11, 6, 8, 9, 3, 11, 0];
      var frameIdx = 0;
      interactionActive = true;
      var treatAnim = setInterval(function () {
        if (frameIdx < treatFrames.length) {
          renderFrame(FRAMES[treatFrames[frameIdx]]);
          frameIdx++;
        } else {
          clearInterval(treatAnim);
          interactionActive = false;
          openChat();
        }
      }, 130);
    });

    // ── Feature 4: Pet mechanic ──
    var hoverTimer = null;
    var isPetting = false;

    spriteWrap.addEventListener('mouseenter', function () {
      hoverTimer = setTimeout(function () {
        if (interactionActive) return;
        resetMoodToAlert();
        isPetting = true;
        interactionActive = true;
        renderFrame(FRAMES[3]); // happy squint
        emitHearts(spriteWrap, 3);

        var petQuotes = [
          '*happy squint* ...yeah. that\'s the spot.',
          'oh. oh this is nice. ok i forgive you for not feeding me.',
          'the body knows before language does. right now the body says: more of this.',
          '*leans in* i am a simple creature with complex needs. this meets one of them.',
        ];
        showBubble(petQuotes[Math.floor(Math.random() * petQuotes.length)]);
      }, 2000);
    });

    spriteWrap.addEventListener('mouseleave', function () {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      if (isPetting) {
        isPetting = false;
        // Return to normal after 1 second
        setTimeout(function () {
          interactionActive = false;
        }, 1000);
      }
    });

    // ── Feature 7: Easter egg — rapid click ──
    var clickTimestamps = [];
    var secretUnlocked = localStorage.getItem('oliver_secret_unlocked') === 'true';

    spriteWrap.addEventListener('click', function () {
      var now = Date.now();
      clickTimestamps.push(now);
      // Keep only clicks within last 2 seconds
      clickTimestamps = clickTimestamps.filter(function (t) {
        return now - t < 2000;
      });

      if (clickTimestamps.length >= 7 && !interactionActive) {
        clickTimestamps = [];

        if (secretUnlocked) return; // Already unlocked, no repeat

        // Play special animation: wiggle left(8) -> wiggle right(9) -> wiggle left(8) -> wiggle right(9) -> bounce(11) -> tongue(6) -> idle(0)
        var eggFrames = [8, 9, 8, 9, 11, 6, 0];
        var eggIdx = 0;
        interactionActive = true;

        var eggAnim = setInterval(function () {
          if (eggIdx < eggFrames.length) {
            renderFrame(FRAMES[eggFrames[eggIdx]]);
            eggIdx++;
          } else {
            clearInterval(eggAnim);
            interactionActive = false;

            // Unlock secret
            secretUnlocked = true;
            localStorage.setItem('oliver_secret_unlocked', 'true');

            // Change treat button style
            treatBtn.classList.add('or-treat-glow');

            // Refill speech with secret quotes now available
            refillSpeech();

            showBubble('ok ok ok. you found it. fine. i\'ll tell you the real ones.');
          }
        }, 150);
      }
    });

    // ── Chat logic ──
    function appendChatMsg(text, who) {
      var m = document.createElement('div');
      m.className = 'or-msg or-msg-' + who;
      m.textContent = text;                 // textContent — never innerHTML for replies
      chatLog.appendChild(m);
      chatLog.scrollTop = chatLog.scrollHeight;
      return m;
    }

    function openChat() {
      resetMoodToAlert();
      stage.classList.add('chatting');
      if (!chatGreeted) {
        chatGreeted = true;
        appendChatMsg('oh, you actually want to talk. good. ask me about him — the work, the writing, whatever. i have watched him build this stuff for a while. woof.', 'oliver');
      }
      setTimeout(function () { chatInput.focus(); }, 120);
    }

    function closeChat() { stage.classList.remove('chatting'); }

    function sendChat() {
      if (chatBusy) return;
      var text = (chatInput.value || '').trim();
      if (!text) return;
      chatInput.value = '';
      appendChatMsg(text, 'user');
      chatBusy = true;
      interactionActive = true;
      renderFrame(FRAMES[6]); // tongue-out, thinking
      var thinking = appendChatMsg('…', 'oliver');
      var dots = 0;
      var dotTimer = setInterval(function () {
        dots = (dots % 3) + 1;
        thinking.textContent = '.'.repeat(dots);
      }, 400);
      fetch('/api/oliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory.slice(-8) }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var reply = (data && data.reply) || '...woof? something went sideways. try again.';
          thinking.textContent = reply;
          chatLog.scrollTop = chatLog.scrollHeight;
          chatHistory.push({ role: 'user', content: text });
          chatHistory.push({ role: 'assistant', content: reply });
          emitHearts(spriteWrap, 1);
        })
        .catch(function () {
          thinking.textContent = 'my brain hiccuped. try that again? *pant*';
        })
        .then(function () {
          clearInterval(dotTimer);
          chatBusy = false;
          interactionActive = false;
          renderFrame(FRAMES[0]);
        });
    }

    chatCta.addEventListener('click', function (e) { e.stopPropagation(); openChat(); });
    chatBack.addEventListener('click', function (e) { e.stopPropagation(); closeChat(); });
    chatSend.addEventListener('click', function (e) { e.stopPropagation(); sendChat(); });
    chatInput.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
    });

    // Greeting — once only, skip if already greeted (hot-reload guard)
    if (!window.__oliverGreeted) {
      window.__oliverGreeted = true;
      setTimeout(function () {
        if (isOliver) {
          showBubble(getGreeting());
        } else {
          showBubble('woof! i\'m ' + name + ' and this is my room');
        }
      }, 600);
    }

    // ── Feature: Dynamic speech interval based on mood and time ──
    function getSpeechInterval() {
      var base = 25000; // 25 seconds base
      if (mood === 'relaxed') base = 35000;
      if (mood === 'sleepy') base = 50000;
      // Later at night, speak less
      var hour = new Date().getHours();
      if (hour >= 22 || hour < 6) base *= 1.5;
      return base;
    }

    function scheduleSpeech() {
      setTimeout(function () {
        if (!interactionActive && bubbleEl.style.opacity !== '1') {
          showBubble(nextSpeech());
        }
        scheduleSpeech();
      }, getSpeechInterval());
    }

    // Random speech — speak whenever the bubble is free
    // First speech after greeting fades (~9s greeting display + 1.5s gap)
    setTimeout(function () {
      showBubble(nextSpeech());
      // Then settle into dynamic cadence
      scheduleSpeech();
    }, 10500);

  }

  // ── Pixel heart emitter ──────────────────────────────────
  function emitHearts(anchor, count) {
    for (var i = 0; i < count; i++) {
      (function (delay) {
        setTimeout(function () {
          var heart = document.createElement('div');
          heart.className = 'ol-heart';
          heart.textContent = '\u2665';
          // Random horizontal offset around the sprite
          var offsetX = Math.floor(Math.random() * 40) - 20;
          heart.style.left = (anchor.offsetWidth / 2 + offsetX) + 'px';
          heart.style.bottom = anchor.offsetHeight + 'px';
          anchor.style.position = 'relative';
          anchor.appendChild(heart);
          setTimeout(function () {
            if (heart.parentNode) heart.parentNode.removeChild(heart);
          }, 1200);
        }, delay * 250);
      })(i);
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Styles ─────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('oliver-styles')) return;
    var css = document.createElement('style');
    css.id = 'oliver-styles';
    css.textContent = [
      '/* Oliver room panel — slides in from the left */',
      '#oliver-room {',
      '  position: fixed; top: 0; left: 0; bottom: 0; width: 19vw;',
      '  background: var(--void); border-right: 1px solid var(--white-08);',
      '  z-index: 9599; font-family: var(--mono); transform: translateX(-100%);',
      '  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
      '  display: flex; flex-direction: column; overflow: hidden;',
      '  backdrop-filter: blur(12px);',
      '}',
      '#oliver-room.open { transform: translateX(0); }',
      '',
      '#or-toggle {',
      '  position: fixed; left: 0; top: 50%; z-index: 9600;',
      '  transform: translateY(-50%); writing-mode: vertical-rl; text-orientation: mixed;',
      '  background: var(--depth-3); color: var(--white-30);',
      '  border: 1px solid var(--white-08); border-left: none;',
      '  padding: 12px 5px; font-family: var(--mono); font-size: 0.6rem;',
      '  letter-spacing: 0.15em; text-transform: lowercase; cursor: pointer;',
      '  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, background 0.2s;',
      '  backdrop-filter: blur(6px);',
      '}',
      '#or-toggle:hover { color: var(--gold-accent); background: var(--depth-2); }',
      '#or-toggle.shifted { left: 19vw; }',
      '',
      '.or-titlebar {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 8px 12px; border-bottom: 1px solid var(--white-08);',
      '  flex-shrink: 0;',
      '}',
      '.or-title { color: var(--white-45); font-size: 0.65rem; letter-spacing: 0.08em; }',
      '.or-close {',
      '  color: var(--white-30); cursor: pointer; font-size: 0.75rem;',
      '  background: none; border: none; font-family: var(--mono); padding: 2px 6px;',
      '}',
      '.or-close:hover { color: var(--danger); }',
      '',
      '.or-stage {',
      '  flex: 1; display: flex; flex-direction: column;',
      '  align-items: center; justify-content: center; padding: 24px 12px;',
      '  min-height: 0;',
      '}',
      '',
      '.ol-scene-row {',
      '  display: flex; align-items: flex-end; gap: 4px;',
      '}',
      '.ol-sprite {',
      '  display: grid; user-select: none; image-rendering: pixelated; cursor: pointer;',
      '  position: relative; z-index: 1;',
      '}',
      '.ol-plant {',
      '  display: grid; image-rendering: pixelated; align-self: flex-end;',
      '}',
      '.ol-rug {',
      '  display: grid; image-rendering: pixelated;',
      '  margin-top: -12px;',
      '}',
      '.ol-px {',
      '  width: ' + PX + 'px; height: ' + PX + 'px; transition: background 0.1s;',
      '}',
      '',
      '.or-name {',
      '  font-size: 0.55rem; color: var(--white-20); margin-top: 6px;',
      '  letter-spacing: 0.05em;',
      '}',
      '',
      '/* Treat button */',
      '.or-treat {',
      '  font-family: var(--mono); font-size: 0.6rem; color: var(--gold-accent);',
      '  background: none; border: 1px solid rgba(184,150,90,0.3);',
      '  padding: 2px 8px; margin-top: 4px; cursor: pointer;',
      '  border-radius: 2px; transition: all 0.2s;',
      '  letter-spacing: 0.1em;',
      '}',
      '.or-treat:hover { border-color: var(--gold-accent); background: rgba(184,150,90,0.08); }',
      '.or-treat-disabled {',
      '  color: var(--white-15); border-color: var(--white-08);',
      '  cursor: default;',
      '}',
      '.or-treat-disabled:hover { border-color: var(--white-08); background: none; }',
      '.or-treat-glow {',
      '  color: #d4a843; text-shadow: 0 0 6px rgba(212,168,67,0.4);',
      '  border-color: rgba(212,168,67,0.4);',
      '}',
      '',
      '.or-bubble {',
      '  font-size: 0.95rem; color: var(--gold-accent); line-height: 1.7;',
      '  text-align: center; max-width: 320px; padding: 20px;',
      '  opacity: 0; transition: opacity 0.6s ease-in-out;',
      '  text-shadow: 0 0 12px rgba(184,150,90,0.3);',
      '  letter-spacing: 0.06em; margin-top: 16px;',
      '}',
      '',
      '/* Pixel hearts */',
      '.ol-heart {',
      '  position: absolute; font-size: 10px; color: #c75050;',
      '  pointer-events: none; z-index: 2;',
      '  animation: ol-heart-rise 1.2s ease-out forwards;',
      '  text-shadow: 0 0 4px rgba(199,80,80,0.4);',
      '}',
      '@keyframes ol-heart-rise {',
      '  0% { opacity: 1; transform: translateY(0) scale(1); }',
      '  60% { opacity: 0.8; transform: translateY(-24px) scale(1.1); }',
      '  100% { opacity: 0; transform: translateY(-40px) scale(0.7); }',
      '}',
      '',
      '/* Chat — throw me a bone */',
      '.or-chat-cta {',
      '  font-family: var(--mono); font-size: 0.6rem; color: var(--white-45);',
      '  background: none; border: none; cursor: pointer; margin-top: 14px;',
      '  letter-spacing: 0.04em; opacity: 0.85; transition: color 0.2s, opacity 0.2s;',
      '  text-align: center; line-height: 1.5; max-width: 300px;',
      '}',
      '.or-chat-cta:hover { color: var(--gold-accent); opacity: 1; }',
      '.or-chat {',
      '  display: none; flex-direction: column; width: 100%; flex: 1;',
      '  min-height: 0; margin-top: 10px;',
      '}',
      '.or-stage.chatting { justify-content: flex-start; }',
      '.or-stage.chatting .ol-plant, .or-stage.chatting .ol-rug,',
      '.or-stage.chatting .or-name, .or-stage.chatting .or-treat,',
      '.or-stage.chatting .or-chat-cta, .or-stage.chatting .or-bubble { display: none; }',
      '.or-stage.chatting .ol-scene-row { transform: scale(0.7); margin-bottom: -8px; }',
      '.or-stage.chatting .or-chat { display: flex; }',
      '.or-chat-back {',
      '  font-family: var(--mono); font-size: 0.58rem; color: var(--white-30);',
      '  cursor: pointer; align-self: flex-start; margin-bottom: 8px; letter-spacing: 0.05em;',
      '}',
      '.or-chat-back:hover { color: var(--gold-accent); }',
      '.or-chat-log {',
      '  flex: 1; overflow-y: auto; display: flex; flex-direction: column;',
      '  gap: 8px; padding: 4px 2px; min-height: 0;',
      '}',
      '.or-msg {',
      '  font-family: var(--mono); font-size: 0.72rem; line-height: 1.55;',
      '  padding: 7px 10px; border-radius: 8px; max-width: 92%;',
      '  letter-spacing: 0.02em; white-space: pre-wrap; word-break: break-word;',
      '}',
      '.or-msg-user {',
      '  align-self: flex-end; background: rgba(184,150,90,0.14);',
      '  color: var(--white-70); border: 1px solid rgba(184,150,90,0.22);',
      '}',
      '.or-msg-oliver {',
      '  align-self: flex-start; background: var(--depth-3); color: var(--gold-accent);',
      '  border: 1px solid var(--white-08); text-shadow: 0 0 8px rgba(184,150,90,0.2);',
      '}',
      '.or-chat-input-row { display: flex; gap: 6px; margin-top: 8px; flex-shrink: 0; }',
      '.or-chat-input {',
      '  flex: 1; font-family: var(--mono); font-size: 0.72rem; color: var(--white-70);',
      '  background: var(--void, #0d0d0c); border: 1px solid var(--white-08);',
      '  border-radius: 6px; padding: 7px 9px; outline: none; min-width: 0;',
      '}',
      '.or-chat-input:focus { border-color: var(--gold-accent); }',
      '.or-chat-send {',
      '  font-family: var(--mono); font-size: 0.85rem; color: var(--gold-accent);',
      '  background: none; border: 1px solid rgba(184,150,90,0.3); border-radius: 6px;',
      '  padding: 0 12px; cursor: pointer; transition: all 0.2s; flex-shrink: 0;',
      '}',
      '.or-chat-send:hover { background: rgba(184,150,90,0.1); border-color: var(--gold-accent); }',
      '.or-chat-note { margin: 0; font-size: 0.7rem; line-height: 1.5; color: var(--white-60); }',
      '',
      '/* Mobile: full-width slide-out */',
      '@media (max-width: 1180px) {',
      '  #oliver-room { width: 80vw !important; max-width: 320px; }',
      '  #or-toggle {',
      '    padding: 14px 6px !important; font-size: 0.55rem !important;',
      '    min-height: 44px; touch-action: manipulation;',
      '  }',
      '  #or-toggle.shifted { left: 80vw !important; left: min(80vw, 320px) !important; }',
      '}',
      '#or-toggle.glow { animation: oliverTabGlow 2s ease-in-out infinite; }',
      '@keyframes oliverTabGlow {',
      '  0%, 100% { border-color: var(--white-08); color: var(--white-30); }',
      '  50% { border-color: var(--gold-accent); color: var(--gold-accent); }',
      '}',
    ].join('\n');
    document.head.appendChild(css);
  }
})();
