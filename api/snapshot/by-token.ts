// GET /api/snapshot/by-token?s=TOKEN
//
// Renders a stored report from its share token. This is what makes cold
// outreach work: the email says "full read here, free, nothing to sign up for"
// and the link has to honour that exactly.
//
// UNGATED, deliberately. Three reasons:
//   1. The outreach email promises no signup. Gating it would make that a lie.
//   2. A report that can be forwarded to a business partner is distribution.
//      The gate exists to capture whoever RUNS a new analysis, not to stop
//      someone sharing a finished one.
//   3. For bulk-generated reports we already have the recipient's address —
//      we mailed it to them. Asking for it again is theatre.
//
// The token is 192 bits from a CSPRNG, so it is unguessable; possession of the
// link is the authorisation.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureSchema, dbConfigured, track, hashIp, clientIp } from '../_lib/db.js';
import { nicheOptions } from '../_lib/niches.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!dbConfigured()) return res.status(503).json({ error: 'Storage is not configured.' });

  const token = typeof req.query.s === 'string' ? req.query.s.trim() : '';
  // Shape check before touching the database — a share token is base64url.
  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(400).json({ error: 'That link is not valid.' });
  }

  const ipHash = hashIp(clientIp(req.headers as Record<string, string | string[] | undefined>));

  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, report, share_token, source, unlocked, created_at
      FROM snapshots
      WHERE share_token = ${token}
    `;
    if (!rows.length) {
      return res.status(404).json({ error: 'That link has expired or was never valid.' });
    }
    const snap = rows[0];
    if (!snap.report) {
      return res.status(404).json({ error: 'That report is no longer available.' });
    }

    // The open is the signal worth having — for a cold-outreach recipient this
    // is the moment they engaged, and it is what makes a follow-up warranted.
    const channel = (snap.source as Record<string, unknown> | null)?.channel ?? null;
    await track('snapshot_viewed_by_link', {
      snapshotId: snap.id,
      meta: { channel, wasUnlocked: snap.unlocked },
      ipHash,
    });

    return res.json({
      ok: true,
      id: snap.id,
      shareToken: snap.share_token,
      report: snap.report,
      /** Cold-outreach reports get a slightly different framing on the page. */
      prepared: channel === 'bulk',
      createdAt: snap.created_at,
      // Without these the correction dropdown would contain only the industry we
      // guessed — and a report generated from outside, with nobody to ask, is
      // the one most likely to have guessed wrong.
      nicheOptions: nicheOptions(),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Could not load that report.' });
  }
}
