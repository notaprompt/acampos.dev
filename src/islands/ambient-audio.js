// Ambient audio — Tone.js procedural drone, activated by button only
(function () {
  let started = false;
  let synth = null;
  let reverb = null;

  window.__toggleAmbient = async function () {
    if (!started) {
      const Tone = await import('tone');
      await Tone.start();

      reverb = new Tone.Reverb({ decay: 8, wet: 0.7 }).toDestination();
      synth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 2,
        envelope: { attack: 2, decay: 4, sustain: 0.8, release: 4 },
        modulation: { type: 'sine' },
        volume: -20,
      }).connect(reverb);

      synth.triggerAttack('C2');
      started = true;
    } else {
      if (synth) {
        synth.triggerRelease();
        synth = null;
      }
      started = false;
    }
  };

  // Create toggle button
  const btn = document.createElement('button');
  btn.id = 'ambient-toggle';
  btn.textContent = 'ambient';
  btn.title = 'Toggle procedural ambient drone';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 9000;
    background: var(--depth-2, #0C0C0C);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.45);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  `;

  btn.addEventListener('mouseenter', function () {
    btn.style.color = '#b8965a';
    btn.style.borderColor = '#b8965a';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.color = started ? '#5BF29B' : 'rgba(255,255,255,0.45)';
    btn.style.borderColor = started ? '#5BF29B' : 'rgba(255,255,255,0.08)';
  });

  btn.addEventListener('click', function () {
    window.__toggleAmbient();
    setTimeout(function () {
      btn.style.color = started ? '#5BF29B' : 'rgba(255,255,255,0.45)';
      btn.style.borderColor = started ? '#5BF29B' : 'rgba(255,255,255,0.08)';
    }, 100);
  });

  document.body.appendChild(btn);
})();
