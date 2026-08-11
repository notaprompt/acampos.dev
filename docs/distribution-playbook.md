# Distribution playbook — getting clients, fast

_Written 2026-08-11. The build is done; this is how it gets used._

---

## The situation, honestly

The 2026 market research says three things that matter, and they all point the same way:

1. **Specialists command 30–40% fee premiums over generalists.** Niche beats broad, every time.
2. **73% of buyers now want pricing tied to outcomes**, not hours.
3. **Content marketing is table stakes and no longer differentiates.** The market is saturated with generic AI content. What differentiates in 2026 is *proprietary tools and original research*.

That third point is the whole game. Everyone can write a blog post about AI for small business. Almost nobody has a machine that reads a specific business and tells its owner where it is losing money, with the figures reasoned from that trade's economics.

**You have that machine now. It is the distribution strategy, not a lead magnet for it.**

The corollary is uncomfortable and worth sitting with: every hour spent on generic content is an hour not spent pointing the machine at a named business. Do not write the blog. Run the Snapshot on someone.

---

## The one-line thesis

> The artifact is the pitch. Stop describing what you can do and start showing people what is wrong with their business.

Everything below is a different delivery mechanism for the same artifact.

---

## Play 1 — The Cold Snapshot (start here, this week)

**The move:** pick 40 local businesses in one trade in one zip. Pre-generate a Snapshot for each. Send one short email per owner with a link to their own finished report.

**Why it works:** it inverts cold outreach. You are not asking for their time — you are handing them something specific about their business that took real work and costs them nothing. The reply rate on "here is your competitor's response time versus yours" is not comparable to the reply rate on "I help businesses like yours."

**Mechanics that already exist:**
- `tier: 'bulk'` in `api/_lib/models.ts` runs free-first, so 40 reports cost roughly nothing.
- `/snapshot?url=theirdomain.com` starts the analysis on arrival — they land already watching their own business get read.
- Every unlock lands in `leads` and exports via `/api/leads/export?token=...&format=csv`.

**The email — 90 to 130 words, per your outreach register:**

> Subject: your after-hours calls
>
> I ran a read on [business] this morning — the kind of thing I do for operations work.
>
> The short version: someone who wants a quote at 8pm has no way to get one from you. Your form is business-hours only and the phone goes to voicemail. In landscaping that's usually 20–40% of inbound, and it doesn't show up anywhere because a lead that never becomes a lead doesn't get logged.
>
> Full read here, free, nothing to sign up for: [link]
>
> If it's useful, I fix that specific thing for a fixed price. If it isn't, ignore this and I won't follow up.
>
> — Alex

**Never say how you found them.** Never send a second one if they don't reply.

**Legal, because it matters:** CAN-SPAM permits cold B2B email but requires a real physical postal address in the message, a working unsubscribe, accurate headers, and honoring opt-outs within 10 business days. Put the address in the footer from email one. One unsolicited email with a genuine artifact and no follow-up is defensible; a sequence is not.

**Target:** 40 sends → expect 6–10 opens of the report → 2–4 replies → 1 call. Repeat weekly with a different trade.

---

## Play 2 — The Index (the compounding one)

**The move:** publish **The Northern Virginia Small Business Web Index**. Aggregate, anonymized data from every Snapshot ever run. Update it monthly.

> "We read 340 landscaping, HVAC, and contracting websites across Prince William, Fairfax, and Loudoun counties. 71% have no way to request a quote outside business hours. 4% are readable by an AI assistant. Here is the breakdown by trade and by county."

**Why it works:** this is the "original research and proprietary benchmarks" the market research named as the actual 2026 differentiator. It is also:
- **A press asset.** Local business journals run this. Trade publications run this.
- **An SEO asset** that compounds and cannot be copied, because the data is yours.
- **A reason for every owner in the region to check their own score**, which routes straight back into the Snapshot.
- **Proof of expertise** that no amount of claiming can substitute for.

**Critical:** anonymized and aggregate only. Never publish a named business's grade without their consent. The `snapshots` table has `visibility` defaulting to `private` for exactly this reason. Naming businesses would be a lawsuit and a reputation, in that order.

**Cadence:** first edition at 100 snapshots. Monthly after that.

---

## Play 3 — The AI-visibility wedge (most timely, least contested)

**The hook, which is real:** only about **1.2% of businesses** are ever named when someone asks an AI assistant to recommend a local business. Meanwhile ChatGPT has become the third-most-common source of local business recommendations, behind Google and Facebook.

