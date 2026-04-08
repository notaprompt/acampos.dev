---
title: "StrudelVision"
tagline: "Started as a Saturday night. Four WebGL shader modes driven by music, Strudel integration, natural-language shader control via Ollama, a synth pad, and a DJ mixer. Better for artisans than craftsmen."
status: "active"
stack: ["WebGL2", "Canvas2D", "Web Audio API", "Strudel", "Ollama", "Web Speech API", "WebSocket", "Vanilla JS"]
order: 6
---

## Goals

See the music. That was the whole brief.

Started with one shader and a visualizer ported from the devsite tunnel. Grew because each layer revealed something worth chasing: audio spectral analysis, then Strudel live coding beats, then speech-to-text lyrics synced to the visuals, then natural-language shader control via Ollama. TouchDesigner introduced OSC and a new constraint — exporting live browser state to a node-based compositor shows you exactly where the seams are between tools.

The design target: Teenage Engineering meets MCM brutalist meets 2030 retro-futuristic DJ jazz bar. Translucent terminal panels, pill buttons, thin weights, monospace for data.

## Architecture

Four visual modes:
1. **Thermal fractal** — Julia set with heat map palette, C parameter cycling through curated presets
2. **Cyber flow** — domain-warped fbm, neon grid overlay
3. **Prismatic feedback** — rainbow trails, hue rotation matrix
4. **Infinite hall** — Canvas2D feedback zoom (not GLSL — the feedback loop is the technique)

Each mode is audio-reactive via spectral analysis: centroid steers palette, flux drives intensity, vocal isolation triggers text events, hit accumulation gates visual cuts.

The rest of the stack:
- Library (12 tracks), YouTube embed, Strudel REPL, file drop, mic input
- Kinetic text engine with entrance animations and per-track lyric narrative
- AI chat panel (Ollama) — natural language edits shader parameters live without reloading
- TE-style synth pad: 4×4 grid, Web Audio synthesis, looping, recording layers
- DJ mixer: dual deck, equal-power crossfade
- TD bridge: WebSocket connection exports live state to TouchDesigner

Zero build system. Single `index.html`. `python3 -m http.server 8888`.

## Limitations

- Runs hot — render loop capped at 1.5× DPR on laptop hardware
- Hall mode (Canvas2D) can't composite with the shader pipeline — it's a separate renderer, not a GLSL layer
- Ollama must be running locally for AI chat; no graceful fallback
- TD bridge is currently one-way (browser → TD); full bidirectional control is unfinished
- CSS animation for the panel UI is genuinely harder than the shaders. TouchDesigner is a different discipline entirely — it rewards intuition, not correctness.

## Learnings

The artisan/craftsman distinction came from TouchDesigner. It produces better output from someone who thinks visually and intuitively than from someone optimizing for correctness. The same turned out to be true of the Julia set shader — when C drifts into an unstable region the fractal dies to black. The engineering fix would be to clamp the parameter. The actual fix was to curate a list of known-beautiful presets and cycle through them. Artisan instinct, not engineering control.

Zero dependencies was a constraint that shaped everything. No build step means no tree-shaking, no types, no module graph — and also no tooling tax, instant feedback, and a file that opens anywhere. The right choice for something built for feel.
