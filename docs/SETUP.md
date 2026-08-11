# Setup & operations

Everything the Snapshot pipeline needs, what it does without each key, and the
handful of things only you can do.

---

## Things only you can do

### 1. Accept Resend's marketplace terms — blocks report email

The install is provisioned up to the legal acceptance, which is yours to give.

```
https://vercel.com/notaprompt-9428s-projects/~/integrations/accept-terms/resend?source=cli
```

Then finish it:

```sh
vercel integration add resend/resend-email --plan free -m domain=campos.works -m region=us-east-1 -n campos-works-email
```

Free plan. After that Resend will want DNS records on `campos.works` to verify
sending — that is also yours.

**Until this is done, no email is sent to anyone.** The gate copy has been
written to match that truthfully — it says the report opens on the next screen,
not that it will arrive in an inbox. If you wire email later, that copy should
change back.

### 2. Set the environment variables below

Nothing in the list is optional in production except where marked.

---

## Environment variables

| Variable | Required | Without it |
|---|---|---|
| `DATABASE_URL` | **yes** | No storage: no gate, no share links, no leads, no Index. Already set. |
| `ANTHROPIC_API_KEY` | **yes** | Live Snapshots fall back to free providers; quality drops at the conversion moment. Already set. |
| `ADMIN_TOKEN` | **yes** | `/admin/pipeline` and `/api/leads/export` return 503. Fails closed. |
| `IP_HASH_SALT` | **yes** | Rate limiting and IP pseudonymity run on a publicly known default salt. |
| `BRAVE_SEARCH_API_KEY` | recommended | Named competitors, search visibility, and the frontier mirror's live sourcing all report "not checked". Free tier, 2k queries/month. **Highest-value key to add.** |
| `YELP_API_KEY` | recommended | No review data. Reviews are the most persuasive section for a local owner. Free tier. |
| `GOOGLE_PLACES_API_KEY` | optional | No Google Business Profile rating or review count. Cheap, ~$17/1000. |
| `OLIVER_API_KEY` + `OLIVER_BASE_URL` | optional | OmniRoute / any OpenAI-compatible gateway. Used free-first for bulk and utility work. Already set. |
| `GROQ_API_KEY` | optional | One fewer free provider in the fallback chain. |
| `CEREBRAS_API_KEY` | optional | Same. |
| `GEMINI_API_KEY` | optional | Same. |
| `MISTRAL_API_KEY` | optional | Same. |
| `FREE_FIRST_TIERS` | optional | Defaults to `bulk,utility`. Add `snapshot` only if you want to test running the live report on free inference — see the note below before you do. |

```sh
vercel env add ADMIN_TOKEN production
vercel env add IP_HASH_SALT production
vercel env add BRAVE_SEARCH_API_KEY production
```

### On `FREE_FIRST_TIERS`

The live Snapshot deliberately runs on Sonnet 5 (~4¢) rather than free
inference. It is the artifact that turns a stranger into a client, and free
endpoints are rate-limited and quality-variable in exactly the moments traffic
spikes. Bulk generation is the opposite case — hundreds of reports where
per-call quality matters less than being able to run them at all — which is why
`bulk` and `utility` are free-first by default.

---

## Commands

```sh
npm run verify      # typecheck + tests + build. Run before every deploy.
npm test            # 51 tests
npm run typecheck
npm run build

# Bulk pre-generation for cold outreach
npm run bulk -- targets.csv --dry-run --limit 3   # always start here
npm run bulk -- targets.csv --concurrency 2
```

`targets.csv` is one domain per line, or a CSV with a `domain` / `website` /
`url` column. Extra columns pass through to the output. Output lands in
`out/bulk-YYYY-MM-DD.csv` with a share link and a drafted email per business,
and the run is resumable — re-running skips anything already written.

---

## The surfaces

