---
title: "StrudelVision"
tagline: "A Saturday night that kept going. Music visualizer with four WebGL shader modes, a Strudel REPL, a synth pad, a DJ mixer, and a TouchDesigner bridge — all in one index.html. Kinda works."
status: "active"
stack: ["WebGL2", "Canvas2D", "Web Audio API", "Strudel", "Ollama", "Web Speech API", "WebSocket", "Vanilla JS"]
image: "/images/projects/strudelvision.jpg"
demo: "http://127.0.0.1:8888"
hidden_demo: true
order: 5
---

## What happened

Saw the tunnel on this site reacting to music. Wanted more of that. Added a second shader. Then a third. Then a synth pad because it seemed reasonable at the time. Then a DJ mixer. Then TouchDesigner because the WebSocket was right there.

It runs at `localhost:8888`. It only runs on my laptop. Nobody asked for it.

The design direction was "Teenage Engineering meets MCM brutalist meets retro DJ bar." The reality is more like a late night with too many browser tabs open and the fans going.

## What it does (mostly)

Four visual modes:
1. **Thermal fractal** — Julia set, heat map, cycles through presets when the math goes bad
2. **Cyber flow** — domain-warped noise, neon grid, looks cooler than it sounds
3. **Prismatic feedback** — rainbow trails, hue matrix, the most chaotic one
4. **Infinite hall** — Canvas2D feedback zoom, borrowed from this site's tunnel, not actually GLSL

Audio analysis drives all of it: spectral centroid steers color, flux drives intensity, hit accumulation gates cuts. There's also a kinetic text engine, speech-to-text lyrics, an AI chat panel that tells Ollama to edit shader parameters in natural language, and a WebSocket that exports state to TouchDesigner.

Zero build system. Single `index.html`. `python3 -m http.server 8888`.

## What doesn't work

- Runs the laptop fans at full speed. That's the vibe now.
- Hall mode can't composite with the shader pipeline. It's a separate renderer and there's no fixing that without rewriting everything. Not rewriting everything.
- The synth pad records layers but there's no way to delete a layer. Bug. Also kind of a feature.
- TouchDesigner is a completely different discipline and it shows. The bridge is one-way. That's fine.
- Ollama has to be running locally for the AI chat. Most people don't have Ollama running locally.
- CSS animation is genuinely harder than writing WebGL shaders, which says something about CSS.

Nobody else uses this. That's fine. It's for the Saturday nights.
