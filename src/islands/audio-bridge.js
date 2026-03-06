// Audio bridge — connects music player audio to ASCII shader via AnalyserNode
(function () {
  let analyser = null;
  let dataArray = null;
  let connected = false;

  function tryConnect() {
    if (connected) return;

    // Prefer shared AnalyserNode from music-panel.js (avoids double MediaElementSource)
    if (window.__musicPlayerAnalyser) {
      analyser = window.__musicPlayerAnalyser;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      connected = true;
      poll();
      return;
    }

    // Fallback: create our own from the audio element
    const audio = document.querySelector('#music-player-audio');
    if (!audio) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      source.connect(analyser);
      analyser.connect(ctx.destination);
      connected = true;

      poll();
    } catch (e) {
      // Audio element may already be connected or context unavailable
    }
  }

  function poll() {
    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);

    // Average bass frequencies (bins 0-7, low end)
    let sum = 0;
    const bassEnd = Math.min(8, dataArray.length);
    for (let i = 0; i < bassEnd; i++) {
      sum += dataArray[i];
    }
    const level = sum / (bassEnd * 255);

    // Pass to ASCII shader if available
    if (typeof window.__setAsciiAudioLevel === 'function') {
      window.__setAsciiAudioLevel(level);
    }

    requestAnimationFrame(poll);
  }

  // Wait for music panel to initialize, then try connecting
  setTimeout(function () {
    tryConnect();
    // Retry a few times in case panel loads slowly
    let attempts = 0;
    const interval = setInterval(function () {
      if (connected || attempts > 10) {
        clearInterval(interval);
        return;
      }
      tryConnect();
      attempts++;
    }, 2000);
  }, 2000);
})();
