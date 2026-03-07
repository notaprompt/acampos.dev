// Oliver — the site's resident clippy
// a dog who lives in his room, dances, and provides moral support
(function () {
  // Don't re-init on client-side navigation
  if (window.__oliverInit) return;
  window.__oliverInit = true;
  // Skip on narrow screens (mobile)
  if (window.innerWidth <= 768) return;

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
    17: '#917e3e',      // rug — warm gold weave
    18: '#6b5828',      // rug — dark brown accent
    19: '#b0a060',      // rug — light golden fringe/warp
    20: '#2d5a27',      // plant — dark green leaf
    21: '#5a8a3a',      // plant — light green edge
    22: '#a85030',      // plant — terracotta pot
    23: '#7a3820',      // plant — pot shadow
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
  var SPEECH = [
    // woofs
    'woof',
    'bark!',
    'bork',
    '*panting*',
    '*tail wag*',
    'woof woof',
    '*chases tail*',
    'hey. hey. look at me. hi.',
    'you\'re doing great. probably.',
    // things he's witnessed
    'he\'s still going. the lamp has been on for hours.',
    'something just happened. the posture changed.',
    'i think he forgot i was here.',
    'the typing stopped. that\'s either very good or very bad.',
    'he just laughed at his own code. concerning.',
    'it\'s quiet now. too quiet.',
    'he\'s talking to the screen again. i don\'t think the screen started it.',
    // feed me
    '...is that a treat?',
    'i haven\'t been fed in many minutes',
    'if you feed me i\'ll dance harder',
    '*sniffs screen for treats*',
    'you look like someone who gives good treats',
    'i would be a very good boy for a snack',
    'this is my hungry face. ( o.o )',
    // philosophy
    'sometimes the bravest thing is to sit with it. i am always sitting.',
    'i have achieved enlightenment. it looks like this. *dances*',
    'if i stop dancing do i still exist? let\'s not find out.',
    'what if the real treasure was the tab you forgot to close?',
    'to bark or not to bark. that\'s not really a question. bark.',
    'the map is not the territory. the territory is also not the territory. everything is vibrating.',
    'i don\'t understand what he\'s building but the energy in here is immaculate.',
    // existential
    'i exist on a website. you exist on a rock. neither of us asked for this.',
    'one must imagine sisyphus wagging his tail.',
    'i am a dog made of text on a screen and i have never been more free.',
    'we are all just divs inside divs pretending to be real.',
    'nothing matters and everything is fine. woof.',
    'i was born when you clicked generate. what\'s your excuse?',
    'i have no legs and yet i dance. think about that.',
    'the void is warm if you bring a blanket.',
    'somewhere a server is running and it doesn\'t know why either.',
    'i contain multitudes. mostly woof.',
  ];

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
    var roomOpen = true;

    // ── Room panel ──
    var panel = document.createElement('div');
    panel.id = 'oliver-room';
    panel.className = 'open';
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
    toggle.className = 'shifted';
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
      toggle.classList.toggle('shifted', roomOpen);
    }

    toggle.addEventListener('click', toggleRoom);
    closeBtnEl.addEventListener('click', function () {
      if (roomOpen) toggleRoom();
    });

    // Click sprite to trigger a speech bubble
    spriteWrap.addEventListener('click', function () {
      if (bubbleEl.style.opacity === '1') return;
      showBubble(SPEECH[Math.floor(Math.random() * SPEECH.length)]);
    });

    // ── Dance sequence ──
    var SEQUENCE = [0,0,1,2,0,0,3,0,1,2,0,8,9,8,9,0,0,5,0,4,0,6,0,0,10,0,7,0,11,0,0,1,2,3,0];
    var seqIdx = 0;
    setInterval(function () {
      seqIdx = (seqIdx + 1) % SEQUENCE.length;
      renderFrame(FRAMES[SEQUENCE[seqIdx]]);
    }, 350);

    // ── Speech bubbles ──
    function showBubble(text) {
      bubbleEl.textContent = text;
      bubbleEl.style.opacity = '1';
      setTimeout(function () {
        bubbleEl.style.opacity = '0';
      }, 4500);
    }

    // Greeting
    setTimeout(function () {
      if (isOliver) {
        showBubble('woof! welcome to my room!');
      } else {
        showBubble('woof! i\'m ' + name + ' and this is my room');
      }
    }, 600);

    // Random speech every ~12s
    setInterval(function () {
      if (Math.random() > 0.5) return;
      if (bubbleEl.style.opacity === '1') return;
      showBubble(SPEECH[Math.floor(Math.random() * SPEECH.length)]);
    }, 12000);

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
      '  background: rgba(5,5,5,0.96); border-right: 1px solid rgba(255,255,255,0.06);',
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
      '  background: rgba(5,5,5,0.85); color: var(--white-30);',
      '  border: 1px solid rgba(255,255,255,0.06); border-left: none;',
      '  padding: 12px 5px; font-family: var(--mono); font-size: 0.6rem;',
      '  letter-spacing: 0.15em; text-transform: lowercase; cursor: pointer;',
      '  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, background 0.2s;',
      '  backdrop-filter: blur(6px);',
      '}',
      '#or-toggle:hover { color: var(--gold-accent); background: rgba(5,5,5,0.95); }',
      '#or-toggle.shifted { left: 19vw; }',
      '',
      '.or-titlebar {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);',
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
      '  font-size: 0.55rem; color: rgba(255,255,255,0.2); margin-top: 6px;',
      '  letter-spacing: 0.05em;',
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
      '/* Hide on mobile */',
      '@media (max-width: 768px) {',
      '  #oliver-room, #or-toggle { display: none !important; }',
      '}',
    ].join('\n');
    document.head.appendChild(css);
  }
})();
