# Site Audit Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, interactive B2B site analysis tool at `campos.works/audit` that crawls a client's website, generates an AI-powered SWOT, walks them through a conversational business questionnaire, and presents a diagnosis beautiful enough to close the deal before a price is named.

**Architecture:** Astro page with vanilla JS islands for interactivity. Vercel serverless function (`/api/audit`) does the crawl + analysis. Claude generates the SWOT and narrative. Results stored in Neon Postgres keyed by domain so each audit has a shareable URL. Questionnaire answers stored alongside the audit. Follows the existing campos.works void architecture design system.

**Tech Stack:** Astro 5, Vercel serverless (Node), `@anthropic-ai/sdk` (Claude), `@neondatabase/serverless` (Neon Postgres), vanilla JS (no React - matches the rest of campos.works).

**Key principle:** The analysis IS the pitch. By the time she finishes scrolling, she's already sold - not because you pressured her, but because she SAW what's broken and SAW what's possible.

---

## File Structure

```
src/pages/
  audit.astro                    - the interactive audit page (URL input + results + questionnaire)

src/styles/
  audit.css                      - audit-specific styles (extends void architecture tokens)

public/islands/
  audit-engine.js                - client-side JS: form submission, step transitions,
                                   progressive result rendering, questionnaire flow

api/audit/
  crawl.ts                       - serverless: fetches target URL, extracts HTML metadata,
                                   checks crawlability, SSR detection, meta tags, indexability
  score.ts                       - serverless: runs AI-powered SWOT analysis via Claude,
                                   generates narrative + scores
  save.ts                        - serverless: persists audit results + questionnaire answers
  [id].ts                        - serverless: retrieves a saved audit by ID (shareable URL)

src/lib/
  audit-types.ts                 - shared TypeScript types for audit data structures
```

---

## Task 1: Types + DB Setup

**Files:**
- Create: `src/lib/audit-types.ts`
- Create: `api/audit/save.ts`

- [ ] **Step 1: Define the audit data types**

Create `src/lib/audit-types.ts` with these interfaces:

- `CrawlResult` - URL, domain, isSSR, htmlContentLength, hasJsFramework, title, description, ogImage, ogTitle, hasRobotsTxt, hasSitemap, sitemapUrls, canonicalUrl, hasJsonLd, jsonLdTypes, indexablePages, responseTimeMs, contentType, isHttps, hasViewportMeta, platform, platformEvidence, hasAgentJson, hasLlmsTxt, internalLinks, externalLinks, headings (level + text), images (src + alt), imagesWithoutAlt
- `ScoreCard` - category, grade (A-F), score (0-100), findings (string[])
- `SWOT` - strengths, weaknesses, opportunities, threats (all string[])
- `AuditNarrative` - headline, whatsWorking, whatsBroken, biggestOpportunity
- `QuestionnaireAnswers` - goodMonth, customerChannels, desiredFeeling, hiddenStory, ambitionLevel
- `SiteAudit` - id, domain, crawl, scores, swot, narrative, questionnaire, createdAt

Full type definitions are in the detailed plan appendix below.

- [ ] **Step 2: Create the save endpoint**

Create `api/audit/save.ts` - POST endpoint that inserts domain + crawl_data + scores + swot + narrative + questionnaire into `site_audits` table, returns `{ id, createdAt }`.

- [ ] **Step 3: Run the DB migration**

Create `site_audits` table with: id (TEXT PK, auto-generated), domain (TEXT), crawl_data (JSONB), scores (JSONB), swot (JSONB), narrative (TEXT), questionnaire (JSONB), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ). Index on domain.

- [ ] **Step 4: Commit**

```bash
git add src/lib/audit-types.ts api/audit/save.ts
git commit -m "add audit types and save endpoint"
```

---

## Task 2: Crawl Endpoint

**Files:**
- Create: `api/audit/crawl.ts`

The core analysis engine. Fetches the target URL, parses the HTML, extracts everything needed to score the site. No Puppeteer - raw fetch + regex parsing. Serverless-compatible.

- [ ] **Step 1: Build the crawl endpoint**

POST endpoint accepting `{ url: string }`. Does:
1. Fetch the URL with timing (response time measurement)
2. Extract meta tags (title, description, OG tags, canonical, viewport)
3. Detect platform (Shopify, WordPress, Squarespace, Wix, Webflow, custom)
4. Detect JS framework (Next.js, Nuxt, React, Angular, Svelte, Vue)
5. SSR detection: is there >500 chars of visible text in raw HTML?
6. Check robots.txt existence + parse sitemap URL from it
7. If sitemap found, count URLs in it
8. Check for agent.json and llms.txt at well-known paths
9. Extract all headings (h1-h6 with level + text)
10. Extract all links (internal vs external, deduped)
11. Extract all images (src + alt, count missing alts)
12. Check for JSON-LD blocks, extract @type from each
13. Return the full `CrawlResult` object

