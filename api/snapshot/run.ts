// POST /api/snapshot/run
//
// The whole pipeline. Deterministic work first (free), then one judgment call.
//
// THE GATE: this endpoint returns a teaser and an id. The findings themselves
// are written to the database and never sent to the browser here. Only
// /api/snapshot/unlock, after a verified email, reads them back out. That is
// what makes the gate real — there is no hidden div to delete and no JSON blob
// in the network tab.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { crawl, scoreParts, healthScore, type CrawlResult, type PartScore } from '../_lib/crawl.js';
import { detectNiche, nicheById, nicheOptions } from '../_lib/niches.js';
import { gatherPresence, presenceFindings, deriveLocality, type PresenceResult } from '../_lib/presence.js';
import { frontierMirror, type FrontierMirror } from '../_lib/frontier.js';
import { analyze, type ModelReport } from '../_lib/analyze.js';
import { sql, ensureSchema, dbConfigured, track, hashIp, clientIp, overRateLimit, shareToken } from '../_lib/db.js';
import { adminHeaderMatches } from '../_lib/adminauth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ip = clientIp(req.headers as Record<string, string | string[] | undefined>);
  const ipHash = hashIp(ip);

  const body = (req.body || {}) as { url?: string; describe?: string; nicheId?: string; source?: unknown };
  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const describe = typeof body.describe === 'string' ? body.describe.trim() : '';

  if (!rawUrl && describe.length < 20) {
    return res.status(400).json({ error: 'Give me a website, or tell me about the business in a sentence or two.' });
  }

  // The owner has to be able to test his own funnel. A valid admin header
  // skips the throttle — and so does an owner cookie, because a browser will
  // not send a custom header and the owner is the person most likely to run
  // this repeatedly.
  const cookies = String(req.headers.cookie || '');
  const ownerCookie = /(?:^|;\s*)cw_owner=([^;]+)/.exec(cookies)?.[1];
  const isAdmin = Boolean(
    process.env.ADMIN_TOKEN &&
      (adminHeaderMatches(req, process.env.ADMIN_TOKEN) ||
        (ownerCookie && ownerCookie === process.env.ADMIN_TOKEN))
  );

  // 6/hour turned out to be too tight: a genuinely curious owner checks their
  // own site, a competitor, and a second location before they have decided
  // anything. It is also per-IP, so everyone behind one office NAT shares it.
  const RATE_MAX = parseInt(process.env.SNAPSHOT_RATE_LIMIT || '30', 10) || 30;

  if (dbConfigured()) {
    try {
      await ensureSchema();
      if (!isAdmin && await overRateLimit(ipHash, 'snapshot_run', RATE_MAX, 60)) {
        return res.status(429).json({
          error: "That's a few too many in an hour. Email alex@campos.works and I'll just run it for you.",
        });
      }
    } catch { /* never block on infrastructure */ }
  }

  await track('snapshot_run', { meta: { hasUrl: Boolean(rawUrl), described: Boolean(describe) }, ipHash });

  // ── 1. Crawl (free, deterministic) ──
  const crawled = rawUrl
    ? await crawl(rawUrl)
    : ({ ok: false, error: 'no website given', domain: '', bodyText: '', headings: [], socialProfiles: [], zips: [], states: [] } as unknown as CrawlResult);

  if (rawUrl && !crawled.ok) {
    return res.status(422).json({ error: crawled.error, canDescribe: true });
  }

  // ── 2. Classify (free) ──
  const detected = detectNiche({
    title: crawled.title,
    description: crawled.description,
    headings: (crawled.headings || []).map((h) => h.text),
    bodyText: crawled.bodyText,
    hint: describe || null,
  });
  const pack = body.nicheId ? nicheById(String(body.nicheId)) : detected.pack;

  // ── 3. Score (free, deterministic) ──
  const parts = crawled.ok ? scoreParts(crawled) : [];

  // ── 4. Off-site presence + frontier (mostly free) ──
  const locality = deriveLocality(crawled.zips || [], crawled.states || [], crawled.bodyText || '');
  const provisionalName = (crawled.title || '').split(/[|\-–—:]/)[0].trim() || crawled.domain || '';

  const [presence, frontier] = await Promise.all([
    gatherPresence({
      domain: crawled.domain || '',
      businessName: provisionalName,
      nicheLabel: pack.label,
      locality,
      socialProfiles: crawled.socialProfiles || [],
    }),
    frontierMirror(pack.label, pack.id),
  ]);

  // Fold presence into the front-door score.
  const pf = presenceFindings(presence);
  const front = parts.find((p) => p.slug === 'front-door');
  if (front) {
    front.score = Math.max(0, Math.min(100, front.score + pf.delta));
    front.findings.push(...pf.findings);
    front.grade = front.score >= 90 ? 'A' : front.score >= 80 ? 'B' : front.score >= 68 ? 'C' : front.score >= 55 ? 'D' : 'F';
  }

  const health = parts.length ? healthScore(parts) : 0;

  // ── 5. The single judgment call ──
  let report: ModelReport;
  let modelMeta = { model: 'none', costCents: 0, fallback: false };
  try {
    const result = await analyze({
      pack, crawl: crawled, parts, presence, locality, described: describe,
    });
    report = result.data;
    modelMeta = { model: result.meta.model, costCents: result.meta.costCents, fallback: result.meta.fallback };
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    // Goes to the platform log. A generic message to the visitor is right; a
    // generic message in the log means debugging production by guesswork.
    console.error('[snapshot] model call failed:', detail, err);
    await track('snapshot_model_fail', { meta: { err: detail }, ipHash });
    // Header only. A token in a query string lands in access logs, browser
    // history, and Referer headers — it is a secret written down in public.
    const admin = isAdmin;
    return res.status(503).json({
      error: "The analysis engine didn't come back this time. Try again in a minute, or email alex@campos.works and I'll run it by hand.",
      ...(admin ? { detail } : {}),
    });
  }

  const totalLow = report.leaks.reduce((a, l) => a + (l.costLow || 0), 0);
  const totalHigh = report.leaks.reduce((a, l) => a + (l.costHigh || 0), 0);

  // Full findings — stored, never returned by this endpoint.
  const full = {
    report,
    parts,
    presence,
    frontier,
    niche: { id: pack.id, label: pack.label, confidence: detected.confidence, matched: detected.matched },
    locality,
    health,
    totals: { low: totalLow, high: totalHigh },
    crawlSummary: crawled.ok
      ? {
          finalUrl: crawled.finalUrl, platform: crawled.platform, responseTimeMs: crawled.responseTimeMs,
          isSSR: crawled.isSSR, isHttps: crawled.isHttps, wordCount: crawled.wordCount,
          pagesRead: crawled.pagesRead, hasJsonLd: crawled.hasJsonLd, hasAgentJson: crawled.hasAgentJson,
          hasLlmsTxt: crawled.hasLlmsTxt, sitemapUrls: crawled.sitemapUrls,
        }
      : null,
    generatedAt: new Date().toISOString(),
  };

  // The teaser is everything we are willing to show for free. It has to be
  // enough to prove the work is real, and not enough to be the report.
  const teaser = {
    businessName: report.businessName,
    whatTheyDo: report.whatTheyDo,
    niche: pack.label,
    nicheConfidence: detected.confidence,
    locality,
    health,
    grades: parts.filter((p) => !p.notVisible).map((p) => ({ label: p.label, grade: p.grade })),
    leakCount: report.leaks.length,
    findingCount: parts.reduce((a, p) => a + p.findings.length, 0),
    estLow: totalLow,
    estHigh: totalHigh,
    /** One real finding, as proof this is not a template. */
    sampleFinding: report.leaks[0]
      ? { name: report.leaks[0].name, evidence: report.leaks[0].evidence }
      : null,
    reviewsChecked: presence.reviews.state !== 'not_checked',
    competitorsFound: presence.competitors.data?.length || 0,
    frontierItems: frontier.items.length,
    pagesRead: crawled.pagesRead?.length || 0,
  };

  let id: string | null = null;
  let token: string | null = null;
  if (dbConfigured()) {
    try {
      token = shareToken();
      const rows = await sql`
        INSERT INTO snapshots (
          domain, input_kind, raw_input, niche_id, niche_label, niche_conf, zip,
          crawl, enrichment, report, teaser, model, cost_cents, share_token, source, ip_hash
        ) VALUES (
          ${crawled.domain || null},
          ${rawUrl ? 'url' : 'described'},
          ${rawUrl || describe.slice(0, 2000)},
          ${pack.id}, ${pack.label}, ${detected.confidence},
          ${locality || null},
          ${crawled.ok ? JSON.stringify(crawled) : null},
          ${JSON.stringify({ presence, frontier })},
          ${JSON.stringify(full)},
          ${JSON.stringify(teaser)},
          ${modelMeta.model}, ${modelMeta.costCents},
          ${token},
          ${body.source ? JSON.stringify(body.source) : null},
          ${ipHash}
        )
        RETURNING id
      `;
      id = rows[0]?.id ?? null;
    } catch (err) {
      await track('snapshot_save_fail', { meta: { err: String(err) }, ipHash });
    }
  }

  await track('snapshot_ready', { snapshotId: id, meta: { niche: pack.id, health, leaks: report.leaks.length }, ipHash });

  return res.json({
    id,
    gated: true,
    teaser,
    nicheOptions: nicheOptions(),
    // Deliberately absent: report, parts, presence, frontier.
  });
}