| Path | What it is | Gated |
|---|---|---|
| `/snapshot` | The main event. URL or describe → report. | Report is gated on name + email |
| `/snapshot?url=domain.com` | Starts an analysis on arrival. Use in outreach. | Gated |
| `/snapshot?s=TOKEN` | Opens a report already generated. | **Ungated** — see below |
| `/ai-visibility` | Ungated hook. Does an assistant name you? | No |
| `/the-index` | Aggregate research. Publishes at ≥5 per category. | No |
| `/services` + 8 sub-pages | The offering. | No |
| `/work` | What actually exists, with a "what I have not done" section. | No |
| `/contact` | Booking and email, context-aware. | No |
| `/admin/pipeline?token=…` | The warm list, funnel, corrections. | `ADMIN_TOKEN` |
| `/api/leads/export?token=…` | CSV of the warm list. | `ADMIN_TOKEN` |

### Why share links are ungated

The outreach email promises "nothing to sign up for", so gating the link would
make it a lie. Beyond that, a report someone can forward to a business partner
is distribution. The gate exists to capture whoever *runs a new analysis*, not
to stop someone sharing a finished one. Tokens are 192 bits from a CSPRNG, so
possession of the link is the authorisation.

---

## The gate

`/api/snapshot/run` stores findings server-side and returns only a teaser plus
an id. `/api/snapshot/unlock` is the only path that reads them out. There is no
hidden element to delete and no JSON in the network tab — the report is not
concealed on the page, it was never sent.

Email validation runs syntax → disposable-domain blocklist → placeholder
detection → live MX/DNS lookup, plus a honeypot field and a submit-timing check.

**Role addresses (`info@`, `office@`, `service@`) are deliberately accepted.**
For most trades that is the owner's real inbox; blocking them would reject the
actual buyers.

---

## What to watch

`/admin/pipeline` shows the funnel from the `events` table.

- **Gate conversion below 35%** — the teaser is showing too much or too little.
  Above 45% is healthy.
- **Corrections** — every owner correction is logged with what changed. This is
  the only feedback loop `api/_lib/niches.ts` will ever get. Read them weekly;
  they tell you exactly where the machine is wrong.
- **Unclaimed snapshots** — bulk-generated, or someone who bounced at the gate.
  Both are outreach targets, for different reasons.

---

## Security notes

- **SSRF guard** (`api/_lib/ssrf.ts`) validates every outbound fetch: scheme,
  port, and every resolved address, re-checked on each redirect hop. Covered by
  13 tests including encoded-loopback bypasses. `/api/snapshot/run` is public
  and fetches a stranger's URL, so this is load-bearing — do not weaken it.
- **Share tokens** are `randomBytes(24)`, 192 bits.
- **`hashIp`** is HMAC-SHA256 keyed on `IP_HASH_SALT`. The IPv4 space is 2³², so
  an unkeyed hash would be reversible in seconds.
- **Pre-existing, not addressed:** `api/admin/visitors.ts` authenticates against
  a SHA-256 hash hardcoded in source. If this repo is or becomes public, that is
  an unsalted hash of a password sitting in git history and is brute-forceable.
  Worth moving to `ADMIN_TOKEN` like the newer endpoints — left alone because it
  is outside what was asked.

---

## Drift guards

The offering used to live in six places and they disagreed — five agent surfaces
were advertising services and prices that no longer existed. Now:

- `api/_lib/offering.ts` is the single machine-readable source. Every agent
  endpoint (`/api/agent/profile`, `/api/agent/context`, `/api/agent/a2a`) reads
  from it.
- `src/data/services.ts` is the single human-facing source for the pages.
- `tests/offering.test.ts` fails the build if the two disagree on slugs, names,
  questions, or prices — it caught three mismatches the first time it ran.
- `tests/no-unguarded-fetch.test.ts` scans every server file for raw fetches
  that follow redirects or skip the SSRF guard, so that class of bug cannot be
  reintroduced anywhere in `api/`.

## Known gaps

- **Report email** — blocked on the Resend terms acceptance above.
- **OG images for share links** — a shared `/snapshot?s=…` link currently uses
  the site-wide preview image rather than one showing the business's own numbers.
  Worth doing before any volume of cold outreach; a preview showing "health 42 ·
  $38k/yr leaking" is far more clickable than a generic card.
- **`/audit` is superseded by `/snapshot`** but still reachable, so existing
  saved-audit links keep working. Its crawl endpoint had an unguarded SSRF
  (a function named `safeFetch` that followed redirects with no address checks);
  that is now routed through the real guard. The whole `/audit` surface and
  `api/audit/*` can be retired when you are comfortable orphaning old links.
