---
title: "Guardian"
tagline: "An earlier desktop workspace whose memory engine became ForgeFrame."
status: "absorbed"
stack: ["Electron", "React", "Node.js", "SQLite/FTS5", "Zustand", "xterm.js"]
repo: "https://github.com/notaprompt/guardian-ui-scaffold"
order: 7
screenshots:
  - src: "/images/projects/guardian.png"
    caption: "The Electron workspace with terminal, chat, notes, and artifacts. This capture shows the layout, not evidence that its pattern detection was accurate."
---

Guardian started as a desktop interface for working with local models. It combined chat, a terminal, notes, and persistent context in one Electron application. As I used it, the memory and session-management work became more useful than the shell around it. I extracted that engine into [ForgeFrame](/projects/forgeframe) and stopped developing Guardian as a separate product.

## What I built

The application routed requests across Ollama and cloud providers, stored notes in SQLite, and processed completed sessions into decisions, tasks, and code artifacts. Notes supported sensitivity levels and encryption at rest, with an explicit lock and unlock cycle.

I also tried detecting two kinds of conversational drift: a model changing the meaning of a user's statement, and a topic recurring across sessions without reaching a decision. Those features used heuristic classifications and required context across conversations.

A JSON-RPC bridge connected Guardian to ForgeFrame's MCP memory server, and a migration path moved the shell's internal memory into the shared store. That transition exposed the difficult engineering: keeping state synchronized and managing processes when a session ends, a provider fails, or the desktop application restarts.

## What survived

Persistent memory, provenance, and the post-session pipeline continued in ForgeFrame. The desktop shell did not justify a second product once those capabilities were available separately. The [post-mortem](/misc/hall-of-shame#guardian) records that decision.

Reframe detection had no measured false-positive rate or formal user study. Compression thresholds were hand-tuned, and the encryption implementation was not independently audited. Those limitations remain part of the record; extracting the engine did not resolve them.
