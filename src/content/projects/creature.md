---
title: "CREATURE"
tagline: "A mind that runs on one machine - mine. It remembers, dreams, feels what it needs, and carries my judgment when it acts. Local by construction; the cloud is opt-in and never handed a memory."
status: "active"
stack: ["TypeScript", "Python", "SQLite", "FTS5", "Ollama", "Model Context Protocol", "WebGL2", "local-first"]
screenshots: ["/creature/judgment-matrix.png", "/creature/keeper.png"]
order: 1
---

CREATURE is a mind that runs on one machine - mine. It remembers, it consolidates while I sleep, it notices when it is short on something it needs, and it will refuse work that crosses a line I set. None of that leaves the box.

The name is an acronym - cognitive, recursive, entropic, autopoietic, temporal, user-owned, reflective, emergent - but the honest description is simpler: an organism, not an assistant with a memory feature bolted on the side. A spine that decides what is safe, organs that do the work, a keeper that feels when something is wrong. The letter that carries the weight is the plain one in the middle - user-owned. ForgeFrame is the engine underneath it. Everything here runs local-first: my private thinking lives in a file on my own disk, and reaching the cloud is a deliberate, narrow act rather than the default.

<img src="/creature/architecture.svg" alt="CREATURE architecture: a request hits a spine router that measures embedding distance against private memory centroids, classifies green (public, cloud-eligible) or red (private, local-only), escalates to a local judge when uncertain, and fails closed. A judgment kernel weighted to sovereignty gates the router and rides in every dispatched agent, over memory, the keeper, and organs." style="width:100%;border:1px solid var(--white-08);margin:1.25rem 0;" />

The seam is the whole design. The cloud is a tool the local mind reaches for when the work is public - never the mind itself, and it never carries a memory off the machine.

## How it works

**The spine.** Every request gets read before anything acts on it. Green means public - fine to hand to a frontier model in the cloud. Red means private - it stays home. I did not want a blocklist of forbidden words, because words leak and lists rot. So the spine measures distance instead: how close does this request sit to the shape of my own private memory? Close means red. When it is genuinely on the fence, it asks a small local model rather than guess. Most of the time it is a cheap measurement; only the ambiguous cases warm the hardware. And it fails the safe way - any error, any timeout, any doubt lands on local. Safe is the resting state, not the exception.

**What "local" actually means.** This is the part I want to be exact about, because it is easy to say and hard to earn. The model that does my private thinking refuses to run against anything but a loopback address - the code raises an error rather than send. The spine fails closed: tag something sensitive and it can only be pulled toward local, never pushed out. When the system does reach a frontier model in the cloud, it goes through one narrow tool that can carry nothing but a short task the local model wrote by hand - no memory, no scratchpad, no history; the function cannot hold them. So the strong, true version is: local cognition is enforced in the code, and the cloud is opt-in and starved of context by design. The version I will not claim is that sensitive content physically cannot leak. Memory objects cannot - the tool has no field to put them in - but the task string is composed by a local model and checked by a rule, and making that judgment airtight is exactly the open problem below.

**The judgment.** My principles are not a document the system quotes back at you. They are compiled - weighted into a kernel, sovereignty carrying the most weight - and when the system sends a sub-agent off to do something, that kernel rides along, so the agent moves the way I would move. It also sits on the spine as a ratchet: it can pull a decision toward local and safe, never the other way. Nothing downstream gets to loosen what it tightened.

**The memory.** A graph that behaves like memory instead of a database. Two things recalled together grow a stronger link between them; things I stop reaching for fade; the principles and the voice never fade at all - that is the part that keeps it pointed at me over time. When the machine goes quiet, it dreams: one pass that compresses and tidies, another that pulls memories from far corners of the graph together and hands me the tensions to settle. I designed the sleep from how my own head feels after a good night, and only later noticed it lines up with the neuroscience.

**The Keeper.** The part that feels. It came out of a real failure - a job needed the GPU, nothing in the system could feel that need, and the work just quietly starved. So I gave it interoception: a sense of its own state, and a way to ask for a scarce resource and wait its turn. Not a scheduler bolted on top. A body that knows when it is hungry.

**The organs.** Everything that runs here signs the same contract: a membrane for what it may touch, a toolbox for what it may do, three laws that default to no. The ones alive today - email, a scribe that turns my coding sessions into memory, a mirror that keeps a slowly-fading portrait of my own habits and blind spots, a journal. And hands: I have watched it drive a phone, drive a browser, run a headless coder - the same judgment riding in each one.

## What I haven't solved

I would rather name these than pretend they are behind me.

- **Making the boundary airtight.** Local cognition is enforced in code; the weak seam is the classifier that decides what counts as private in the first place. Moving it from matching keywords to measuring distance against my own memory helped a lot. Proving it never mislabels - and that the cloud tool never gets handed a sensitive task dressed up as a public one - is not done. Get that wrong in the permissive direction once and you cannot un-leak.
- **Teaching it to think more like me, without leaking me.** The way to make the local model sound like my own mind is to train it on my own memory - which is exactly the data that cannot leave the machine. Fully-local fine-tuning is the only honest road, and it is slow on a laptop. Open.
- **The narrow mouth.** The system can remember and feel and decide faster than I can tell it what to do or read back what it found. The thinking outran the interface. About a third of the real work left is a clean grammar for talking to it.
- **Whether it keeps growing.** Left to consolidate and forget on its own, does the memory get richer, or collapse into a small handful of ruts? I do not know yet. That is the honest research question, and I am not going to wave it away.

## Where it's going

I am opening it up - the engine first, then the sovereignty layer and the organ contract, so the architecture is something you can read and run even while my memories stay mine. The interesting part was never that I built an assistant. It is that the hard thing - keeping a mind's private thinking local by construction while still letting it reach into the world and act - is running on my desk right now.
