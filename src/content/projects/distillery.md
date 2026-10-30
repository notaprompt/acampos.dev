---
title: "Distillery"
tagline: "A phone-to-laptop reading queue that connects shared links with work already in progress."
status: "shipped"
stack: ["Python", "Flask", "Ollama", "yt-dlp", "SQLite", "iOS Shortcuts", "Tailscale"]
order: 5
screenshots:
  - src: "/images/projects/distillery-feed.jpg"
    caption: "The reading queue with a completed summary, a quarantined item, and an extraction error. The visible scores are model judgments, not validated measures of usefulness."
---

I save articles, videos, and papers on my phone, then lose the connection between what I read and what I am building. Distillery turns the share sheet into a reading queue on my Mac. It extracts the content, summarizes it against relevant project context, and keeps the result searchable.

The aim is to make saved material easier to use. A summary should help me decide whether an idea changes a project, deserves a closer read, or is something I already know.

## The workflow

An iOS Shortcut sends the URL over Tailscale. The Mac extracts transcripts with yt-dlp, articles with trafilatura, and papers through the arXiv API. A local model reads the content with relevant context retrieved from [ForgeFrame](/projects/forgeframe).

The result includes a summary, connections to active projects, and separate estimates of relevance and novelty. A gate combines those scores before writing selected items into memory. The web interface exposes completed items, quarantines, and errors, with search and the option to run an item again after changing the prompt.

The server and worker run through launchd, restart after a crash, and keep their state in SQLite. A cloud reasoning pass is intended to receive only public source material, while private memory stays on the local path.

## The useful mistake

An early run returned “no change to build” in 17 of 20 distillations. The prompt was too eager to match incoming material to my existing beliefs. I moved the principles later in the prompt and added a novelty score so unfamiliar ideas had a better chance of being considered.

That was a change in the question I asked the model. It still needs evaluation: a higher novelty score does not show that an idea is correct or worth pursuing.

## Where it stands

The share-sheet workflow is in personal use. Extraction coverage varies by platform, and local inference can take 30–60 seconds. A backlog run also exposed a timeout failure that produced empty summaries; the repair added explicit failures and an idle, plugged-in condition for resumed processing.

It remains a single-user tool. The next useful evidence is whether it helps me revisit and apply saved material, rather than simply producing a larger archive of summaries.
