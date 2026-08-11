#!/usr/bin/env node --experimental-strip-types --no-warnings
//
// bulk-snapshot — pre-generate Snapshots for a list of businesses.
//
// This is the engine behind distribution Play 1: run the analysis on 40 real
// local businesses, then send each owner a link to their own finished report.
// The artifact is the pitch, so the artifact has to exist before the email does.
//
// Runs on the `bulk` model tier, which is free-first — 40 reports cost roughly
// nothing. Quality per report is slightly below the live Snapshot; that is the
// correct trade for volume, and any owner who clicks through gets the full
// live-quality experience when they interact.
//
// USAGE
//   node --experimental-strip-types scripts/bulk-snapshot.mjs targets.csv
//   node --experimental-strip-types scripts/bulk-snapshot.mjs targets.csv --dry-run
//   node --experimental-strip-types scripts/bulk-snapshot.mjs targets.csv --concurrency 3 --limit 20
//
// INPUT   one domain per line, or a CSV with a `domain` (or `website`/`url`) column.
//         Extra columns are carried through to the output untouched.
// OUTPUT  out/bulk-YYYY-MM-DD.csv — outreach-ready, with a share link and a
//         drafted email per business.
//
// Resumable: domains already present in the output file are skipped, so an
// interrupted run picks up where it stopped.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { register } from 'node:module';

// The api/ sources import each other with `.js` extensions (what Vercel's build
// emits). Map those back to `.ts` so this script can use them directly.
register('./ts-resolve.mjs', import.meta.url);