**The move:** lead with this, everywhere. It is the rare pitch that is simultaneously true, urgent, easy to demonstrate, and almost entirely uncontested by competitors who are still selling "SEO."

The Snapshot already runs the demonstration live — it asks an assistant to recommend businesses in their trade and area and reports whether they were named. Watching an assistant name three competitors and not you is more persuasive than any argument.

**Why this is your wedge specifically:** you already built and shipped the agent-surface layer. `campos.works/agent.json` is live and populated. You are not pitching a theory; you are pointing at your own implementation.

**Angles:**
- "Ask ChatGPT for a plumber in your zip. Does it say your name?" — the entire ad.
- A free standalone checker at `/ai-visibility` that runs just this probe with no email gate, feeding into the full Snapshot.
- Claude answers local questions through open-web signals and `llms.txt` with no business dashboard to claim — meaning there is a real, closeable gap and no platform gatekeeper. Say that plainly.

---

## Play 4 — The chamber play (highest leverage per hour)

**The move:** approach one chamber of commerce or trade association. Offer every member a free Snapshot as a member benefit. You provide the machine; they provide the introduction and the credibility.

**Why it works:** one relationship converts to 200 warm leads with an implicit endorsement attached. Chambers are permanently hunting for member benefits that cost them nothing. This is the single highest ratio of outcome to hours in this document.

**The ask:** a co-branded landing page, one email from them to members, a slot at one meeting. In exchange they get a members-only aggregate report on how their region's businesses actually score — which is a genuinely good asset for them.

**Targets:** Prince William Chamber, Greater Reston, Loudoun County, plus trade associations (VA Nursery & Landscape Association, regional HVAC contractor groups). Start with the one where you have any existing connection at all.

---

## Play 5 — Do the work first (the referral engine)

**The move:** pick 5 local businesses. Fix one real thing for free. Publish the before/after with their permission.

**Why it works:** it converts an empty portfolio into five case studies, five referral sources, and five reference calls in about three weekends. You already have the Orellana landscaping work as proof this shape works — that one client produced a bilingual proposal generator and a QuickBooks integration, both of which are now proof points across three service pages.

**Pick the fix deliberately:** after-hours intake, every time. It is the highest-return item in most trades, it is a 1–2 week build, and the before/after number is unambiguous.

**The rule:** free work gets a written case study and two introductions, agreed up front. Not a favor — a trade.

---

## Play 6 — The clip engine (volume, low effort)

**The move:** Snapshot clip mode → screen recording → short-form video. One take per business, infinite variants by trade and county.

**The format that works:** no talking head, no avatar. Screen recording of a real analysis running on a real (consented or anonymized) business, with a hook overlaid.

- "This landscaping company is losing $40k a year and doesn't know it."
- "I asked ChatGPT for an HVAC company in Woodbridge. Watch who it names."
- "Your competitor answers at 9pm. You don't. Here's what that costs."

**On the tooling question:** Higgsfield is the wrong tool for this — it is built for brand-cinematic and product-insertion work, caps at 5s/720p, and burns credits fast. For B2B local services an AI avatar actively *costs* trust in the body of the content. If you want an avatar hook, Creatify at $19/mo beats it on value; Arcads ($110/mo) only if you later need maximum fidelity. The substance is your own screen recording, which is free and is the part nobody can copy.

**Clip mode is already built** — the toggle on any finished report switches to a 430px vertical, high-contrast layout designed to be recorded.

---

## Play 7 — Adjacent professionals (the quiet channel)

**The move:** the people who already have the trust you are trying to build — accountants, bookkeepers, insurance brokers, commercial realtors, business attorneys — serve exactly your buyer and do not compete with you.

An accountant with 80 small-business clients watches those clients struggle with operations constantly and has nothing to hand them. Give them something to hand over.

**The offer:** a co-branded Snapshot link, and 10% of anything that closes. Or no fee at all, just reciprocity — for a good referral relationship that is often cleaner.

**Why it beats content marketing:** one bookkeeper relationship is worth more than a year of blog posts, and it takes one coffee.

---

## Play 8 — The competitor mirror (potent; handle with care)

**The move:** run a Snapshot on a business's *strongest local competitor* and show them the comparison.

**Why it works:** nothing motivates an owner like seeing that the shop across town answers at 9pm and they don't.

