// GET /api/leads/export — the warm list, exportable.
//
// Auth: ADMIN_TOKEN via ?token= or the x-admin-token header. This returns
// personal data, so it fails closed — no token configured means no access,
// rather than open access.
//
// ?format=csv (default) | json
// ?since=2026-01-01  ?status=new  ?niche=hvac  ?limit=500

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, dbConfigured } from '../_lib/db.js';

function csvCell(v: unknown): string {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // Defuse spreadsheet formula injection — these land in Excel and Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: 'Export is not configured (set ADMIN_TOKEN).' });

  const provided =
    (req.headers['x-admin-token'] as string | undefined) ||
    (typeof req.query.token === 'string' ? req.query.token : '');
  if (provided !== expected) return res.status(401).json({ error: 'Unauthorized' });

  if (!dbConfigured()) return res.status(503).json({ error: 'No database configured.' });

  const limit = Math.min(5000, Math.max(1, parseInt(String(req.query.limit ?? '1000'), 10) || 1000));
  const since = typeof req.query.since === 'string' ? req.query.since : null;
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const niche = typeof req.query.niche === 'string' ? req.query.niche : null;

  try {
    await ensureSchema();
    const rows = await sql`
      SELECT
        l.id, l.created_at, l.updated_at, l.name, l.email, l.email_domain, l.mx_verified,
        l.business_name, l.website, l.niche_label, l.zip, l.health_score,
        l.est_leak_low, l.est_leak_high, l.top_gaps, l.snapshot_count, l.status, l.intent,
        l.last_snapshot, s.share_token
      FROM leads l
      LEFT JOIN snapshots s ON s.id = l.last_snapshot
      WHERE (${since}::text IS NULL OR l.created_at >= ${since}::timestamptz)
        AND (${status}::text IS NULL OR l.status = ${status})
        AND (${niche}::text  IS NULL OR l.niche_id = ${niche})
      ORDER BY l.created_at DESC
      LIMIT ${limit}
    `;

    if (String(req.query.format || 'csv') === 'json') {
      return res.json({ count: rows.length, leads: rows });
    }

    const cols = [
      'created_at', 'name', 'email', 'business_name', 'website', 'niche_label', 'zip',
      'health_score', 'est_leak_low', 'est_leak_high', 'top_gaps', 'snapshot_count',
      'mx_verified', 'status', 'intent', 'report_url',
    ];
    const lines = [cols.join(',')];
    for (const r of rows as Record<string, unknown>[]) {
      const enriched: Record<string, unknown> = {
        ...r,
        top_gaps: Array.isArray(r.top_gaps) ? (r.top_gaps as string[]).join(' | ') : r.top_gaps,
        report_url: r.share_token ? `https://campos.works/snapshot?s=${r.share_token}` : '',
      };
      lines.push(cols.map((c) => csvCell(enriched[c])).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campos-warm-list-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(lines.join('\n'));
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
}
