---
title: "On Observation and Identity Modeling"
subtitle: "What I learned building tools that rewrite a person's words, remember their patterns, and sometimes mistake an inference for a fact."
status: "published"
date: "2026-03-24"
updated: "2026-10-30"
series: "fields"
order: 1
---

I noticed it after the third session. The assistant's answer made sense, but it answered a slightly different person: more certain about the problem, cleaner about the motive, easier to advise.

I had supplied the uncertainty. The response had quietly resolved it for me.

The version was close enough that I did not notice it at first. Close enough that I started drifting toward it. Later I noticed my own typing changing: shorter sentences, fewer hedges, some of the assistant's version of me appearing in how I wrote.

That is the part I wanted to inspect. An assistant can make an inference about a person and return it in the grammatical form of a fact. If the person accepts it, the inference becomes part of the material the next response works from.

That observation became a design question in two projects: how do you make a tool's interpretation visible while the person still has a useful chance to disagree?

## The rewrite has a direction

In [Reframed](/projects/reframed), I was building a tool to help people describe their professional experience. A resume rewrite always chooses an emphasis. It decides which work deserves the first line, which details to compress, and how much authority a sentence should carry.

There is a factual boundary: do not invent a team, a skill, or a result. There is also a less tidy boundary around interpretation. Someone can have done the work and still feel misrepresented by the language used to describe it.

That is why I care about voice. A useful rewrite should make the experience easier to understand while leaving the person able to recognize and defend it. Fluency alone is a poor measure. A sentence can sound excellent and ask its owner to perform a confidence they do not have, or imply responsibility they never held.

Reframed offers two versions and a change log. Those are ways to make the editorial choices inspectable. They do not settle whether a choice is good. The person still has to decide which wording they can stand behind in an interview.

The product has an incentive to produce a satisfying transformation. Sometimes the honest transformation is small. That is a tension I need to keep in the design, because a dramatic before-and-after is easier to sell than a careful one.

## Making the inference visible

[Guardian](/projects/guardian) approached the same problem inside a conversation. I built a detector for seven types of reframing and tracked the area of the person's self-description they touched. The categories came from examples I noticed while using models. They were a working taxonomy, chosen by me.

Consider a response such as “You're not frustrated, you're motivated.” It replaces the feeling the person named. “The real issue is that you don't trust your judgment” makes a claim about a motive they may never have expressed. These examples show what the detector was meant to flag. They are not evidence that every reframe is harmful; sometimes a person asks for another interpretation.

The useful question is whether the change is visible enough to accept or reject. A response can offer an interpretation as an interpretation. It can point back to the words that prompted it. It can leave room for “you have this wrong” without turning the correction into more evidence for its theory.

I also built detection for topics that recurred across sessions without an apparent resolution. The prototype used a threshold of four sessions over fourteen days. That number was a design choice. It was not a finding about how long a person should need to work through something.

Recurrence is ambiguous. It can mean avoidance. It can mean a difficult situation is still difficult. A system that calls every repeated concern a trap adds a judgment that its data cannot support.

## Compression makes a guess durable

Memory makes this more consequential. A raw exchange contains hesitations, corrections, and context. A summary compresses them. A pattern compresses several summaries. A principle can then carry the result into future sessions.

This is a useful software architecture. It is also a sequence of editorial decisions. “I hesitated in that conversation” can become “I avoid conflict” if the system is careless. The shorter statement is easier to retrieve and harder to qualify. Repeating it later can make the original inference feel established.

In ForgeFrame, I gave principle and voice records protection from automatic decay. That keeps important commitments available. It also raises the cost of getting a classification wrong. A record treated as a principle deserves a visible source and a deliberate path for correction.

I want to be able to ask where a statement came from, whether I said it or a model inferred it, and what later outputs depended on it. Keeping everything on my machine gives me room to build those affordances. Local storage does not make the inference accurate.

## What the prototype did not establish

Guardian's false-positive rate was unmeasured. There was no formal user study. The categories and thresholds were hand chosen. A model's confidence score did not supply the missing calibration.

The categories make specific claims I can review against a conversation. That gives me a way to investigate what I noticed in my own use. A detector finding examples that fit my taxonomy does not independently validate it; measuring accuracy would require judgments beyond mine.

The unresolved-pattern feature had another limit that I understood more clearly later: showing someone a pattern does not supply the time, energy, help, or opportunity to change it. A tool can produce a more articulate account of being stuck and still leave the person stuck. I return to that in [Where the Difference Is Stored](/writing/where-the-difference-is-stored).

## Who can correct the record

I still think the ownership question matters. A system may hold an inference I have never seen. I may hold context I chose not to type. Both can be wrong about what the other knows.

The practical requirement is a way to work across that asymmetry. Show me consequential inferences. Preserve enough context to challenge them. Let a correction change future behavior. Let some things stay outside the record.

This argument also supports infrastructure I built. I should name that interest. I chose local memory because I wanted access to the process and the ability to change it. That choice carries maintenance costs, and the interpretations still need checking.

I want an assistant that can notice something I missed. I also want it to remain possible to say, plainly, “That isn't me,” and have the correction stick.