Uses `AbortSignal.timeout(15000)` on main fetch, `5000` on ancillary checks (robots, sitemap, agent.json). All ancillary checks wrapped in try/catch so they fail gracefully.

- [ ] **Step 2: Test locally**

```bash
cd ~/repos/acampos.dev
# Start vercel dev, POST to /api/audit/crawl with mariashotsauce.com, verify JSON output
```

- [ ] **Step 3: Commit**

```bash
git add api/audit/crawl.ts
git commit -m "add site crawl endpoint - HTML analysis, meta extraction, platform detection"
```

---

## Task 3: AI Scoring + SWOT Endpoint

**Files:**
- Create: `api/audit/score.ts`

Takes the crawl result, feeds it to Claude, gets back score cards + SWOT + narrative.

- [ ] **Step 1: Build the score endpoint**

POST endpoint accepting a `CrawlResult` body. Sends to Claude with:
- System prompt: "You are a sharp, opinionated web strategist analyzing a business website." Asks for 5 score cards (SEO, Content, Performance, Mobile, Agent Readiness), SWOT specific to THIS site, and a narrative (headline, whatsWorking, whatsBroken, biggestOpportunity).
- Tool use with `submit_audit` tool for structured output.
- Model: `claude-sonnet-4-6`, max_tokens 4000.
- Returns the structured `{ scores, swot, narrative }`.

Voice in the system prompt: honest, specific, warm but direct. Never generic. "No sitemap" not "SEO needs work."

- [ ] **Step 2: Commit**

```bash
git add api/audit/score.ts
git commit -m "add AI-powered site scoring - SWOT, score cards, narrative via Claude"
```

---

## Task 4: Audit Retrieval Endpoint

**Files:**
- Create: `api/audit/[id].ts`

- [ ] **Step 1: Build the retrieval endpoint**

GET endpoint that reads `id` from query params, fetches from `site_audits` table, returns the full audit object. 404 if not found.

- [ ] **Step 2: Commit**

```bash
git add api/audit/[id].ts
git commit -m "add audit retrieval endpoint for shareable URLs"
```

---

## Task 5: The Audit Page (Astro + Island)

**Files:**
- Create: `src/pages/audit.astro`
- Create: `public/islands/audit-engine.js`

The main interactive surface. 5 phases, each revealed progressively:

### Phase 1: URL Input
- `h1`: "what's your site doing?"
- Subtitle: "type in a URL. get an honest read in 30 seconds."
- Text input + "analyze" button
- Note: "free. no login. the analysis is the pitch."

### Phase 2: Crawl Results (appears after crawl completes)
- Spinner + status label ("reading the site..." -> "analyzing..." -> "done.")
- Details grid: platform, server-rendered, HTTPS, response time, sitemap, structured data, images without alt, agent-discoverable
- Score cards grid: 5 cards, each with large letter grade (colored: A/B green, C gold, D/F red), category label, score bar, findings list

### Phase 3: SWOT + Narrative (appears after AI scoring completes)
- Narrative headline (large, serif)
- Two-column: "what's working" / "what's not"
- Full-width "biggest opportunity" with gold accent border
- SWOT 2x2 grid: S (green), W (red), O (gold), T (neutral)
- "now tell me about the business" continue button

