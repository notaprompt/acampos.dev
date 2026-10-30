---
title: "ForgeFrame"
tagline: "Persistent memory for agents, with local storage, retrieval, and a record of where context came from."
status: "active"
stack: ["TypeScript", "Node.js", "MCP Protocol", "SQLite", "FTS5", "Ollama", "WebGL2"]
repo: "https://www.npmjs.com/package/@forgeframe/server"
updated: 2026-08-08
order: 2
screenshots: []
---

An agent that loses context between sessions makes the user repeat the work of explaining a project. Saving every conversation helps with recall, but creates another problem: old assumptions and incidental details can crowd out what still matters.

ForgeFrame is my attempt to make that context manageable. It stores memories locally, records their sources, and retrieves them through an MCP server. It is the memory layer behind [CREATURE](/projects/creature) and [Distillery](/projects/distillery), so I encounter its tradeoffs in daily use.

## The design

SQLite and full-text search provide a small, inspectable base. Local embeddings add semantic retrieval, with keyword search as a fallback. The memory server is available as [@forgeframe/server](https://www.npmjs.com/package/@forgeframe/server).

Memories lose strength over time and strengthen when retrieved. Related memories gain a connection when recalled together. Principles and voice references are exempt from decay. This gives the system a way to distinguish durable instructions from context that may have stopped being useful.

Scheduled maintenance proposes duplicates to merge, weakens unused connections, and looks for tensions between stored ideas. Some of those proposals need a person's judgment. Repeated retrieval can reinforce a mistaken belief just as easily as a useful one, so reinforcement is a mechanism to inspect, not a measure of truth.

The packages separate memory storage, model routing, the MCP server, and a local proxy. Memory and server packages use MIT licenses; core and proxy use AGPL. That keeps the basic storage interface reusable while putting different terms around the orchestration layer.

## What running it has taught me

Session hooks record context from coding work, and Distillery writes selected reading back through the same interface. Those integrations test whether the memory layer is useful outside its own UI. They also expose the less visible work: provenance, source weighting, session lifecycle, and recovery when a local model is unavailable.

I built a graph interface for inspecting connections and reviewing consolidation output. The graph helps me inspect the stored relationships; it does not establish whether retrieval is good.

## Where it stands

The memory server is published on npm and used by the other systems on this machine. Development continues around retrieval quality, consolidation, and the interfaces for reviewing what has been stored.

The main unanswered question is whether decay and reinforcement improve retrieval over time. Daily use exposes failures, but I still need a repeatable evaluation that distinguishes useful recall from frequently repeated context. Sensitive context also needs careful handling when downstream agents retrieve it.
