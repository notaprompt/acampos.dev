---
title: "ForgeFrame"
tagline: "Sovereign AI middleware — routing, memory, provenance, governance"
status: "active"
stack: ["TypeScript", "Node.js", "MCP Protocol", "AGPL/MIT"]
repo: "https://github.com/notaprompt"
order: 2
---

## Goals

Guardian's routing engine, memory system, and session management were too useful to stay trapped inside one desktop app. ForgeFrame is the extraction -- sovereign AI middleware that any application can use. The memory primitive is open (MIT) because memory should be a protocol-level capability, not a vendor feature. The governance layer is proprietary because some things shouldn't be free for companies to strip-mine.

## Process

The extraction started as a monorepo with three packages: `@forgeframe/memory` (MIT), `@forgeframe/core` (AGPL), and vertical configurations for domain-specific deployments.

The layer stack:

```
L4  Guardian Pro / ForgeFrame Enterprise    PROPRIETARY
L3  ForgeFrame Core (routing, sessions)     AGPL
L2  MCP Memory Server (the primitive)       MIT
L1  MCP Protocol (Anthropic's standard)     OPEN
```

A key architectural insight: MCP provides tools and resources but does not intercept conversations. Full sovereignty requires a proxy architecture for conversation intercept alongside MCP for ecosystem compatibility. Both mechanisms run simultaneously.

The routing layer is pure TypeScript with zero runtime dependencies and dependency injection interfaces. Provider adapters are pluggable. Session state is portable. Nothing is hardcoded to a specific LLM vendor.

## Limitations

- The proxy intercept mechanism is architecturally designed but not yet production-hardened at scale.
- Enterprise vertical configurations (financial compliance, healthcare) exist as domain knowledge, not shipped code. The competitive advantage is the domain expertise, not the framework.
- The AGPL core creates friction for some enterprise adopters. This is intentional — it forces governance conversations — but it is still friction.

## Learnings

The hardest part of building middleware is deciding what to absorb and what to leave alone. I had a separate financial NLP-to-SQL platform (VaultQL) that I eventually realized was just a ForgeFrame configuration with domain-specific prompts. Knowing when a product is really a configuration is a skill I'm still developing.

The layer stack is the thesis in code: open primitives, source-available infrastructure, proprietary intelligence. Every decision maps to a belief about what should be commoditized and what should not. I have strong opinions about this and I'm sure some of them are wrong. But the architecture should make the opinions legible.
