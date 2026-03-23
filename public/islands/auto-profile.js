/**
 * Auto-profiler: analyzes audio to generate visualizer profile parameters.
 * Runs client-side using Web Audio API's OfflineAudioContext.
 *
 * Usage:
 *   window.__autoProfile('/audio/track.mp3').then(function(profile) { ... })
 */
(function () {
  'use strict';

  // Attempt to analyze the first 30 seconds of a track
  var ANALYZE_DURATION = 30;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  async function autoProfile(audioUrl) {
    // Fetch the audio file
    var response = await fetch(audioUrl);
    var arrayBuffer = await response.arrayBuffer();

    // Decode audio
    var ctx = new OfflineAudioContext(1, 44100 * ANALYZE_DURATION, 44100);
    var audioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      // If decode fails, return default
      return defaultProfile();
    }

    // Get raw PCM data (mono, first channel)
    var raw = audioBuffer.getChannelData(0);
    var sampleRate = audioBuffer.sampleRate;
    var samples = Math.min(raw.length, sampleRate * ANALYZE_DURATION);

    // ── Analysis passes ──

    // 1. Overall RMS (loudness)
    var rmsSum = 0;
    for (var i = 0; i < samples; i++) {
      rmsSum += raw[i] * raw[i];
    }
    var rms = Math.sqrt(rmsSum / samples);

    // 2. Peak amplitude
    var peak = 0;
    for (var i = 0; i < samples; i++) {
      var abs = Math.abs(raw[i]);
      if (abs > peak) peak = abs;
    }

    // 3. Dynamic range (crest factor: peak / rms)
    var crest = peak / (rms || 0.001);

    // 4. Bass energy (low-pass estimate: average absolute value of downsampled signal)
    // Simple: average every 100th sample (roughly 440Hz and below for 44.1kHz)
    var bassSum = 0;
    var bassCount = 0;
    var windowSize = 100;
    for (var i = 0; i < samples - windowSize; i += windowSize) {
      var blockSum = 0;
      for (var j = 0; j < windowSize; j++) {
        blockSum += raw[i + j];
      }
      bassSum += Math.abs(blockSum / windowSize);
      bassCount++;
    }
    var bassEnergy = bassSum / (bassCount || 1);

    // 5. Transient density (zero-crossing rate — higher = more high-freq content)
    var zeroCrossings = 0;
    for (var i = 1; i < samples; i++) {
      if ((raw[i] >= 0 && raw[i - 1] < 0) || (raw[i] < 0 && raw[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    var zcr = zeroCrossings / (samples / sampleRate); // crossings per second

    // 6. Transient sharpness (how many sudden jumps in energy)
    var frameSize = Math.floor(sampleRate * 0.02); // 20ms frames
    var frameCount = Math.floor(samples / frameSize);
    var frameEnergies = [];
    for (var f = 0; f < frameCount; f++) {
      var sum = 0;
      var offset = f * frameSize;
      for (var j = 0; j < frameSize; j++) {
        sum += raw[offset + j] * raw[offset + j];
      }
      frameEnergies.push(sum / frameSize);
    }

    // Count sharp transients (frame energy jumps > 3x previous)
    var sharpTransients = 0;
    for (var f = 1; f < frameEnergies.length; f++) {
      if (frameEnergies[f] > frameEnergies[f - 1] * 3 && frameEnergies[f] > 0.001) {
        sharpTransients++;
      }
    }
    var transientRate = sharpTransients / (samples / sampleRate); // per second

    // 7. Spectral tilt (ratio of low energy to high energy — rough brightness measure)
    var lowSum = 0, highSum = 0, lowCount = 0, highCount = 0;
    for (var i = 0; i < samples; i++) {
      if (i % 200 < 100) { lowSum += Math.abs(raw[i]); lowCount++; }
      else { highSum += Math.abs(raw[i]); highCount++; }
    }
    var spectralBalance = (highSum / (highCount || 1)) / ((lowSum / (lowCount || 1)) || 0.001);

    // ── Map to profile parameters ──

    // Normalize metrics to 0-1 range based on typical values
    var rmsNorm = clamp(rms / 0.15, 0, 1);           // 0=silent, 1=loud
    var bassNorm = clamp(bassEnergy / 0.05, 0, 1);    // 0=no bass, 1=heavy bass
    var zcrNorm = clamp(zcr / 3000, 0, 1);            // 0=bass-heavy, 1=treble-heavy
    var transientNorm = clamp(transientRate / 5, 0, 1); // 0=smooth, 1=percussive
    var crestNorm = clamp((crest - 2) / 8, 0, 1);     // 0=compressed, 1=dynamic

    // hitThresh: bass transient sensitivity
    // Loud/bassy tracks need higher threshold (less sensitive), quiet tracks need lower
    var hitThresh = lerp(0.02, 0.08, bassNorm * 0.7 + rmsNorm * 0.3);

    // bendAmp: how hard the camera turns
    // Dynamic, transient-rich tracks get harder turns
    var bendAmp = lerp(1.0, 1.8, transientNorm * 0.5 + crestNorm * 0.3 + (1 - rmsNorm) * 0.2);

    // steerSens: mid-frequency steering force
    // Bright, detailed tracks get more steering
    var steerSens = lerp(1.0, 2.5, zcrNorm * 0.4 + transientNorm * 0.3 + spectralBalance * 0.3);

    // midSnap: snare/attack response amplification
    // Percussive tracks with sharp transients get high snap
    var midSnap = lerp(1.0, 4.0, transientNorm * 0.6 + zcrNorm * 0.2 + crestNorm * 0.2);

    // flipThresh: hit accumulation before direction flip
    // Busy tracks need higher threshold (fewer flips), calm tracks can flip more
    var flipThresh = lerp(0.5, 0.6, rmsNorm * 0.4 + transientNorm * 0.3 + bassNorm * 0.3);

    // smoothing: analyser time constant
    // Calm/mellow tracks get high smoothing, busy/percussive get low
    var busyness = transientNorm * 0.4 + zcrNorm * 0.3 + (1 - crestNorm) * 0.3;
    var smoothing = lerp(0.8, 0.55, busyness);

    var profile = {
      hitThresh: Math.round(hitThresh * 100) / 100,
      bendAmp: Math.round(bendAmp * 10) / 10,
      steerSens: Math.round(steerSens * 10) / 10,
      midSnap: Math.round(midSnap * 10) / 10,
      flipThresh: Math.round(flipThresh * 100) / 100,
      smoothing: Math.round(smoothing * 100) / 100,
    };

    return profile;
  }

  function defaultProfile() {
    return {
      hitThresh: 0.04, bendAmp: 1.3, steerSens: 1.8,
      midSnap: 2.5, flipThresh: 0.55, smoothing: 0.65
    };
  }

  window.__autoProfile = autoProfile;
})();
