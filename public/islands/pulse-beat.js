/* pulse-beat.js — the weekly pulse rendered as a heartbeat.
 *
 * Progressive enhancement: finds each generated pulse block (the markdown the
 * weekly loop writes between pulse markers) and draws an EKG strip above it —
 * one beat per commit, amplitude from the week's file count, monospace vitals.
 * The text stays in the DOM untouched; if this script never loads, the page is
 * still whole. Raw canvas, no deps, same ethos as the constellation.
 *
 * Integration (one line, wherever project pages get their scripts):
 *   <script src="/islands/pulse-beat.js" defer></script>
 */
(() => {
  const blocks = [...document.querySelectorAll('sub')].filter(s =>
    /maintains itself weekly/i.test(s.textContent)).map(s => s.closest('p, div, section') ?? s.parentElement);

  for (const anchor of blocks) {
    // vitals live in the strong line above: "Recent work · week of X · N commits across M files"
    let head = anchor;
    while (head && !/Recent work/.test(head.textContent)) head = head.previousElementSibling;
    const scope = head ?? anchor;
    const m = scope.textContent.match(/(\d+)\s+commits?\s+across\s+(\d+)\s+files/);
    if (!m) continue;
    const commits = +m[1], files = +m[2];

    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'display:block;width:100%;height:56px;margin:6px 0 2px';
    scope.parentElement.insertBefore(c, scope);

    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W, H, t0 = performance.now();
    const size = () => { W = c.clientWidth; H = 56; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size, { passive: true });

    // beat positions: commits spread across the week's width, tiny jitter seeded
    // by index so the trace is stable between visits
    const beats = Array.from({ length: Math.min(commits, 40) }, (_, i) => {
      const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      return (i + 0.5 + jitter * 0.3) / Math.min(commits, 40);
    });
    const amp = Math.min(10 + files * 0.6, 22);

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--fg')?.trim() || 'rgba(240,238,230,.9)';
    const dim = css.getPropertyValue('--white-08')?.trim() || 'rgba(255,255,255,.08)';

    function trace(x) {
      // baseline with a sharp QRS-like spike at each beat
      let y = 0;
      for (const b of beats) {
        const d = (x - b) * Math.min(commits, 40) * 2.2;
        if (Math.abs(d) < 1.4) {
          const q = Math.exp(-d * d * 6);
          y += (d < 0 ? -0.35 : 1) * q;
        }
      }
      return y;
    }

    let raf;
    function draw(now) {
      const sweep = ((now - t0) / 6000) % 1.25;   // sweep crosses in 6s, rests briefly
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = dim; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let px = 0; px <= W; px++) {
        const x = px / W;
        const fade = Math.max(0, 1 - Math.max(0, x - sweep) * 30) * (x <= sweep ? 1 : 0);
        const y = H * 0.62 - trace(x) * amp * (0.35 + 0.65 * fade);
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();
      // sweep head glow
      if (sweep <= 1) {
        const hx = sweep * W;
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(hx, H * 0.62 - trace(sweep) * amp, 1.8, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    }
    // reduced motion: draw one static frame with everything lit
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let px = 0; px <= W; px++) {
        const y = H * 0.62 - trace(px / W) * amp;
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();
    } else {
      raf = requestAnimationFrame(draw);
      // pause offscreen — a heartbeat nobody is watching costs nothing
      new IntersectionObserver(es => es.forEach(e =>
        e.isIntersecting ? (raf = requestAnimationFrame(draw)) : cancelAnimationFrame(raf)
      )).observe(c);
    }
  }
})();
