---
title: "CREATURE"
tagline: "A personal automation system that keeps private context local and puts limits around what agents can do."
status: "active"
stack: ["TypeScript", "Python", "Ollama", "MCP", "SQLite/FTS5", "Local model routing"]
screenshots: []
updated: 2026-08-08
order: 3
---

I wanted agents that could carry context between tasks and do useful work on my machine. That meant dealing with permissions, private information, background jobs, and limited compute. CREATURE is the personal system I built around those constraints, using [ForgeFrame](/projects/forgeframe) for memory.

It connects coding sessions, reading, email, journaling, and automation. Some agents can operate a browser or phone. The work is deciding what each task may read, which model should handle it, and when an action needs my approval.

## Local context, selective cloud use

A router compares incoming requests with representations of private context. Ambiguous cases go to a small local model. Errors and timeouts send the work to the local path. The private model client rejects non-loopback addresses.

Cloud work goes through a narrower interface that accepts a task string without dedicated memory or conversation-history fields. A local model prepares that task. This reduces the context sent out, but it does not make the boundary airtight: the classifier can make a mistake, and a task string can still contain sensitive information.

I also built a policy layer that can make a routing decision more restrictive. Each component declares what it may access and which tools it may use. These are implementation choices I can inspect and test, rather than relying entirely on an agent remembering an instruction.

## Keeping it running

Background maintenance compresses memory, proposes connections, and surfaces contradictions for review. A resource monitor grew out of a practical failure: a job needed the GPU, another task held it, and the queued work made no progress. Tracking machine state and resource demand made that failure visible.

That experience changed where I spent time. An agent's output matters, but so do the queue, restart behavior, logs, and the ability to tell whether a task is waiting or stuck. A system I use every day needs those answers.

The [architecture reference](/creature) records the component inventory as of August 2026. It is a snapshot, rather than a live census or a measure of capability.

## Where it stands

CREATURE is my daily integration environment. The open work is evaluating routing mistakes, making the interface easier to use, and checking whether repeated consolidation improves retrieval over time.

I want more of the architecture to be readable and runnable without exposing my private data. Local fine-tuning is another experiment I want to try; the current system uses existing models.
