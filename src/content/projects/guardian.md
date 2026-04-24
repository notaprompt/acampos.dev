---
title: "Guardian"
tagline: "Desktop control plane for local inference. Reframe detection, pattern tracking, encrypted notes. Built for environments where data stays on the machine."
status: "active"
stack: ["Electron", "React", "Node.js", "SQLite/FTS5", "Zustand", "xterm.js"]
image: "/images/projects/guardian.png"
repo: "https://github.com/notaprompt/guardian-ui-scaffold"
order: 3
---

## Goals

Guardian is ForgeFrame configured for end users instead of developers. Same engine - memory, decay, principle-tier tagging - with a desktop UI. Tracks how model responses shift over time and keeps sensitive data local.

## Process

Started as an Electron shell with a chat window and a local Ollama connection. Built outward from there.

**Routing.** Provider-agnostic engine across Anthropic, OpenAI, and Ollama. Auto-selects by intent complexity and cost. Runs air-gapped on local models or through cloud APIs.

**Reframe detection.** Classifies when model responses subtly reshape user statements across 7 types. Triggers prompt correction when user-rated inaccuracy exceeds 40%.

**Unresolved-pattern detection.** Separate from reframe detection -- identifies topics that recur across sessions without resolution. Schema, accessors, and pipeline integration wired into the post-session flow. Detects multi-session conversation patterns where the same topic returns without progress toward a decision or action.

**Memory.** 4-level compression pipeline (raw -> summary -> pattern -> principle). Strength decays over time, reinforces on retrieval.

**Sovereign encryption.** Notes support sensitivity levels and context gating. Encrypted at rest with IPC-based unlock/lock cycle. Private notes stay private -- they don't flow into cloud context even when cloud providers are active.

**ForgeFrame fusion.** JSON-RPC stdio client bridges Guardian to ForgeFrame's MCP memory server. Sessions sync bidirectionally. Data migration pipeline handles the transition from Guardian's internal SQLite to ForgeFrame's shared memory layer.

**Post-session pipeline.** Fires on conversation end. Extracts decisions, tasks, and code artifacts. Generates typed notes. Indexes into FTS5 for search. Links entities into a knowledge graph. Runs unresolved-pattern detection.

## Limitations

- Reframe detection uses heuristic classification, not a trained model. False positive rate unmeasured.
- Memory compression thresholds are hand-tuned, not empirically optimized.
- No formal user study on reframe detection or unresolved-pattern accuracy.
- Sovereign encryption is functional but not audited by a third party.

## Learnings

The hardest problems were state synchronization and process lifecycle management, not the models themselves.

Reframe detection surfaced a deeper problem: models subtly reshape your language over time. Detecting that requires understanding the user's baseline, which requires memory, which requires local persistence. That dependency chain is why ForgeFrame exists.

Unresolved-pattern detection surfaced something else: cross-session recurrence isn't visible within any single conversation - it's visible only across them. You need memory that spans sessions to see which topics return without progress.

Guardian is where the essay on observation and identity modeling came from. Everything I describe there — the loop, the reframe types, the four quadrants of who-sees-what — I found by building this and watching what happened.
