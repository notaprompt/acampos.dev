// Music Panel island — custom side panel player with WMP-style visualizer
// Replaces Webamp with full UI control: visualizer, controls, playlist, weather
(function () {
  'use strict';
  // Don't re-init on client-side navigation
  if (window.__musicPanelInit) return;
  if (window.__musicPanelCleanup) window.__musicPanelCleanup();
  window.__musicPanelInit = true;

  // ── Playlist ──────────────────────────────────────────────
  // profile: hitThresh (bass transient sensitivity), bendAmp (how hard turns are),
  //          steerSens (mid freq steering force), flipThresh (hit accumulation to flip),
  //          smoothing (analyser time constant — lower = snappier response)
  // midSnap: amplifies mid-frequency transient (delta) response — what makes snares/attacks snap
  var PLAYLIST = [
    { artist: 'Shigeo Sekito', title: 'the word II', url: '/audio/the-word-ii.mp3',
      profile: { hitThresh: 0.08, bendAmp: 1.0, steerSens: 1.0, midSnap: 1.0, flipThresh: 0.5, smoothing: 0.8 } },
    { artist: 'Aphex Twin', title: 'Avril 14th', url: '/audio/avril-14th.mp3',
      profile: { hitThresh: 0.02, bendAmp: 1.8, steerSens: 2.5, midSnap: 4.0, flipThresh: 0.6, smoothing: 0.55 } },
    { artist: 'Brent Faiyaz', title: 'white noise.', url: '/audio/white-noise.mp3',
      profile: { hitThresh: 0.03, bendAmp: 1.4, steerSens: 2.0, midSnap: 3.5, flipThresh: 0.6, smoothing: 0.6 } },
    { artist: 'Piero Piccioni', title: 'Easy Lovers', url: '/audio/easy-lovers.mp3',
      profile: { hitThresh: 0.05, bendAmp: 1.2, steerSens: 1.5, midSnap: 2.5, flipThresh: 0.55, smoothing: 0.7 } },
    { artist: 'Maison Music', title: "l'histoire de ta vie", url: '/audio/lhistoire-de-ta-vie.mp3',
      profile: { hitThresh: 0.03, bendAmp: 1.6, steerSens: 2.2, midSnap: 3.0, flipThresh: 0.6, smoothing: 0.6 } },
  ];

  // Active profile — defaults to The Word II
  var activeProfile = PLAYLIST[0].profile;

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
    // Apply song-specific visualizer profile
    if (track.profile) {
      activeProfile = track.profile;
      if (analyser) analyser.smoothingTimeConstant = track.profile.smoothing;
    }
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
  banner.innerHTML = '<span class="np-scroll"><span class="np-label">now playing:</span> <span class="np-track">--</span><span class="np-spacer"></span><span class="np-weather"></span><span class="np-spacer"></span><span class="np-stock"></span><span class="np-spacer"></span></span>';
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

    // Update marquee track
    var trackHtml = '';
    if (track.artist) {
      trackHtml += '<span class="np-artist">' + track.artist + '</span>';
      trackHtml += '<span class="np-sep"> // </span>';
    }
    trackHtml += track.title;
    var npTrack = banner.querySelector('.np-track');
    if (npTrack) npTrack.innerHTML = trackHtml;
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
  // Color cycle — 4 site colors, hit-driven jumps + energy saturation
  var PALETTE = [COL_GOLD, COL_GLOW, COL_ALIVE, COL_DANGER];
  var palIdx = 0;
  var palBlend = 0;
  var flashEnergy = 0;  // decays from bass hits, drives color intensity
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

  // ═══ WALL ARCHITECTURE — objects that fly past on tunnel walls ═══
  // Each draw function: (ctx, cx, cy, s, col, alpha) where s = scale
  var wallObjTypes = {
    // ── DOORS (5 variants) ──
    door_panel: function(ctx, cx, cy, s, col, a) {
      // 1800s six-panel door
      var dw = 18*s, dh = 36*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.strokeRect(cx-dw/2, cy-dh/2, dw, dh);
      // panels (3 rows of 2)
      var pw = dw*0.35, ph = dh*0.25, gap = dw*0.06;
      for (var pr=0;pr<3;pr++) {
        var py = cy - dh/2 + dh*0.1 + pr*(ph+gap*1.5);
        ctx.strokeRect(cx-dw/2+gap, py, pw, ph);
        ctx.strokeRect(cx+dw/2-gap-pw, py, pw, ph);
      }
      // knob
      ctx.beginPath();
      ctx.arc(cx+dw*0.3, cy+dh*0.05, 1.5*s, 0, Math.PI*2);
      ctx.stroke();
    },
    door_french: function(ctx, cx, cy, s, col, a) {
      // French double doors with glass panes
      var dw = 28*s, dh = 36*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.strokeRect(cx-dw/2, cy-dh/2, dw, dh);
      // center divide
      ctx.beginPath(); ctx.moveTo(cx, cy-dh/2); ctx.lineTo(cx, cy+dh/2); ctx.stroke();
      // glass panes (4 per side)
      var pw = dw*0.38, ph = dh*0.18;
      for (var side=-1;side<=1;side+=2) {
        for (var pr=0;pr<4;pr++) {
          var px = cx + side*(dw*0.01 + pw/2);
          var py = cy - dh/2 + dh*0.08 + pr*(ph+dh*0.04);
          ctx.strokeRect(px-pw/2, py, pw, ph);
        }
      }
    },
    door_saloon: function(ctx, cx, cy, s, col, a) {
      // Saloon swinging half-doors
      var dw = 26*s, dh = 20*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      // frame top
      ctx.beginPath(); ctx.moveTo(cx-dw/2, cy-dh/2); ctx.lineTo(cx+dw/2, cy-dh/2); ctx.stroke();
      // left door
      ctx.strokeRect(cx-dw/2, cy-dh/2, dw*0.46, dh);
      // right door
      ctx.strokeRect(cx+dw*0.04, cy-dh/2, dw*0.46, dh);
      // louvers
      for (var li=1;li<4;li++) {
        var ly = cy - dh/2 + li*dh*0.25;
        ctx.beginPath(); ctx.moveTo(cx-dw/2+2*s, ly); ctx.lineTo(cx-dw*0.04-2*s, ly); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+dw*0.04+2*s, ly); ctx.lineTo(cx+dw/2-2*s, ly); ctx.stroke();
      }
    },
    door_front: function(ctx, cx, cy, s, col, a) {
      // Front door with transom window
      var dw = 20*s, dh = 38*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.strokeRect(cx-dw/2, cy-dh/2, dw, dh);
      // transom
      ctx.beginPath(); ctx.moveTo(cx-dw/2, cy-dh/2+dh*0.2); ctx.lineTo(cx+dw/2, cy-dh/2+dh*0.2); ctx.stroke();
      // arch in transom
      ctx.beginPath(); ctx.arc(cx, cy-dh/2+dh*0.2, dw*0.35, Math.PI, 0); ctx.stroke();
      // knob
      ctx.beginPath(); ctx.arc(cx+dw*0.28, cy+dh*0.1, 1.5*s, 0, Math.PI*2); ctx.stroke();
    },
    door_garage: function(ctx, cx, cy, s, col, a) {
      // Garage door with horizontal sections
      var dw = 40*s, dh = 30*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.strokeRect(cx-dw/2, cy-dh/2, dw, dh);
      for (var gi=1;gi<5;gi++) {
        var gy = cy - dh/2 + gi*dh/5;
        ctx.beginPath(); ctx.moveTo(cx-dw/2, gy); ctx.lineTo(cx+dw/2, gy); ctx.stroke();
      }
      // small windows in top section
      for (var wi=0;wi<3;wi++) {
        ctx.strokeRect(cx - dw*0.3 + wi*dw*0.22, cy-dh/2+dh*0.04, dw*0.16, dh/5-dh*0.08);
      }
    },
    // ── WINDOWS (5 variants) ──
    win_arched: function(ctx, cx, cy, s, col, a) {
      var ww = 14*s, wh = 22*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.beginPath();
      ctx.moveTo(cx-ww/2, cy+wh/2);
      ctx.lineTo(cx-ww/2, cy-wh*0.1);
      ctx.arc(cx, cy-wh*0.1, ww/2, Math.PI, 0);
      ctx.lineTo(cx+ww/2, cy+wh/2);
      ctx.closePath(); ctx.stroke();
      // sill
      ctx.beginPath(); ctx.moveTo(cx-ww*0.6, cy+wh/2); ctx.lineTo(cx+ww*0.6, cy+wh/2); ctx.stroke();
      // center mullion
      ctx.beginPath(); ctx.moveTo(cx, cy-wh*0.1-ww/2); ctx.lineTo(cx, cy+wh/2); ctx.stroke();
    },
    win_double: function(ctx, cx, cy, s, col, a) {
      // Double-hung window
      var ww = 14*s, wh = 20*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.strokeRect(cx-ww/2, cy-wh/2, ww, wh);
      // horizontal divide
      ctx.beginPath(); ctx.moveTo(cx-ww/2, cy); ctx.lineTo(cx+ww/2, cy); ctx.stroke();
      // sill
      ctx.beginPath(); ctx.moveTo(cx-ww*0.6, cy+wh/2); ctx.lineTo(cx+ww*0.6, cy+wh/2); ctx.stroke();
    },
    win_round: function(ctx, cx, cy, s, col, a) {
      // Porthole / round window
      var r = 9*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
      // cross
      ctx.beginPath(); ctx.moveTo(cx-r, cy); ctx.lineTo(cx+r, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-r); ctx.lineTo(cx, cy+r); ctx.stroke();
    },
    win_gothic: function(ctx, cx, cy, s, col, a) {
      // Gothic pointed arch window
      var ww = 12*s, wh = 28*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      ctx.beginPath();
      ctx.moveTo(cx-ww/2, cy+wh/2);
      ctx.lineTo(cx-ww/2, cy-wh*0.15);
      ctx.quadraticCurveTo(cx-ww/2, cy-wh/2, cx, cy-wh/2);
      ctx.quadraticCurveTo(cx+ww/2, cy-wh/2, cx+ww/2, cy-wh*0.15);
      ctx.lineTo(cx+ww/2, cy+wh/2);
      ctx.closePath(); ctx.stroke();
      // inner tracery
      ctx.beginPath(); ctx.moveTo(cx, cy-wh/2); ctx.lineTo(cx, cy+wh/2); ctx.stroke();
    },
    win_bay: function(ctx, cx, cy, s, col, a) {
      // Bay window — 3 angled panes
      var ww = 22*s, wh = 16*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      // center pane
      ctx.strokeRect(cx-ww*0.22, cy-wh/2, ww*0.44, wh);
      // left angled
      ctx.beginPath();
      ctx.moveTo(cx-ww*0.22, cy-wh/2); ctx.lineTo(cx-ww/2, cy-wh*0.3);
      ctx.lineTo(cx-ww/2, cy+wh*0.3); ctx.lineTo(cx-ww*0.22, cy+wh/2);
      ctx.stroke();
      // right angled
      ctx.beginPath();
      ctx.moveTo(cx+ww*0.22, cy-wh/2); ctx.lineTo(cx+ww/2, cy-wh*0.3);
      ctx.lineTo(cx+ww/2, cy+wh*0.3); ctx.lineTo(cx+ww*0.22, cy+wh/2);
      ctx.stroke();
    },
    // ── PICTURE FRAMES (5 variants) ──
    frame_portrait: function(ctx, cx, cy, s, col, a) {
      var fw = 10*s, fh = 14*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      ctx.strokeRect(cx-fw/2, cy-fh/2, fw, fh);
      ctx.strokeRect(cx-fw/2+2*s, cy-fh/2+2*s, fw-4*s, fh-4*s);
    },
    frame_landscape: function(ctx, cx, cy, s, col, a) {
      var fw = 18*s, fh = 11*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      ctx.strokeRect(cx-fw/2, cy-fh/2, fw, fh);
      // inner mat
      ctx.strokeRect(cx-fw/2+2*s, cy-fh/2+2*s, fw-4*s, fh-4*s);
    },
    frame_oval: function(ctx, cx, cy, s, col, a) {
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      ctx.beginPath(); ctx.ellipse(cx, cy, 8*s, 11*s, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, 6*s, 9*s, 0, 0, Math.PI*2); ctx.stroke();
    },
    frame_ornate: function(ctx, cx, cy, s, col, a) {
      var fw = 14*s, fh = 14*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      ctx.strokeRect(cx-fw/2, cy-fh/2, fw, fh);
      // corner ornaments
      var co = 3*s;
      for (var ccx=-1;ccx<=1;ccx+=2) for (var ccy=-1;ccy<=1;ccy+=2) {
        ctx.beginPath();
        ctx.moveTo(cx+ccx*fw/2, cy+ccy*(fh/2-co));
        ctx.quadraticCurveTo(cx+ccx*(fw/2-co*0.3), cy+ccy*(fh/2-co*0.3), cx+ccx*(fw/2-co), cy+ccy*fh/2);
        ctx.stroke();
      }
    },
    frame_triptych: function(ctx, cx, cy, s, col, a) {
      var fw = 22*s, fh = 10*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      // three frames
      ctx.strokeRect(cx-fw/2, cy-fh/2, fw*0.3, fh);
      ctx.strokeRect(cx-fw*0.13, cy-fh/2, fw*0.3, fh);
      ctx.strokeRect(cx+fw*0.2, cy-fh/2, fw*0.3, fh);
    },
    // ── SHELVES (5 variants) ──
    shelf_books: function(ctx, cx, cy, s, col, a) {
      var sw = 20*s, sh = 3*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      // shelf plank
      ctx.beginPath(); ctx.moveTo(cx-sw/2, cy); ctx.lineTo(cx+sw/2, cy); ctx.stroke();
      // brackets
      ctx.beginPath(); ctx.moveTo(cx-sw*0.35, cy); ctx.lineTo(cx-sw*0.35, cy+4*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+sw*0.35, cy); ctx.lineTo(cx+sw*0.35, cy+4*s); ctx.stroke();
      // books
      for (var bi=0;bi<5;bi++) {
        var bx = cx - sw*0.35 + bi*sw*0.15;
        var bh = (3+bi%3)*s;
        ctx.strokeRect(bx, cy-bh, sw*0.1, bh);
      }
    },
    shelf_display: function(ctx, cx, cy, s, col, a) {
      var sw = 16*s, sh = 20*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      ctx.strokeRect(cx-sw/2, cy-sh/2, sw, sh);
      // 3 shelves
      for (var si=1;si<4;si++) {
        var sy = cy - sh/2 + si*sh/4;
        ctx.beginPath(); ctx.moveTo(cx-sw/2, sy); ctx.lineTo(cx+sw/2, sy); ctx.stroke();
      }
    },
    shelf_floating: function(ctx, cx, cy, s, col, a) {
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      // two floating shelves
      ctx.beginPath(); ctx.moveTo(cx-10*s, cy-4*s); ctx.lineTo(cx+10*s, cy-4*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-8*s, cy+4*s); ctx.lineTo(cx+12*s, cy+4*s); ctx.stroke();
      // small item on each
      ctx.strokeRect(cx-2*s, cy-4*s-5*s, 4*s, 5*s);
      ctx.beginPath(); ctx.arc(cx+4*s, cy+4*s-3*s, 2*s, 0, Math.PI*2); ctx.stroke();
    },
    shelf_mantle: function(ctx, cx, cy, s, col, a) {
      // Fireplace mantle
      var mw = 26*s, mh = 22*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s);
      // mantle shelf
      ctx.beginPath(); ctx.moveTo(cx-mw/2, cy-mh*0.3); ctx.lineTo(cx+mw/2, cy-mh*0.3); ctx.stroke();
      // opening
      ctx.beginPath();
      ctx.moveTo(cx-mw*0.3, cy-mh*0.3);
      ctx.lineTo(cx-mw*0.3, cy+mh/2);
      ctx.lineTo(cx+mw*0.3, cy+mh/2);
      ctx.lineTo(cx+mw*0.3, cy-mh*0.3);
      ctx.stroke();
      // arch
      ctx.beginPath(); ctx.arc(cx, cy-mh*0.3, mw*0.3, Math.PI, 0); ctx.stroke();
    },
    shelf_clock: function(ctx, cx, cy, s, col, a) {
      // Wall clock
      var r = 8*s;
      ctx.strokeStyle = 'rgba('+col+','+a+')';
      ctx.lineWidth = Math.max(0.5, s*0.8);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
      // hour marks
      for (var hi=0;hi<12;hi++) {
        var ha = hi*Math.PI/6;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(ha)*r*0.8, cy+Math.sin(ha)*r*0.8);
        ctx.lineTo(cx+Math.cos(ha)*r*0.95, cy+Math.sin(ha)*r*0.95);
        ctx.stroke();
      }
      // hands
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+r*0.5, cy-r*0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-r*0.1, cy-r*0.6); ctx.stroke();
    }
  };

  // Build array of type keys for random selection
  var wallObjKeys = Object.keys(wallObjTypes);

  // Object pool — placed on walls at random depths
  var wallObjects = [];
  var wallObjCount = 18;
  function initWallObj() {
    return {
      type: wallObjKeys[Math.floor(Math.random() * wallObjKeys.length)],
      wall: Math.floor(Math.random() * 4), // 0=left, 1=right, 2=ceiling, 3=floor
      pos: Math.random(),   // position along wall (0-1)
      depth: Math.random(), // raw depth slot (0-1)
      seed: Math.random()   // for per-object variation
    };
  }
  for (var oi = 0; oi < wallObjCount; oi++) {
    wallObjects.push(initWallObj());
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
  var leanAngle = 0;                  // g-force tilt — lags VP, springs back
  var leanVel = 0;                    // angular velocity for spring physics
  // Bend system — makes the tunnel curve like a bendy straw
  // Bend system — two control points for S-curves and U-turns
  var bendX1 = 0, bendY1 = 0, bendTX1 = 0, bendTY1 = 0;
  var bendX2 = 0, bendY2 = 0, bendTX2 = 0, bendTY2 = 0;
  var bendAngle1 = Math.random() * Math.PI * 2;
  var bendAngle2 = Math.random() * Math.PI * 2;
  var flipVel = 0;                    // angular velocity during flip
  var flipCooldown = 180;             // frames until next flip allowed (starts with 3s warmup)
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

    // Steering — mid delta (transient snap) + continuous arc from sMid
    var p = activeProfile;
    steerAngle += midDelta * 3 * p.midSnap          // transient snap — what makes snares jolt
               + sMid * 0.08 * p.steerSens          // continuous arc from sustained mids
               + Math.sin(visTime * 0.4) * sMid * 0.05;

    // Target velocity — follows a heading that the music steers
    var steerSpeed = (0.015 + sMid * 0.025) * p.steerSens;
    targetVelX += Math.cos(steerAngle) * steerSpeed;
    targetVelY += Math.sin(steerAngle) * steerSpeed;

    // Bass hits = gentle nudge in current heading, not random kicks
    if (hit > p.hitThresh) {
      targetVelX += Math.cos(steerAngle) * hit * 0.6 * p.bendAmp;
      targetVelY += Math.sin(steerAngle) * hit * 0.6 * p.bendAmp;
      hitAccum += hit;
    }

    // Heavy damping — velocity bleeds off smoothly, long gliding curves
    targetVelX *= 0.85;
    targetVelY *= 0.85;

    // Move target
    targetX += targetVelX;
    targetY += targetVelY;

    // Soft bounds — tighter leash, VP never drifts too far from center
    var dist = Math.sqrt(targetX * targetX + targetY * targetY);
    var bound = 0.35 / p.bendAmp; // profiles with high bendAmp get tighter bounds
    if (dist > bound) {
      var pull = (dist - bound) * 0.12;
      targetX -= targetX / dist * pull;
      targetY -= targetY / dist * pull;
    }

    // Chase smoothing — VP glides after target with heavy lag
    var chaseSpeed = 0.03 + sTotal * 0.02;
    chaseX += (targetX - chaseX) * chaseSpeed;
    chaseY += (targetY - chaseY) * chaseSpeed;

    // ── Flip system — rollercoaster backflips on bass accumulation ──
    if (flipCooldown > 0) flipCooldown--;
    if (hitAccum > p.flipThresh && flipCooldown <= 0 && Math.random() < 0.5) {
      // Full rotation — fast enough to feel like a backflip
      flipVel = (Math.random() < 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.15);
      flipCooldown = 90; // ~1.5 seconds cooldown — more frequent
      hitAccum = 0;
    }
    // Decay hit accumulator
    hitAccum *= 0.97;

    // Flip animation — carries momentum, decays into next movement
    flipAngle += flipVel;
    flipAngle = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); // wrap 0-2π, no accumulation
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
    bendTX1 = Math.cos(bendAngle1) * (0.7 + sBass * 0.4) * p.bendAmp;
    bendTY1 = Math.sin(bendAngle1) * (0.6 + sBass * 0.3) * p.bendAmp;
    bendTX2 = Math.cos(bendAngle2) * (0.8 + sMid * 0.5) * p.bendAmp;
    bendTY2 = Math.sin(bendAngle2) * (0.5 + sMid * 0.4) * p.bendAmp;
    // Smooth chase — fast enough to feel dramatic, slow enough to flow
    bendX1 += (bendTX1 - bendX1) * 0.025;
    bendY1 += (bendTY1 - bendY1) * 0.025;
    bendX2 += (bendTX2 - bendX2) * 0.02;
    bendY2 += (bendTY2 - bendY2) * 0.02;

    // ── Reverse system — beat bounce, threshold scaled to song profile ──
    if (hit > Math.max(p.hitThresh * 1.5, 0.06) && reverseTimer <= 0 && Math.random() < 0.08) {
      reverseTimer = 30 + Math.floor(Math.random() * 30);
    }
    if (reverseTimer > 0) reverseTimer--;
    var forwardDir = reverseTimer > 0 ? -0.6 : 1;

    // ── Feedback zoom — centered on VP so you fly TOWARD the target ──
    var feedbackZoom = 1.012 + sBass * 0.015 + hit * 0.04;
    if (reverseTimer > 0) feedbackZoom = 1 / (1.012 + sBass * 0.01);
    // Zoom origin = where the VP will be (chase position)
    var zoomCx = w / 2 + chaseX * w * 0.15;
    var zoomCy = h / 2 + chaseY * h * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.75 - sTotal * 0.08;
    ctx.translate(zoomCx, zoomCy);
    ctx.rotate(flipAngle * 0.8);
    ctx.scale(feedbackZoom, feedbackZoom);
    ctx.translate(-zoomCx, -zoomCy);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 0, w, h);

    visTime += 0.016;

    // Forward motion — speed driven by bass, reversed during reverse
    hallZ += (0.015 + sBass * 0.04 + hit * 0.25) * forwardDir;

    // Palette — slow drift baseline, hard jump on strong bass hit
    palBlend += 0.003 + sTotal * 0.004;
    if (hit > p.hitThresh * 1.2 && Math.random() < 0.4) {
      // Hard cut to next color on a strong hit
      palIdx = (palIdx + 1) % PALETTE.length;
      palBlend = 0;
    }
    if (palBlend >= 1) { palBlend = 0; palIdx = (palIdx + 1) % PALETTE.length; }
    var colA = PALETTE[palIdx];
    var colB = PALETTE[(palIdx + 1) % PALETTE.length];

    // Flash energy — spikes on hit, drives opacity/saturation boost
    flashEnergy = Math.min(1, flashEnergy + hit * 3);
    flashEnergy *= 0.88;

    // G-force tilt — spring physics, tilts opposite to lateral acceleration
    // When thrown left (targetVelX < 0) you lean right, like a rollercoaster seat
    var leanForce = -targetVelX * 1.8;
    leanVel += (leanForce - leanAngle) * 0.06 - leanVel * 0.88;
    leanAngle += leanVel;
    leanAngle = Math.max(-0.18, Math.min(0.18, leanAngle)); // max ~10 degrees

    // Vanishing point — chase + lean into the bend
    var vpx = w / 2 + chaseX * w * 0.15 + bendX1 * w * 0.06;
    var vpy = h / 2 + chaseY * h * 0.12 + bendY1 * h * 0.05;

    // ═══ LAYER 1: INFINITE HALL — receding rectangles ═══
    var rectCount = 36;
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

      // Light sweep — bright band rolling through depth, sells infinite motion
      var sweepPos = (visTime * 0.4 + sBass * 0.3) % 1;
      var sweepDist = Math.abs(zRaw - sweepPos);
      if (sweepDist > 0.5) sweepDist = 1 - sweepDist;
      var sweepBoost = Math.max(0, 1 - sweepDist * 8) * (0.4 + sTotal * 0.3);

      // Color — depth-mapped, flash-boosted on hits
      var rectAlpha = (0.2 + fv * 0.45 + sweepBoost + flashEnergy * 0.4) * (0.3 + z * 0.7);
      var colT = (z + palBlend) % 1;
      ctx.strokeStyle = lerpColorA(colA, colB, colT, Math.min(rectAlpha, 1.0));
      ctx.lineWidth = 0.5 + z * 2.5 + fv * 1.5 + sweepBoost * 2 + flashEnergy * 2;

      // Draw warped rectangle — not a perfect rect, audio bends it
      ctx.beginPath();
      ctx.moveTo(rx - warp, ry - warp);
      ctx.lineTo(rx + rectW + warp, ry - warp * 0.7);
      ctx.lineTo(rx + rectW + warp * 0.7, ry + rectH + warp);
      ctx.lineTo(rx - warp * 0.7, ry + rectH + warp * 0.7);
      ctx.closePath();
      ctx.stroke();

      // Glow on close / loud rects — amplified by flash energy
      if (z > 0.3 && (fv > 0.3 || flashEnergy > 0.2)) {
        ctx.strokeStyle = lerpColorA(colA, colB, colT, (fv + flashEnergy * 0.5) * 0.18);
        ctx.lineWidth = 3 + z * 6 + flashEnergy * 8;
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

    // ═══ LAYER 2b: WALL ARCHITECTURE — doors, windows, frames, shelves ═══
    for (var oi = 0; oi < wallObjCount; oi++) {
      var obj = wallObjects[oi];
      // Depth cycles like hall rects
      var ozRaw = (obj.depth + hallZ * 0.9) % 1;
      var oz = ozRaw * ozRaw * ozRaw;
      if (oz < 0.01 || oz > 0.85) continue; // skip too far or too near

      // Scale: oz is 0-1 but cubed, so boost for visible object sizes
      var oScale = oz * 3 + 0.15;
      var oParallax = oz * oz;
      var oCx = vpx + (w / 2 - vpx) * oParallax;
      var oCy = vpy + (h / 2 - vpy) * oParallax;
      // S-curve bend like hall rects
      var ob1 = Math.sin(oz * Math.PI * 1.2);
      var ob2 = Math.sin((oz - 0.3) * Math.PI * 1.1);
      oCx += (bendX1 * ob1 + bendX2 * ob2) * w * 0.25;
      oCy += (bendY1 * ob1 + bendY2 * ob2) * h * 0.2;

      // Position on wall surface
      var halfW = w * oScale * 0.5;
      var halfH = h * oScale * 0.5;
      var objX, objY;
      if (obj.wall === 0) {        // left wall
        objX = oCx - halfW * (0.6 + obj.pos * 0.3);
        objY = oCy + (obj.pos - 0.5) * halfH * 0.8;
      } else if (obj.wall === 1) { // right wall
        objX = oCx + halfW * (0.6 + obj.pos * 0.3);
        objY = oCy + (obj.pos - 0.5) * halfH * 0.8;
      } else if (obj.wall === 2) { // ceiling
        objX = oCx + (obj.pos - 0.5) * halfW * 1.2;
        objY = oCy - halfH * (0.5 + obj.pos * 0.2);
      } else {                     // floor
        objX = oCx + (obj.pos - 0.5) * halfW * 1.2;
        objY = oCy + halfH * (0.5 + obj.pos * 0.2);
      }

      // Alpha fades with distance, brightens when near
      var oAlpha = (0.15 + oz * 0.5) * (0.5 + sTotal * 0.3);
      var oColT = (oz + palBlend + obj.seed) % 1;
      var oCol = lerpColor(colA, colB, oColT);
      var oRgb = parseInt(oCol.slice(1,3),16)+','+parseInt(oCol.slice(3,5),16)+','+parseInt(oCol.slice(5,7),16);

      // Draw the object
      wallObjTypes[obj.type](ctx, objX, objY, oScale, oRgb, oAlpha);

      // Recycle when passed camera
      if (ozRaw < 0.02) {
        wallObjects[oi] = initWallObj();
        wallObjects[oi].depth = 0.8 + Math.random() * 0.2;
      }
    }

    // ═══ LAYER 3b: WALL SEAM LINES — fade out before center (no X convergence) ═══
    var midX = w / 2 + bendX1 * w * 0.25;
    var midY = h / 2 + bendY1 * h * 0.2;
    var screenCorners = [[0, 0], [w, 0], [w, h], [0, h]];

    var wallDefs = [
      { genY: true, ex: 0, cpBiasX: -0.2, cpBiasY: 0, colShift: 0 },
      { genY: true, ex: w, cpBiasX: 0.2, cpBiasY: 0, colShift: 0.25 },
      { genX: true, ey: 0, cpBiasX: 0, cpBiasY: -0.15, colShift: 0.5 },
      { genX: true, ey: h, cpBiasX: 0, cpBiasY: 0.15, colShift: 0.75 },
    ];
    var wallSeams = 5;
    for (var wi = 0; wi < wallDefs.length; wi++) {
      var wd = wallDefs[wi];

      for (var si = 0; si < wallSeams; si++) {
        var sfrac = (si + 0.5) / wallSeams;
        var sfv = freqData[(wi * wallSeams + si + 8) % bufferLength] / 255;
        var sColT = (sfrac * 0.3 + wd.colShift + palBlend) % 1;

        var startX, startY;
        if (wd.genY) { startX = wd.ex; startY = h * sfrac; }
        else { startX = w * sfrac; startY = wd.ey; }

        // Draw line as segments that fade out toward VP — never reaches center
        var segs = 12;
        for (var sg = 0; sg < segs; sg++) {
          var t0 = sg / segs;
          var t1 = (sg + 1) / segs;
          // Fade: full alpha near screen edge, zero by 55% of the way
          var segAlpha = (1 - t0 / 0.55);
          if (segAlpha <= 0) break;
          segAlpha = segAlpha * segAlpha * (0.08 + sfv * 0.2 + sTotal * 0.08);

          // Lerp along straight line from start to VP (bend handled by rects)
          var x0 = startX + (vpx - startX) * t0;
          var y0 = startY + (vpy - startY) * t0;
          var x1 = startX + (vpx - startX) * t1;
          var y1 = startY + (vpy - startY) * t1;

          ctx.strokeStyle = lerpColorA(colA, colB, sColT, segAlpha);
          ctx.lineWidth = (0.5 + sfv * 1.5) * (1 - t0 * 0.7);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
    }

    // ═══ LAYER 3c: CORNER AO — dark gradients where walls meet ═══
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (var ai = 0; ai < 4; ai++) {
      var sc = screenCorners[ai];
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

    // ═══ LAYER 3d: EDGE HIGHLIGHTS — fading specular at corners ═══
    for (var ei = 0; ei < 4; ei++) {
      var esc = screenCorners[ei];
      var efv = freqData[(ei * 12) % bufferLength] / 255;
      // Fading segments — only near half, never reaches center
      var hl = 8;
      for (var hi = 0; hi < hl; hi++) {
        var ht0 = hi / hl;
        var ht1 = (hi + 1) / hl;
        var hAlpha = (1 - ht0 / 0.5);
        if (hAlpha <= 0) break;
        hAlpha = hAlpha * (0.03 + efv * 0.06 + sTotal * 0.02);
        ctx.strokeStyle = 'rgba(255,255,255,' + hAlpha + ')';
        ctx.lineWidth = 0.5 * (1 - ht0);
        ctx.beginPath();
        ctx.moveTo(esc[0] + (vpx - esc[0]) * ht0, esc[1] + (vpy - esc[1]) * ht0);
        ctx.lineTo(esc[0] + (vpx - esc[0]) * ht1, esc[1] + (vpy - esc[1]) * ht1);
        ctx.stroke();
      }
    }

    // ═══ LAYER 3e: DEPTH FOG — radial darkening centered on VP ═══
    var fogR = Math.max(w, h) * 0.8;
    var fogGrad = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, fogR);
    fogGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
    fogGrad.addColorStop(0.04, 'rgba(0,0,0,0.7)');
    fogGrad.addColorStop(0.12, 'rgba(0,0,0,0.3)');
    fogGrad.addColorStop(0.35, 'rgba(0,0,0,0.05)');
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

  function fetchStock() {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.bitcoin) return;
        var price = data.bitcoin.usd;
        var pct = data.bitcoin.usd_24h_change.toFixed(2);
        var arrow = pct >= 0 ? '\u25B2' : '\u25BC';
        var sign = pct >= 0 ? '+' : '';
        var color = pct >= 0 ? 'rgba(100,220,120,0.6)' : 'rgba(220,100,100,0.6)';
        var html = '<span style="opacity:0.4">BTC</span> ' +
          '<span style="color:rgba(255,255,255,0.6)">$' + price.toLocaleString() + '</span> ' +
          '<span style="color:' + color + '">' + arrow + ' ' + sign + pct + '%</span>';
        var slots = banner.querySelectorAll('.np-stock');
        for (var i = 0; i < slots.length; i++) slots[i].innerHTML = html;
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
  fetchStock();
  setInterval(fetchStock, 60000);

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
