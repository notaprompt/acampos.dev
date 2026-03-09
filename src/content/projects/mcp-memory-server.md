---
title: "MCP Memory Server"
tagline: "The memory primitive — strength decay, retrieval reinforcement, local-first storage"
status: "active"
stack: ["TypeScript", "MCP Protocol", "SQLite", "MIT License"]
repo: "https://github.com/notaprompt"
order: 3
---

## Goals

Build the smallest useful memory primitive for AI systems and give it away. MIT license, one SQLite file you can move or delete. Memory should be a protocol-level capability, not something locked to a platform.

## Process

The MCP Memory Server implements the Model Context Protocol to expose memory as a tool that any MCP-compatible client can use. It stores memories with tags, metadata, and a strength value that decays over time.

The core mechanics:

- **Strength decay**: Each memory has a strength value between 0 and 1. Strength decays at a configurable rate (default 0.97/day). Memories that are never accessed fade naturally.
- **Retrieval reinforcement**: When a memory is retrieved, its strength increases by a configurable amount (default +0.15). Frequently-accessed memories persist. Rarely-accessed memories decay.
- **Semantic search**: Full-text search across memory content and tags. The query interface is simple — search by text, filter by tags, set a minimum strength threshold.

The result is an emergent forgetting curve. No explicit garbage collection. No manual curation. The system's memory landscape shapes itself around what is actually used.

Storage is SQLite — single-file, portable, zero-configuration. A memory server is a file you can move, back up, or delete. Local by default.

## Limitations

- Search is keyword-based (FTS5), not semantic embedding. True semantic similarity requires a vector store or embedding model, which adds complexity and dependencies that conflict with the "smallest useful primitive" goal.
- The decay model is simple exponential. Human memory consolidation is more complex (sleep-dependent, emotion-weighted, context-dependent). This is a useful approximation, not a faithful model.
- No built-in encryption. Sovereign storage means the user owns the file, but the file is plaintext SQLite. Encryption at rest is the user's responsibility.

## Learnings

The most important design decision was what to leave out. Every feature request -- vector embeddings, graph relationships, encryption, multi-user sync -- would have made it more capable and less useful as a primitive. A primitive that does one thing well gets composed into systems. A server that does everything gets replaced. I have to keep reminding myself of this.

MCP taught me the difference between tools and intercept. MCP is excellent for exposing capabilities. It is not designed for observing conversations. Both are necessary for local control, but they're different mechanisms. That distinction shaped all of ForgeFrame's architecture.
