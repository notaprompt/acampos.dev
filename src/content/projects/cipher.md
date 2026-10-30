---
title: "Cipher"
tagline: "An unbuilt design for monitoring news against a user's own investment theses."
status: "concept"
stack: ["Python", "ForgeFrame", "Twilio", "RSS", "LLM Scoring"]
order: 8
---

Cipher is a design, not a working application. I wanted a way to follow financial news without repeatedly checking the same feeds: watch selected sources, compare new events with a written thesis, and bring relevant changes to my attention.

## The proposed workflow

An RSS and filings pipeline would collect source material. A model would compare each item with thesis documents, while ForgeFrame would retain what had already been read and which questions were still open. Routine items would go into a brief; urgent items could trigger a text or call.

I would build this as a configuration of the existing routing and memory components before creating another standalone codebase. The useful work would be choosing sources, defining what changes a thesis, and testing whether the alerts deserve attention.

## Why it is still a concept

Model scores are inconsistent, and a numeric threshold would give that inconsistency more authority than it deserves. I have not established how to calibrate relevance, measure missed events, or decide when an interruption is justified.

The design also needs clear boundaries around financial interpretation and personal data. I have left implementation parked while the underlying infrastructure matures.