### Phase 4: Questionnaire (5 questions, one at a time)
- Q1: "what does a good month look like for your business?" (textarea)
- Q2: "where do your customers usually find you?" (pill buttons: instagram, google, word of mouth, farmers market, wholesale, other)
- Q3: "when someone lands on your site, what do you want them to feel?" (textarea)
- Q4: "what's the one thing about your business you wish more people knew?" (textarea)
- Q5: "how ambitious do you want to get?" (pills: fix what's broken, level up, blow their minds)

### Phase 5: Outro
- "here's who's building this"
- Portfolio cards: campos.works (studio), reframed.works (product)
- Shareable audit URL
- Cal.com CTA: "let's talk about what's next"

- [ ] **Step 1: Create audit.astro page**

Astro page using the Page layout. Contains all 5 phase sections with `class="phase"` (only `.active` is visible). Loads `audit-engine.js` and `cal-embed.js` as inline scripts.

- [ ] **Step 2: Build audit-engine.js**

Vanilla JS island (~200 lines) that orchestrates the flow:
- Handles URL input + analyze button click
- Calls `/api/audit/crawl` then `/api/audit/score` sequentially
- Renders results progressively (crawl details first, then score cards, then SWOT)
- Manages questionnaire flow (one question at a time, auto-advance on pill selection)
- Saves completed audit via `/api/audit/save`
- Handles `?id=` query param on page load to display a saved audit
- All rendering via innerHTML template literals (no framework)

- [ ] **Step 3: Commit**

```bash
git add src/pages/audit.astro public/islands/audit-engine.js
git commit -m "add interactive audit page - crawl, score, SWOT, questionnaire, shareable URL"
```

---

## Task 6: Audit CSS

**Files:**
- Create: `src/styles/audit.css`

- [ ] **Step 1: Write the audit stylesheet**

Extends void architecture tokens from global.css. Key sections:
- Phase transitions (display none/block with fadeIn animation)
- Input row (flex, mono font, gold focus ring)
- Score cards (auto-fit grid, letter grades colored by tier, 3px score bars)
- Details grid (2-column key-value pairs)
- Narrative (serif headline, two-column sections, gold-bordered "biggest opportunity")
- SWOT (2x2 grid, colored headers per quadrant)
- Questionnaire (centered, serif question text, mono inputs, pill buttons with selected state using gold-accent)
- Portfolio cards (grid, border hover effect)
- CTA button (glow background, void text)
- Spinner (12px, gold border-top, rotating)
- Mobile breakpoint at 600px: all grids collapse to single column

- [ ] **Step 2: Import in audit.astro**

- [ ] **Step 3: Commit**

```bash
git add src/styles/audit.css
git commit -m "add audit page styles - void architecture, score cards, SWOT grid, questionnaire"
```

---

## Task 7: Link from Services + Deploy

**Files:**
- Modify: `src/pages/services.astro`

- [ ] **Step 1: Add audit card to services page**

Add a new featured service card at the top of the `.services` grid linking to `/audit`:
- Title: "Free Site Audit"
- Description: "Type in your URL. Get an honest read in 30 seconds - what's working, what's broken, what would change the most."
- Spans full grid width via `.featured` class

- [ ] **Step 2: Add @anthropic-ai/sdk dependency if missing**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 3: Verify build**

```bash
npx astro build 2>&1 | tail -10
```

- [ ] **Step 4: Push and deploy**

```bash
git add -A
git commit -m "link audit tool from services page"
git push origin main
```

- [ ] **Step 5: Run DB migration on production**

- [ ] **Step 6: End-to-end test on production**

Navigate to campos.works/audit, type mariashotsauce.com, verify all 5 phases render correctly, shareable link works, Cal.com CTA works.

---

## Appendix: Full Type Definitions

```typescript
// src/lib/audit-types.ts

export interface CrawlResult {
  url: string;
  domain: string;
  isSSR: boolean;
  htmlContentLength: number;
  hasJsFramework: string | null;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  ogTitle: string | null;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrls: number;
  canonicalUrl: string | null;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  indexablePages: string[];
  responseTimeMs: number;
  contentType: string;
  isHttps: boolean;
  hasViewportMeta: boolean;
  platform: string | null;
  platformEvidence: string[];
  hasAgentJson: boolean;
  hasLlmsTxt: boolean;
  internalLinks: string[];
  externalLinks: string[];
  headings: { level: number; text: string }[];
  images: { src: string; alt: string | null }[];
  imagesWithoutAlt: number;
}

export interface ScoreCard {
  category: string;
  grade: string;
  score: number;
  findings: string[];
}

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface AuditNarrative {
  headline: string;
  whatsWorking: string;
  whatsBroken: string;
  biggestOpportunity: string;
}

export interface QuestionnaireAnswers {
  goodMonth: string;
  customerChannels: string[];
  desiredFeeling: string;
  hiddenStory: string;
  ambitionLevel: "fix" | "level-up" | "blow-minds";
}

export interface SiteAudit {
  id: string;
  domain: string;
  crawl: CrawlResult;
  scores: ScoreCard[];
  swot: SWOT;
  narrative: AuditNarrative;
  questionnaire: QuestionnaireAnswers | null;
  createdAt: string;
}
```

## Env Vars Needed

- `ANTHROPIC_API_KEY` - probably already set on campos.works Vercel project
- `DATABASE_URL` - already set (used by hits.ts, guestbook.ts)

No new dependencies beyond `@anthropic-ai/sdk` (check if already in package.json).
