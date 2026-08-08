---
title: "ForgeFrame"
tagline: "Open-source memory for agents. Memories decay over time. Principles don't. You decide which is which."
status: "active"
stack: ["TypeScript", "Node.js", "MCP Protocol", "SQLite", "FTS5", "Ollama", "WebGL2"]
repo: "https://github.com/notaprompt/forgeframe"
updated: 2026-08-08
order: 2
screenshots:
  - src: "/images/projects/forgeframe-door.jpg"
    caption: "the cockpit's front door - the graph behind it holds real memories, so it asks for a token"
metrics:
  - { label: "tests", value: "888 (884 passing)", asof: "Aug 2026", source: "test runner" }
  - { label: "packages", value: "4", asof: "Aug 2026" }
  - { label: "commits", value: "188 on main", asof: "Aug 2026" }
  - { label: "memories under management", value: "5,262", asof: "Aug 2026", source: "memory.db" }

---

Agents forget everything between sessions. ForgeFrame gives them persistent memory - what gets used strengthens, what gets ignored decays, and some things are principle-tier and never change. The memory never leaves the machine: sensitivity tiers gate every seam, and nothing marked sensitive is ever handed to a cloud model - not summarized, not embedded, not "anonymized." Local is the storage layer and the trust boundary. Four packages: `@forgeframe/memory` (MIT), `@forgeframe/core` (AGPL), `@forgeframe/server` (MIT), and `@forgeframe/proxy` (AGPL).

<!-- pulse:start -->
**Recent work** · week of 2026-08-07 · 14 commits across 22 files

Added a load ledger so every heavy tenant, models, training, swarm, leases, eyes, sits on one board with rule-named conflicts. The dream trigger got a refractory after a 60-second drain pushed 959 cycles past the daemon guard; journals are now the shared clock, and REM emits training pairs from the day's episodes. The state header now carries a typed situation line that classifies the present, and texted approvals now run instead of being narrated.

<sub>maintained weekly from the commit log</sub>
<!-- pulse:end -->

```
L4  ForgeFrame Proxy (scrub, inject, log)   AGPL
L3  ForgeFrame Core (routing, sessions)     AGPL
L2  MCP Memory Server (the primitive)       MIT
L1  MCP Protocol (Anthropic's standard)     OPEN
```

## How it works

**Memory engine.** SQLite + FTS5. Strength decay with 7-day half-life and a 0.1 floor. Retrieval reconsolidates - accessing a memory reinforces it. Ollama-backed semantic search with keyword fallback. Principle tier: `principle` and `voice` tagged memories are exempt from decay and consolidation - the non-decaying reference layer.

**Hebbian learning.** Co-retrieval strengthening (LTP) and depression (LTD). Edge weight management, refractory periods, pruning below 0.05. Co-activated memories strengthen; quiet edges fade.

**Consolidation engine.** Two scheduled cycles that run when the system is idle. The design converges on the biological compression/recombination pattern; I arrived at it from cognitive-ergonomic intuition rather than the neuroscience literature.

Compression cycle (runs at consolidation pressure ≥ 20):
1. Hebbian LTD maintenance - weakens unused edges, prunes below threshold
2. Strength decay pass
3. Cluster scan + dedup proposals
4. Valence backfill - reclassifies memories saved without attention-weighting
5. Source calibration - survival rates per source connector (Distillery, Hermes)
6. Silence detection - tags domains that went quiet
7. Drift detection - which belief clusters are strengthening vs weakening

Recombination cycle (runs at consolidation pressure ≥ 50):
1. Graph recombination - pairs memories from disconnected regions for user grading
2. Hindsight review - audits entrenched beliefs with charged-valence scrutiny
3. Tension detection - surfaces productive friction without resolving it
4. Consolidation summary - narrative synthesis of the full cycle

Invariant protection at every gate. 16 invariants enforced in code.

**Memory valence.** Three states: charged (high-signal, attention-weighted), neutral (factual), grounding (foundational). Assigned at save time via local model. Propagates through consolidation priority, Hebbian LTP multiplier, hindsight scrutiny, and recombination preference.

**Guardian state metric.** Seven-signal composite: revisit-without-action, time-since-artifact, contradiction density, orphan ratio, decay velocity, recursion depth, Hebbian imbalance. Three states: nominal, elevated, overloaded. Modulates learning rate and recombination eligibility.

**Routing.** Tier-based model dispatch. Provider adapters for Anthropic, OpenAI-compatible, and Ollama. Pure TypeScript, dependency injection throughout.

**Proxy.** Localhost proxy for conversation intercept. Scrubs PII before anything reaches a cloud model, rehydrates on the way back. Three tiers: regex, dictionary, local model.

**Source connectors.** Multi-directory ingestion with per-source strength weighting and tag control.

**Session management.** Full session lifecycle - start, track, end, query. Provenance logging for every memory operation.

**Forge Cockpit.** Terminal workspace manager built on Zellij. Named tabs, session persistence, tab-level context for every running agent.

**Cockpit UI.** 3,566-line single-file vanilla JS + WebGL2 + Cytoscape.js application. Compound node graph with tag-based clustering, semantic zoom, and nodes colored by TRIM tag. Signal overlay with consolidation summary, user grading (real/meh/nothing), productive tensions, hindsight review, graph health, source calibration bars. Sonar waveform in the status bar encodes Guardian state, consolidation pressure, urgency, and polarity. Five themes (Olive Glass default), thermal shader background responds to the Guardian state metric.

**Hermes integration.** Python MemoryProvider for the Hermes agent framework. Guardian tool exposing temperature as opaque state. Model routing config: Gemma local for triage, Sonnet for voice, Opus for deep.

**Swarm orchestration.** Multi-agent execution in isolated git worktrees with shared memory. Builder + skeptic pattern.

**Forge Agent.** Autonomous task execution with self-evaluation. Picks up tasks, executes in isolation, reviews its own output before reporting back.

The surface: 21 HTTP endpoints across 5 domains, 21 SSE event types, 20 MCP tools. In production it is the memory layer for everything else built on this machine - every Claude Code session logs to it via a SessionEnd hook, and Distillery pushes high-signal distillations back in with co-retrieval edges. It compounds.

## What I haven't solved

- Proxy LLM tier not yet wired to Ollama - regex and dictionary tiers are active
- Forge Cockpit (Zellij) not yet wired to ForgeFrame directly
- Context menu, settings panel, inline memory editor, and artifact state machine UI are Wave B - not shipped
- Enterprise vertical configurations exist as domain knowledge, not shipped code
- AGPL core creates friction for some enterprise adopters. Intentional, but still friction

## Where it's going

The Hebbian engine was the right abstraction. Once LTP/LTD was wired in, the consolidation pipeline had something real to compress. The order mattered - building the learning substrate before the visualization meant the graph shows actual signal, not synthetic structure.

The strongest validation wasn't a test suite. It was running Distillery on top of it and having the signal gate work - filtering known content and surfacing genuinely new ideas - without touching the core engine at all. When another system uses your API and the right things happen, the abstraction is holding.
