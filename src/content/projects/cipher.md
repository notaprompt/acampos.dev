---
title: "Cipher"
tagline: "Financial monitoring agent. Scores news against your investment thesis. Calls you if something matters."
status: "concept"
stack: ["Python", "ForgeFrame", "Twilio", "RSS", "LLM Scoring"]
order: 8
---

Not built - a design, parked on purpose while the engine under it matures. I want to stop manually reading financial news: an agent that watches the world, scores events against my thesis sectors, and escalates by severity - call my phone if it's serious, text if it's moderate, morning brief if it can wait.

## How it would work

Cipher is a ForgeFrame vertical, not a new codebase. RSS ingest polls financial news, filings, and sector sources. Each item is scored 0-10 against pre-built thesis documents through the routing engine. Score > 8 rings the phone; 5-8 sends a text; below that accumulates into a morning brief. `@forgeframe/memory` keeps the context - what it already scored, which theses are active, what my positions look like.

## What I haven't solved

- It isn't built. That is the honest headline, and it stays until it changes.
- Model scoring of financial events is noisy - a 7 from one evaluation is a 5 from another. Calibration across providers is open.
- An agent that can ring a phone at 2am has real power over attention. The thresholds are boundaries around cognitive space, not tuning parameters - the system that protects a portfolio also has to protect sleep.
- Automated financial advice has real regulatory edges. Cipher scores and informs; it never recommends. The user decides.

## Where it's going

Nowhere until the engine earns it. Designing it clarified the pattern that keeps showing up: the engineering lives in ForgeFrame, the value is domain knowledge - which feeds matter, how to read a filing, what makes an event thesis-relevant. When it gets built, it gets built as configuration.
