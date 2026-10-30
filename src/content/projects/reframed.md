---
title: "Reframed"
tagline: "Resume tailoring with two versions, a visible change log, and the applicant in control."
status: "shipped"
stack: ["Next.js", "TypeScript", "Anthropic", "Neon Postgres", "Upstash Redis", "Stripe", "React PDF"]
demo: "https://reframed.works"
order: 1
screenshots:
  - src: "/images/projects/reframed-landing.jpg"
    caption: "The public product and its sample resume comparison. This is a demonstration of the workflow, not a customer outcome."
  - src: "/images/projects/reframed-receipt.jpg"
    caption: "The example Honesty Receipt. Its percentages illustrate the interface; they are not measured authorship or an independent check that a resume is true."
---

Tailoring my resume by hand took too long. The useful part was translating experience into the language of a role. The difficult part was knowing when stronger wording crossed into a claim I could not support.

I built Reframed around that decision. An applicant uploads or pastes a resume, adds a job description, and receives two versions with a change log. They review the changes and choose what to keep before exporting a PDF.

## The product decisions

Refined keeps the original structure and tightens the language. Reframed reorganizes the experience around the role. I removed a more aggressive third option because it added another decision without making the choice clearer.

The prompt defines what the model may change at the sentence level. It can explain transferable experience and adjust emphasis; it must not invent employers, skills, responsibilities, or results. Those constraints reduce the room for fabrication, but the applicant still needs to check every claim.

A change log makes the rewrite reviewable. The Honesty Receipt adds a signed record of changes classified through text overlap with the original. The signature verifies the record's origin and integrity; the overlap rules are a review aid, not a test of whether the underlying experience is true.

## What I built

The application handles resume extraction, job matching, model routing with provider fallbacks, and server-rendered PDF export. It includes magic-link authentication, Stripe billing and credits, an application board, and a job-board integration.

Much of the work sits around the model call: preserving the applicant's input through a multi-step flow, showing progress while analysis runs, handling checkout recovery, and enforcing access when a subscription changes. A successful generation is only one part of a usable product.

## Where it stands

Reframed is live at [reframed.works](https://reframed.works), with authentication, billing, tailoring, and export connected in one workflow. Distribution is the next commercial problem to solve: finding a repeatable way to reach applicants.

Unusual resume layouts can still break extraction. Analysis takes time across several model steps, and the applicant needs to review the final wording before using it.
