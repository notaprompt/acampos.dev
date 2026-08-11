// GET /api/index-stats
//
// Aggregate, anonymized statistics across every Snapshot ever run. This is the
// data behind The Index — the original research that, per the 2026 market
// research, is the thing that actually differentiates when generic content no
// longer does.
//
// PRIVACY, which is the whole design constraint: no individual business is ever
// identifiable here. No domains, no names, no per-business rows. Categories are
// suppressed below a minimum sample size, because "1 of 1 landscaping companies
// in 22191 has no booking form" identifies a specific business by arithmetic.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, dbConfigured } from './_lib/db.js';

/** Below this, a category is suppressed rather than published. */
const MIN_SAMPLE = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbConfigured()) {
    return res.json({ ready: false, reason: 'no data yet' });
  }

  try {
    await ensureSchema();

    const totals = await sql`
      SELECT
        count(*)::int                                   AS total,
        count(DISTINCT domain)::int                     AS businesses,
        count(DISTINCT niche_id)::int                   AS categories,
        min(created_at)                                 AS since
      FROM snapshots
      WHERE report IS NOT NULL
    `;

    const t = totals[0] || { total: 0, businesses: 0, categories: 0, since: null };
    if ((t.total ?? 0) < MIN_SAMPLE) {
      return res.json({ ready: false, reason: 'not enough data yet', total: t.total ?? 0, minimum: MIN_SAMPLE });
    }

    // Per-category aggregates, suppressed below the sample floor.
    const byNiche = await sql`
      SELECT
        niche_label                                                  AS label,
        count(*)::int                                                AS n,
        round(avg((report->>'health')::numeric))::int                AS avg_health,
        round(avg((report->'totals'->>'low')::numeric))::int         AS avg_leak_low,
        round(avg((report->'totals'->>'high')::numeric))::int        AS avg_leak_high
      FROM snapshots
      WHERE report IS NOT NULL
        AND report->>'health' IS NOT NULL
        AND niche_label IS NOT NULL
      GROUP BY niche_label
      HAVING count(*) >= ${MIN_SAMPLE}
      ORDER BY count(*) DESC
      LIMIT 20
    `;

    // How often each specific gap shows up. The headline numbers.
    const gaps = await sql`
      WITH f AS (
        SELECT
          s.id,
          (p->>'slug')          AS slug,
          (p->>'label')         AS label,
          (fnd->>'ok')::boolean AS ok,
          (fnd->>'text')        AS text
        FROM snapshots s
        CROSS JOIN LATERAL jsonb_array_elements(s.report->'parts') p
        CROSS JOIN LATERAL jsonb_array_elements(p->'findings') fnd
        WHERE s.report IS NOT NULL
      )
      SELECT
        label,
        text,
        count(*)::int AS n,
        round(100.0 * count(*) / NULLIF((SELECT count(DISTINCT id) FROM f), 0))::int AS pct
      FROM f
      WHERE ok = false
      GROUP BY label, text
      HAVING count(*) >= ${MIN_SAMPLE}
      ORDER BY count(*) DESC
      LIMIT 15
    `;

    // Grade distribution across the parts we can observe.
    const grades = await sql`
      SELECT
        (p->>'label') AS label,
        (p->>'grade') AS grade,
        count(*)::int AS n
      FROM snapshots s
      CROSS JOIN LATERAL jsonb_array_elements(s.report->'parts') p
      WHERE s.report IS NOT NULL
        AND (p->>'notVisible') IS DISTINCT FROM 'true'
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    return res.json({
      ready: true,
      generatedAt: new Date().toISOString(),
      minimumSample: MIN_SAMPLE,
      totals: {
        snapshots: t.total,
        businesses: t.businesses,
        categories: t.categories,
        since: t.since,
      },
      byNiche,
      gaps,
      grades,
      method:
        'Every figure is computed from automated reads of publicly available business websites, ' +
        'plus public DNS and registry records. No business is identified. Categories with fewer than ' +
        `${MIN_SAMPLE} businesses are withheld so no individual business can be inferred.`,
    });
  } catch (err) {
    return res.status(500).json({ ready: false, reason: err instanceof Error ? err.message : 'query failed' });
  }
}
