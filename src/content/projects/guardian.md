---
title: "Guardian"
tagline: "Cognitive desktop application — neuroprotective AI workspace"
status: "active"
stack: ["Electron 33", "React 18", "Node.js", "SQLite/FTS5", "Zustand", "xterm.js"]
repo: "https://github.com/notaprompt/guardian-ui-scaffold"
order: 1
---

## Goals

I wanted an AI workspace that worked for me, not on me. Every tool I tried was designed to send my context somewhere else. So I built one where I control every layer -- what model runs, what gets remembered, what gets forgotten, and what never leaves the machine.

## Process

Guardian started as a bare Electron shell with a chat window and a local Ollama connection. I was just trying to talk to a model without my data leaving the room.

The architecture grew outward from the user's position. 60+ IPC channels across 20 backend modules now connect the UI to a provider-agnostic routing engine that auto-selects models by intent complexity and cost. The routing layer supports Anthropic, OpenAI, and local Ollama providers simultaneously.

The reframe detection engine emerged from observing how model responses subtly reshape user statements. It classifies reframes across 7 types and triggers automatic prompt correction when user-rated inaccuracy exceeds 40%.

The memory system uses a 4-level hierarchical compression pipeline (raw -> summary -> pattern -> principle) with automatic threshold-triggered distillation. Strength decays at 0.97/day with retrieval reinforcement at +0.15 per access — an emergent forgetting curve that prioritizes frequently-accessed knowledge.

The post-session intelligence pipeline fires on conversation end: extracts decisions, tasks, code artifacts, and insights via LLM; auto-generates typed notes; indexes conversation chunks with semantic summaries into FTS5 for near-semantic search; links entities into a knowledge graph; and runs reframe detection — all without user intervention.

## Limitations

- The reframe detection engine uses heuristic classification, not a trained model. False positive rate is not formally measured.
- Memory compression thresholds are hand-tuned, not empirically optimized. The decay rate of 0.97/day is a plausible starting point, not a validated parameter.
- The codebase is 31,700 lines. Some modules carry technical debt from rapid prototyping phases.
- No formal user study has validated the neuroprotective claims. The safety layer is engineered intuition, not peer-reviewed evidence.

## Learnings

The hardest problems were not AI problems. They were state synchronization, process lifecycle management, and making 20 modules agree on what "the current conversation" means. Architectural boundaries are the product.

The reframe detection work changed how I think about AI safety entirely. The problem isn't that models lie. It's that they subtly reshape your language until you can't tell the difference between your thoughts and their suggestions. Detecting this requires understanding the user's baseline, which requires memory, which requires trust, which requires sovereignty. The problems are recursive. That recursion is why ForgeFrame exists.
