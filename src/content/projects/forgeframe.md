---
title: "ForgeFrame"
tagline: "Open-source memory for AI agents. Memories decay over time. Principles don't. You decide which is which."
status: "active"
stack: ["TypeScript", "Node.js", "MCP Protocol", "SQLite", "FTS5", "Ollama", "WebGL2"]
repo: "https://github.com/notaprompt/forgeframe"
order: 2
---

## Goals

AI agents forget everything between sessions. ForgeFrame gives them persistent memory - what gets used strengthens, what gets ignored decays, and some things are constitutional and never change. Four packages: `@forgeframe/memory` (MIT), `@forgeframe/core` (AGPL), `@forgeframe/server` (MIT), and `@forgeframe/proxy` (AGPL).

```
L4  ForgeFrame Proxy (scrub, inject, log)   AGPL
L3  ForgeFrame Core (routing, sessions)     AGPL
L2  MCP Memory Server (the primitive)       MIT
L1  MCP Protocol (Anthropic's standard)     OPEN
```

## Process

**Memory engine.** SQLite + FTS5. Strength decay with 7-day half-life and a 0.1 floor. Retrieval reconsolidates - accessing a memory reinforces it. Ollama-backed semantic search with keyword fallback. Constitutional exemption: `principle` and `voice` tagged memories never decay, never consolidate, never weaken.

**Hebbian learning.** Co-retrieval strengthening (LTP) and depression (LTD). Edge weight management, refractory periods, pruning below 0.05. Memories that fire together, wire together. Memories that don't, fade.

**Dream engine.** NREM and REM cycles that run when the system is idle.

NREM (compression, runs at sleep pressure ≥ 20):
1. Hebbian LTD maintenance - weakens unused edges, prunes below threshold
2. Strength decay pass
3. Cluster scan + dedup proposals
4. Valence backfill - reclassifies memories saved without emotional tagging
5. Source calibration - survival rates per organ (Distillery, Hermes)
6. Silence detection - tag domains that went quiet
7. Drift detection - which belief clusters are strengthening vs weakening

REM (recombination, runs at sleep pressure ≥ 50):
1. Dream seeding - pairs memories from disconnected graph regions for founder grading
2. Hindsight review - audits entrenched beliefs with charged-valence scrutiny
3. Tension detection - surfaces productive friction without resolving it
4. Dream journal - narrative synthesis of the full cycle

Constitutional protection at every gate. 16 invariants enforced in code.

**Emotional valence.** Three states: charged (emotional weight), neutral (factual), grounding (identity). Assigned at save time via local model. Propagates through consolidation priority, Hebbian LTP multiplier, hindsight scrutiny, and dream seeding preference.

**Guardian temperature.** Seven-signal composite: revisit-without-action, time-since-artifact, contradiction density, orphan ratio, decay velocity, recursion depth, Hebbian imbalance. Three states: calm, warm, trapped. Modulates learning rate and dream eligibility.

**Routing.** Tier-based model dispatch. Provider adapters for Anthropic, OpenAI-compatible, and Ollama. Pure TypeScript, dependency injection throughout.

**Proxy.** Localhost proxy for conversation intercept. Scrubs PII before anything reaches a cloud model, rehydrates on the way back. Three tiers: regex, dictionary, local LLM. 101 tests.

**Source connectors.** Multi-directory ingestion with per-source strength weighting and tag control.

**Session management.** Full session lifecycle - start, track, end, query. Provenance logging for every memory operation.

**Forge Cockpit.** Terminal workspace manager built on Zellij. Named tabs, session persistence, tab-level context for every running agent.

**Cockpit UI.** 3,566-line single-file vanilla JS + WebGL2 + Cytoscape.js application. Compound node graph with tag-based clustering, semantic zoom, and nodes colored by TRIM tag. Signal overlay with dream journal, founder grading (real/meh/nothing), productive tensions, hindsight review, graph health, source calibration bars. Sonar waveform in the status bar encodes Guardian state, sleep pressure, urgency, and polarity. Five themes (Olive Glass default), thermal shader background responds to Guardian temperature.

**Hermes integration.** Python MemoryProvider for the Hermes agent framework. Guardian tool exposing temperature as opaque state. Model routing config: Gemma local for triage, Sonnet for voice, Opus for deep.

**Swarm orchestration.** Multi-agent execution in isolated git worktrees with shared memory. Builder + skeptic pattern.

**Forge Agent.** Autonomous task execution with self-evaluation. Picks up tasks, executes in isolation, reviews its own output before reporting back.

## API surface

21 HTTP endpoints across 5 domains (Dream, Hermes, Guardian, Hebbian, Graph). 21 SSE event types for real-time observability. 20 MCP tools.

## In production

Running as the memory layer for everything else built on this machine. Every Claude Code session logs to it via a SessionEnd hook. Distillery pushes high-signal distillations back into it as memories with co-retrieval edges. It compounds.

## Limitations

- Proxy LLM tier not yet wired to Ollama - regex and dictionary tiers are active
- Forge Cockpit (Zellij) not yet wired to ForgeFrame directly
- Context menu, settings panel, inline memory editor, and artifact state machine UI are Wave B - not shipped
- Enterprise vertical configurations exist as domain knowledge, not shipped code
- AGPL core creates friction for some enterprise adopters. Intentional, but still friction

## Learnings

The Hebbian engine was the right abstraction. Once LTP/LTD was wired in, the dream system had something real to compress. The order mattered - building the learning substrate before the visualization meant the graph shows actual signal, not synthetic structure.

The strongest validation wasn't a test suite. It was running Distillery on top of it and having the signal gate work - filtering known content and surfacing genuinely new ideas - without touching the core engine at all. When another system uses your API and the right things happen, the abstraction is holding.
