---
title: "StrudelVision"
tagline: "A browser instrument for live-coded music, audio-reactive visuals, and late-night experiments."
status: "parked"
stack: ["WebGL2", "Canvas2D", "Web Audio API", "Strudel", "Ollama", "Web Speech API", "WebSocket", "Vanilla JS"]
screenshots:
  - src: "/images/projects/strudelvision.jpg"
    caption: "A frame from the visualizer. Still images show the shader output; the audio response and transitions need a running session to judge."
  - src: "/images/projects/strudelvision-repl.jpg"
    caption: "The Strudel editor, synth pad, and local-model chat over the visual output. The chat can adjust shader parameters."
order: 6
---

This started on a Saturday night because I wanted more control over a music-reactive tunnel on this site. It grew into a browser instrument: a Strudel editor for live coding music, visual modes driven by audio analysis, a synth pad, and a DJ mixer.

It is a personal experiment, parked without an active roadmap. I still pick it up occasionally. The chat feature requires a local Ollama instance; there is no hosted demo.

## What it does

Three WebGL modes use fractals, warped noise, and color feedback. A fourth uses Canvas2D to create a feedback hall. Audio features steer color and intensity, while accumulated hits control cuts between scenes.

The local-model chat adjusts shader parameters from plain-language instructions. Speech recognition can supply text, and a one-way WebSocket bridge sends state to TouchDesigner. Everything lives in one HTML file, served locally without a build step.

Keeping the feedback loop short made it easy to try ideas during a set. It also made the architecture increasingly awkward as unrelated tools accumulated in the same file.

## Where it stops

GPU use is high. The Canvas2D hall cannot composite with the WebGL pipeline, recorded synth layers cannot be deleted, and the TouchDesigner bridge only sends data in one direction.

For now, it is a Saturday-night instrument and a place to try visual ideas. Finishing every feature would be a different project.