// ── env ───────────────────────────────────────────────────────────
// Load .env.local the same way Vercel would, without adding a dependency.
function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!m) continue;
      let v = m[2].trim().replace(/^["']|["']$/g, '');
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const { crawl, scoreParts, healthScore } = await import('../api/_lib/crawl.ts');
const { detectNiche } = await import('../api/_lib/niches.ts');
const { gatherPresence, presenceFindings, deriveLocality } = await import('../api/_lib/presence.ts');
const { frontierMirror } = await import('../api/_lib/frontier.ts');
const { analyze } = await import('../api/_lib/analyze.ts');
const { sql, ensureSchema, dbConfigured, shareToken } = await import('../api/_lib/db.ts');

// ── args ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const inputPath = argv.find((a) => !a.startsWith('--'));
const DRY = Boolean(flag('dry-run', false));
const CONCURRENCY = Math.max(1, Math.min(6, parseInt(flag('concurrency', '2'), 10) || 2));
const LIMIT = parseInt(flag('limit', '0'), 10) || 0;
const OUT_DIR = String(flag('out', 'out'));

if (!inputPath) {
  console.error('usage: bulk-snapshot.mjs <targets.csv> [--dry-run] [--concurrency N] [--limit N]');
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error(`no such file: ${inputPath}`);
  process.exit(1);
}

// ── csv ───────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function csvCell(v) {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // spreadsheet formula injection
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function readTargets(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const rows = parseCsv(raw);
  if (!rows.length) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const domainCol = header.findIndex((h) => ['domain', 'website', 'url', 'site'].includes(h));

  // No header row: treat every line as a bare domain.
  if (domainCol === -1) {
    return rows.map((r) => ({ domain: r[0].trim(), extra: {} })).filter((t) => t.domain);
  }

  return rows.slice(1).map((r) => {
    const extra = {};
    header.forEach((h, i) => { if (i !== domainCol && h) extra[h] = r[i] || ''; });
    return { domain: (r[domainCol] || '').trim(), extra };
  }).filter((t) => t.domain);
}

function normalizeDomain(d) {
  return d.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').trim().toLowerCase();
}

// ── the outreach draft ────────────────────────────────────────────
// Deterministic, from the real top leak. 90–130 words, no mention of how they
// were found, no claimed attachment, one ask, and an explicit no-follow-up.
function draftEmail(name, report, url) {
  const leak = (report.leaks || [])[0];
  if (!leak) return '';
  const cost =
    leak.costLow && leak.costHigh
      ? `Usually $${leak.costLow.toLocaleString()}–$${leak.costHigh.toLocaleString()} a year in this trade.`
      : '';
  return [
    `Subject: ${leak.name.toLowerCase()}`,
    '',
    `I ran a read on ${name} this morning — the kind of thing I do for operations work.`,
    '',
    `${leak.evidence} ${cost}`.trim(),
    '',
    `Full read here, free, nothing to sign up for: ${url}`,
    '',
    `If it's useful, I fix that specific thing for a fixed price. If it isn't, ignore this — I won't follow up.`,
    '',
    '— Alex',
    'alex@campos.works',
  ].join('\n');
}

// ── run ───────────────────────────────────────────────────────────
const OUT_COLS = [
  'domain', 'business_name', 'niche', 'locality', 'health',
  'top_leak', 'top_leak_evidence', 'est_low', 'est_high',
  'reviews', 'assistant_names_them', 'snapshot_url', 'draft_email', 'status', 'ran_at',
];

async function main() {
  const targets = readTargets(inputPath);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `bulk-${new Date().toISOString().slice(0, 10)}.csv`);

  // Resume: skip anything already written.
  const done = new Set();
  if (fs.existsSync(outPath)) {
    for (const r of parseCsv(fs.readFileSync(outPath, 'utf8')).slice(1)) {
      if (r[0]) done.add(normalizeDomain(r[0]));
    }
  } else {
    fs.writeFileSync(outPath, OUT_COLS.join(',') + '\n');
  }

  let queue = targets.filter((t) => !done.has(normalizeDomain(t.domain)));
  if (LIMIT) queue = queue.slice(0, LIMIT);

  console.log(`${targets.length} targets · ${done.size} already done · ${queue.length} to run`);
  console.log(`concurrency ${CONCURRENCY}${DRY ? ' · DRY RUN (nothing saved)' : ''}`);
  if (!DRY && !dbConfigured()) {
    console.log('! DATABASE_URL not set — reports will be generated but not saved, so share links will be blank.');
  }
  console.log('');

  if (!DRY && dbConfigured()) await ensureSchema();

  let i = 0, ok = 0, failed = 0;
  const started = Date.now();

  async function worker(id) {
    while (true) {
      const idx = i++;
      if (idx >= queue.length) return;
      const target = queue[idx];
      const domain = normalizeDomain(target.domain);
      const label = `[${String(idx + 1).padStart(3)}/${queue.length}]`;

      try {
        const row = await one(domain, target.extra);
        fs.appendFileSync(outPath, OUT_COLS.map((c) => csvCell(row[c])).join(',') + '\n');
        ok++;
        console.log(`${label} ✓ ${domain} — ${row.health || '–'} · ${row.top_leak || 'no leaks found'}`);
      } catch (err) {
        failed++;
        const row = { domain, status: `failed: ${err.message}`, ran_at: new Date().toISOString() };
        fs.appendFileSync(outPath, OUT_COLS.map((c) => csvCell(row[c])).join(',') + '\n');
        console.log(`${label} ✗ ${domain} — ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, n) => worker(n)));

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log('');
  console.log(`done — ${ok} ok, ${failed} failed, ${mins} min`);
  console.log(`→ ${outPath}`);
  if (ok) {
    console.log('');
    console.log('Next: read a few of these yourself before sending anything. The machine’s');
    console.log('credibility is the whole business, and a bad report burns a prospect forever.');
  }
}

async function one(domain, extra) {
  const crawled = await crawl(domain);
  if (!crawled.ok) throw new Error(crawled.error || 'could not read site');

  const detected = detectNiche({
    title: crawled.title,
    description: crawled.description,
    headings: (crawled.headings || []).map((h) => h.text),
    bodyText: crawled.bodyText,
  });
  const pack = detected.pack;

  const parts = scoreParts(crawled);
  const locality = deriveLocality(crawled.zips || [], crawled.states || [], crawled.bodyText || '');
  const businessName = (crawled.title || '').split(/[|\-–—:]/)[0].trim() || domain;

  const [presence, frontier] = await Promise.all([
    gatherPresence({
      domain: crawled.domain,
      businessName,
      nicheLabel: pack.label,
      locality,
      socialProfiles: crawled.socialProfiles || [],
    }),
    frontierMirror(pack.label, pack.id),
  ]);

  const pf = presenceFindings(presence);
  const front = parts.find((p) => p.slug === 'front-door');
  if (front) {
    front.score = Math.max(0, Math.min(100, front.score + pf.delta));
    front.findings.push(...pf.findings);
    front.grade = front.score >= 90 ? 'A' : front.score >= 80 ? 'B' : front.score >= 68 ? 'C' : front.score >= 55 ? 'D' : 'F';
  }
  const health = healthScore(parts);

  const result = await analyze({
    pack, crawl: crawled, parts, presence, locality, tier: 'bulk',
  });
  const report = result.data;

  const totalLow = report.leaks.reduce((a, l) => a + (l.costLow || 0), 0);
  const totalHigh = report.leaks.reduce((a, l) => a + (l.costHigh || 0), 0);

  const full = {
    report, parts, presence, frontier,
    niche: { id: pack.id, label: pack.label, confidence: detected.confidence, matched: detected.matched },
    locality, health, totals: { low: totalLow, high: totalHigh },
    generatedAt: new Date().toISOString(),
    generatedBy: 'bulk',
  };

  const teaser = {
    businessName: report.businessName, whatTheyDo: report.whatTheyDo,
    niche: pack.label, locality, health,
    grades: parts.filter((p) => !p.notVisible).map((p) => ({ label: p.label, grade: p.grade })),
    leakCount: report.leaks.length,
    findingCount: parts.reduce((a, p) => a + p.findings.length, 0),
    estLow: totalLow, estHigh: totalHigh,
    sampleFinding: report.leaks[0] ? { name: report.leaks[0].name, evidence: report.leaks[0].evidence } : null,
    reviewsChecked: presence.reviews.state !== 'not_checked',
    competitorsFound: presence.competitors.data?.length || 0,
    frontierItems: frontier.items.length,
    pagesRead: crawled.pagesRead?.length || 0,
  };

  let url = '';
  if (!DRY && dbConfigured()) {
    const token = shareToken();
    await sql`
      INSERT INTO snapshots (
        domain, input_kind, raw_input, niche_id, niche_label, niche_conf, zip,
        crawl, enrichment, report, teaser, model, cost_cents, share_token, source
      ) VALUES (
        ${crawled.domain}, 'url', ${domain},
        ${pack.id}, ${pack.label}, ${detected.confidence}, ${locality || null},
        ${JSON.stringify(crawled)}, ${JSON.stringify({ presence, frontier })},
        ${JSON.stringify(full)}, ${JSON.stringify(teaser)},
        ${result.meta.model}, ${result.meta.costCents}, ${token},
        ${JSON.stringify({ channel: 'bulk', ...extra })}
      )
    `;
    url = `https://campos.works/snapshot?s=${token}`;
  }

  const reviews = presence.reviews.state === 'found'
    ? (presence.reviews.data || []).map((r) => `${r.platform}${r.reviewCount ? ` ${r.reviewCount}` : ''}`).join(' / ')
    : presence.reviews.state;

  return {
    domain,
    business_name: report.businessName,
    niche: pack.label,
    locality,
    health,
    top_leak: report.leaks[0]?.name || '',
    top_leak_evidence: report.leaks[0]?.evidence || '',
    est_low: totalLow,
    est_high: totalHigh,
    reviews,
    assistant_names_them:
      presence.assistantVisibility.state === 'found'
        ? (presence.assistantVisibility.data?.named ? 'yes' : 'no')
        : 'not checked',
    snapshot_url: url,
    draft_email: draftEmail(report.businessName, report, url || 'https://campos.works/snapshot'),
    status: 'ok',
    ran_at: new Date().toISOString(),
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
