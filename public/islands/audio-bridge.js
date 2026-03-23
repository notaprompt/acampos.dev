// Audio bridge — connects music player audio to ASCII shader via AnalyserNode
(function () {
  if (window.__audioBridgeInit) return;
  window.__audioBridgeInit = true;
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

    // Don't create our own MediaElementSource — it would steal the audio
    // element from music-panel.js and cause silence. Wait for the shared
    // analyser to become available instead.
    // The music panel exposes window.__musicPlayerAnalyser after initAudioContext()
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
