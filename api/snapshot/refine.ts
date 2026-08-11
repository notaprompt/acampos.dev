// POST /api/snapshot/refine
//
// The owner tells us we got something wrong; we read their business again with
// the correction applied. This is the most valuable interaction on the site —
// a correction is a stronger buying signal than a form fill, because it means
// they cared enough to argue with it.
//
// Cheap by construction: the crawl and the deterministic scores are reused from
// storage, so nothing is re-fetched. Only the judgment call re-runs. The one
// exception is a change of industry, which invalidates the category-scoped
// probes (competitors, assistant visibility, the frontier mirror) — those are
// re-gathered, because leaving them stale would mean showing the owner
// competitors from a trade they just told us they are not in.
//
// GATE: refuses unless the snapshot has already been unlocked. Otherwise this
// would be a way to read findings without ever giving an email.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scoreParts, healthScore, type CrawlResult, type PartScore } from '../_lib/crawl.js';
import { nicheById, nicheOptions } from '../_lib/niches.js';
import { gatherPresence, presenceFindings, type PresenceResult } from '../_lib/presence.js';
import { frontierMirror } from '../_lib/frontier.js';
import { analyze, type ModelReport } from '../_lib/analyze.js';
import { sql, ensureSchema, dbConfigured, track, hashIp, clientIp, overRateLimit } from '../_lib/db.js';

