---
title: "Distillery"
tagline: "Share a URL from your phone. Your Mac distills it through your intellectual identity."
status: "active"
stack: ["Python", "Flask", "Ollama", "yt-dlp", "SQLite", "iOS Shortcuts", "Tailscale"]
order: 4
---

## Goals

Process the external content firehose through a personal intellectual lens at compute scale. Share a TikTok, an arXiv paper, an article — from your phone, anywhere — and your Mac extracts the content, runs it through a local LLM loaded with your principles and active projects, and stores what matters.

No cloud. No API calls for the distillation. Ollama runs locally. The lens is your own recorded identity — principles, projects, accumulated thinking from ForgeFrame memory. The system tells you what's relevant to what you're building and why.

## Process

The pipeline:

1. **iOS Shortcut**: Share sheet sends URL to Mac via Tailscale (works from anywhere, not just home WiFi)
2. **Extractor**: yt-dlp for video transcripts, trafilatura for web articles, arXiv API for papers. No video files saved — transcript only.
3. **Lens builder**: Loads your constitutional principles, searches ForgeFrame memory for context relevant to this specific content, scans active repos
4. **Distillation**: Ollama (qwen3:32b) processes through the lens. Returns: resonance score (0-1), reframed insight in your voice, connections to your projects, and an honest action surface assessment.
5. **Storage**: SQLite. Searchable. Filterable by resonance, status, source type.
6. **Web UI**: Dark theme, resonance bars, connection tags. Search, delete, re-distill with updated lens.

Always-on via launchd. Server and worker auto-start on login, restart on crash.

## Limitations

- Video extraction depends on yt-dlp supporting the platform. TikTok and YouTube work. Some platforms don't expose transcripts.
- The lens is only as good as your ForgeFrame memory. Early on, with few memories, the distillation is generic. It sharpens as your memory accumulates.
- Single-user by design. The constitutional lens is personal. Multi-user would require separate lens configs.
- Ollama inference on a 32B model takes 30-60 seconds per distillation. Not instant.

## Learnings

The distillery taught me that the value isn't in the content — it's in the filter. Everyone has the same firehose. The difference is what you keep and why. A system that filters through your recorded principles produces output that's useful in a way no generic summarizer can match. The lens is the product, not the pipeline.
