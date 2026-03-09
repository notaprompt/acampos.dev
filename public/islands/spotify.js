/**
 * Spotify integration — PKCE OAuth, Web Playback SDK, audio analysis.
 * No client secret used. All auth via PKCE flow (client ID only).
 */

(function () {
  var CLIENT_ID = '117146db638c4bf6b0fdb5879ea50502';
  var REDIRECT_URI = window.location.origin;
  var SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
  ].join(' ');

  // ── PKCE helpers ──────────────────────────────────────────────

  function randomBytes(len) {
    var arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return arr;
  }

  function base64url(buf) {
    return btoa(String.fromCharCode.apply(null, buf))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function sha256(str) {
    var buf = new TextEncoder().encode(str);
    var hash = await crypto.subtle.digest('SHA-256', buf);
    return base64url(new Uint8Array(hash));
  }

  // ── Token storage ─────────────────────────────────────────────

  function saveToken(data) {
    data.expires_at = Date.now() + data.expires_in * 1000;
    localStorage.setItem('sp_token', JSON.stringify(data));
  }

  function getToken() {
    try {
      var t = JSON.parse(localStorage.getItem('sp_token'));
      if (t && t.expires_at > Date.now() + 60000) return t;
    } catch (e) {}
    return null;
  }

  function clearToken() {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_verifier');
  }

  // ── Auth flow ─────────────────────────────────────────────────

  async function login() {
    var verifier = base64url(randomBytes(32));
    var challenge = await sha256(verifier);
    localStorage.setItem('sp_verifier', verifier);

    var params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    window.location.href = 'https://accounts.spotify.com/authorize?' + params;
  }

  async function exchangeCode(code) {
    var verifier = localStorage.getItem('sp_verifier');
    if (!verifier) return null;

    var res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    });

    if (!res.ok) return null;
    var data = await res.json();
    saveToken(data);
    localStorage.removeItem('sp_verifier');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    return data.access_token;
  }

  async function refreshToken(refreshTok) {
    var res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshTok,
      }),
    });
    if (!res.ok) { clearToken(); return null; }
    var data = await res.json();
    if (!data.refresh_token) data.refresh_token = refreshTok;
    saveToken(data);
    return data.access_token;
  }

  async function getAccessToken() {
    var t = getToken();
    if (t) return t.access_token;
    // Try refresh
    try {
      var stored = JSON.parse(localStorage.getItem('sp_token'));
      if (stored && stored.refresh_token) return await refreshToken(stored.refresh_token);
    } catch (e) {}
    return null;
  }

  // ── API calls ─────────────────────────────────────────────────

  async function apiGet(path) {
    var token = await getAccessToken();
    if (!token) return null;
    var res = await fetch('https://api.spotify.com/v1' + path, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (res.status === 401) { clearToken(); return null; }
    if (!res.ok) return null;
    return res.json();
  }

  async function search(query, types) {
    return apiGet('/search?q=' + encodeURIComponent(query) + '&type=' + (types || 'track') + '&limit=10');
  }

  async function getAudioAnalysis(trackId) {
    return apiGet('/audio-analysis/' + trackId);
  }

  async function getAudioFeatures(trackId) {
    return apiGet('/audio-features/' + trackId);
  }

  async function getCurrentlyPlaying() {
    return apiGet('/me/player/currently-playing');
  }

  // ── Web Playback SDK ──────────────────────────────────────────

  var player = null;
  var deviceId = null;
  var onPlayerReady = null;
  var onStateChange = null;

  function loadSDK() {
    return new Promise(function (resolve) {
      if (window.Spotify) { resolve(); return; }
      window.onSpotifyWebPlaybackSDKReady = resolve;
      var s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      document.head.appendChild(s);
    });
  }

  async function initPlayer(callbacks) {
    onPlayerReady = callbacks.onReady;
    onStateChange = callbacks.onStateChange;

    var token = await getAccessToken();
    if (!token) return;

    await loadSDK();

    player = new window.Spotify.Player({
      name: 'acampos.dev',
      getOAuthToken: async function (cb) {
        cb(await getAccessToken());
      },
      volume: 0.8,
    });

    player.addListener('ready', function (e) {
      deviceId = e.device_id;
      if (onPlayerReady) onPlayerReady(deviceId);
    });

    player.addListener('player_state_changed', function (state) {
      if (onStateChange) onStateChange(state);
    });

    player.addListener('not_ready', function () { deviceId = null; });

    await player.connect();
  }

  async function playTrackOnDevice(trackUri) {
    var token = await getAccessToken();
    if (!token || !deviceId) return;
    await fetch('https://api.spotify.com/v1/me/player/play?device_id=' + deviceId, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [trackUri] }),
    });
  }

  // ── Beat chart — maps analysis to beat timestamps ─────────────

  function buildBeatChart(analysis) {
    if (!analysis) return null;
    return {
      beats: analysis.beats || [],
      bars: analysis.bars || [],
      sections: analysis.sections || [],
      segments: analysis.segments || [],
      tempo: analysis.track ? analysis.track.tempo : 120,
      // Get current beat index given playback position in seconds
      getBeat: function (t) {
        var b = this.beats;
        for (var i = 0; i < b.length - 1; i++) {
          if (t >= b[i].start && t < b[i + 1].start) return i;
        }
        return 0;
      },
      // 0-1 position within current beat
      getBeatPhase: function (t) {
        var b = this.beats;
        for (var i = 0; i < b.length; i++) {
          if (t >= b[i].start && t < b[i].start + b[i].duration) {
            return (t - b[i].start) / b[i].duration;
          }
        }
        return 0;
      },
      // Energy of current segment (loudness)
      getSegmentEnergy: function (t) {
        var s = this.segments;
        for (var i = 0; i < s.length; i++) {
          if (t >= s[i].start && t < s[i].start + s[i].duration) {
            // loudness_max in dB, normalize to 0-1 (typical range -60 to 0)
            return Math.max(0, (s[i].loudness_max + 60) / 60);
          }
        }
        return 0;
      },
      // Section index (verse, chorus, etc.)
      getSection: function (t) {
        var s = this.sections;
        for (var i = 0; i < s.length; i++) {
          if (t >= s[i].start && t < s[i].start + s[i].duration) return i;
        }
        return 0;
      },
    };
  }

  // ── Handle OAuth callback on page load ────────────────────────

  async function handleCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if (code) {
      await exchangeCode(code);
      return true;
    }
    return false;
  }

  // ── Public API ────────────────────────────────────────────────

  window.SpotifyBridge = {
    login: login,
    getAccessToken: getAccessToken,
    clearToken: clearToken,
    isLoggedIn: function () { return !!getToken(); },
    search: search,
    getAudioAnalysis: getAudioAnalysis,
    getAudioFeatures: getAudioFeatures,
    getCurrentlyPlaying: getCurrentlyPlaying,
    initPlayer: initPlayer,
    playTrack: playTrackOnDevice,
    buildBeatChart: buildBeatChart,
    getPlayer: function () { return player; },
    handleCallback: handleCallback,
  };

  // Handle OAuth redirect automatically
  handleCallback();
})();
