---
title: "ForgeFrame"
tagline: "Open-source memory for AI agents. Memories decay over time. Principles don't. You decide which is which."
status: "active"
stack: ["TypeScript", "Node.js", "MCP Protocol", "SQLite", "FTS5", "Ollama", "MIT/AGPL"]
repo: "https://github.com/notaprompt/ForgeFrame"
order: 3
---

## Goals

AI agents forget everything between sessions. ForgeFrame gives them persistent memory that works like yours does — what matters stays, what doesn't fades, and some things are constitutional and never decay. Extracted from Guardian into standalone infrastructure. Memory primitive is MIT. Core is AGPL.

## Process

Monorepo with four packages: `@forgeframe/memory` (MIT), `@forgeframe/core` (AGPL), `@forgeframe/server` (MIT), and `@forgeframe/proxy` (AGPL).

```
L4  ForgeFrame Proxy (scrub, inject, log)   AGPL
L3  ForgeFrame Core (routing, sessions)     AGPL
L2  MCP Memory Server (the primitive)       MIT
L1  MCP Protocol (Anthropic's standard)     OPEN
```

**Memory server.** SQLite + FTS5. Weighted retrieval with strength decay and retrieval reinforcement. Embedding support via Ollama for semantic search with keyword fallback. Implements MCP for compatibility with Claude Desktop, Cursor, and anything that speaks the protocol.

**Routing.** Tier-based model dispatch. Provider adapters for Anthropic, OpenAI, and Ollama. Pure TypeScript, dependency injection throughout.

**Proxy.** Localhost proxy for conversation intercept. Scrubs PII before anything reaches a cloud model, rehydrates on the way back. Requires a local model (Ollama) for full protection.

**Source connectors.** Multi-directory ingestion with per-source strength weighting and tag control. Point it at a folder, it indexes the contents into memory with configurable decay and categorization.

**Session management.** Full session lifecycle -- start, track, end, query. 12 MCP tools exposed. Provenance logging for every memory operation.

## In production

ForgeFrame is running in production right now — 295 memories across 88 sessions. The Distillery reads it for relevance scoring. The Business OS reads it for founder receipts and TODO tracking. Every Claude Code session logs to it automatically via a SessionEnd hook. It's not a demo — it's the memory layer for everything else I build.

## Limitations

- Proxy has 63 tests and handles scrubbing, rehydration, and latency instrumentation, but has not been load-tested at scale.
- Proxy LLM tier not yet wired to Ollama -- regex and dictionary tiers are active.
- Enterprise vertical configurations exist as domain knowledge, not shipped code.
- AGPL core creates friction for some enterprise adopters. Intentional, but still friction.

## Learnings

I had a separate financial NLP-to-SQL platform that turned out to be a ForgeFrame configuration with domain-specific prompts. Knowing when a product is really a configuration is a useful distinction.

The strongest validation wasn't a test suite -- it was building a Business OS on top of it and having it just work. When another system reads your database directly and gets the right answers, the abstraction is holding.