**The care required:** analyzing a public website is fine. But framing it as "here is your competitor's weaknesses" invites you into a fight you do not want, and it makes you look like someone who will do the same to them. **Only ever show the comparison from the recipient's side** — "three of the five businesses ranking above you offer online booking; you don't" — never a named teardown of a third party sent to their rival.

Use aggregate framing. It is more persuasive anyway, and it keeps you the person who is obviously trustworthy.

---

## Sequencing — what to actually do

**Week 1 — prove the machine on real businesses**
- Run Snapshots on 10 local businesses you can name. Read every one yourself. Fix whatever reads wrong.
- This is the single most important week. The machine's credibility is the entire business, and you cannot delegate reading the first ten.

**Week 2 — first cold batch**
- 40 Snapshots in one trade, one county. 40 emails. No follow-ups.
- Measure: report opens, replies, calls booked. Export the list weekly.

**Week 3 — the chamber conversation + free work**
- One chamber approach. Two free fixes started.

**Week 4 — the Index, first edition**
- By now you have 50–100 snapshots. Publish the aggregate. Send it to every local business journal and to the chamber.

**Ongoing weekly rhythm**
- One cold batch (different trade), one clip, one adjacent-professional coffee.

---

## What to measure

The `events` table already tracks the funnel. The numbers that matter:

| Metric | Where | Healthy |
|---|---|---|
| Snapshot started → ready | `snapshot_run` → `snapshot_ready` | > 85% |
| Ready → unlocked (the gate) | `snapshot_ready` → `unlock_success` | > 45% |
| Unlocked → call booked | manual, in `leads.status` | > 8% |
| Cold email → report opened | link params | > 15% |

**If the gate converts below 35%, the teaser is showing too much or too little.** Too little and there is no reason to trade an email; too much and there is no need to.

---

## The things not to do

- **Do not build a course, a newsletter, or a personal brand.** All three are slower than pointing the machine at named businesses, and all three are what everyone else is doing.
- **Do not compete on being an "AI consultant."** The market is consolidating and saturated. You are an operator who ships — that is the 30–40% premium, and it is defensible because it took six years to acquire.
- **Do not discount.** The Teardown at $500 exists so nobody needs a discount to start.
- **Do not scale outreach before the artifact is provably good.** A bad Snapshot sent to 500 people burns 500 prospects permanently. Ten read by hand first.
- **Do not automate the follow-up.** One email, one artifact, no sequence. The restraint is itself a differentiator in a market where everyone is running six-touch cadences.

---

## What's built

- **Share links** — `/snapshot?s=TOKEN` opens a report already generated, ungated. Play 1 is now fully wired: pre-generate, send the link, they land on their own finished read with nothing to sign up for. They can also correct it from there, which is the strongest signal you will get short of a reply.
- **`/ai-visibility`** — ungated, no-email checker. Asks an assistant to recommend a business in a trade and town and shows who it names. The Play 3 hook, live.
- **`/the-index`** — the Play 2 asset. Reads aggregates from `/api/index-stats`, publishes nothing until there are ≥5 businesses in a category, and never names one.
- **`scripts/bulk-snapshot.mjs`** — the Play 1 engine. `node --experimental-strip-types scripts/bulk-snapshot.mjs targets.csv`. Free-first `bulk` tier, resumable, concurrency-capped, and it drafts the outreach email per business from that business's actual top leak. Start with `--dry-run --limit 3`.
- **Corrections** — owners can fix the industry, name, or location and re-read. Every correction is logged to `events` as `snapshot_refined`, which is the only feedback loop the niche packs will ever get. Read those weekly; they tell you exactly where the machine is wrong.

## Open threads

- **Named competitors need `BRAVE_SEARCH_API_KEY`** (free tier, 2k queries/month). Without it that section honestly reports "not checked" — which is fine, but the section is much stronger with it. Highest-value key to add.
- **Review data needs `YELP_API_KEY`** (free) or `GOOGLE_PLACES_API_KEY` (cheap). Reviews are the most persuasive single section for a local business owner. Second-highest-value key.
- **`IP_HASH_SALT`** must be set in production — the default is a placeholder, and rate limiting plus IP pseudonymity both depend on it.
- **OG images** — a shared `/snapshot?s=…` link currently previews with the generic site card. Before running Play 1 at volume, a preview showing the business's own numbers would materially raise click-through.
