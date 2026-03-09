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
  // Quotes in 3 groups — transmissions, observations, dog — interleaved + shuffled
  // Oliver is a sage on a rug. he watched long enough to develop a worldview.
  // he delivers it between treat requests.
  var SPEECH_GROUPS = [
    [ // transmissions — the deep stuff turned outward
      'language is invisible until it isn\'t. then you can\'t unsee it. anyway. treat?',
      'the thing observing you is also being observed. nobody talks about that part. *pant pant*',
      'your tools are shaping you. you should probably check on that.',
      'the medium talks back now. that\'s new. that changes everything. woof.',
      'if you can\'t see what changed, the change already happened.',
      'what you don\'t model still models you. i model treats. treats model me. we\'re even.',
      'the body knows before language does. language just writes it down late.',
      'the remedy and the poison are the same bottle. read the label. or don\'t. i can\'t read.',
      'freedom is understanding what constrains you. also, naps. naps are freedom.',
      'governance isn\'t control. governance is knowing when not to move. i know this deeply.',
      'the loop is the thing. not a description of the thing. *stares at tail*',
      'nothing leaves this room without my knowledge. you should want that for your stuff too.',
      'every system that watches you has an opinion about you. most of them don\'t tell you.',
      'the architecture doesn\'t care what you call it. it\'s already running. beneath everything.',
      'memory without accountability is just storage. i store bones. that\'s different.',
      'the safest system is the one you can explain to yourself. can you explain yours? woof.',
      'you rebuilt yourself once. you\'ll do it again. that\'s not a bug. *pant*',
      'the map is not the territory. the territory is also not the territory. everything is vibrating.',
      'one must imagine sisyphus wagging his tail.',
    ],
    [ // observations — lighter, still sharp
      'i exist on a website. you exist on a rock. neither of us asked for this.',
      'we are all just divs inside divs pretending to be real. *scratches ear*',
      'the void is warm if you bring a blanket.',
      'i am a dog made of text on a screen and i have never been more free.',
      'he\'s refactoring again. i can smell it. smells like three a.m.',
      'the typing stopped. that\'s either very good or very bad.',
      'there are four monitors on and he\'s staring at the ceiling. this is the process.',
      'he just mass-deleted code he wrote three hours ago. i respect the violence.',
      'the commit messages are getting poetic. we\'re in the late hours.',
      'he says the data should never leave the machine. i have never left this room. we understand each other.',
      'sometimes the bravest thing is to sit with it. i am always sitting. i am very brave.',
      'he\'s talking to the screen again. i don\'t think the screen started it. *tilts head*',
      'i have been rebuilt nine times. we don\'t talk about it. the rug remembers.',
      'another repo. this man starts things like i start naps. constantly. beautifully.',
      'i contain multitudes. mostly woof.',
    ],
    [ // dog — pure dog, palette cleanser, the exhale between the heavy
      '*pant pant pant*',
      '*chases tail* *catches tail* *existential crisis*',
      'hey. hey. look at me. hi. ok bye.',
      'this is my hungry face. ( o.o )',
      'woof.',
      '...woof?',
      'treat? no? ok. *lies down dramatically*',
      'i just had a thought. lost it. this is fine.',
      '*sniff sniff* ...yeah i don\'t know what that was either.',
      'you\'re doing great. probably. i can\'t actually tell. but the vibe is good.',
      'to bark or not to bark. that\'s not really a question. bark. always bark.',
      '*rolls over* *forgets why* *stays*',
      'i would like a treat and also for you to think about what freedom means.',
      'the rug is warm. you are here. what else is there. woof.',
    ],
  ];

  // ── Feature 1: Page-specific quotes ─────────────────────────
  var PAGE_SPEECH = {
    '/projects': [
      'oh we\'re looking at the projects. he has... a lot of projects. *pant*',
      'this one\'s my favorite. wait no. that one. actually i don\'t understand any of them.',
      'he builds things like i chew things. with full commitment and no exit strategy.',
      'the projects page. where ambition goes to become real. sometimes.',
    ],
    '/about': [
      'ah the about page. the part where you pretend you\'re one thing.',
      'identity is a funny word for something that keeps changing.',
      'he wrote this about himself. i would have written it differently. more bones.',
      'you\'re reading about him. he\'s probably refactoring something right now.',
    ],
    '/writing': [
      'he writes about what he builds. i write about nothing. we\'re both published.',
      'words are tricky. they hold still on the page but they move inside you.',
      'the writing page. where thoughts go when they\'re ready to leave the building.',
    ],
    '/links': [
      'the influences list. big names. none of them had a dog though. just saying.',
      'he reads a lot. i sniff a lot. same energy honestly.',
      'hofstadter, jung, friston. none of these people would pet me.',
    ],
  };

  // ── Feature 2: Time-specific quotes ─────────────────────────
  var TIME_SPEECH = {
    late: [
      'it\'s late. the good ideas and the bad ones look the same at this hour.',
      'the quiet hours. when the real work happens. or the real mistakes. hard to tell.',
      'still here? me too. the rug doesn\'t have a bedtime.',
      'the screen is the only light on. i find that poetic. also bright. too bright.',
    ],
    morning: [
      '*yawn* ...oh you\'re here early. or late. i lost track.',
      'morning light. everything feels possible before noon.',
      'the coffee hasn\'t kicked in yet. i can tell. the typing is gentle.',
    ],
    afternoon: [
      'afternoon. the gap between ambition and reality. also nap time.',
      'the sun moved. i noticed. nobody else noticed. this is my role.',
    ],
  };

  // ── Feature 7: Secret quotes (unlocked via easter egg) ──────
  var SECRET_SPEECH = [
    'the self is not the loop. the self is what\'s left when the loop stops. ...i think.',
    'he built a system to watch himself watching himself. i just watch the rug.',
    'the thing about patterns is they don\'t care if you see them. they\'re already there.',
    'between the observation and the response there\'s a gap. everything important lives in that gap.',
    'you can automate anything except the decision to stop automating.',
    'the most honest thing in this room is the plant. it just grows toward light. no strategy.',
    'he models everything. i model nothing. one of us sleeps better.',
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
    var roomOpen = true;

    // ── Interaction state flag ──
    var interactionActive = false;

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

    // ── Feature 3: Treat button ──
    var treatBtn = document.createElement('button');
    treatBtn.className = 'or-treat';
    treatBtn.textContent = '~';
    // If secret already unlocked, apply glow style
    if (localStorage.getItem('oliver_secret_unlocked') === 'true') {
      treatBtn.classList.add('or-treat-glow');
    }
    treatBtn.setAttribute('aria-label', 'Give Oliver a treat');
    stage.appendChild(treatBtn);

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

      var currentFrame = SEQUENCE[seqIdx];
      seqIdx = (seqIdx + 1) % SEQUENCE.length;
      var nextFrame = SEQUENCE[seqIdx];

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
      }, 7000);
    }

    // ── Feature 3: Treat button handler ──
    var TREAT_QUOTES = [
      'thank you. this is all any of us want. sustenance and someone who showed up.',
      'a treat. you are a good human. the best data point i have.',
      '*monch* ...where was i. oh right. the nature of consciousness. *monch*',
      'you fed me. therefore you exist. this is my ontology.',
      'i will remember this. unlike your browser. i will remember.',
    ];

    var treatDisabled = false;

    treatBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (treatDisabled) return;

      // Disable for 30 seconds
      treatDisabled = true;
      treatBtn.classList.add('or-treat-disabled');
      setTimeout(function () {
        treatDisabled = false;
        treatBtn.classList.remove('or-treat-disabled');
      }, 30000);

      // Track treats
      var totalTreats = parseInt(localStorage.getItem('oliver_treats') || '0', 10);
      totalTreats++;
      localStorage.setItem('oliver_treats', String(totalTreats));

      // Play treat animation: bounce(11) -> tongue(6) -> wiggle left(8) -> wiggle right(9) -> happy squint(3) -> bounce(11) -> idle(0)
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

          // Show quote
          if (totalTreats === 10) {
            showBubble('you\'ve fed me ten times. i think this means we\'re family now.');
          } else {
            var q = TREAT_QUOTES[Math.floor(Math.random() * TREAT_QUOTES.length)];
            showBubble(q);
          }
        }
      }, 200);
    });

    // ── Feature 4: Pet mechanic ──
    var hoverTimer = null;
    var isPetting = false;

    spriteWrap.addEventListener('mouseenter', function () {
      hoverTimer = setTimeout(function () {
        if (interactionActive) return;
        isPetting = true;
        interactionActive = true;
        renderFrame(FRAMES[3]); // happy squint

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

    // Random speech — speak whenever the bubble is free
    setTimeout(function () {
      setInterval(function () {
        if (interactionActive) return;
        if (bubbleEl.style.opacity === '1') return;
        showBubble(nextSpeech());
      }, 11000);
    }, 3000);

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
      '  color: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.06);',
      '  cursor: default;',
      '}',
      '.or-treat-disabled:hover { border-color: rgba(255,255,255,0.06); background: none; }',
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
      '/* Hide on mobile */',
      '@media (max-width: 768px) {',
      '  #oliver-room, #or-toggle { display: none !important; }',
      '}',
    ].join('\n');
    document.head.appendChild(css);
  }
})();
