---
title: "Cipher"
tagline: "Financial monitoring agent. Scores news against your investment thesis. Calls you if something matters."
status: "concept"
stack: ["Python", "ForgeFrame", "Twilio", "RSS", "LLM Scoring"]
order: 5
repo: "https://github.com/notaprompt/cipher"
---

## Goals

I want to stop manually reading financial news. Build an agent that watches the world, scores events against my thesis sectors, and escalates by severity -- call my phone if it's serious, text if it's moderate, morning brief if it can wait.

## Process

Cipher is designed as a ForgeFrame vertical configuration. The core loop:

1. **RSS ingest**: Continuous polling of financial news feeds, regulatory filings, and sector-specific sources.
2. **LLM scoring**: Each item is scored 0-10 against pre-built thesis sectors using ForgeFrame's routing engine. The scoring prompt evaluates relevance, magnitude, and urgency.
3. **Threshold escalation**: Score > 8 triggers T1 (phone call via Twilio). Score 5-8 triggers T2 (text/push notification). Score < 5 accumulates into T3 (morning brief).
4. **Thesis automation**: Pre-built sector theses are maintained as structured documents. When an event scores high, the system generates a contextualized brief that maps the event to the relevant thesis, including historical precedent and position implications.

The agent uses `@forgeframe/memory` for persistent context — it remembers what it has already scored, what theses are active, and what the user's current positions and risk tolerance look like.

## Limitations

- This is a concept-stage project. The architecture is designed but not yet built as a running system.
- LLM scoring of financial events is inherently noisy. A score of 7 from one model evaluation might be a 5 from another. Calibration across providers is an unsolved problem.
- Phone call escalation via Twilio requires careful rate limiting to avoid alert fatigue. The threshold tuning is a human factors problem, not an engineering problem.
- Regulatory constraints on automated financial advice are real. Cipher provides information and scoring, not recommendations. The user always decides.

## Learnings

Designing this clarified something important: Cipher is not a new codebase. It's a ForgeFrame deployment with domain-specific prompts, RSS sources, and escalation rules. The engineering is in ForgeFrame. The value is domain knowledge -- which feeds matter, how to score regulatory filings, what constitutes a thesis-relevant event. That distinction between product and configuration keeps showing up.

Also: an agent that calls your phone at 2am has real power over your attention. The escalation thresholds aren't just technical parameters. They're boundaries around your cognitive space. The system that protects your portfolio also needs to protect your sleep. I already stay up too late as it is.
