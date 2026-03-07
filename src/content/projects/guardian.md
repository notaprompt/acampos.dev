---
title: "Guardian"
tagline: "Desktop workspace that keeps your context local and your language yours"
status: "active"
stack: ["Electron 33", "React 18", "Node.js", "SQLite/FTS5", "Zustand", "xterm.js"]
image: "/images/projects/guardian.png"
repo: "https://github.com/notaprompt/guardian-ui-scaffold"
order: 1
---

## Goals

Desktop workspace where chat, terminal, notes, and memory live in one local-first interface. You pick the model, the data stays on your machine.

## Process

Started as an Electron shell with a chat window and a local Ollama connection. Built outward from there.

**Routing.** Provider-agnostic engine across Anthropic, OpenAI, and Ollama. Auto-selects by intent complexity and cost. Runs air-gapped on local models or through cloud APIs.

**Reframe detection.** Classifies when model responses subtly reshape user statements across 7 types. Triggers prompt correction when user-rated inaccuracy exceeds 40%.

**Memory.** 4-level compression pipeline (raw -> summary -> pattern -> principle). Strength decays over time, reinforces on retrieval.

**Post-session pipeline.** Fires on conversation end. Extracts decisions, tasks, and code artifacts. Generates typed notes. Indexes into FTS5 for search. Links entities into a knowledge graph.

## Limitations

- Reframe detection uses heuristic classification, not a trained model. False positive rate unmeasured.
- Memory compression thresholds are hand-tuned, not empirically optimized.
- No formal user study on reframe detection accuracy.

## Learnings

The hardest problems were state synchronization and process lifecycle management, not the models themselves.

Reframe detection surfaced a deeper problem: models subtly reshape your language over time. Detecting that requires understanding the user's baseline, which requires memory, which requires local persistence. That dependency chain is why ForgeFrame exists.
