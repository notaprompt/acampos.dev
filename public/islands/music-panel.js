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

    // ── Feedback zoom — falling forward into the void ──
    var feedbackZoom = 1.006 + sBass * 0.008 + hit * 0.02;
    ctx.save();
    ctx.globalAlpha = 0.94 - sTotal * 0.04;
    ctx.translate(w / 2, h / 2);
    ctx.scale(feedbackZoom, feedbackZoom);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, 0, w, h);

    visTime += 0.016;

    // Forward motion — speed driven by bass
    hallZ += 0.008 + sBass * 0.025 + hit * 0.15;

    // Palette
    palBlend += 0.003 + sTotal * 0.002;
    if (palBlend >= 1) { palBlend = 0; palIdx = (palIdx + 1) % PALETTE.length; }
    var colA = PALETTE[palIdx];
    var colB = PALETTE[(palIdx + 1) % PALETTE.length];

    // Vanishing point — drifts slowly with mid frequencies
    var vpx = w / 2 + Math.sin(visTime * 0.13) * w * 0.06;
    var vpy = h / 2 + Math.cos(visTime * 0.09) * h * 0.04;

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

      // Position: lerp from vanishing point to screen edges
      var rx = vpx - rectW / 2;
      var ry = vpy - rectH / 2;

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
      var spread = w * cScale * 0.55;

      // Left and right columns
      var freqIdx = Math.floor(cz * bufferLength) % bufferLength;
      var cfv = freqData[freqIdx] / 255;
      var colAlpha = (0.1 + cfv * 0.3) * (0.2 + cz * 0.8);
      var cColT = (cz * 0.7 + palBlend + 0.5) % 1;
      ctx.strokeStyle = lerpColorA(colB, colA, cColT, Math.min(colAlpha, 0.6));
      ctx.lineWidth = 0.5 + cz * 2;

      // Left column
      var lx = vpx - spread;
      ctx.beginPath();
      ctx.moveTo(lx, vpy - h * cScale * 0.5);
      ctx.lineTo(lx, vpy + h * cScale * 0.5);
      ctx.stroke();

      // Right column
      var rrx = vpx + spread;
      ctx.beginPath();
      ctx.moveTo(rrx, vpy - h * cScale * 0.5);
      ctx.lineTo(rrx, vpy + h * cScale * 0.5);
      ctx.stroke();

      // Cross beams — horizontal connections
      if (ci % 3 === 0 && cz > 0.1) {
        var beamY1 = vpy - h * cScale * 0.35;
        var beamY2 = vpy + h * cScale * 0.35;
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

    // ═══ LAYER 3: CONVERGENCE LINES — diagonals to vanishing point ═══
    var lineCount = 8;
    for (var li = 0; li < lineCount; li++) {
      var la = (li / lineCount) * Math.PI * 2 + visTime * 0.03;
      // Start from screen edges
      var edgeX = w / 2 + Math.cos(la) * w * 0.8;
      var edgeY = h / 2 + Math.sin(la) * h * 0.8;

      var freqIdx = (li * 4) % bufferLength;
      var lfv = freqData[freqIdx] / 255;
      var lineAlpha = 0.06 + lfv * 0.2 + sTotal * 0.1;

      ctx.strokeStyle = lerpColorA(colA, colB, (li / lineCount + palBlend) % 1, lineAlpha);
      ctx.lineWidth = 0.5 + lfv * 1.5;
      ctx.beginPath();
      ctx.moveTo(edgeX, edgeY);
      ctx.lineTo(vpx, vpy);
      ctx.stroke();

      // Glow
      if (lfv > 0.4) {
        ctx.strokeStyle = lerpColorA(colA, colB, (li / lineCount + palBlend) % 1, lfv * 0.05);
        ctx.lineWidth = 3 + lfv * 4;
        ctx.stroke();
      }
    }

    // ═══ LAYER 4: MIRROR FRAMES — rectangles on the "walls" ═══
    var frameCount = 8;
    for (var fi = 0; fi < frameCount; fi++) {
      var fz = ((fi / frameCount) + hallZ * 0.7 + 0.1) % 1;
      fz = fz * fz;
      if (fz < 0.02) continue;

      var fScale = fz;
      var fSpread = w * fScale * 0.5;

      var freqIdx = Math.floor((fi * 3 + 7) % bufferLength);
      var ffv = freqData[freqIdx] / 255;
      var fAlpha = (0.1 + ffv * 0.25) * (0.3 + fz * 0.7);
      var fColT = (fz + palBlend + 0.3) % 1;
      ctx.strokeStyle = lerpColorA(colA, colB, fColT, Math.min(fAlpha, 0.5));
      ctx.lineWidth = 0.5 + fz * 1.5;

      // Frame dimensions
      var fw = w * fScale * 0.12 + ffv * 10;
      var fh = h * fScale * 0.15 + ffv * 8;

      // Left wall frame
      var lfx = vpx - fSpread - fw * 0.3;
      var lfy = vpy - fh / 2 + Math.sin(visTime * 0.3 + fi) * h * fScale * 0.05;
      ctx.strokeRect(lfx, lfy, fw, fh);

      // Right wall frame
      var rfx = vpx + fSpread - fw * 0.7;
      var rfy = vpy - fh / 2 + Math.cos(visTime * 0.25 + fi) * h * fScale * 0.05;
      ctx.strokeRect(rfx, rfy, fw, fh);

      // Inner frame lines — mirror reflections (waveform fragments)
      if (fz > 0.08) {
        var waveLen = waveData.length;
        ctx.save();
        ctx.globalAlpha = fAlpha * 0.6;
        // Left mirror — draw a slice of waveform inside
        ctx.beginPath();
        for (var mi = 0; mi < 20; mi++) {
          var mt = mi / 20;
          var mIdx = Math.floor((fi * 50 + mi * 5) % waveLen);
          var mSample = (waveData[mIdx] - 128) / 128;
          var mx = lfx + mt * fw;
          var my = lfy + fh / 2 + mSample * fh * 0.3;
          if (mi === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        }
        ctx.strokeStyle = lerpColorA(colB, colA, fColT, 0.3);
        ctx.lineWidth = 0.5 + fz;
        ctx.stroke();
        // Right mirror
        ctx.beginPath();
        for (var mi = 0; mi < 20; mi++) {
          var mt = mi / 20;
          var mIdx = Math.floor((fi * 50 + mi * 5 + 30) % waveLen);
          var mSample = (waveData[mIdx] - 128) / 128;
          var mx = rfx + mt * fw;
          var my = rfy + fh / 2 + mSample * fh * 0.3;
          if (mi === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // ═══ LAYER 5: FLOOR GRID — perspective grid beneath ═══
    var gridLines = 10;
    for (var gi = 0; gi < gridLines; gi++) {
      var gz = ((gi / gridLines) + hallZ * 1.5) % 1;
      gz = gz * gz;
      if (gz < 0.01) continue;

      var gScale = gz;
      var gy = vpy + h * gScale * 0.45;
      var gxSpread = w * gScale * 0.55;
      var gfv = freqData[Math.floor(gz * bufferLength) % bufferLength] / 255;
      var gAlpha = (0.05 + gfv * 0.15) * (0.2 + gz * 0.8);

      ctx.strokeStyle = lerpColorA(colA, colB, (gz + palBlend) % 1, gAlpha);
      ctx.lineWidth = 0.3 + gz;
      ctx.beginPath();
      ctx.moveTo(vpx - gxSpread, gy);
      ctx.lineTo(vpx + gxSpread, gy);
      ctx.stroke();
    }

    // ═══ LAYER 6: BASS FLARE — depth pulse on transients ═══
    if (hit > 0.03) {
      var flareR = Math.min(w, h) * 0.3 * hit * 6;
      var grad = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, flareR);
      var flareCol = lerpColor(colA, colB, palBlend);
      grad.addColorStop(0, rgba(flareCol, hit * 1.5));
      grad.addColorStop(0.4, rgba(flareCol, hit * 0.3));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // ═══ LAYER 7: VANISHING POINT — tiny pulsing core ═══
    var vpR = 2 + sBass * 4 + hit * 12;
    ctx.beginPath();
    ctx.arc(vpx, vpy, vpR, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COL_GLOW, 0.3 + sTotal * 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vpx, vpy, vpR * 3, 0, Math.PI * 2);
    ctx.fillStyle = rgba(COL_GLOW, 0.03 + sTotal * 0.03);
    ctx.fill();
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
