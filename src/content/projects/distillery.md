---
title: "Distillery"
tagline: "Share a link from your phone. Your laptop reads it through your own recorded principles and tells you what resonates."
status: "active"
stack: ["Python", "Flask", "Ollama", "yt-dlp", "SQLite", "iOS Shortcuts", "Tailscale"]
order: 4
---

## Goals

Process the external content firehose through a personal intellectual lens. Share a TikTok, an arXiv paper, an article from your phone - the Mac extracts the content, runs it through a local model loaded with your principles and active projects, scores it for novelty, and pushes what's genuinely new into ForgeFrame memory where it participates in dreaming and Hebbian learning.

The old version was a confirmation machine. 17 out of 20 distillations said "no change to build." The fix wasn't the pipeline - it was the lens orientation and adding a signal gate.

## Process

1. **iOS Shortcut**: Share sheet sends URL to Mac via Tailscale
2. **Extractor**: yt-dlp for video transcripts, trafilatura for articles, arXiv API for papers. No video files saved.
3. **Lens builder**: Searches ForgeFrame memory for context relevant to this specific content, loads constitutional principles, scans active repos. Constitution sits in the user prompt section - content gets a fair hearing before identity filtering.
4. **Distillation**: Ollama (qwen3:32b). Returns: resonance score (0-1), novelty score (0-1), reframed insight in your voice, connections to active projects, action surface assessment.
5. **Signal gate**: `signal = resonance × novelty`. Threshold 0.20. Known content filters out (TurboQuant seen before: resonance 0.95, novelty 0.15, signal 0.14 → filtered). Genuinely new ideas pass through (adversarial vision: resonance 0.72, novelty 0.88, signal 0.63 → pushed).
6. **ForgeFrame writeback**: High-signal items push to ForgeFrame as memories with tiered strength (0.4/0.55/0.7). Co-retrieval edges created immediately - the new memory participates in Hebbian LTP/LTD from the start.
7. **Temporal context**: Recent distillations injected into the prompt. Detects patterns across the feed ("you've shared 3 compression papers this week").
8. **Opus meta pass**: High-signal items get a deep reasoning pass from Claude. Sovereignty safe - cloud sees public content only, never ForgeFrame memory contents.
9. **Storage**: SQLite. Searchable, filterable by resonance, novelty, signal, status, source type.
10. **Web UI**: Dark theme, resonance/novelty bars, connection tags. Search, delete, re-distill with updated lens.

Always-on via launchd. Server and worker auto-start on login, restart on crash.

## In production

48 distillations total, 1 pushed to ForgeFrame so far. Average resonance 0.37, average novelty 0.52. The signal gate is working - most content is familiar. The one that made it through was genuinely new and is now in the graph.

## Limitations

- yt-dlp platform coverage gaps. TikTok and YouTube work. Some platforms don't expose transcripts.
- The lens sharpens with ForgeFrame memory accumulation. Early on with few memories, distillation is less specific.
- 30-60 second inference time on 32B model. Not instant.
- Single-user by design. The constitutional lens is personal.
- 45 backlog items distilled with the old lens - redistillation pending.

## Learnings

The problem wasn't extraction or inference speed. It was that the lens was narcissistic - it checked incoming content against the founder's identity first, and most things don't match perfectly. Moving the constitution to the user prompt and adding a novelty score changed what the system was actually doing: from "does this confirm who I am" to "is this something I haven't seen before."

The lens is the product, not the pipeline. Same data, same model, different frame - different outputs entirely.
