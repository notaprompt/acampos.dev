# Devsite Copy Update: ForgeFrame + Distillery

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update ForgeFrame and Distillery project pages on campos.works to reflect current state (April 15, 2026), voice-checked with perlocutionary audit.

**Architecture:** Content rewrite across 6 files in the acampos.dev Astro site. Two primary rewrites (project .md files), four secondary updates (llms.txt, agent.json, mcp.json, resume.astro). About page Guardian reference flagged for user decision.

**Tech Stack:** Astro content collections (markdown frontmatter), JSON config files, plain text

---

## Voice Audit Summary

### ForgeFrame - current copy is ~30% of what's built

Flagged:
- "works like yours does" - selling disguised as description
- "Extracted from Guardian" - stale (Guardian IS ForgeFrame per April 12 decision)
- "Forge Cockpit = Zellij workspace manager" - completely wrong, now WebGL2 + Cytoscape.js
- "12 MCP tools" everywhere - now 20
- "63 tests" proxy - now 101
- "It's not a demo" - defensive preemption
- Missing: Hebbian engine, dream system, valence, Guardian temperature, Cockpit UI, 21 endpoints, 21 SSE types, Hermes, Distillery as source organ

### Distillery - current copy is pre-April-14 organ upgrade

Flagged:
- "No cloud. No API calls. Ollama runs locally." - triple negation, defensive
- Pipeline missing 7 commits of new architecture: content-first lens, novelty scoring, signal gate, ForgeFrame writeback, co-retrieval edges, temporal context, Opus meta pass
- Still describes direct SQLite reads (now HTTP API)

---

### Task 1: Rewrite ForgeFrame project page

**Files:**
- Modify: `src/content/projects/forgeframe.md` (full rewrite)

- [ ] **Step 1: Replace forgeframe.md with voice-checked copy**

The new copy includes: Hebbian learning, dream engine (NREM 7 + REM 4), emotional valence, Guardian temperature, Cockpit (WebGL2 + Cytoscape.js), proxy (101 tests), Hermes integration, 21 HTTP endpoints, 21 SSE events, 20 MCP tools. Voice register: peers/developers. Perlocutionary audit passed.

- [ ] **Step 2: Verify frontmatter renders correctly**

Run: `cd ~/repos/acampos.dev && npm run dev`
Check: /projects/forgeframe loads, stack tags render, tagline displays

- [ ] **Step 3: Commit**

```bash
git add src/content/projects/forgeframe.md
git commit -m "update ForgeFrame project page to current state"
```

---

### Task 2: Rewrite Distillery project page

**Files:**
- Modify: `src/content/projects/distillery.md` (full rewrite)

- [ ] **Step 1: Replace distillery.md with voice-checked copy**

New copy reflects organ upgrade: ForgeFrame HTTP client, content-first lens, novelty scoring (signal = resonance x novelty), memory writeback with tiered strength, co-retrieval edges, temporal context, Opus meta pass. Includes proof metrics and the "before/after" story.

- [ ] **Step 2: Verify rendering**

Run: check /projects/distillery loads correctly

- [ ] **Step 3: Commit**

```bash
git add src/content/projects/distillery.md
git commit -m "update Distillery project page to current state"
```

---

### Task 3: Update llms.txt

**Files:**
- Modify: `public/llms.txt:7` (ForgeFrame description)
- Modify: `public/llms.txt:13` (Distillery description)
- Modify: `public/llms.txt:83-86` (MCP server section)

- [ ] **Step 1: Update ForgeFrame line**

Old: "Local-first memory system for AI agents. Persistent memory with strength decay, constitutional principles that never decay, and MCP-native integration. SQLite + FTS5. Runs on a laptop."

New: "Local-first memory for AI agents. Hebbian learning, dream cycles (NREM compression + REM recombination), constitutional persistence, emotional valence, Guardian temperature. SQLite + FTS5 + Ollama. 20 MCP tools. Cockpit UI with compound graph and real-time observability."

- [ ] **Step 2: Update Distillery line**

Old: "Phone-to-local-inference pipeline. Share a URL from iOS, Mac extracts content via yt-dlp, Ollama distills through a constitutional lens, results stored locally."

New: "ForgeFrame source organ. Share a URL from iOS, Mac extracts and distills through a content-first constitutional lens with novelty scoring. High-signal items write back to ForgeFrame memory with Hebbian edges. Local Ollama inference, Opus meta pass on high-signal items."

- [ ] **Step 3: Update MCP section tool count**

"12 tools" -> "20 tools" in the MCP server description line.

- [ ] **Step 4: Commit**

```bash
git add public/llms.txt
git commit -m "update llms.txt for ForgeFrame and Distillery"
```

---

### Task 4: Update agent.json and mcp.json

**Files:**
- Modify: `public/.well-known/agent.json:65` (ForgeFrame description)
- Modify: `public/.well-known/mcp.json` (tool list, description)

- [ ] **Step 1: Update agent.json ForgeFrame description**

Old: "Open-source memory for AI agents. MCP server with 12 tools. SQLite + FTS5."
New: "Open-source memory for AI agents. Hebbian learning, dream cycles, constitutional persistence. MCP server with 20 tools. SQLite + FTS5 + Ollama."

- [ ] **Step 2: Update mcp.json description and tool list**

Update description to mention Hebbian/dream/Guardian. Update tools array to include new tools (dream_trigger, dream_journal, guardian_temperature, hebbian_weights, etc.). Update version if appropriate.

- [ ] **Step 3: Commit**

```bash
git add public/.well-known/agent.json public/.well-known/mcp.json
git commit -m "update agent.json and mcp.json tool counts and descriptions"
```

---

### Task 5: Update resume.astro ForgeFrame reference

**Files:**
- Modify: `src/pages/resume.astro:101`

- [ ] **Step 1: Update ForgeFrame line**

Old: "open-source persistent memory for agents. MCP server with 12 tools, strength-based decay, constitutional persistence. 40-60% inference cost reduction."

New: "open-source memory for agents. Hebbian learning, dream cycles, constitutional persistence. 20 MCP tools, Cockpit UI, 576 tests."

- [ ] **Step 2: Commit**

```bash
git add src/pages/resume.astro
git commit -m "update ForgeFrame description on resume page"
```

---

### Task 6 (BLOCKED - needs user decision): about.astro Guardian reference

**Files:**
- Modify: `src/pages/about.astro:14`

Current: Lists Guardian as separate "desktop app" with link to /projects/guardian.
Decision needed: Guardian IS ForgeFrame. Merge the reference, or keep Guardian as a separate entry?

---

## Bounds that could/should be updated beyond this plan

| Surface | Current state | Recommendation |
|---------|--------------|----------------|
| `src/pages/about.astro:14` | Guardian listed as separate project | Merge into ForgeFrame reference (pending user decision) |
| `src/content/projects/guardian.md` | Separate project page | Consider redirect or merge (pending user decision) |
| `src/pages/projects/index.astro:71` | Old layer diagram in console.log | Update to match new architecture |
| `src/pages/links.astro:8` | "local infrastructure" for ForgeFrame | Fine as-is |
| GitHub README | Unknown state | Should match devsite after this update |
| npm package descriptions | Unknown | Should reflect Hebbian/dream if publishing |
