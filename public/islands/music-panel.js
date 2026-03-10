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
    '  background: var(--depth-2); border-left: 1px solid var(--white-08);',
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
    '  background: var(--depth-3); color: var(--white-30);',
    '  border: 1px solid var(--white-08); border-right: none;',
    '  padding: 12px 5px; font-family: var(--mono); font-size: 0.6rem;',
    '  letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;',
    '  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s, background 0.2s;',
    '  backdrop-filter: blur(6px);',
    '}',
    '#mp-toggle:hover { color: var(--gold-accent); background: var(--depth-2); }',
    '#mp-toggle.shifted { right: 19vw; }',
    '',
    '#mp-titlebar {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 8px 12px; border-bottom: 1px solid var(--white-08);',
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
    '  border-bottom: 1px solid var(--white-08);',
    '}',
    '#mp-info .track-title { color: var(--glow); font-size: 0.8rem; margin-bottom: 2px; }',
    '#mp-info .track-artist { color: var(--gold-accent); font-size: 0.7rem; }',
    '',
    '#mp-progress-wrap {',
    '  padding: 8px 12px 0; flex-shrink: 0;',
    '}',
    '#mp-progress {',
    '  width: 100%; height: 4px; background: var(--white-08);',
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
    '  border-bottom: 1px solid var(--white-08);',
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
    '  border-bottom: 1px solid var(--white-08);',
    '}',
    '#mp-volume-label { color: var(--white-30); font-size: 0.6rem; flex-shrink: 0; }',
    '#mp-volume {',
    '  -webkit-appearance: none; appearance: none; width: 100%; height: 3px;',
    '  background: var(--white-08); outline: none; border-radius: 2px; cursor: pointer;',
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
    '  scrollbar-width: thin; scrollbar-color: var(--white-15) transparent;',
    '}',
    '#mp-playlist::-webkit-scrollbar { width: 4px; }',
    '#mp-playlist::-webkit-scrollbar-thumb { background: var(--white-15); border-radius: 2px; }',
    '.mp-pl-item {',
    '  padding: 6px 12px; font-size: 0.65rem; color: var(--white-30);',
    '  cursor: pointer; transition: background 0.15s, color 0.15s;',
    '  display: flex; align-items: center; gap: 6px;',
    '}',
    '.mp-pl-item:hover { background: var(--white-04); color: var(--white-45); }',
    '.mp-pl-item.active { color: var(--alive); }',
    '.mp-pl-item .marker { flex-shrink: 0; width: 10px; font-size: 0.55rem; }',
    '',
    '/* Now-playing banner (top bar) — marquee ticker */',
    '#now-playing {',
    '  position: fixed; top: 0; left: 0; right: 0; z-index: 9500;',
    '  background: var(--depth-1); border-bottom: 1px solid var(--white-08);',
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
    '.np-label { color: var(--white-30); text-transform: uppercase; letter-spacing: 0.1em; }',
    '.np-track { color: var(--gold-accent); }',
    '.np-artist { color: var(--white-45); }',
    '.np-sep { color: var(--white-15); }',
    '.np-spacer { display: inline-block; width: 60px; }',
    '.np-weather { color: var(--white-30); }',
    '/* Spotify bar */',
    '#mp-spotify-bar { padding: 8px 10px; border-top: 1px solid var(--white-08); flex-shrink: 0; }',
    '#sp-connect-btn { background: none; border: 1px solid rgba(30,215,96,0.4); color: rgba(30,215,96,0.8); font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.08em; padding: 4px 10px; cursor: pointer; width: 100%; }',
    '#sp-connect-btn:hover { border-color: #1ed760; color: #1ed760; }',
    '#sp-search { width: 100%; background: var(--white-08); border: 1px solid var(--white-15); color: var(--white-70); font-family: var(--mono); font-size: 0.65rem; padding: 5px 8px; margin-top: 6px; outline: none; }',
    '#sp-results { max-height: 160px; overflow-y: auto; margin-top: 4px; }',
    '.sp-result { padding: 5px 6px; font-size: 0.62rem; color: var(--white-60); cursor: pointer; border-bottom: 1px solid var(--white-04); }',
    '.sp-result:hover { background: var(--white-08); color: var(--white-90); }',
    '.sp-result .sp-r-title { color: var(--white-90); }',
    '.sp-result .sp-r-artist { color: rgba(184,150,90,0.6); font-size: 0.58rem; }',
    '#sp-status { font-size: 0.58rem; color: rgba(30,215,96,0.5); margin-top: 4px; min-height: 14px; }',
    '.wx-temp { color: var(--white-60); }',
    '.wx-desc { color: var(--white-30); }',
    '.wx-loc { color: rgba(184,150,90,0.4); }',
    '',
    '/* Hide separate weather widget — merged into banner */',
    '#weather-widget { display: none !important; }',
    '',
    '/* Legacy weather widget positioning (hidden) */',
    '#weather-widget-legacy {',
    '  position: fixed; top: 0; right: 16px; z-index: 9501;',
    '  padding: 6px 0; font-family: var(--mono); font-size: 0.65rem;',
    '  color: var(--white-30); display: flex; align-items: center; gap: 6px;',
    '}',
    '.wx-temp { color: var(--white-60); }',
    '.wx-desc { color: var(--white-30); }',
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
    '<div id="mp-spotify-bar">',
    '  <button id="sp-connect-btn">connect spotify</button>',
    '  <div id="sp-search-wrap" style="display:none">',
    '    <input id="sp-search" type="text" placeholder="search spotify..." autocomplete="off" />',
    '    <div id="sp-results"></div>',
    '  </div>',
    '  <div id="sp-status"></div>',
    '</div>',
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
  var PIXEL_SCALE = 3; // render at 1/3 res, scale up for vintage pixel look
  function resizeCanvas() {
    var wrap = canvas.parentElement;
    var w = wrap.clientWidth || panel.clientWidth || Math.round(window.innerWidth * 0.19);
    var h = wrap.clientHeight || 400;
    if (w < 10) w = Math.round(window.innerWidth * 0.19);
    canvas.width = Math.floor(w / PIXEL_SCALE);
    canvas.height = Math.floor(h / PIXEL_SCALE);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.imageRendering = 'pixelated';
  }

  function startVisualizer() {
    if (animId) return;
    resizeCanvas();
    drawVisualizer();
  }

  var visTime = 0;
  var waveData = null;

  // ── Mood palette — full spectral sweep, pulled from scene colors ──
  // Dark mode: luminous, glowing — light on void
  var PALETTE_DARK = [
    '#b8965a',  // gold (lamp, accent)
    '#d4a843',  // warm amber (desk glow)
    '#e8a060',  // burnt orange (sunset window)
    '#c75050',  // ember red (danger)
    '#c86090',  // dusty rose (portal pink)
    '#a050c8',  // violet (portal purple)
    '#6868d0',  // periwinkle (night sky)
    '#5090c8',  // slate blue (window light)
    '#40a8a0',  // teal (deep water)
    '#5BF29B',  // mint (monitor alive)
    '#90d870',  // chartreuse (fresh)
    '#E8DCC8',  // warm white (glow)
  ];
  // Light mode: deeper, richer — dark on cream
  var PALETTE_LIGHT = [
    '#7a5520',  // deep gold
    '#9a6818',  // dark amber
    '#a05828',  // rust
    '#8a2020',  // dark red
    '#8a3058',  // plum
    '#602090',  // deep violet
    '#3838a0',  // indigo
    '#285888',  // dark slate blue
    '#1a6860',  // dark teal
    '#1a7a42',  // forest green
    '#4a7830',  // olive
    '#4a3f2e',  // warm brown
  ];
  var PALETTE = PALETTE_DARK;
  // Pre-computed rgba versions for alpha blending
  function rgba(hex, a) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  var palIdx = 0;
  var palBlend = 0;
  var flashEnergy = 0;   // decays from bass hits, drives intensity
  var melodyColor = 0;   // 0-1, smoothed dominant mid-freq position → palette position
  var melodyColorSmooth = 0;
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
  var wallObjCount = 0;
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
  var sRms = 0, sVocal = 0, prevVocal = 0;
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

    // RMS loudness from waveform — direct measure of volume
    var rms = 0;
    for (var wi = 0; wi < waveData.length; wi++) {
      var sample = (waveData[wi] - 128) / 128;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / waveData.length);

    // Vocal range energy (~300Hz-3kHz, bins 5-30 in 64-bin FFT)
    var vocal = 0, vocalCount = 0;
    var vStart = Math.floor(bufferLength * 0.08);
    var vEnd = Math.min(bufferLength, Math.floor(bufferLength * 0.5));
    for (var vi = vStart; vi < vEnd; vi++) {
      vocal += freqData[vi] / 255;
      vocalCount++;
    }
    vocal = vocalCount > 0 ? vocal / vocalCount : 0;

    sBass = sBass * 0.7 + bass * 0.3;
    sMid = sMid * 0.7 + mid * 0.3;
    sHigh = sHigh * 0.7 + high * 0.3;
    sTotal = sTotal * 0.7 + total * 0.3;

    // Smoothed loudness + vocal + silence detection
    sRms = sRms * 0.75 + rms * 0.25;
    sVocal = sVocal * 0.8 + vocal * 0.2;
    var vocalDelta = vocal - prevVocal;
    prevVocal = sVocal;
    var isSilent = sRms < 0.02;
    var loudness = Math.min(1, sRms * 3); // normalize RMS to 0-1

    var hit = Math.max(0, sBass - prevBass);
    prevBass = sBass;

    // ── Chase target movement system ──
    // Mid frequencies steer smoothly, highs add jitter
    var midDelta = sMid - prevMid;
    var highDelta = sHigh - prevHigh;
    prevMid = sMid;
    prevHigh = sHigh;

    // ── Camera: nearly locked center, minimal sway ──
    var p = activeProfile;
    var midDelta = sMid - prevMid;
    var highDelta = sHigh - prevHigh;
    prevMid = sMid;
    prevHigh = sHigh;

    // Tiny VP drift — just enough life, not swiveling
    steerAngle += 0.003 + sMid * 0.005;
    targetVelX = Math.cos(steerAngle) * 0.002;
    targetVelY = Math.sin(steerAngle) * 0.002;
    targetX += targetVelX;
    targetY += targetVelY;
    // Very tight leash — VP stays near center
    targetX *= 0.92;
    targetY *= 0.92;
    chaseX += (targetX - chaseX) * 0.02;
    chaseY += (targetY - chaseY) * 0.02;

    // Bass accumulator for flips (kept but rarer)
    if (hit > p.hitThresh) hitAccum += hit;
    if (flipCooldown > 0) flipCooldown--;
    if (hitAccum > p.flipThresh * 1.5 && flipCooldown <= 0 && Math.random() < 0.3) {
      flipVel = (Math.random() < 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.1);
      flipCooldown = 150; // longer cooldown
      hitAccum = 0;
    }
    hitAccum *= 0.97;
    flipAngle += flipVel;
    flipAngle = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    flipVel *= 0.94;
    if (Math.abs(flipVel) < 0.002) flipVel = 0;

    // ── Tunnel curves — sweeping S-curves that follow the song ──
    // Two bend points at different rates create winding narrative path
    var bendDrive = isSilent ? 0.003 : (0.006 + sVocal * 0.02 + loudness * 0.01);
    bendAngle1 += bendDrive;
    bendAngle2 -= bendDrive * 0.7 + Math.sin(visTime * 0.15) * 0.003;
    // Bass hits = the road bends harder
    if (hit > 0.06) {
      bendAngle1 += (Math.random() - 0.5) * 1.8;
      bendAngle2 += (Math.random() - 0.5) * 1.5;
    }
    // Vocal onset = new chapter, new direction
    if (vocalDelta > 0.03) {
      bendAngle1 += vocalDelta * 4;
      bendAngle2 -= vocalDelta * 3;
    }
    // Generous amplitude — the tunnel winds and sweeps
    var bendAmp = (0.5 + loudness * 0.8) * p.bendAmp;
    bendTX1 = Math.cos(bendAngle1) * bendAmp;
    bendTY1 = Math.sin(bendAngle1) * bendAmp * 0.85;
    bendTX2 = Math.cos(bendAngle2) * bendAmp * 1.0;
    bendTY2 = Math.sin(bendAngle2) * bendAmp * 0.7;
    // Chase: smooth enough for sweeps, responsive enough for drama
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

    // ── Feedback zoom — loudness drives the rush ──
    var feedbackZoom = 1.012 + loudness * 0.025 + hit * 0.06;
    if (isSilent) feedbackZoom = 1.004;
    if (reverseTimer > 0) feedbackZoom = 1 / (1.012 + loudness * 0.01);
    var zoomCx = w / 2 + chaseX * w * 0.15;
    var zoomCy = h / 2 + chaseY * h * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.78 - sTotal * 0.06;
    ctx.translate(zoomCx, zoomCy);
    ctx.rotate(flipAngle * 0.4);
    ctx.scale(feedbackZoom, feedbackZoom);
    ctx.translate(-zoomCx, -zoomCy);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    var isDark = document.documentElement.dataset.theme !== 'light';
    PALETTE = isDark ? PALETTE_DARK : PALETTE_LIGHT;
    var voidBg = isDark ? '0,0,0' : '240,235,225';
    // Uniform void fade
    ctx.fillStyle = 'rgba(' + voidBg + ', 0.14)';
    ctx.fillRect(0, 0, w, h);
    // Extra fade at zoom center
    var centerFadeR = Math.min(w, h) * 0.35;
    var centerFade = ctx.createRadialGradient(zoomCx, zoomCy, 0, zoomCx, zoomCy, centerFadeR);
    centerFade.addColorStop(0, 'rgba(' + voidBg + ', 0.12)');
    centerFade.addColorStop(0.4, 'rgba(' + voidBg + ', 0.04)');
    centerFade.addColorStop(1, 'rgba(' + voidBg + ', 0)');
    ctx.fillStyle = centerFade;
    ctx.fillRect(0, 0, w, h);

    visTime += 0.016;

    // Forward motion — loudness = gas pedal, silence = brakes
    var fwdSpeed = isSilent
      ? 0.003
      : 0.012 + loudness * 0.06 + hit * 0.3;
    hallZ += fwdSpeed * forwardDir;

    // Melody color — multi-feature spectral analysis drives palette position
    // Feature 1: spectral centroid (which frequencies dominate)
    var midStart = Math.floor(bufferLength * 0.02);
    var midEnd   = Math.floor(bufferLength * 0.75);
    var weightedSum = 0, weightTotal = 0;
    for (var mi = midStart; mi < midEnd; mi++) {
      var mw = freqData[mi] / 255;
      weightedSum += mi * mw;
      weightTotal += mw;
    }
    var centroid = weightTotal > 0.1 ? (weightedSum / weightTotal) : midStart;
    var normCentroid = (centroid - midStart) / (midEnd - midStart);
    // Cube root spread — maps the typical 0.2-0.4 centroid range across more palette
    normCentroid = Math.pow(normCentroid, 0.33);

    // Feature 2: spectral flux (how much the spectrum is changing — movement = color shift)
    var flux = Math.abs(midDelta) + Math.abs(highDelta) * 1.5;

    // Feature 3: slow drift — time-based wander so sustained passages still move
    var drift = Math.sin(visTime * 0.12) * 0.15 + Math.sin(visTime * 0.07) * 0.1;

    // Feature 4: energy ratio — treble-dominant moments push cool, bass pushes warm
    var energyRatio = sHigh > 0.01 ? (sHigh / (sBass + 0.01)) : 0;
    var ratioShift = Math.min(0.2, energyRatio * 0.15);

    // Combine: centroid is base position, flux adds jitter, drift adds wander
    var rawMelodyColor = normCentroid + drift + flux * 0.3 + ratioShift;
    rawMelodyColor = ((rawMelodyColor % 1) + 1) % 1; // wrap around palette

    // Smooth — fast enough to react, slow enough to feel like mood
    var melodyLag = weightTotal > 2 ? 0.05 : 0.015;
    melodyColorSmooth += (rawMelodyColor - melodyColorSmooth) * melodyLag;
    // Allow wrapping — if smooth is at 0.9 and target is 0.1, go through 1.0
    var diff = rawMelodyColor - melodyColorSmooth;
    if (diff > 0.5) melodyColorSmooth += 1;
    else if (diff < -0.5) melodyColorSmooth -= 1;
    melodyColorSmooth = ((melodyColorSmooth % 1) + 1) % 1;
    melodyColor = melodyColorSmooth;

    // Continuous palette position — spectral centroid sweeps full gradient
    var palPos = melodyColor * PALETTE.length;
    palIdx = Math.floor(palPos) % PALETTE.length;
    palBlend = palPos % 1;
    var colA = PALETTE[palIdx];
    var colB = PALETTE[(palIdx + 1) % PALETTE.length];
    // expose live color for desk-scene vault sync
    window.__musicColor = lerpColor(colA, colB, palBlend);
    window.__musicEnergy = flashEnergy;
    window.__musicBass = sBass;

    // Flash energy — spikes on hit, drives intensity (percussion layer on top)
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
    // OPTICAL ILLUSION: chromatic depth — warm near, cool far
    // Human eye focuses red wavelengths in front of blue — literally looks closer
    var warmCol = isDark ? '#e8a060' : '#a05828'; // warm amber/orange
    var coolCol = isDark ? '#6868d0' : '#3838a0'; // cool blue/violet
    var rectCount = 28;
    for (var ri = 0; ri < rectCount; ri++) {
      var zRaw = ((ri / rectCount) + hallZ) % 1;
      var z = Math.pow(zRaw, 2.2); // softer than cubic — far rects spread out more
      if (z < 0.001) continue;

      var scale = z;
      var rectW = w * scale;
      var rectH = h * scale;

      var parallax = z * z;
      var rectCx = vpx + (w / 2 - vpx) * parallax;
      var rectCy = vpy + (h / 2 - vpy) * parallax;
      var b1 = Math.sin(z * Math.PI * 1.2);
      var b2 = Math.sin((z - 0.3) * Math.PI * 1.1);
      rectCx += (bendX1 * b1 + bendX2 * b2) * w * 0.25;
      rectCy += (bendY1 * b1 + bendY2 * b2) * h * 0.2;
      var rx = rectCx - rectW / 2;
      var ry = rectCy - rectH / 2;

      var freqIdx = Math.floor(z * bufferLength) % bufferLength;
      var fv = freqData[freqIdx] / 255;
      var warp = fv * scale * 8;

      // Light sweep
      var sweepPos = (visTime * 0.4 + sBass * 0.3) % 1;
      var sweepDist = Math.abs(zRaw - sweepPos);
      if (sweepDist > 0.5) sweepDist = 1 - sweepDist;
      var sweepBoost = Math.max(0, 1 - sweepDist * 8) * (0.4 + sTotal * 0.3);

      // Color — chromatic depth blended into base (single stroke, not stacked)
      var rectAlpha = (0.1 + fv * 0.2 + sweepBoost * 0.4 + flashEnergy * 0.2) * (0.3 + z * 0.7);
      var colT = (z + palBlend) % 1;
      // Blend palette with subtle warm/cool shift — near=warm, far=cool
      var chromaT = Math.max(0, Math.min(1, (z - 0.15) / 0.6));
      var depthCol = lerpColor(coolCol, warmCol, chromaT);
      // Mix depth tint into palette color (~30% depth, 70% palette)
      var mixCol = lerpColorA(depthCol, lerpColor(colA, colB, colT), 0.7, Math.min(rectAlpha, 0.55));

      ctx.lineWidth = 0.6 + z * 2 + fv * 0.8 + sweepBoost + flashEnergy;

      // Draw warped rectangle — single stroke
      ctx.beginPath();
      ctx.moveTo(rx - warp, ry - warp);
      ctx.lineTo(rx + rectW + warp, ry - warp * 0.7);
      ctx.lineTo(rx + rectW + warp * 0.7, ry + rectH + warp);
      ctx.lineTo(rx - warp * 0.7, ry + rectH + warp * 0.7);
      ctx.closePath();
      ctx.strokeStyle = mixCol;
      ctx.stroke();

      // Subtle bass pulse on near rects only
      if (z > 0.6 && sBass > 0.4) {
        var pulseAlpha = (z - 0.6) * sBass * 0.08;
        ctx.strokeStyle = lerpColorA(warmCol, '#ffffff', 0.5, pulseAlpha);
        ctx.lineWidth += sBass * z;
        ctx.stroke();
      }

      // Glow on close / loud rects
      if (z > 0.4 && flashEnergy > 0.3) {
        ctx.strokeStyle = lerpColorA(colA, colB, colT, flashEnergy * 0.1);
        ctx.lineWidth = 2 + z * 3 + flashEnergy * 4;
        ctx.stroke();
      }
    }

    // ═══ LAYER 2: VERTICAL COLUMNS — pillars passing by ═══
    var colCount = 6;
    for (var ci = 0; ci < colCount; ci++) {
      var cz = ((ci / colCount) + hallZ * 1.3) % 1;
      cz = cz * cz;
      if (cz < 0.08) continue; // skip near-VP columns — they smear into a blob

      var cScale = cz;
      var cParallax = cz * cz;
      var colCx = vpx + (w / 2 - vpx) * cParallax;
      var colCy = vpy + (h / 2 - vpy) * cParallax;
      var cb1 = Math.sin(cz * Math.PI * 1.2);
      var cb2 = Math.sin((cz - 0.3) * Math.PI * 1.1);
      colCx += (bendX1 * cb1 + bendX2 * cb2) * w * 0.25;
      colCy += (bendY1 * cb1 + bendY2 * cb2) * h * 0.2;
      var spread = w * cScale * 0.55;

      var freqIdx = Math.floor(cz * bufferLength) % bufferLength;
      var cfv = freqData[freqIdx] / 255;
      // Fade with depth squared — no brightness accumulation near center
      var colAlpha = (0.1 + cfv * 0.3) * cz * cz;
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

    }

    // ═══ LAYER 2b: WALL ARCHITECTURE — doors, windows, frames, shelves ═══
    for (var oi = 0; oi < wallObjCount; oi++) {
      var obj = wallObjects[oi];
      // Depth cycles like hall rects
      var ozRaw = (obj.depth + hallZ * 0.9) % 1;
      var oz = ozRaw * ozRaw * ozRaw;
      if (oz < 0.01 || oz > 0.85) continue; // skip too far or too near

      // Scale: smaller so they don't dominate
      var oScale = oz * 1.8 + 0.1;
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

      // Very subtle — background texture, not foreground objects
      var oAlpha = (0.06 + oz * 0.2) * (0.3 + sTotal * 0.15);
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
    var screenCorners = [[0, 0], [w, 0], [w, h], [0, h]];

    // ── Helper: trace rect corner/edge position at depth t ──
    // Uses EXACT same math as hall rects: cubic z, quadratic parallax, S-curve bends
    // cornerSx/Sy: -1 or 1 for corner direction from center, or fractional for wall seams
    function hallPos(t, cornerSx, cornerSy) {
      var z = t * t * t; // cubic ease — same as rects
      if (z < 0.001) return [vpx, vpy];
      var scale = z;
      var parallax = z * z;
      // Center — same as rectCx/rectCy
      var cx = vpx + (w / 2 - vpx) * parallax;
      var cy = vpy + (h / 2 - vpy) * parallax;
      // Bend — same as rects
      var b1 = Math.sin(z * Math.PI * 1.2);
      var b2 = Math.sin((z - 0.3) * Math.PI * 1.1);
      cx += (bendX1 * b1 + bendX2 * b2) * w * 0.25;
      cy += (bendY1 * b1 + bendY2 * b2) * h * 0.2;
      // Corner offset from center — same as rectW/2, rectH/2
      return [cx + cornerSx * w * scale * 0.5, cy + cornerSy * h * scale * 0.5];
    }

    // ── WALL JOINT TICKS — short marks at rect corners, rush past like panel seams ──
    // Only near camera (z > 0.15). Bold when close, invisible when far.
    // Draws small perpendicular tick marks at each corner of the hall rects.
    var tickCount = 14;
    for (var ti = 0; ti < tickCount; ti++) {
      var tRaw = ((ti / tickCount) + hallZ * 1.1) % 1;
      var tz = tRaw * tRaw * tRaw;
      if (tz < 0.12 || tz > 0.95) continue; // skip near-VP and off-screen

      var tScale = tz;
      var tParallax = tz * tz;
      var tcx = vpx + (w / 2 - vpx) * tParallax;
      var tcy = vpy + (h / 2 - vpy) * tParallax;
      var tb1 = Math.sin(tz * Math.PI * 1.2);
      var tb2 = Math.sin((tz - 0.3) * Math.PI * 1.1);
      tcx += (bendX1 * tb1 + bendX2 * tb2) * w * 0.25;
      tcy += (bendY1 * tb1 + bendY2 * tb2) * h * 0.2;

      var halfW = w * tScale * 0.5;
      var halfH = h * tScale * 0.5;
      // Alpha: strong near camera, fades with depth
      var tickAlpha = tz * tz * (0.3 + sTotal * 0.15);
      var tickLen = 4 + tz * 12; // longer ticks when closer
      var tColT = (tz + palBlend) % 1;
      ctx.strokeStyle = lerpColorA(colA, colB, tColT, Math.min(tickAlpha, 0.4));
      ctx.lineWidth = 0.5 + tz * 1.5;

      // 4 corners: short ticks along wall edges
      var corners = [
        [tcx - halfW, tcy - halfH, 1, 0,  0, 1],  // TL: tick right + down
        [tcx + halfW, tcy - halfH, -1, 0, 0, 1],  // TR: tick left + down
        [tcx + halfW, tcy + halfH, -1, 0, 0, -1], // BR: tick left + up
        [tcx - halfW, tcy + halfH, 1, 0,  0, -1], // BL: tick right + up
      ];
      for (var ci = 0; ci < 4; ci++) {
        var cc = corners[ci];
        // Horizontal tick along wall
        ctx.beginPath();
        ctx.moveTo(cc[0], cc[1]);
        ctx.lineTo(cc[0] + cc[2] * tickLen, cc[1]);
        ctx.stroke();
        // Vertical tick along wall
        ctx.beginPath();
        ctx.moveTo(cc[0], cc[1]);
        ctx.lineTo(cc[0], cc[1] + cc[3] * tickLen + cc[5] * tickLen);
        ctx.stroke();
      }
    }

    // ═══ CORNER AO — dark gradients where walls meet ═══
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (var ai = 0; ai < 4; ai++) {
      var sc = screenCorners[ai];
      var aoR = Math.max(w, h) * 0.35;
      var aoGrad = ctx.createRadialGradient(sc[0], sc[1], 0, sc[0], sc[1], aoR);
      var aoBase = isDark ? '0,0,0' : '80,70,55';
      aoGrad.addColorStop(0, 'rgba(' + aoBase + ',0.45)');
      aoGrad.addColorStop(0.25, 'rgba(' + aoBase + ',0.2)');
      aoGrad.addColorStop(0.5, 'rgba(' + aoBase + ',0.05)');
      aoGrad.addColorStop(1, 'rgba(' + aoBase + ',0)');
      ctx.fillStyle = aoGrad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // ═══ LAYER 5: FLOOR GRID — more lines = stronger perspective ═══
    var gridLines = 14;
    for (var gi = 0; gi < gridLines; gi++) {
      var gz = ((gi / gridLines) + hallZ * 1.5) % 1;
      gz = gz * gz;
      if (gz < 0.06) continue;

      var gScale = gz;
      var gParallax = gz * gz;
      var gridCx = vpx + (w / 2 - vpx) * gParallax;
      var gridCy = vpy + (h / 2 - vpy) * gParallax;
      var gb1 = Math.sin(gz * Math.PI * 1.2);
      var gb2 = Math.sin((gz - 0.3) * Math.PI * 1.1);
      gridCx += (bendX1 * gb1 + bendX2 * gb2) * w * 0.25;
      gridCy += (bendY1 * gb1 + bendY2 * gb2) * h * 0.2;
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

    // ═══ SPEED LINES — radial streaks from edges toward VP on loud moments ═══
    // Anime/manga speed effect — screams "forward motion"
    if (loudness > 0.25) {
      var slCount = 12 + Math.floor(loudness * 16);
      var slAlphaBase = (loudness - 0.25) * 0.6;
      for (var sl = 0; sl < slCount; sl++) {
        // Random angle around perimeter
        var slAngle = (sl / slCount) * Math.PI * 2 + visTime * 0.3;
        // Start at screen edge
        var edgeR = Math.max(w, h) * 0.7;
        var sx = vpx + Math.cos(slAngle) * edgeR;
        var sy = vpy + Math.sin(slAngle) * edgeR;
        // End partway toward VP — longer when louder
        var slLen = 0.3 + loudness * 0.4 + hit * 0.2;
        var ex = sx + (vpx - sx) * slLen;
        var ey = sy + (vpy - sy) * slLen;
        // Vary alpha per line
        var slA = slAlphaBase * (0.3 + 0.7 * Math.abs(Math.sin(sl * 7.3 + visTime)));
        var slCol = isDark ? '255,255,255' : '40,30,15';
        ctx.strokeStyle = 'rgba(' + slCol + ',' + slA + ')';
        ctx.lineWidth = 0.3 + loudness * 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }

    // ═══ TUNNEL VIGNETTE — dark edges in dark mode, white edges in light ═══
    var vigR = Math.max(w, h) * 0.75;
    var vigGrad = ctx.createRadialGradient(vpx, vpy, vigR * 0.3, vpx, vpy, vigR);
    var vigCol = isDark ? '0,0,0' : '244,239,230';
    vigGrad.addColorStop(0, 'rgba(' + vigCol + ',0)');
    vigGrad.addColorStop(0.6, 'rgba(' + vigCol + ',0)');
    vigGrad.addColorStop(0.85, 'rgba(' + vigCol + ',' + (0.15 + loudness * 0.1) + ')');
    vigGrad.addColorStop(1, 'rgba(' + vigCol + ',' + (0.35 + loudness * 0.15) + ')');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

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
        var stockIsDark = document.documentElement.dataset.theme !== 'light';
        var color = pct >= 0 ? (stockIsDark ? 'rgba(100,220,120,0.6)' : 'rgba(30,140,60,0.8)') : (stockIsDark ? 'rgba(220,100,100,0.6)' : 'rgba(180,50,50,0.8)');
        var priceColor = stockIsDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
        var html = '<span style="opacity:0.4">BTC</span> ' +
          '<span style="color:' + priceColor + '">$' + price.toLocaleString() + '</span> ' +
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

  // ── Spotify integration ────────────────────────────────────
  var spConnectBtn = panel.querySelector('#sp-connect-btn');
  var spSearchWrap = panel.querySelector('#sp-search-wrap');
  var spSearchInput = panel.querySelector('#sp-search');
  var spResults = panel.querySelector('#sp-results');
  var spStatus = panel.querySelector('#sp-status');
  var activeBeatChart = null;
  var spotifyPlayer = null;

  function spSetStatus(msg) {
    if (spStatus) spStatus.textContent = msg;
  }

  function initSpotify() {
    if (!window.SpotifyBridge) return;
    var sp = window.SpotifyBridge;

    if (sp.isLoggedIn()) {
      spConnectBtn.textContent = 'spotify connected';
      spConnectBtn.style.borderColor = 'rgba(30,215,96,0.7)';
      spSearchWrap.style.display = 'block';
      initSpotifyPlayer();
    } else {
      spConnectBtn.addEventListener('click', function () { sp.login(); });
    }
  }

  function initSpotifyPlayer() {
    var sp = window.SpotifyBridge;
    sp.initPlayer({
      onReady: function (deviceId) {
        spSetStatus('player ready');
      },
      onStateChange: function (state) {
        if (!state) return;
        var track = state.track_window && state.track_window.current_track;
        if (!track) return;
        var position = state.position / 1000; // ms to seconds
        // Update beat chart position
        if (activeBeatChart) {
          window.__spPosition = position;
        }
        // Load analysis when track changes
        if (!window.__spCurrentId || window.__spCurrentId !== track.id) {
          window.__spCurrentId = track.id;
          spSetStatus('analyzing ' + track.name + '...');
          sp.getAudioAnalysis(track.id).then(function (analysis) {
            activeBeatChart = sp.buildBeatChart(analysis);
            spSetStatus(track.name);
          });
        }
      },
    });
  }

  // Expose beat chart to visualizer via global
  window.__getSpBeatChart = function () { return activeBeatChart; };
  window.__getSpPosition = function () { return window.__spPosition || 0; };

  // Search
  var searchTimer = null;
  if (spSearchInput) {
    spSearchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var q = spSearchInput.value.trim();
      if (q.length < 2) { spResults.innerHTML = ''; return; }
      searchTimer = setTimeout(function () {
        window.SpotifyBridge && window.SpotifyBridge.search(q).then(function (data) {
          if (!data || !data.tracks) return;
          spResults.innerHTML = '';
          data.tracks.items.forEach(function (track) {
            var div = document.createElement('div');
            div.className = 'sp-result';
            div.innerHTML = '<div class="sp-r-title">' + track.name + '</div>' +
              '<div class="sp-r-artist">' + (track.artists[0] ? track.artists[0].name : '') + '</div>';
            div.addEventListener('click', function () {
              window.SpotifyBridge.playTrack(track.uri);
              spResults.innerHTML = '';
              spSearchInput.value = '';
              spSetStatus('loading ' + track.name + '...');
            });
            spResults.appendChild(div);
          });
        });
      }, 400);
    });
  }

  // Init after spotify.js loads
  if (window.SpotifyBridge) {
    initSpotify();
  } else {
    window.addEventListener('load', function () {
      setTimeout(initSpotify, 500);
    });
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