const MAX_REFINES = 6;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!dbConfigured()) return res.status(503).json({ error: 'Storage is not configured.' });

  const ipHash = hashIp(clientIp(req.headers as Record<string, string | string[] | undefined>));

  const body = (req.body || {}) as {
    id?: string;
    /** Proves the caller holds the link, for reports they never unlocked themselves. */
    shareToken?: string;
    nicheId?: string;
    businessName?: string;
    locality?: string;
    context?: string;
  };

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return res.status(400).json({ error: 'Missing snapshot id.' });

  if (await overRateLimit(ipHash, 'snapshot_refine', MAX_REFINES, 60)) {
    return res.status(429).json({
      error: "You've re-read this a few times now. If it's still not right, email alex@campos.works — I'd genuinely like to know what it got wrong.",
    });
  }

  const corrections = {
    businessName: (body.businessName || '').trim().slice(0, 160) || undefined,
    locality: (body.locality || '').trim().slice(0, 120) || undefined,
    context: (body.context || '').trim().slice(0, 1500) || undefined,
  };
  const nicheId = typeof body.nicheId === 'string' ? body.nicheId.trim() : '';

  if (!nicheId && !corrections.businessName && !corrections.locality && !corrections.context) {
    return res.status(400).json({ error: 'Nothing to correct — change something first.' });
  }

  try {
    await ensureSchema();

    const rows = await sql`SELECT * FROM snapshots WHERE id = ${id}::uuid`;
    if (!rows.length) return res.status(404).json({ error: 'That snapshot has expired. Run a new one.' });
    const snap = rows[0];

    // Authorisation: either they unlocked it themselves, or they hold the share
    // link. A cold-outreach recipient never unlocked anything — and they are
    // precisely the person whose correction is most worth having, because we
    // guessed their industry from outside with nobody to check it.
    const heldToken = typeof body.shareToken === 'string' ? body.shareToken.trim() : '';
    const holdsLink = Boolean(heldToken) && heldToken === snap.share_token;
    if (!snap.unlocked && !holdsLink) {
      return res.status(403).json({ error: 'Open the report first.' });
    }

    const stored = (snap.report || {}) as Record<string, unknown>;
    const crawled = (snap.crawl || null) as CrawlResult | null;
    const prevPresence = ((snap.enrichment as Record<string, unknown>)?.presence || null) as PresenceResult | null;
    const prevFrontier = ((snap.enrichment as Record<string, unknown>)?.frontier || null);

    if (!crawled && !snap.raw_input) {
      return res.status(422).json({ error: 'Not enough stored detail to re-read this one. Run a fresh Snapshot.' });
    }

    const nicheChanged = Boolean(nicheId && nicheId !== snap.niche_id);
    const pack = nicheById(nicheId || String(snap.niche_id || 'general'));
    const locality = corrections.locality || String(snap.zip || (stored.locality as string) || '');

    // Re-score deterministically from the stored crawl — free, and keeps the
    // grades consistent with whatever the report ends up saying.
    let parts: PartScore[] = (stored.parts as PartScore[]) || [];
    let presence = prevPresence;
    let frontier = prevFrontier;

    if (nicheChanged) {
      // The category-scoped probes are now wrong. Re-gather rather than reuse.
      const businessName =
        corrections.businessName ||
        ((stored.report as ModelReport | undefined)?.businessName ?? '') ||
        String(snap.domain || '');

      const [freshPresence, freshFrontier] = await Promise.all([
        gatherPresence({
          domain: String(snap.domain || ''),
          businessName,
          nicheLabel: pack.label,
          locality,
          socialProfiles: crawled?.socialProfiles || [],
        }),
        frontierMirror(pack.label, pack.id),
      ]);
      presence = freshPresence;
      frontier = freshFrontier;

      if (crawled) {
        parts = scoreParts(crawled);
        const pf = presenceFindings(freshPresence);
        const front = parts.find((p) => p.slug === 'front-door');
        if (front) {
          front.score = Math.max(0, Math.min(100, front.score + pf.delta));
          front.findings.push(...pf.findings);
          front.grade =
            front.score >= 90 ? 'A' : front.score >= 80 ? 'B' : front.score >= 68 ? 'C' : front.score >= 55 ? 'D' : 'F';
        }
      }
    }

    if (!presence) {
      return res.status(422).json({ error: 'Not enough stored detail to re-read this one. Run a fresh Snapshot.' });
    }

    const health = parts.length ? healthScore(parts) : (stored.health as number) || 0;

    const result = await analyze({
      pack,
      crawl: crawled || {},
      parts,
      presence,
      locality,
      described: snap.input_kind === 'described' ? String(snap.raw_input || '') : undefined,
      corrections,
    });

    const report = result.data;
    const totalLow = report.leaks.reduce((a, l) => a + (l.costLow || 0), 0);
    const totalHigh = report.leaks.reduce((a, l) => a + (l.costHigh || 0), 0);

    const full = {
      ...stored,
      report,
      parts,
      presence,
      frontier,
      niche: { id: pack.id, label: pack.label, confidence: 1, matched: [], correctedByOwner: nicheChanged },
      locality,
      health,
      totals: { low: totalLow, high: totalHigh },
      corrections,
      refinedAt: new Date().toISOString(),
      revision: ((stored.revision as number) || 1) + 1,
    };

    await sql`
      UPDATE snapshots SET
        report      = ${JSON.stringify(full)},
        enrichment  = ${JSON.stringify({ presence, frontier })},
        niche_id    = ${pack.id},
        niche_label = ${pack.label},
        zip         = ${locality || null},
        cost_cents  = COALESCE(cost_cents, 0) + ${result.meta.costCents}
      WHERE id = ${id}::uuid
    `;

    // A correction tells us what the machine gets wrong. Log it — this is the
    // only feedback loop the niche packs will ever get.
    await track('snapshot_refined', {
      snapshotId: id,
      leadId: snap.lead_id,
      meta: {
        nicheChanged,
        from: snap.niche_id,
        to: pack.id,
        correctedName: Boolean(corrections.businessName),
        correctedLocality: Boolean(corrections.locality),
        gaveContext: Boolean(corrections.context),
        revision: full.revision,
      },
      ipHash,
    });

    return res.json({ ok: true, report: full, nicheOptions: nicheOptions() });
  } catch (err) {
    await track('snapshot_refine_fail', { snapshotId: id, meta: { err: String(err) }, ipHash });
    return res.status(500).json({ error: 'Could not re-read that one. Email alex@campos.works and I will do it by hand.' });
  }
}
