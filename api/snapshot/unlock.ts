// POST /api/snapshot/unlock
//
// The gate. Name + verified email in, full report out, lead on the warm list.
//
// This is the only endpoint that reads a snapshot's findings back out. /run
// stores them and returns a teaser; nothing else can reach them. That is the
// whole design — the report is not hidden in the page, it was never sent.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyEmail, verifyName } from '../_lib/email.js';
import { sql, ensureSchema, dbConfigured, track, hashIp, clientIp, overRateLimit } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ip = clientIp(req.headers as Record<string, string | string[] | undefined>);
  const ipHash = hashIp(ip);

  const body = (req.body || {}) as {
    id?: string;
    name?: string;
    email?: string;
    businessName?: string;
    intent?: string;
    /** Hidden field. A human never fills this in. */
    website_url?: string;
    /** Client-side ms from render to submit. Bots are instant. */
    elapsedMs?: number;
  };

  if (!dbConfigured()) {
    return res.status(503).json({ error: 'Storage is not configured on this deployment.' });
  }

  // ── Bot checks, before we spend anything ──
  if (typeof body.website_url === 'string' && body.website_url.trim() !== '') {
    await track('unlock_bot', { meta: { reason: 'honeypot' }, ipHash });
    // Look successful. Telling a bot why it failed only helps it.
    return res.status(200).json({ ok: true, report: null });
  }
  if (typeof body.elapsedMs === 'number' && body.elapsedMs >= 0 && body.elapsedMs < 1200) {
    await track('unlock_bot', { meta: { reason: 'too_fast', elapsedMs: body.elapsedMs }, ipHash });
    return res.status(200).json({ ok: true, report: null });
  }

  if (await overRateLimit(ipHash, 'unlock_attempt', 12, 60)) {
    return res.status(429).json({ error: 'Too many attempts. Email alex@campos.works and I will send it over.' });
  }
  await track('unlock_attempt', { snapshotId: body.id || null, ipHash });

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return res.status(400).json({ error: 'Missing snapshot id.' });

  // ── Validate, field by field, so the visitor gets a useful message ──
  const nameVerdict = verifyName(body.name);
  if (!nameVerdict.ok) {
    return res.status(400).json({ error: nameVerdict.reason, field: 'name' });
  }

  const emailVerdict = await verifyEmail(body.email);
  if (!emailVerdict.ok) {
    await track('unlock_email_rejected', { snapshotId: id, meta: { reason: emailVerdict.reason }, ipHash });
    return res.status(400).json({ error: emailVerdict.reason, field: 'email' });
  }

  // The owner testing his own funnel should not land in his own warm list.
  // Everything else about the unlock is identical — the report opens normally.
  const ownerEmails = (process.env.OWNER_EMAILS || 'alex@campos.works')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isOwner = ownerEmails.includes(emailVerdict.email);

  try {
    await ensureSchema();

    const rows = await sql`SELECT * FROM snapshots WHERE id = ${id}::uuid`;
    if (!rows.length) return res.status(404).json({ error: 'That snapshot has expired. Run a new one — it takes a minute.' });
    const snap = rows[0];

    const full = snap.report as Record<string, unknown>;
    const teaser = snap.teaser as Record<string, unknown> | null;
    const totals = (full?.totals as { low: number; high: number }) || { low: 0, high: 0 };
    const health = typeof full?.health === 'number' ? (full.health as number) : null;
    const topGaps = (((full?.report as Record<string, unknown>)?.leaks as { name: string }[]) || [])
      .slice(0, 3)
      .map((l) => l.name);

    // ── Upsert the lead. One person, many snapshots. ──
    if (isOwner) {
      await sql`UPDATE snapshots SET unlocked = true, unlocked_at = now() WHERE id = ${id}::uuid`;
      await track('unlock_owner', { snapshotId: id, meta: { niche: snap.niche_id }, ipHash });
      return res.json({ ok: true, shareToken: snap.share_token, returning: false, owner: true, report: full });
    }

    const leadRows = await sql`
      INSERT INTO leads (
        name, email, dedup_key, email_domain, mx_verified, business_name, website,
        niche_id, niche_label, zip, first_snapshot, last_snapshot,
        top_gaps, health_score, est_leak_low, est_leak_high, intent, source, ip_hash
      ) VALUES (
        ${nameVerdict.name}, ${emailVerdict.email}, ${emailVerdict.dedupKey},
        ${emailVerdict.domain}, ${emailVerdict.mxVerified},
        ${(body.businessName || (teaser?.businessName as string) || '').slice(0, 160) || null},
        ${snap.domain || null},
        ${snap.niche_id || null}, ${snap.niche_label || null}, ${snap.zip || null},
        ${id}::uuid, ${id}::uuid,
        ${JSON.stringify(topGaps)}, ${health}, ${totals.low}, ${totals.high},
        ${(body.intent || '').slice(0, 400) || null},
        ${snap.source || null}, ${ipHash}
      )
      ON CONFLICT (dedup_key) DO UPDATE SET
        name           = EXCLUDED.name,
        business_name  = COALESCE(EXCLUDED.business_name, leads.business_name),
        website        = COALESCE(EXCLUDED.website, leads.website),
        niche_id       = COALESCE(EXCLUDED.niche_id, leads.niche_id),
        niche_label    = COALESCE(EXCLUDED.niche_label, leads.niche_label),
        zip            = COALESCE(EXCLUDED.zip, leads.zip),
        last_snapshot  = EXCLUDED.last_snapshot,
        top_gaps       = EXCLUDED.top_gaps,
        health_score   = EXCLUDED.health_score,
        est_leak_low   = EXCLUDED.est_leak_low,
        est_leak_high  = EXCLUDED.est_leak_high,
        intent         = COALESCE(EXCLUDED.intent, leads.intent),
        snapshot_count = leads.snapshot_count + 1,
        updated_at     = now()
      RETURNING id, snapshot_count
    `;
    const leadId = leadRows[0]?.id ?? null;
    const returning = (leadRows[0]?.snapshot_count ?? 1) > 1;

    await sql`
      UPDATE snapshots
      SET unlocked = true, unlocked_at = now(), lead_id = ${leadId}::uuid
      WHERE id = ${id}::uuid
    `;

    await track('unlock_success', {
      snapshotId: id,
      leadId,
      meta: { niche: snap.niche_id, health, returning, mxVerified: emailVerdict.mxVerified },
      ipHash,
    });

    // Now — and only now — the findings leave the server.
    return res.json({
      ok: true,
      shareToken: snap.share_token,
      returning,
      report: full,
    });
  } catch (err) {
    await track('unlock_fail', { snapshotId: id, meta: { err: String(err) }, ipHash });
    return res.status(500).json({ error: 'Something broke saving that. Email alex@campos.works and I will send the report directly.' });
  }
}
