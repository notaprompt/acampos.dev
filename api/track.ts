// POST /api/track — client-side funnel events.
//
// The server already records what it does (run, ready, unlock, refine). What it
// could not see is what the *person* does: where they stop reading, which CTA
// they press, whether they abandon at the gate. Without that, "conversion is
// low" is a fact with no cause attached.
//
// Deliberately small and deliberately allowlisted. This is a public,
// unauthenticated endpoint, so it accepts only a fixed set of event kinds and a
// fixed set of scalar fields. It can never be used to write arbitrary rows.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { track, hashIp, clientIp, overRateLimit, dbConfigured } from './_lib/db.js';

/** The only kinds a browser may write. Anything else is dropped silently. */
const ALLOWED = new Set([
  'input_focused',        // they engaged with the URL box
  'describe_opened',      // no website — clicked the describe path
  'gate_shown',           // analysis finished, gate rendered
  'gate_field_error',     // validation rejected them (which field)
  'gate_abandoned',       // left with the gate open and never unlocked
  'report_viewed',        // report rendered
  'report_scrolled',      // how far down they actually read
  'section_viewed',       // a named report section entered the viewport
  'cta_clicked',          // which call to action
  'clip_mode',            // opened clip mode
  'printed',              // downloaded the PDF
  'link_copied',          // copied the share link
  'correction_opened',    // opened the "something's wrong" panel
  'outbound_clicked',     // clicked a citation or competitor link
]);

/** Scalar detail, clamped. No free-form payloads. */
function cleanMeta(raw: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== 'object') return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 8) break;
    if (!/^[a-z][a-z0-9_]{0,24}$/i.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v);
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 60);
    else continue;
    n++;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Fire-and-forget from the client; never make the visitor wait on analytics.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!dbConfigured()) return res.status(204).end();

  const ipHash = hashIp(clientIp(req.headers as Record<string, string | string[] | undefined>));

  const body = (req.body || {}) as { kind?: string; snapshotId?: string; meta?: unknown };
  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!ALLOWED.has(kind)) return res.status(204).end();

  // Generous, but bounded — a page can legitimately fire a dozen of these.
  if (await overRateLimit(ipHash, 'client_event', 200, 60)) return res.status(204).end();

  const snapshotId =
    typeof body.snapshotId === 'string' && /^[0-9a-f-]{36}$/i.test(body.snapshotId)
      ? body.snapshotId
      : null;

  await track(kind, { snapshotId, meta: cleanMeta(body.meta), ipHash });
  return res.status(204).end();
}
