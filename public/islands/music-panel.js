// Music Panel island — custom side panel player with WMP-style visualizer
// Replaces Webamp with full UI control: visualizer, controls, playlist, weather
(function () {
  'use strict';
  // Don't re-init on client-side navigation
  if (window.__musicPanelInit) return;
  if (window.__musicPanelCleanup) window.__musicPanelCleanup();
  window.__musicPanelInit = true;

  // ── Playlist ──────────────────────────────────────────────
  var PLAYLIST = [
    { artist: 'Aphex Twin', title: 'Avril 14th', url: '/audio/avril-14th.mp3' },
    { artist: 'Brent Faiyaz', title: 'white noise.', url: '/audio/white-noise.mp3' },
    { artist: 'Piero Piccioni', title: 'Easy Lovers', url: '/audio/easy-lovers.mp3' },
    { artist: 'Maison Music', title: "l'histoire de ta vie", url: '/audio/lhistoire-de-ta-vie.mp3' },
    { artist: 'Shigeo Sekito', title: 'the word II', url: '/audio/the-word-ii.mp3' },
  ];

  // ── State (restore from localStorage if available) ────────
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('mp_state')); } catch(e) {}
  var currentIndex = saved ? saved.idx : 0;
  var isPlaying = false;
  var isShuffled = false;
  var repeatMode = 1; // 0=off, 1=all, 2=one — default: loop playlist
  var shuffleOrder = null;
  var volume = saved ? (saved.vol != null ? saved.vol : 0.7) : 0.7;

  function saveState() {
    try {
      localStorage.setItem('mp_state', JSON.stringify({
        idx: currentIndex,
        vol: volume,
        time: audio.currentTime || 0
      }));
    } catch(e) {}
  }
  var audioCtx = null;
  var analyser = null;
  var sourceNode = null;
  var panelOpen = true;
  var peaks = [];
  var peakDecay = [];
  var animId = null;

  // ── Audio element (reuse persistent element from HTML) ────
  var audio = document.getElementById('music-player-audio') || document.createElement('audio');
  if (!audio.id) {
    audio.id = 'music-player-audio';
    audio.preload = 'metadata';
    document.body.appendChild(audio);
  }
  audio.volume = volume;

  // ── Helpers ───────────────────────────────────────────────
  function shuffle(arr) {
    var a = [];
    for (var i = 0; i < arr.length; i++) a.push(i);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function getPlayIndex(i) {
    if (isShuffled && shuffleOrder) return shuffleOrder[i];
    return i;
  }

  function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // ── Audio engine ──────────────────────────────────────────
  function initAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    try {
      sourceNode = audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) {
      // Already connected
    }
    window.__musicPlayerAnalyser = analyser;
  }

  function loadTrack(index) {
    var pi = getPlayIndex(index);
    var track = PLAYLIST[pi];
    if (!track) return;
    currentIndex = index;
    audio.src = track.url;
    updateNowPlaying(track);
    updatePlaylistHighlight();
    updateProgressDisplay();
    saveState();
  }

  function playTrack() {
    initAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audio.play().then(function () {
      isPlaying = true;
      updatePlayBtn();
      showBanner(true);
      startVisualizer();
    }).catch(function () {});
  }

  function pauseTrack() {
    audio.pause();
    isPlaying = false;
    updatePlayBtn();
  }

  function togglePlay() {
    if (isPlaying) {
      pauseTrack();
    } else {
      if (!audio.src || audio.src === window.location.href) loadTrack(currentIndex);
      playTrack();
    }
  }

  function nextTrack() {
    var next = currentIndex + 1;
    if (next >= PLAYLIST.length) {
      if (repeatMode >= 1) next = 0;
      else { pauseTrack(); return; }
    }
    loadTrack(next);
    if (isPlaying) playTrack();
  }

  function prevTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    var prev = currentIndex - 1;
    if (prev < 0) prev = PLAYLIST.length - 1;
    loadTrack(prev);
    if (isPlaying) playTrack();
  }

  function toggleShuffle() {
    isShuffled = !isShuffled;
    if (isShuffled) {
      shuffleOrder = shuffle(PLAYLIST);
    } else {
      shuffleOrder = null;
    }
    shuffleBtn.style.color = isShuffled ? 'var(--alive)' : 'var(--white-30)';
  }

  function cycleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    if (repeatMode === 0) {
      repeatBtn.textContent = '\u27F3';
      repeatBtn.style.color = 'var(--white-30)';
    } else if (repeatMode === 1) {
      repeatBtn.textContent = '\u27F3';
      repeatBtn.style.color = 'var(--alive)';
    } else {
      repeatBtn.textContent = '\u27F31';
      repeatBtn.style.color = 'var(--alive)';
    }
    audio.loop = repeatMode === 2;
  }

  // ── Inject styles ─────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#music-panel {',
    '  position: fixed; top: 0; right: 0; bottom: 0; width: 19vw;',
    '  background: rgba(5,5,5,0.96); border-left: 1px solid rgba(255,255,255,0.06);',
    '  z-index: 9599; font-family: var(--mono); transform: translateX(100%);',
    '  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);',
    '  display: flex; flex-direction: column; overflow: hidden;',
    '  backdrop-filter: blur(12px);',
    '}',
    '#music-panel.open { transform: translateX(0); }',
    '',
    '#mp-toggle {',
    '  position: fixed; right: 0; top: 50%; z-index: 9600;',
    '  transform: translateY(-50%); writing-mode: vertical-rl;',
    '  background: rgba(5,5,5,0.85); color: var(--white-30);',
    '  border: 1px solid rgba(255,255,255,0.06); border-right: none;',
    '  padding: 12px 5px; font-family: var(--mono); font-size: 0.6rem;',
    '  letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;',
    '  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, background 0.2s;',
    '  backdrop-filter: blur(6px);',
    '}',
    '#mp-toggle:hover { color: var(--gold-accent); background: rgba(5,5,5,0.95); }',
    '#mp-toggle.shifted { right: 19vw; }',
    '',
    '#mp-titlebar {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);',
    '  flex-shrink: 0;',
    '}',
    '#mp-titlebar .title { color: var(--white-45); font-size: 0.65rem; letter-spacing: 0.08em; }',
    '#mp-titlebar .close { color: var(--white-30); cursor: pointer; font-size: 0.75rem; background: none; border: none; font-family: var(--mono); padding: 2px 6px; }',
    '#mp-titlebar .close:hover { color: var(--danger); }',
    '',
    '#mp-visualizer {',
    '  width: 100%; flex: 1; min-height: 0;',
    '  background: var(--depth-2); display: block;',
    '}',
    '',
    '#mp-info {',
    '  padding: 12px; flex-shrink: 0;',
    '  border-bottom: 1px solid rgba(255,255,255,0.06);',
    '}',
    '#mp-info .track-title { color: var(--glow); font-size: 0.8rem; margin-bottom: 2px; }',
    '#mp-info .track-artist { color: var(--gold-accent); font-size: 0.7rem; }',
    '',
    '#mp-progress-wrap {',
    '  padding: 8px 12px 0; flex-shrink: 0;',
    '}',
    '#mp-progress {',
    '  width: 100%; height: 4px; background: rgba(255,255,255,0.08);',
    '  cursor: pointer; position: relative; border-radius: 2px;',
    '}',
    '#mp-progress-fill {',
    '  height: 100%; background: var(--gold-accent); border-radius: 2px;',
    '  width: 0%; transition: width 0.1s linear;',
    '}',
    '#mp-progress-thumb {',
    '  position: absolute; top: -4px; width: 12px; height: 12px;',
    '  background: var(--glow); border-radius: 50%;',
    '  transform: translateX(-50%); left: 0%;',
    '  opacity: 0; transition: opacity 0.15s;',
    '}',
    '#mp-progress:hover #mp-progress-thumb { opacity: 1; }',
    '',
    '#mp-times {',
    '  display: flex; justify-content: space-between; padding: 4px 12px 0;',
    '  font-size: 0.6rem; color: var(--white-30); flex-shrink: 0;',
    '}',
    '',
    '#mp-controls {',
    '  display: flex; align-items: center; justify-content: center;',
    '  gap: 16px; padding: 10px 12px; flex-shrink: 0;',
    '  border-bottom: 1px solid rgba(255,255,255,0.06);',
    '}',
    '#mp-controls button {',
    '  background: none; border: none; color: var(--white-30);',
    '  font-family: var(--mono); font-size: 0.85rem; cursor: pointer;',
    '  padding: 4px 6px; transition: color 0.15s;',
    '}',
    '#mp-controls button:hover { color: var(--glow); }',
    '#mp-controls .play-btn { font-size: 1.1rem; color: var(--white-45); }',
    '#mp-controls .play-btn:hover { color: var(--alive); }',
    '',
    '#mp-volume-wrap {',
    '  display: flex; align-items: center; gap: 8px;',
    '  padding: 4px 12px 10px; flex-shrink: 0;',
    '  border-bottom: 1px solid rgba(255,255,255,0.06);',
    '}',
    '#mp-volume-label { color: var(--white-30); font-size: 0.6rem; flex-shrink: 0; }',
    '#mp-volume {',
    '  -webkit-appearance: none; appearance: none; width: 100%; height: 3px;',
    '  background: rgba(255,255,255,0.08); outline: none; border-radius: 2px; cursor: pointer;',
    '}',
    '#mp-volume::-webkit-slider-thumb {',
    '  -webkit-appearance: none; width: 10px; height: 10px;',
    '  background: var(--glow); border-radius: 50%; cursor: pointer;',
    '}',
    '#mp-volume::-moz-range-thumb {',
    '  width: 10px; height: 10px; background: var(--glow);',
    '  border-radius: 50%; border: none; cursor: pointer;',
    '}',
    '',
    '#mp-playlist {',
    '  flex: 1; overflow-y: auto; padding: 8px 0;',
    '  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;',
    '}',
    '#mp-playlist::-webkit-scrollbar { width: 4px; }',
    '#mp-playlist::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }',
    '.mp-pl-item {',
    '  padding: 6px 12px; font-size: 0.65rem; color: var(--white-30);',
    '  cursor: pointer; transition: background 0.15s, color 0.15s;',
    '  display: flex; align-items: center; gap: 6px;',
    '}',
    '.mp-pl-item:hover { background: rgba(255,255,255,0.03); color: var(--white-45); }',
    '.mp-pl-item.active { color: var(--alive); }',
    '.mp-pl-item .marker { flex-shrink: 0; width: 10px; font-size: 0.55rem; }',
    '',
    '/* Now-playing banner (top bar) — marquee ticker */',
    '#now-playing {',
    '  position: fixed; top: 0; left: 0; right: 0; z-index: 9500;',
    '  background: rgba(5,5,5,0.92); border-bottom: 1px solid rgba(255,255,255,0.06);',
    '  padding: 6px 0; font-family: var(--mono); font-size: 0.7rem;',
    '  overflow: hidden; white-space: nowrap;',
    '  backdrop-filter: blur(6px); opacity: 0; transition: opacity 0.4s;',
    '  pointer-events: none;',
    '}',
    '#now-playing.visible { opacity: 1; }',
    '.np-scroll {',
    '  display: inline-block; padding-left: 100%;',
    '  animation: np-marquee 48s linear infinite;',
    '}',
    '@keyframes np-marquee {',
    '  0% { transform: translateX(0); }',
    '  100% { transform: translateX(-100%); }',
    '}',
    '.np-label { color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.1em; }',
    '.np-track { color: var(--gold-accent); }',
    '.np-artist { color: rgba(255,255,255,0.4); }',
    '.np-sep { color: rgba(255,255,255,0.12); }',
    '.np-spacer { display: inline-block; width: 60px; }',
    '.np-weather { color: rgba(255,255,255,0.3); }',
    '.wx-temp { color: rgba(255,255,255,0.5); }',
    '.wx-desc { color: rgba(255,255,255,0.25); }',
    '.wx-loc { color: rgba(184,150,90,0.4); }',
    '',
    '/* Hide separate weather widget — merged into banner */',
    '#weather-widget { display: none !important; }',
    '',
    '/* Legacy weather widget positioning (hidden) */',
    '#weather-widget-legacy {',
    '  position: fixed; top: 0; right: 16px; z-index: 9501;',
    '  padding: 6px 0; font-family: var(--mono); font-size: 0.65rem;',
    '  color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 6px;',
    '}',
    '.wx-temp { color: rgba(255,255,255,0.5); }',
    '.wx-desc { color: rgba(255,255,255,0.25); }',
    '.wx-loc { color: rgba(184,150,90,0.4); }',
    '',
    '/* CRT scanlines for visualizer */',
    '#mp-vis-wrap { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }',
    '#mp-vis-wrap::after {',
    '  content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;',
    '  background: repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px);',
    '  pointer-events: none;',
    '}',
    '',
    '/* Hide on mobile */',
    '@media (max-width: 768px) {',
    '  #music-panel, #mp-toggle { display: none !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // ── DOM ────────────────────────────────────────────────────

  // Now-playing banner — marquee ticker
  var banner = document.createElement('div');
  banner.id = 'now-playing';
  banner.innerHTML = '<span class="np-scroll"><span class="np-label">now playing:</span> <span class="np-track">--</span><span class="np-spacer"></span><span class="np-weather"></span><span class="np-spacer"></span><span class="np-label">now playing:</span> <span class="np-track np-track-2">--</span><span class="np-spacer"></span></span>';
  document.body.appendChild(banner);
  var npWeatherEl = banner.querySelector('.np-weather');

  // Weather widget
  var weatherEl = document.createElement('div');
  weatherEl.id = 'weather-widget';
  document.body.appendChild(weatherEl);

  // Toggle button
  var toggle = document.createElement('button');
  toggle.id = 'mp-toggle';
  toggle.className = 'shifted';
  toggle.textContent = 'player';
  toggle.setAttribute('aria-label', 'Toggle music player');
  document.body.appendChild(toggle);

  // Panel
  var panel = document.createElement('div');
  panel.id = 'music-panel';
  panel.className = 'open';
  panel.innerHTML = [
    '<div id="mp-titlebar">',
    '  <span class="title">music_player.exe</span>',
    '  <button class="close" aria-label="Close player">\u00D7</button>',
    '</div>',
    '<div id="mp-vis-wrap"><canvas id="mp-visualizer"></canvas></div>',
    '<div id="mp-info">',
    '  <div class="track-title">--</div>',
    '  <div class="track-artist">--</div>',
    '</div>',
    '<div id="mp-progress-wrap">',
    '  <div id="mp-progress">',
    '    <div id="mp-progress-fill"></div>',
    '    <div id="mp-progress-thumb"></div>',
    '  </div>',
    '</div>',
    '<div id="mp-times"><span id="mp-time-cur">0:00</span><span id="mp-time-dur">0:00</span></div>',
    '<div id="mp-controls">',
    '  <button class="shuffle-btn" title="Shuffle">\u266A</button>',
    '  <button class="prev-btn" title="Previous">\u00AB</button>',
    '  <button class="play-btn" title="Play">\u25B6</button>',
    '  <button class="next-btn" title="Next">\u00BB</button>',
    '  <button class="repeat-btn" title="Repeat">\u27F3</button>',
    '</div>',
    '<div id="mp-volume-wrap">',
    '  <span id="mp-volume-label">vol</span>',
    '  <input type="range" id="mp-volume" min="0" max="1" step="0.01" value="0.7" />',
    '</div>',
    '<div id="mp-playlist"></div>',
  ].join('\n');
  document.body.appendChild(panel);

  // ── Element refs ──────────────────────────────────────────
  var titleEl = panel.querySelector('.track-title');
  var artistEl = panel.querySelector('.track-artist');
  var progressBar = panel.querySelector('#mp-progress');
  var progressFill = panel.querySelector('#mp-progress-fill');
  var progressThumb = panel.querySelector('#mp-progress-thumb');
  var timeCur = panel.querySelector('#mp-time-cur');
  var timeDur = panel.querySelector('#mp-time-dur');
  var playBtn = panel.querySelector('.play-btn');
  var shuffleBtn = panel.querySelector('.shuffle-btn');
  var repeatBtn = panel.querySelector('.repeat-btn');
  var volumeSlider = panel.querySelector('#mp-volume');
  var playlistEl = panel.querySelector('#mp-playlist');
  var canvas = panel.querySelector('#mp-visualizer');
  var closeBtn = panel.querySelector('.close');
  var ctx = canvas.getContext('2d');

  // ── Panel toggle ──────────────────────────────────────────
  function togglePanel() {
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    toggle.classList.toggle('shifted', panelOpen);
  }

  toggle.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', function () {
    if (panelOpen) togglePanel();
  });

  // ── Playlist DOM ──────────────────────────────────────────
  function buildPlaylist() {
    playlistEl.innerHTML = '';
    for (var i = 0; i < PLAYLIST.length; i++) {
      var item = document.createElement('div');
      item.className = 'mp-pl-item';
      item.dataset.index = i;
      item.innerHTML = '<span class="marker">' + (i === getPlayIndex(currentIndex) ? '\u25B8' : '') + '</span>' +
        '<span>' + PLAYLIST[i].artist + ' \u2014 ' + PLAYLIST[i].title + '</span>';
      playlistEl.appendChild(item);
    }
  }

  function updatePlaylistHighlight() {
    var items = playlistEl.querySelectorAll('.mp-pl-item');
    var activeTrackIndex = getPlayIndex(currentIndex);
    for (var i = 0; i < items.length; i++) {
      var isActive = parseInt(items[i].dataset.index) === activeTrackIndex;
      items[i].classList.toggle('active', isActive);
      items[i].querySelector('.marker').textContent = isActive ? '\u25B8' : '';
    }
  }

  playlistEl.addEventListener('click', function (e) {
    var item = e.target.closest('.mp-pl-item');
    if (!item) return;
    var idx = parseInt(item.dataset.index);
    // Find position in play order for this track index
    if (isShuffled && shuffleOrder) {
      for (var i = 0; i < shuffleOrder.length; i++) {
        if (shuffleOrder[i] === idx) { currentIndex = i; break; }
      }
    } else {
      currentIndex = idx;
    }
    loadTrack(currentIndex);
    playTrack();
  });

  buildPlaylist();

  // ── Controls ──────────────────────────────────────────────
  playBtn.addEventListener('click', togglePlay);
  panel.querySelector('.next-btn').addEventListener('click', nextTrack);
  panel.querySelector('.prev-btn').addEventListener('click', prevTrack);
  shuffleBtn.addEventListener('click', function () {
    toggleShuffle();
    buildPlaylist();
    updatePlaylistHighlight();
  });
  repeatBtn.addEventListener('click', cycleRepeat);

  volumeSlider.addEventListener('input', function () {
    volume = parseFloat(this.value);
    audio.volume = volume;
  });

  function updatePlayBtn() {
    playBtn.textContent = isPlaying ? '\u275A\u275A' : '\u25B6';
  }

  // ── Progress bar ──────────────────────────────────────────
  function updateProgressDisplay() {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    progressThumb.style.left = pct + '%';
    timeCur.textContent = formatTime(audio.currentTime);
    timeDur.textContent = formatTime(audio.duration);
  }

  function onTimeUpdate() {
    updateProgressDisplay();
    saveState();
  }
  function onLoadedMetadata() {
    timeDur.textContent = formatTime(audio.duration);
  }
  function onEnded() {
    if (repeatMode === 2) return;
    nextTrack();
  }
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('ended', onEnded);

  // Seekable progress bar
  var seeking = false;
  function seekFromEvent(e) {
    var rect = progressBar.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) {
      audio.currentTime = pct * audio.duration;
      updateProgressDisplay();
    }
  }

  progressBar.addEventListener('mousedown', function (e) {
    seeking = true;
    seekFromEvent(e);
  });
  function onDocMouseMove(e) {
    if (seeking) seekFromEvent(e);
  }
  function onDocMouseUp() {
    seeking = false;
  }
  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('mouseup', onDocMouseUp);

  // ── Now playing ───────────────────────────────────────────
  function updateNowPlaying(track) {
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;

    // Update both marquee track slots
    var trackHtml = '';
    if (track.artist) {
      trackHtml += '<span class="np-artist">' + track.artist + '</span>';
      trackHtml += '<span class="np-sep"> // </span>';
    }
    trackHtml += track.title;
    var npTracks = banner.querySelectorAll('.np-track');
    for (var i = 0; i < npTracks.length; i++) {
      npTracks[i].innerHTML = trackHtml;
    }
  }

  // Update weather in the marquee banner
  function updateBannerWeather(html) {
    if (npWeatherEl) npWeatherEl.innerHTML = html;
  }

  function showBanner(visible) {
    banner.classList.toggle('visible', visible);
  }

  function onPause() {
    isPlaying = false;
    updatePlayBtn();
  }
  function onPlay() {
    isPlaying = true;
    updatePlayBtn();
    showBanner(true);
  }
  audio.addEventListener('pause', onPause);
  audio.addEventListener('play', onPlay);

  // ── Visualizer ────────────────────────────────────────────
  function resizeCanvas() {
    var wrap = canvas.parentElement;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight || 400;
  }

  function startVisualizer() {
    if (animId) return;
    resizeCanvas();
    drawVisualizer();
  }

  var visTime = 0;
  var waveData = null;

  // Site palette — no hsl, raw hex/rgba
  var COL_GLOW = '#E8DCC8';       // warm white
  var COL_GOLD = '#b8965a';       // gold accent
  var COL_ALIVE = '#5BF29B';      // green
  var COL_DANGER = '#c75050';     // red
  // Pre-computed rgba versions for alpha blending
  function rgba(hex, a) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  // Color cycle through the palette — not rainbow, just the 4 site colors
  var PALETTE = [COL_GOLD, COL_GLOW, COL_ALIVE, COL_DANGER];
  var palIdx = 0;
  var palBlend = 0;
  function lerpColor(a, b, t) {
    var ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
    var br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
    var r = Math.round(ar + (br - ar) * t);
    var g = Math.round(ag + (bg - ag) * t);
    var bl = Math.round(ab + (bb - ab) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function lerpColorA(a, b, t, alpha) {
    var ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
    var br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
    var r = Math.round(ar + (br - ar) * t);
    var g = Math.round(ag + (bg - ag) * t);
    var bl = Math.round(ab + (bb - ab) * t);
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha + ')';
  }

  // Smoothed audio values
  var sBass = 0, sMid = 0, sHigh = 0, sTotal = 0;
  var prevBass = 0;
  // Hall forward motion accumulator
  var hallZ = 0;
  // Chase target — what you're following through the void
  var targetX = 0, targetY = 0;       // target position (normalized -1 to 1)
  var chaseX = 0, chaseY = 0;         // current smoothed VP position
  var targetVelX = 0, targetVelY = 0; // target velocity for smooth curves
  var steerAngle = 0;                 // current heading
  var flipAngle = 0;                  // rotation for flips (radians)
  // Bend system — makes the tunnel curve like a bendy straw
  // Bend system — two control points for S-curves and U-turns
  var bendX1 = 0, bendY1 = 0, bendTX1 = 0, bendTY1 = 0;
  var bendX2 = 0, bendY2 = 0, bendTX2 = 0, bendTY2 = 0;
  var bendAngle1 = Math.random() * Math.PI * 2;
  var bendAngle2 = Math.random() * Math.PI * 2;
  var flipVel = 0;                    // angular velocity during flip
  var flipCooldown = 0;               // frames until next flip allowed
  var reverseTimer = 0;               // frames of reverse motion remaining
  var prevMid = 0, prevHigh = 0;      // for mid/high transient detection
  var hitAccum = 0;                   // accumulates hits for flip trigger

  function drawVisualizer() {
    animId = requestAnimationFrame(drawVisualizer);

    if (!analyser) return;

    var bufferLength = analyser.frequencyBinCount;
    var freqData = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(freqData);
    if (!waveData) waveData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(waveData);

    var w = canvas.width;
    var h = canvas.height;
    if (w === 0 || h === 0) { resizeCanvas(); return; }

    // ── Audio analysis ──
    var bass = 0, mid = 0, high = 0, total = 0;
    var third = Math.floor(bufferLength / 3);
    for (var i = 0; i < bufferLength; i++) {
      var v = freqData[i] / 255;
      total += v;
      if (i < third) bass += v;
      else if (i < third * 2) mid += v;
      else high += v;
    }
    bass /= third; mid /= third; high /= Math.max(1, bufferLength - third * 2);
    total /= bufferLength;

    sBass = sBass * 0.7 + bass * 0.3;
    sMid = sMid * 0.7 + mid * 0.3;
    sHigh = sHigh * 0.7 + high * 0.3;
    sTotal = sTotal * 0.7 + total * 0.3;

    var hit = Math.max(0, sBass - prevBass);
    prevBass = sBass;

    // ── Chase target movement system ──
    // Mid frequencies steer smoothly, highs add jitter
    var midDelta = sMid - prevMid;
    var highDelta = sHigh - prevHigh;
    prevMid = sMid;
    prevHigh = sHigh;

    // Steering — mid drives smooth arcs, like a figure skater leaning into turns
    steerAngle += midDelta * 3 + Math.sin(visTime * 0.4) * sMid * 0.1;

    // Target velocity — follows a heading that the music steers
    var steerSpeed = 0.015 + sMid * 0.025;
    targetVelX += Math.cos(steerAngle) * steerSpeed;
    targetVelY += Math.sin(steerAngle) * steerSpeed;

    // Bass hits = gentle nudge in current heading, not random kicks
    if (hit > 0.08) {
      targetVelX += Math.cos(steerAngle) * hit * 0.6;
      targetVelY += Math.sin(steerAngle) * hit * 0.6;
      hitAccum += hit;
    }

    // Heavy damping — velocity bleeds off smoothly, long gliding curves
    targetVelX *= 0.85;
    targetVelY *= 0.85;

    // Move target
    targetX += targetVelX;
    targetY += targetVelY;

    // Soft bounds — pull back toward center when far out, rubber band feel
    var dist = Math.sqrt(targetX * targetX + targetY * targetY);
    if (dist > 0.6) {
      var pull = (dist - 0.6) * 0.08;
      targetX -= targetX / dist * pull;
      targetY -= targetY / dist * pull;
    }

    // Chase smoothing — VP glides after target with heavy lag
    var chaseSpeed = 0.03 + sTotal * 0.02;
    chaseX += (targetX - chaseX) * chaseSpeed;
    chaseY += (targetY - chaseY) * chaseSpeed;

    // ── Flip system — rollercoaster backflips on bass accumulation ──
    if (flipCooldown > 0) flipCooldown--;
    if (hitAccum > 0.5 && flipCooldown <= 0 && Math.random() < 0.5) {
      // Full rotation — fast enough to feel like a backflip
      flipVel = (Math.random() < 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.15);
      flipCooldown = 90; // ~1.5 seconds cooldown — more frequent
      hitAccum = 0;
    }
    // Decay hit accumulator
    hitAccum *= 0.97;

    // Flip animation — carries momentum, decays into next movement
    flipAngle += flipVel;
    flipVel *= 0.94;
    if (Math.abs(flipVel) < 0.002) flipVel = 0;

    // ── Bend system — two-point S-curves, U-turns, hard randoms ──
    // Bend angles wander continuously, bass hits jolt them hard
    bendAngle1 += 0.008 + sMid * 0.02;
    bendAngle2 -= 0.006 + sMid * 0.015;
    if (hit > 0.07) {
      bendAngle1 += (Math.random() - 0.5) * 2.5;
      bendAngle2 += (Math.random() - 0.5) * 3.0;
    }
    // Targets orbit widely — big amplitude = real turns
    bendTX1 = Math.cos(bendAngle1) * (0.7 + sBass * 0.4);
    bendTY1 = Math.sin(bendAngle1) * (0.6 + sBass * 0.3);
    bendTX2 = Math.cos(bendAngle2) * (0.8 + sMid * 0.5);
    bendTY2 = Math.sin(bendAngle2) * (0.5 + sMid * 0.4);
    // Smooth chase — fast enough to feel dramatic, slow enough to flow
    bendX1 += (bendTX1 - bendX1) * 0.025;
    bendY1 += (bendTY1 - bendY1) * 0.025;
    bendX2 += (bendTX2 - bendX2) * 0.02;
    bendY2 += (bendTY2 - bendY2) * 0.02;

    // ── Reverse system — occasional backward pull ──
    if (hit > 0.1 && reverseTimer <= 0 && Math.random() < 0.08) {
      reverseTimer = 30 + Math.floor(Math.random() * 30); // 0.5-1 sec reverse
    }
    if (reverseTimer > 0) reverseTimer--;
    var forwardDir = reverseTimer > 0 ? -0.6 : 1;

    // ── Feedback zoom — centered on VP so you fly TOWARD the target ──
    var feedbackZoom = 1.006 + sBass * 0.008 + hit * 0.02;
    if (reverseTimer > 0) feedbackZoom = 1 / (1.006 + sBass * 0.005);
    // Zoom origin = where the VP will be (chase position)
    var zoomCx = w / 2 + chaseX * w * 0.15;
    var zoomCy = h / 2 + chaseY * h * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.55 - sTotal * 0.1;
    ctx.translate(zoomCx, zoomCy);
    ctx.rotate(flipAngle * 0.8);
    ctx.scale(feedbackZoom, feedbackZoom);
    ctx.translate(-zoomCx, -zoomCy);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, w, h);

    visTime += 0.016;

    // Forward motion — speed driven by bass, reversed during reverse
    hallZ += (0.008 + sBass * 0.025 + hit * 0.15) * forwardDir;

    // Palette
    palBlend += 0.003 + sTotal * 0.002;
    if (palBlend >= 1) { palBlend = 0; palIdx = (palIdx + 1) % PALETTE.length; }
    var colA = PALETTE[palIdx];
    var colB = PALETTE[(palIdx + 1) % PALETTE.length];

    // Vanishing point — driven by the chase system
    var vpx = w / 2 + chaseX * w * 0.15;
    var vpy = h / 2 + chaseY * h * 0.12;

    // ═══ LAYER 1: INFINITE HALL — receding rectangles ═══
    var rectCount = 24;
    for (var ri = 0; ri < rectCount; ri++) {
      // z cycles forward continuously — each rect has a depth slot
      var zRaw = ((ri / rectCount) + hallZ) % 1;
      // Ease: close rects spread out, far ones compress (perspective)
      var z = zRaw * zRaw * zRaw;
      if (z < 0.001) continue;

      // Perspective scale: 0 = vanishing point, 1 = fills screen
      var scale = z;
      var rectW = w * scale;
      var rectH = h * scale;

      // Parallax: near rects offset MORE from VP (you pass through them)
      // At z=0 rect is at VP, at z=1 rect is at screen center
      var parallax = z * z; // quadratic — near rects barely move, far rects swing hard
      var rectCx = vpx + (w / 2 - vpx) * parallax;
      var rectCy = vpy + (h / 2 - vpy) * parallax;
      // S-curve bend — two control points at different depths create winding path
      // Bend1 peaks at z~0.35 (mid-far), bend2 peaks at z~0.7 (mid-near)
      var b1 = Math.sin(z * Math.PI * 1.2);       // peaks ~0.35 depth
      var b2 = Math.sin((z - 0.3) * Math.PI * 1.1); // peaks ~0.7 depth
      rectCx += (bendX1 * b1 + bendX2 * b2) * w * 0.25;
      rectCy += (bendY1 * b1 + bendY2 * b2) * h * 0.2;
      var rx = rectCx - rectW / 2;
      var ry = rectCy - rectH / 2;

      // Audio modulation — frequency data warps the rectangle
      var freqIdx = Math.floor(z * bufferLength) % bufferLength;
      var fv = freqData[freqIdx] / 255;
      var warp = fv * scale * 8;

      // Color cycles through palette based on depth
      var rectAlpha = (0.15 + fv * 0.35) * (0.3 + z * 0.7);
      var colT = (z + palBlend) % 1;
      ctx.strokeStyle = lerpColorA(colA, colB, colT, Math.min(rectAlpha, 0.7));
      ctx.lineWidth = 0.5 + z * 2.5 + fv * 1.5;

      // Draw warped rectangle — not a perfect rect, audio bends it
      ctx.beginPath();
      ctx.moveTo(rx - warp, ry - warp);
      ctx.lineTo(rx + rectW + warp, ry - warp * 0.7);
      ctx.lineTo(rx + rectW + warp * 0.7, ry + rectH + warp);
      ctx.lineTo(rx - warp * 0.7, ry + rectH + warp * 0.7);
      ctx.closePath();
      ctx.stroke();

      // Glow on close / loud rects
      if (z > 0.3 && fv > 0.3) {
        ctx.strokeStyle = lerpColorA(colA, colB, colT, fv * 0.08);
        ctx.lineWidth = 3 + z * 6;
        ctx.stroke();
      }
    }

    // ═══ LAYER 2: VERTICAL COLUMNS — pillars passing by ═══
    var colCount = 12;
    for (var ci = 0; ci < colCount; ci++) {
      var cz = ((ci / colCount) + hallZ * 1.3) % 1;
      cz = cz * cz;
      if (cz < 0.005) continue;

      var cScale = cz;
      var cParallax = cz * cz;
      var colCx = vpx + (w / 2 - vpx) * cParallax;
      var colCy = vpy + (h / 2 - vpy) * cParallax;
      var spread = w * cScale * 0.55;

      var freqIdx = Math.floor(cz * bufferLength) % bufferLength;
      var cfv = freqData[freqIdx] / 255;
      var colAlpha = (0.1 + cfv * 0.3) * (0.2 + cz * 0.8);
      var cColT = (cz * 0.7 + palBlend + 0.5) % 1;
      ctx.strokeStyle = lerpColorA(colB, colA, cColT, Math.min(colAlpha, 0.6));
      ctx.lineWidth = 0.5 + cz * 2;

      // Left column
      var lx = colCx - spread;
      ctx.beginPath();
      ctx.moveTo(lx, colCy - h * cScale * 0.5);
      ctx.lineTo(lx, colCy + h * cScale * 0.5);
      ctx.stroke();

      // Right column
      var rrx = colCx + spread;
      ctx.beginPath();
      ctx.moveTo(rrx, colCy - h * cScale * 0.5);
      ctx.lineTo(rrx, colCy + h * cScale * 0.5);
      ctx.stroke();

      // Cross beams
      if (ci % 3 === 0 && cz > 0.1) {
        var beamY1 = colCy - h * cScale * 0.35;
        var beamY2 = colCy + h * cScale * 0.35;
        ctx.strokeStyle = lerpColorA(colB, colA, cColT, colAlpha * 0.5);
        ctx.lineWidth = 0.3 + cz;
        ctx.beginPath();
        ctx.moveTo(lx, beamY1);
        ctx.lineTo(rrx, beamY1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, beamY2);
        ctx.lineTo(rrx, beamY2);
        ctx.stroke();
      }
    }

    // ═══ LAYER 3: TUNNEL WALLS — lines end at far-wall edges, not one point ═══
    // The "far wall" is a small rectangle at the VP — lines from each screen
    // edge terminate at the corresponding edge of this rectangle, not all
    // at the same pixel. This is what makes it read as a hall, not an X.
    var farW = 30 + sBass * 15;  // far wall half-width
    var farH = 22 + sBass * 10;  // far wall half-height
    var midX = w / 2 + bendX1 * w * 0.25;
    var midY = h / 2 + bendY1 * h * 0.2;

    // Far wall corners
    var farTL = [vpx - farW, vpy - farH];
    var farTR = [vpx + farW, vpy - farH];
    var farBR = [vpx + farW, vpy + farH];
    var farBL = [vpx - farW, vpy + farH];

    // Draw the far wall rectangle (the void at the end)
    ctx.strokeStyle = lerpColorA(colA, colB, palBlend, 0.15 + sTotal * 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(farTL[0], farTL[1]);
    ctx.lineTo(farTR[0], farTR[1]);
    ctx.lineTo(farBR[0], farBR[1]);
    ctx.lineTo(farBL[0], farBL[1]);
    ctx.closePath();
    ctx.stroke();

    var wallDefs = [
      // Left wall: screen left edge → far wall left edge
      { genY: true, ex: 0, farA: farTL, farB: farBL, cpBiasX: -0.2, cpBiasY: 0, colShift: 0 },
      // Right wall: screen right edge → far wall right edge
      { genY: true, ex: w, farA: farTR, farB: farBR, cpBiasX: 0.2, cpBiasY: 0, colShift: 0.25 },
      // Ceiling: screen top edge → far wall top edge
      { genX: true, ey: 0, farA: farTL, farB: farTR, cpBiasX: 0, cpBiasY: -0.15, colShift: 0.5 },
      // Floor: screen bottom edge → far wall bottom edge
      { genX: true, ey: h, farA: farBL, farB: farBR, cpBiasX: 0, cpBiasY: 0.15, colShift: 0.75 },
    ];
    var wallSeams = 5;
    for (var wi = 0; wi < wallDefs.length; wi++) {
      var wd = wallDefs[wi];
      var wcp1x = midX + wd.cpBiasX * w + bendX2 * w * 0.15;
      var wcp1y = midY + wd.cpBiasY * h + bendY2 * h * 0.12;

      for (var si = 0; si < wallSeams; si++) {
        var sfrac = (si + 0.5) / wallSeams;
        var sfv = freqData[(wi * wallSeams + si + 8) % bufferLength] / 255;
        var sAlpha = 0.06 + sfv * 0.18 + sTotal * 0.08;
        var sColT = (sfrac * 0.3 + wd.colShift + palBlend) % 1;
        ctx.strokeStyle = lerpColorA(colA, colB, sColT, sAlpha);
        ctx.lineWidth = 0.5 + sfv * 1.5;

        // Start: point on screen edge
        var startX, startY;
        if (wd.genY) {
          startX = wd.ex;
          startY = h * sfrac;
        } else {
          startX = w * sfrac;
          startY = wd.ey;
        }
        // End: interpolate along the far wall edge (not a single point)
        var endX = wd.farA[0] + (wd.farB[0] - wd.farA[0]) * sfrac;
        var endY = wd.farA[1] + (wd.farB[1] - wd.farA[1]) * sfrac;
        var wcp2x = (wcp1x + endX) / 2 + wd.cpBiasX * w * 0.3;
        var wcp2y = (wcp1y + endY) / 2 + wd.cpBiasY * h * 0.25;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(wcp1x, wcp1y, wcp2x, wcp2y, endX, endY);
        ctx.stroke();

        if (sfv > 0.4) {
          ctx.strokeStyle = lerpColorA(colA, colB, sColT, sfv * 0.05);
          ctx.lineWidth = 3 + sfv * 4;
          ctx.stroke();
        }
      }
    }
    // 4 corner edges — screen corners to far-wall corners
    var screenCorners = [[0, 0], [w, 0], [w, h], [0, h]];
    var farCorners = [farTL, farTR, farBR, farBL];
    var cornerBias = [[-0.15, -0.12], [0.15, -0.12], [0.15, 0.12], [-0.15, 0.12]];
    for (var ci = 0; ci < 4; ci++) {
      var cfv = freqData[(ci * 8) % bufferLength] / 255;
      var cAlpha = 0.2 + cfv * 0.3 + sTotal * 0.1;
      ctx.strokeStyle = lerpColorA(colA, colB, (ci / 4 + palBlend) % 1, cAlpha);
      ctx.lineWidth = 1.5 + cfv * 2.5;
      var ccp1x = midX + cornerBias[ci][0] * w + bendX2 * w * 0.15;
      var ccp1y = midY + cornerBias[ci][1] * h + bendY2 * h * 0.12;
      var ccp2x = (ccp1x + farCorners[ci][0]) / 2 + cornerBias[ci][0] * w * 0.3;
      var ccp2y = (ccp1y + farCorners[ci][1]) / 2 + cornerBias[ci][1] * h * 0.3;
      ctx.beginPath();
      ctx.moveTo(screenCorners[ci][0], screenCorners[ci][1]);
      ctx.bezierCurveTo(ccp1x, ccp1y, ccp2x, ccp2y, farCorners[ci][0], farCorners[ci][1]);
      ctx.stroke();
      if (cfv > 0.3) {
        ctx.strokeStyle = lerpColorA(colA, colB, (ci / 4 + palBlend) % 1, cfv * 0.06);
        ctx.lineWidth = 5 + cfv * 6;
        ctx.stroke();
      }
    }

    // ═══ LAYER 3b: WALL SURFACE FILLS — gradient trapezoids per wall ═══
    // Each wall is a trapezoid from screen edge to far-wall edge, filled
    // with a gradient that darkens toward the VP (far = dark = depth).
    var wallTraps = [
      // Left wall: TL screen → TL far, BL screen → BL far
      { pts: [[0, 0], farTL, farBL, [0, h]], gradFrom: [0, h / 2], gradTo: [vpx, vpy], brightness: 0.06 },
      // Right wall
      { pts: [[w, 0], farTR, farBR, [w, h]], gradFrom: [w, h / 2], gradTo: [vpx, vpy], brightness: 0.06 },
      // Ceiling
      { pts: [[0, 0], farTL, farTR, [w, 0]], gradFrom: [w / 2, 0], gradTo: [vpx, vpy], brightness: 0.08 },
      // Floor
      { pts: [[0, h], farBL, farBR, [w, h]], gradFrom: [w / 2, h], gradTo: [vpx, vpy], brightness: 0.05 },
    ];
    for (var ti = 0; ti < wallTraps.length; ti++) {
      var trap = wallTraps[ti];
      var trapCol = lerpColor(colA, colB, (ti / 4 + palBlend) % 1);
      var trapGrad = ctx.createLinearGradient(
        trap.gradFrom[0], trap.gradFrom[1], trap.gradTo[0], trap.gradTo[1]
      );
      var nearAlpha = trap.brightness + sTotal * 0.04;
      trapGrad.addColorStop(0, rgba(trapCol, nearAlpha));
      trapGrad.addColorStop(0.7, rgba(trapCol, nearAlpha * 0.2));
      trapGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = trapGrad;
      ctx.beginPath();
      ctx.moveTo(trap.pts[0][0], trap.pts[0][1]);
      ctx.lineTo(trap.pts[1][0], trap.pts[1][1]);
      ctx.lineTo(trap.pts[2][0], trap.pts[2][1]);
      ctx.lineTo(trap.pts[3][0], trap.pts[3][1]);
      ctx.closePath();
      ctx.fill();
    }

    // ═══ LAYER 3c: CORNER AO — dark gradients where walls meet ═══
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (var ai = 0; ai < 4; ai++) {
      var sc = screenCorners[ai];
      var fc = farCorners[ai];
      // Radial gradient along each corner edge — darkest at the seam
      var aoR = Math.max(w, h) * 0.25;
      var aoGrad = ctx.createRadialGradient(sc[0], sc[1], 0, sc[0], sc[1], aoR);
      aoGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
      aoGrad.addColorStop(0.3, 'rgba(0,0,0,0.1)');
      aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aoGrad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // ═══ LAYER 3d: EDGE HIGHLIGHTS — thin bright lines at wall seams ═══
    for (var ei = 0; ei < 4; ei++) {
      var esc = screenCorners[ei];
      var efc = farCorners[ei];
      var efv = freqData[(ei * 12) % bufferLength] / 255;
      // Bright thin line — specular rim catching light at each corner edge
      ctx.strokeStyle = 'rgba(255, 255, 255,' + (0.03 + efv * 0.06 + sTotal * 0.02) + ')';
      ctx.lineWidth = 0.5;
      var ecp1x = midX + cornerBias[ei][0] * w + bendX2 * w * 0.15;
      var ecp1y = midY + cornerBias[ei][1] * h + bendY2 * h * 0.12;
      var ecp2x = (ecp1x + efc[0]) / 2 + cornerBias[ei][0] * w * 0.3;
      var ecp2y = (ecp1y + efc[1]) / 2 + cornerBias[ei][1] * h * 0.3;
      ctx.beginPath();
      ctx.moveTo(esc[0], esc[1]);
      ctx.bezierCurveTo(ecp1x, ecp1y, ecp2x, ecp2y, efc[0], efc[1]);
      ctx.stroke();
    }

    // ═══ LAYER 3e: DEPTH FOG — radial darkening centered on VP ═══
    var fogR = Math.max(w, h) * 0.8;
    var fogGrad = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, fogR);
    fogGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
    fogGrad.addColorStop(0.08, 'rgba(0,0,0,0.2)');
    fogGrad.addColorStop(0.3, 'rgba(0,0,0,0.03)');
    fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, w, h);

    // ═══ LAYER 5: FLOOR GRID — perspective grid beneath ═══
    var gridLines = 10;
    for (var gi = 0; gi < gridLines; gi++) {
      var gz = ((gi / gridLines) + hallZ * 1.5) % 1;
      gz = gz * gz;
      if (gz < 0.01) continue;

      var gScale = gz;
      var gParallax = gz * gz;
      var gridCx = vpx + (w / 2 - vpx) * gParallax;
      var gridCy = vpy + (h / 2 - vpy) * gParallax;
      var gy = gridCy + h * gScale * 0.45;
      var gxSpread = w * gScale * 0.55;
      var gfv = freqData[Math.floor(gz * bufferLength) % bufferLength] / 255;
      var gAlpha = (0.05 + gfv * 0.15) * (0.2 + gz * 0.8);

      ctx.strokeStyle = lerpColorA(colA, colB, (gz + palBlend) % 1, gAlpha);
      ctx.lineWidth = 0.3 + gz;
      ctx.beginPath();
      ctx.moveTo(gridCx - gxSpread, gy);
      ctx.lineTo(gridCx + gxSpread, gy);
      ctx.stroke();
    }

  }

  // Resize canvas on window resize
  window.addEventListener('resize', function () {
    if (panelOpen) resizeCanvas();
  });

  // ── Weather (migrated from webamp-player.js) ──────────────
  function fetchWeather() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) { loadWeather(pos.coords.latitude, pos.coords.longitude); },
        function () { loadWeather(38.33, -77.79); },
        { timeout: 5000 }
      );
    } else {
      loadWeather(38.33, -77.79);
    }
  }

  function loadWeather(lat, lon) {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
      '&longitude=' + lon +
      '&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto'
    )
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.current) return;
        var temp = Math.round(data.current.temperature_2m);
        var desc = weatherDesc(data.current.weather_code);
        var tz = data.timezone || '';
        var loc = tz.split('/').pop().replace(/_/g, ' ');
        var wxHtml = '<span class="wx-loc">' + loc + '</span> ' +
          '<span class="wx-temp">' + temp + 'F</span> ' +
          '<span class="wx-desc">' + desc + '</span>';
        weatherEl.innerHTML = wxHtml;
        updateBannerWeather(wxHtml);
      })
      .catch(function () {});
  }

  function weatherDesc(code) {
    if (code === 0) return 'clear';
    if (code <= 3) return 'cloudy';
    if (code <= 49) return 'fog';
    if (code <= 59) return 'drizzle';
    if (code <= 69) return 'rain';
    if (code <= 79) return 'snow';
    if (code <= 82) return 'showers';
    if (code <= 86) return 'snow showers';
    if (code <= 99) return 'thunderstorm';
    return '';
  }

  fetchWeather();

  // ── Init — never interrupt audio that's already playing ──
  // Detect if audio is already loaded with a src (playing OR paused mid-track)
  var audioHasSrc = audio.src && audio.src !== '' && audio.src !== window.location.href;

  if (audioHasSrc) {
    // Audio element survived (View Transition persist or same-page re-init)
    // Figure out which track from the src — don't touch playback
    var curSrc = audio.src;
    for (var pi = 0; pi < PLAYLIST.length; pi++) {
      if (curSrc.indexOf(PLAYLIST[pi].url) !== -1) {
        currentIndex = pi;
        break;
      }
    }
    isPlaying = !audio.paused;
    updateNowPlaying(PLAYLIST[getPlayIndex(currentIndex)]);
    updatePlaylistHighlight();
    updatePlayBtn();
    if (isPlaying) showBanner(true);
    initAudioContext();
    if (isPlaying) startVisualizer();
  } else {
    // Truly fresh — no audio loaded at all
    audio.loop = false;
    var restoreIdx = saved ? saved.idx : 0;
    var restoreTime = saved ? saved.time : 0;
    if (restoreIdx >= PLAYLIST.length) restoreIdx = 0;

    // Set src without loadTrack to avoid saveState race
    var track = PLAYLIST[getPlayIndex(restoreIdx)];
    currentIndex = restoreIdx;
    audio.src = track.url;
    updateNowPlaying(track);
    updatePlaylistHighlight();

    function tryAutoPlay() {
      initAudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (restoreTime > 0) {
        audio.addEventListener('loadedmetadata', function restorePos() {
          audio.removeEventListener('loadedmetadata', restorePos);
          if (restoreTime < audio.duration) audio.currentTime = restoreTime;
        });
      }
      audio.play().then(function () {
        isPlaying = true;
        updatePlayBtn();
        showBanner(true);
        startVisualizer();
      }).catch(function () {
        document.addEventListener('click', function autoplayOnClick() {
          document.removeEventListener('click', autoplayOnClick);
          tryAutoPlay();
        }, { once: true });
      });
    }
    tryAutoPlay();
  }

  // Expose cleanup for navigation re-init
  window.__musicPanelCleanup = function () {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
    if (weatherEl && weatherEl.parentNode) weatherEl.parentNode.removeChild(weatherEl);
    if (style && style.parentNode) style.parentNode.removeChild(style);
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('pause', onPause);
    audio.removeEventListener('play', onPlay);
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('mouseup', onDocMouseUp);
  };

})();
