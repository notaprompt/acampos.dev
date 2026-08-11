// GET  /api/admin/pipeline   — the whole funnel in one payload
// POST /api/admin/pipeline   — update a lead's status or notes
//
// The warm list has to be workable without downloading a CSV, or it will not get
// worked. This is the surface Alex actually opens each morning.
//
// Auth: ADMIN_TOKEN via the x-admin-token header, compared in constant time.
// Never from a query string — that would put the token in access logs, browser
// history, and Referer headers. Fails closed when unset.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, dbConfigured } from '../_lib/db.js';
import { adminHeaderMatches } from '../_lib/adminauth.js';

const STATUSES = ['new', 'reading', 'contacted', 'replied', 'call_booked', 'won', 'lost', 'ignored'] as const;

function authorized(req: VercelRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return adminHeaderMatches(req, expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!process.env.ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Admin is not configured (set ADMIN_TOKEN).' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!dbConfigured()) return res.status(503).json({ error: 'No database configured.' });

  try {
    await ensureSchema();

    // ── Update a lead ──
    if (req.method === 'POST') {
      const body = (req.body || {}) as { id?: string; status?: string; notes?: string };
      const id = String(body.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing lead id.' });

      const status = typeof body.status === 'string' ? body.status : undefined;
      if (status && !STATUSES.includes(status as (typeof STATUSES)[number])) {
        return res.status(400).json({ error: `Unknown status. One of: ${STATUSES.join(', ')}` });
      }
      const notes = typeof body.notes === 'string' ? body.notes.slice(0, 4000) : undefined;

      const rows = await sql`
        UPDATE leads SET
          status     = COALESCE(${status ?? null}, status),
          notes      = COALESCE(${notes ?? null}, notes),
          updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING id, status, notes, updated_at
      `;
      if (!rows.length) return res.status(404).json({ error: 'No such lead.' });
      return res.json({ ok: true, lead: rows[0] });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'GET or POST' });

    // ── The funnel ──
    // Counted from the events table so the drop-off between stages is visible,
    // which is the only way to know whether the gate is set at the right height.
    const funnel = await sql`
      SELECT kind, count(*)::int AS n
      FROM events
      WHERE kind IN (
        'snapshot_run','snapshot_ready','unlock_attempt','unlock_success',
        'snapshot_refined','snapshot_viewed_by_link','ai_visibility_run','unlock_bot',
        'input_focused','describe_opened','gate_shown','gate_abandoned',
        'report_viewed','clip_mode','printed','link_copied','correction_opened',
        'unlock_owner','gate_field_error'
      )
        AND created_at > now() - interval '90 days'
      GROUP BY kind
    `;

    const daily = await sql`
      SELECT
        date_trunc('day', created_at)::date AS day,
        count(*) FILTER (WHERE kind = 'snapshot_ready')::int   AS ready,
        count(*) FILTER (WHERE kind = 'unlock_success')::int   AS unlocked,
        count(*) FILTER (WHERE kind = 'snapshot_viewed_by_link')::int AS link_views
      FROM events
      WHERE created_at > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1 DESC
    `;

    const leads = await sql`
      SELECT
        l.id, l.created_at, l.updated_at, l.name, l.email, l.email_domain, l.mx_verified,
        l.business_name, l.website, l.niche_label, l.zip, l.health_score,
        l.est_leak_low, l.est_leak_high, l.top_gaps, l.snapshot_count, l.status, l.notes, l.intent,
        s.share_token
      FROM leads l
      LEFT JOIN snapshots s ON s.id = l.last_snapshot
      ORDER BY
        CASE l.status WHEN 'new' THEN 0 WHEN 'replied' THEN 1 WHEN 'call_booked' THEN 2 ELSE 3 END,
        l.created_at DESC
      LIMIT 500
    `;

    // Snapshots nobody claimed — bulk-generated, or someone who bounced at the
    // gate. Both are outreach targets, for different reasons.
    const unclaimed = await sql`
      SELECT id, domain, niche_label, zip, share_token, created_at,
             (report->>'health')::int              AS health,
             (report->'totals'->>'low')::int       AS leak_low,
             (report->'totals'->>'high')::int      AS leak_high,
             (report->'report'->>'businessName')   AS business_name,
             source->>'channel'                    AS channel
      FROM snapshots
      WHERE unlocked = false AND report IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 200
    `;

    // What the machine keeps getting wrong. The only feedback the niche packs get.
    const corrections = await sql`
      SELECT meta, created_at
      FROM events
      WHERE kind = 'snapshot_refined'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Which trades are actually showing up. If one dominates, that is where the
    // niche pack should get deeper and where outreach should concentrate.
    const byNiche = await sql`
      SELECT niche_label AS label, count(*)::int AS n,
             count(*) FILTER (WHERE unlocked)::int AS unlocked,
             round(avg((report->>'health')::numeric))::int AS avg_health
      FROM snapshots
      WHERE niche_label IS NOT NULL
      GROUP BY niche_label ORDER BY count(*) DESC LIMIT 20
    `;

    // What people press once the report is open.
    const clicks = await sql`
      SELECT meta->>'to' AS target, count(*)::int AS n
      FROM events WHERE kind = 'cta_clicked' AND meta->>'to' IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10
    `;

    // How far down the report they actually read.
    const depth = await sql`
      SELECT
        round(avg((meta->>'pct')::numeric))::int                                   AS avg_pct,
        count(*) FILTER (WHERE (meta->>'pct')::int >= 75)::int                     AS read_deep,
        count(*)::int                                                              AS n
      FROM events WHERE kind = 'report_scrolled' AND meta->>'pct' IS NOT NULL
    `;

    // Which field rejects people at the gate.
    const gateErrors = await sql`
      SELECT meta->>'field' AS field, count(*)::int AS n
      FROM events WHERE kind = 'gate_field_error' AND meta->>'field' IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC
    `;

    const spend = await sql`
      SELECT
        round(sum(cost_cents)::numeric, 2)  AS cents_total,
        round(avg(cost_cents)::numeric, 3)  AS cents_avg,
        count(*)::int                       AS n
      FROM snapshots
      WHERE created_at > now() - interval '30 days'
    `;

    const f: Record<string, number> = {};
    for (const r of funnel as { kind: string; n: number }[]) f[r.kind] = r.n;

    return res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      funnel: {
        started: f.snapshot_run || 0,
        ready: f.snapshot_ready || 0,
        gateAttempts: f.unlock_attempt || 0,
        unlocked: f.unlock_success || 0,
        refined: f.snapshot_refined || 0,
        linkViews: f.snapshot_viewed_by_link || 0,
        aiVisibility: f.ai_visibility_run || 0,
        botsBlocked: f.unlock_bot || 0,
        // The client-side half of the funnel.
        engaged: f.input_focused || 0,
        gateShown: f.gate_shown || 0,
        gateAbandoned: f.gate_abandoned || 0,
        reportViewed: f.report_viewed || 0,
        clipMode: f.clip_mode || 0,
        printed: f.printed || 0,
        linkCopied: f.link_copied || 0,
        correctionOpened: f.correction_opened || 0,
        ownerRuns: f.unlock_owner || 0,
        // The number that tells you whether the gate is set right.
        gateConversion: f.gate_shown
          ? Math.round((100 * (f.unlock_success || 0)) / f.gate_shown)
          : null,
        readyRate: f.snapshot_run ? Math.round((100 * (f.snapshot_ready || 0)) / f.snapshot_run) : null,
        unlockRate: f.snapshot_ready ? Math.round((100 * (f.unlock_success || 0)) / f.snapshot_ready) : null,
      },
      daily,
      byNiche,
      clicks,
      depth: depth[0] || null,
      gateErrors,
      leads,
      unclaimed,
      corrections,
      spend: spend[0] || null,
      statuses: STATUSES,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
}
