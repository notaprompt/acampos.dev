---
title: "CREATURE"
tagline: "A synthetic mind that runs on my machine, remembers what matters, feels its own needs, and carries my judgment when it acts. Sovereign by design — my cognition never leaves the box."
status: "active"
stack: ["TypeScript", "Python", "SQLite", "FTS5", "Ollama", "Model Context Protocol", "WebGL2", "local-first"]
screenshots: ["/creature/judgment-matrix.png", "/creature/keeper.png"]
order: 1
---

## Goals

I wanted an AI that was mine — one that accumulates a model of how I think and never ships that model to someone else's server. Not a chatbot with a memory bolted on. A system that remembers, consolidates while idle, feels when it needs a resource, refuses work that would cross a line I set, and acts in the world without me babysitting it.

CREATURE is the whole organism. ForgeFrame is its engine. Everything below is local-first: my private cognition lives in SQLite on my machine, and the cloud only ever touches public-facing work.

<img src="/creature/architecture.svg" alt="CREATURE architecture: input hits a spine router that classifies green (public, cloud-eligible) or red (private, local-only), gated by a judgment kernel weighted to sovereignty, feeding memory, the keeper, and organs. Cloud is a tool the local mind calls, never its brain." style="width:100%;border:1px solid var(--white-08);margin:1rem 0;" />

The seam is the whole design: cloud is a *tool the local mind calls* with a self-contained task, never the brain, and it never carries memory off the box.

## Process

**The spine router.** Every thought gets classified green (public, cloud-eligible) or red (private, local-only) before anything is dispatched. I didn't want a keyword blocklist — those leak. Instead the router measures embedding distance against the centroids of my own private memory clusters. If a request sits close to my private latent space, it's red. When the distance is ambiguous, it escalates to a local model for a yes/no rather than guessing. Cheap most of the time, a warm local call only on the fence, and the judgment about what's private stays computed on my hardware. The router fails closed: any error, any timeout, any uncertainty resolves to local. Safe is the default, not the exception.

**The judgment kernel.** My principles and voice — sovereignty, honesty, proof over claims, and the rest — are compiled into a weighted matrix, sovereignty carrying the highest weight. When the system dispatches a sub-agent to do work, the kernel is injected into that agent's context so it acts the way I would, not the way a generic assistant would. The kernel also hooks into the router as a monotonic ratchet: it can move a decision toward local/safe but never the other way. Nothing downstream can loosen a constraint the kernel tightened.

**Memory.** A Hebbian graph. Co-used memories strengthen their edge (LTP), disuse decays it (LTD), and edges below threshold get pruned. Ordinary memories decay on a half-life; principle- and voice-tagged memories are exempt — the non-decaying reference layer that keeps the system pointed at me over time. When the machine goes idle, two dream cycles run: an NREM-style compression pass (decay, dedup, cluster maintenance) and a REM-style recombination pass that pairs memories from disconnected regions and surfaces tensions for me to grade. I arrived at the sleep architecture from cognitive-ergonomic intuition and only later found it maps onto the neuroscience.

**The Keeper.** Interoception — the system feeling its own internal state. It was born from a real failure: a need existed (a job wanted the GPU) and nothing in the system could feel it, so work silently starved. The Keeper is the organ that senses need and negotiates for scarce resources. Concretely it arbitrates a GPU mutex — an organ that wants the local model has to ask, wait, and yield. A homeostat, not a scheduler bolted on top.

**Organs.** Anything that runs on the substrate implements a fail-closed organ contract: a **membrane** (what it's allowed to touch), a **toolbox** (what it can do), a **genome** (its config), governed by three laws that default to refusal. Live organs today: email triage, a projects board, a scribe that distills my coding sessions into memory, a mirror that distills my values and blindspots into a deliberately decaying self-portrait, and a journal.

**The Cockpit.** A PWA surface, not a terminal. A memory constellation you navigate by hopping associations rather than searching keywords; a live readout of the system's felt needs and its currently-compiled judgment matrix; and a chat that chains local tools before it answers instead of replying from cold context.

**Creature-hands.** It can act. I've had it drive an iOS simulator, drive a browser, and run a headless coding worker — the same judgment kernel riding along in each so the hands move the way I would move them.

## Limitations

These are the open problems, stated plainly, because pretending they're solved would be the dishonest move.

- **Training toward my latent space without violating sovereignty.** I want the local model to converge on how I actually think, which means training on my private memory — the exact data that must never leave the machine. Fully-local fine-tuning is the only acceptable path and it's slow and awkward on consumer hardware. Unsolved.
- **The I/O-grammar bottleneck.** The system can remember, feel, and decide far better than it can be *told to* and *report back*. Roughly a third of the buildout is missing a clean grammar for triage, A/B/C decisions, and embodied response. The cognition outran the interface.
- **Convergence — the artificial-life question.** Left to consolidate and decay on its own, does the memory graph converge to something rich, or collapse to a small attractor? I don't know yet. This is the genuinely open research question and I'm not going to hand-wave it.

## What's next

Open-sourcing is in progress — ForgeFrame (the engine) first, the sovereignty layer and organ contract alongside it, so the architecture is inspectable even though my memory data stays mine. The interesting claim isn't that I built an assistant. It's that the hard part — keeping a mind's private cognition provably local while still letting it act in the world — is running on my machine right now.
