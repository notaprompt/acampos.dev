// Cursor trail — ghost particles in gold-accent with alpha decay
// Only on hover-capable devices
(function () {
  if (window.__cursorTrailInit) return;
  window.__cursorTrailInit = true;
  if (!window.matchMedia('(hover: hover)').matches) return;

  const canvas = document.getElementById('cursor-trail');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const MAX_PARTICLES = 15;
  const particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (particles.length < MAX_PARTICLES) {
      particles.push({
        x: mouseX,
        y: mouseY,
        alpha: 0.6,
        size: 2 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.015;
      p.size *= 0.98;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(184, 150, 90, ${p.alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
