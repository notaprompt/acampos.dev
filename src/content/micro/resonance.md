---
title: "Resonance / Recursive Hall"
tagline: "Generative WebGL architecture — seeded procedural halls rendered as wireframe ink drawings"
status: "shipped"
stack: ["Three.js", "WebGL", "Custom GLSL Shaders", "Vanilla JS"]
demo: "/recursive-hall.html"
order: 2
---

## Goals

Build a single-file generative art system that renders infinite recursive halls as wireframe ink drawings. One HTML file. Zero build tools. The same seed always produces the same hall. Different seeds produce different spaces. "Visit seed 777" becomes a meaningful instruction.

## Process

Recursive Hall is a single HTML file (~4KB of code, excluding Three.js CDN). It renders corridors that recur inward at configurable depth and scale decay. Each corridor segment drifts laterally, creating the impression of a winding path through an impossible building.

The rendering pipeline:

1. **Seeded RNG**: A deterministic random number generator ensures reproducible generation. Seed 42 always produces the same hall.
2. **Recursive geometry**: Corridors are built as line segments (not polygons). Each recursion level shrinks by a configurable decay factor and shifts the corridor center, producing fractal-like depth.
3. **Custom shaders**: A vertex shader adds breathing wall displacement. A fragment shader applies depth-based color gradients (warm near, cool far) and temporal shimmer.
4. **Post-processing**: Bloom extraction, two-pass Gaussian blur, film grain (GPU noise), vignette, and color grading — all in custom shader passes. No post-processing libraries.
5. **Particles**: Floating motes drift through the corridors with fog-based distance fading and lifecycle management.
6. **Dual theme**: "Ink on Black" (dark, additive blending) and "Ink on Paper" (light, subtractive blending) with automatic color palette inversion.

Camera modes: free (WASD + mouse look), auto-fly (cinematic drift), orbit (external view).

## Limitations

- Single-file architecture means no modularity. Changes require understanding the entire file.
- Three.js r128 (CDN) is outdated. The project uses `PlaneBufferGeometry` which is deprecated in newer versions.
- No audio reactivity in the current version. The architecture supports it (shader uniforms are exposed) but no audio pipeline is connected.
- Performance degrades at depth > 7 on integrated GPUs due to line segment count.

## Learnings

The single-file constraint forced clarity. Every function earns its place or it doesn't exist.

Writing custom post-processing shaders instead of using a library taught me what bloom, grain, and vignette actually are at the math level. Film grain is not noise on a texture -- it's a hash function evaluated per-pixel per-frame. Vignette is not a CSS gradient -- it's an aspect-corrected distance field. Understanding the substrate changes how you see the surface. That idea ended up shaping the entire philosophy of this website.
