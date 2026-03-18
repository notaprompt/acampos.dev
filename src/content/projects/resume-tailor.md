---
title: "Resume Tailor"
tagline: "Upload a resume, paste a job description, get three tailored versions back"
status: "shipped"
stack: ["Next.js", "TypeScript", "Claude API", "Stripe", "React PDF"]
repo: "https://github.com/notaprompt/resume-tailor"
demo: "https://resume-tailor-gilt.vercel.app"
order: 6
---

## Goals

I was tailoring resumes by hand and it took too long. Build a tool that does the rewriting -- conservative, aggressive, and hybrid versions -- without fabricating experience. Pay-per-use, no account required.

## Process

Upload a resume (paste or file), paste a job description URL or text. The system scores the match semantically, then generates three reframed versions with a change log for each.

**Semantic analysis.** Claude reads the resume against the job description and returns a confidence score, gap analysis, and per-section annotations. Not keyword matching -- it reads for intent, culture fit, and transferable experience.

**Three versions.** Conservative (light keyword injection, minimal changes), aggressive (full rewrite, restructured for relevance), and hybrid (natural voice with JD language woven in). Each version includes a change log showing exactly what was modified and why.

**No fabrication.** The tailoring prompt explicitly prohibits inventing experience, inflating metrics, or adding skills the user doesn't have. It reframes what exists. The user decides which version to use.

**PDF export.** Two templates (ATS-optimized and modern-clean) rendered server-side. Download and submit.

## Limitations

- Resume parser is regex-based. Unusual formatting breaks extraction.
- Claude API latency means each step takes a few seconds. The full flow is not instant.
- Rate limiting on free analysis is fingerprint-based, not foolproof.
- No user accounts or saved history. Session state lives in the browser.

## Learnings

The hardest part was the tailoring prompt. Getting a model to rewrite without fabricating required explicit structural constraints -- not just "don't make things up" but defining what reframing means at the sentence level. The difference between "managed a team" and "led cross-functional execution" is reframing. Adding a team you never managed is fabrication. The prompt encodes that distinction.

Also learned that three versions is the right number. One feels like the tool is deciding for you. Five is noise. Three gives you a spectrum and lets you pick.
