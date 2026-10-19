# Maintaining campos.works

How the site is kept current, what regenerates what, and the rules for what
goes public. `docs/SETUP.md` covers the Snapshot pipeline, which is
unpublished (see "Unpublished pages").

## Deploying

Pushing to `main` deploys to campos.works through Vercel, usually live within a
minute. There is no staging step, so verify before pushing:

```sh
npm run verify      # typecheck + build + tests
```

Then confirm on the live site, for example:

```sh
curl -s "https://campos.works/?v=$(date +%s)" | grep -c "understand the intricate"
```

**Commits:** public repo. Message is the change only. No Claude co-author line.

## Routine refreshes

All of these read the machine read-only and publish counts or shapes, never
content.

| What | Command | Writes | Feeds |
|---|---|---|---|
| Desk numbers | `node scripts/bake-office.mjs` | `src/data/office.json` | home "on this desk" line and the terminal's memory count |
| Project figures | `python3 scripts/dither-thumbs.py` | `public/images/thumbs/` | the animated marks on home and /projects |
| CREATURE constellation | `scripts/constellation/` pipeline (below) | `public/creature/constellation3d.json` | the 3D graph on the CREATURE pages |
| Weekly drift check | automatic, see below | a report, never the site | what to fix next |
| Weekly pulse | automatic, see below | site copy, after approval | the maintenance paragraph |
| OG image | `npm install canvas && node scripts/generate-og-image.js` | `public/og-image.png` | link previews |

Run a refresh, then `npm run verify`, then commit and push.

### Project figures

`python3 scripts/dither-thumbs.py` (needs numpy and Pillow)

- One animated, one-bit figure per project, drawn from that system's own
  mechanism. The docstring at the top of the script describes each one.
- Real data used, numbers only:
  - `~/.deuce/crossvenue.db` for DEUCE
  - `~/distillery/distillery.db` for Distillery
  - `src/data/creature.json` for CREATURE's organ counts

  If a database is missing, that figure falls back to seeded data, so the
  script always runs.
- Output per project: `<slug>-64.png` (home) and `<slug>-96.png` (/projects).
  Each is a 12-frame sprite strip used as a CSS mask, so it takes the theme's
  gold in dark and light mode.
- Captions live in `MARKS` in the script and are written to `marks.json`.
- Frame 0 is the still. Hovering or focusing a card plays the loop. Visitors
  with reduced motion see frame 0 only.
- **New project:** add its markdown, add an entry to `MARKS` (otherwise it
  borrows Cipher's figure), rerun the script, and look at the result before
  pushing.

### CREATURE constellation

Run in order from `scripts/constellation/`:

1. `export_topology.py`
2. `layout3d.cjs`
3. `export3d.py`

Intermediate files go to `$TMPDIR`. Positions are quantized and the output
carries no memory content.

### Weekly drift check

`node scripts/site-drift.mjs` checks what the site says against what is true.
It runs from launchd `com.creature.site-drift` on Sundays at 09:30, before the
pulse. It never edits the site.

- **Report:** `~/.creature/site-drift/YYYY-MM-DD.md`, grouped into "fix",
  "look at" and "for the record."
- **Notice:** one line in `~/.creature/notify/`.

What it checks:

- **Projects:** each project's last commit and data activity against the status
  the site gives it. Local paths are in `SOURCES`.
- **Claims:** numbers written in prose against their source (`CLAIMS`). Add an
  entry whenever copy quotes a number that can go stale.
- **Numbers:** dated project metrics, and the desk numbers against the live
  databases.
- **Figures:** whether the data behind the dithered figures has changed since
  they were drawn (the `inputs` in `marks.json`).
- **Pages and links:** every page in the live sitemap, plus project repo and
  demo links. npm links are checked through the registry.
- **Sanitize:** prices, consulting or booking language, the employer named
  outside the resume, or a family relationship on any live page.
- **GitHub:** linked repos that are not public, and public repos pushed in the
  last 30 days that the site does not mention.
- **Resume:** whether the PDF resume changed after the site's resume page.
- **Writing:** days since the last published essay.

Flags: `--no-network` skips the live site and GitHub; `--quiet` skips the
notice. Network checks need to run outside a sandbox.

### Weekly pulse

- launchd `com.creature.site-pulse` runs `scripts/project-pulse.mjs --propose`
  on Sundays at 10:00.
- It drafts a short maintenance paragraph and files it with herald. The site is
  not touched.
- To publish it: `herald approve <stem>`, then
  `node scripts/project-pulse.mjs --apply-decided`, which injects, commits and
  pushes.

## Where copy lives

| Copy | File |
|---|---|
| Home intro and the terminal lines (`statusLines`) | `src/pages/index.astro` |
| About page and its terminal lines | `src/pages/about.astro` |
| Projects (title, tagline, status, order, stack) | `src/content/projects/*.md` |
| Essays (only `status: published` shows) | `src/content/essays/` |
| Resume | `src/pages/resume.astro`, kept in step with the PDF resume |
| Work page | `src/pages/work.astro` |
| CREATURE anatomy census (frozen August 2026) | `src/data/creature.json` |

The home page shows the three projects with the lowest `order`.

The terminal component is `src/components/TerminalLine.astro`. Its first line
is what shows before JavaScript loads and for reduced motion, so keep the motto
there.

## Machine-readable surfaces

These describe the site to search engines and AI agents. Keep them in step with
each other:

- `public/llms.txt`
- `public/agent.json`
- `public/.well-known/agent.json`
- `public/.well-known/a2a-agent-card.json`
- `public/openapi.json`
- `api/_lib/person.ts`, the one profile the three agent endpoints
  (`api/agent/profile`, `context`, `a2a`) return
- the Person JSON-LD in `src/layouts/Base.astro`

None of them lists services, prices or booking.

`api/_lib/offering.ts` and `src/data/services.ts` still hold the old offer
data. A drift test (`tests/offering.test.ts`) keeps the two in agreement, and
the Snapshot API still uses them, but no public page or agent endpoint shows
them.

## Unpublished pages

Astro skips files whose names start with `_`. These are kept but not built:

- `src/pages/_services/`
- `_snapshot.astro`
- `_ai-visibility.astro`
- `_audit.astro`
- `_the-index.astro`

Rename one to bring it back. Before you do, remember these pages are a
consulting funnel. Check the wording about your employer and the price copy
first, and put the services nav, footer links and agent listings back
deliberately rather than all at once.

## What stays off the site

- **Employer:** named on the resume only. Elsewhere it is "bank operations."
- **Family:** no names. Client work is described by the business, not the
  relationship.
- **Money:** no prices, rates or P&L. DEUCE stays described as paper-only until
  that is no longer true.
- **Private systems:** counts, shapes and figures only. No memory content, no
  conversation text.
- **Evaluation work:** none of the client task content, internal instructions,
  pay figures, or names of managers or leads.

## Known open items

- CREATURE's project tagline says "fifteen organs"; the anatomy page counts 46.
- The side panels (the dog and the music player) overlap the content at
  around 1100px wide.
- `docs/SETUP.md` describes the Snapshot pipeline, which is currently
  unpublished.
