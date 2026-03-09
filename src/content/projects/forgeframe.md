---
title: "ForgeFrame"
tagline: "Local intelligence infrastructure — routing, memory, provenance"
status: "active"
stack: ["TypeScript", "Node.js", "MCP Protocol", "AGPL/MIT"]
repo: "https://github.com/notaprompt"
order: 2
---

## Goals

Guardian's routing, memory, and session management extracted into standalone infrastructure. Any application can use it. Memory primitive is MIT. Core is AGPL.

## Process

Monorepo with three packages: `@forgeframe/memory` (MIT), `@forgeframe/core` (AGPL), and vertical configurations for domain-specific deployments.

```
L3  ForgeFrame Core (routing, sessions)     AGPL
L2  MCP Memory Server (the primitive)       MIT
L1  MCP Protocol (Anthropic's standard)     OPEN
```

**Memory server.** SQLite + FTS5. Weighted retrieval with strength decay and retrieval reinforcement. Implements MCP for compatibility with Claude Desktop, Cursor, and anything that speaks the protocol.

**Routing.** Tier-based model dispatch. Provider adapters for Anthropic, OpenAI, and Ollama. Pure TypeScript, dependency injection throughout.

**Proxy.** Localhost proxy for conversation intercept. Scrubs PII before anything reaches a cloud model, rehydrates on the way back. Requires a local model (Ollama) for full protection.

## Limitations

- Proxy is architecturally designed but not production-hardened.
- Enterprise vertical configurations exist as domain knowledge, not shipped code.
- AGPL core creates friction for some enterprise adopters. Intentional, but still friction.

## Learnings

I had a separate financial NLP-to-SQL platform that turned out to be a ForgeFrame configuration with domain-specific prompts. Knowing when a product is really a configuration is a useful distinction.
