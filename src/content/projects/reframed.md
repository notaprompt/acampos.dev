---
title: "Reframed"
tagline: "Upload a resume, paste a job description, get two honest rewrites back"
status: "shipped"
stack: ["Next.js", "TypeScript", "Multi-Provider LLM Routing", "Stripe", "React PDF"]
repo: "https://github.com/notaprompt/resume-tailor"
demo: "https://reframed.works"
order: 1
---

## Goals

I was tailoring resumes by hand and it took too long. Build a tool that does the rewriting -- two versions, refined and reframed -- without fabricating experience. Pay-per-use, magic-link auth, no friction.

## Process

Upload a resume (paste, file, or URL scrape), paste a job description. The system scores the match semantically, then generates two reframed versions with a change log for each.

**Semantic analysis.** Multi-provider routing reads the resume against the job description and returns a confidence score, gap analysis, and per-section annotations. Not keyword matching -- it reads for intent, culture fit, and transferable experience.

**Two versions.** Refined keeps your structure with stronger language. Reframed reshapes it for the specific role. Each version includes a change log showing exactly what was modified and why. We killed the aggressive third version -- two gives you a real choice without decision paralysis.

**No fabrication.** The tailoring prompt explicitly prohibits inventing experience, inflating metrics, or adding skills the user doesn't have. It reframes what exists. The user decides which version to use.

**Voice fingerprinting.** The system detects your writing voice and calibrates the rewrites to sound like you, not like a template. 14 industry format profiles for context-aware formatting.

**PDF export.** ATS-optimized template rendered server-side. Download and submit.

## What's live

- 34 API routes, multi-provider routing with fallback chains
- Stripe payments, magic-link auth, credit system
- Voice fingerprinting, 14 industry profiles
- Application tracking board
- Streaming analysis with real-time progress

## Limitations

- Resume parser handles most formats but unusual layouts can break extraction.
- Multi-model routing means each step takes a few seconds. The full flow is not instant.
- Product works. Distribution is the bottleneck.

## Learnings

The hardest part was the tailoring prompt. Getting a model to rewrite without fabricating required explicit structural constraints -- not just "don't make things up" but defining what reframing means at the sentence level. The difference between "managed a team" and "led cross-functional execution" is reframing. Adding a team you never managed is fabrication. The prompt encodes that distinction.

Two versions is the right number. One feels like the tool is deciding for you. Three was noise. Two gives you a spectrum and lets you pick what feels honest.
