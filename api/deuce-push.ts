import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// deuce-push — the Mac's ledger publisher lands here.
// Accepts a public-safe snapshot of the signed-forecast ledger: counts,
// timestamps, and hashed ids only. No dollar figures, no market ids, no
// sides - the publisher never sends them and this endpoint never asks.

const sql = neon(process.env.DATABASE_URL || '');

let inited = false;
async function init() {
  if (inited) return;
  await sql`CREATE TABLE IF NOT EXISTS deuce_live (
    id INTEGER PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  inited = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = process.env.DEUCE_PUSH_TOKEN;
  const auth = String(req.headers['authorization'] || '');
  if (!token || auth !== `Bearer ${token}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = req.body;
  if (!body || typeof body.total !== 'number' || !Array.isArray(body.tail)) {
    return res.status(400).json({ error: 'bad snapshot' });
  }

  // keep only the fields the page renders - defense against future drift
  const snapshot = {
    total: body.total,
    resolved: Number(body.resolved) || 0,
    open: Number(body.open) || 0,
    h24: Number(body.h24) || 0,
    last_commit: String(body.last_commit || ''),
    tail: body.tail.slice(0, 12).map((r: { t?: unknown; h?: unknown; open?: unknown }) => ({
      t: String(r.t || '').slice(0, 20),
      h: String(r.h || '').slice(0, 8),
      open: Boolean(r.open),
    })),
    whales: {
      watched: Number(body.whales?.watched) || 0,
      feed: (Array.isArray(body.whales?.feed) ? body.whales.feed : []).slice(0, 10)
        .map((r: { t?: unknown; w?: unknown; m?: unknown; s?: unknown; o?: unknown; p?: unknown; usd?: unknown }) => ({
          t: String(r.t || '').slice(0, 20),
          w: String(r.w || '').slice(0, 12),
          m: String(r.m || '').slice(0, 48),
          s: String(r.s || '').slice(0, 4),
          o: String(r.o || '').slice(0, 20),
          p: Number(r.p) || 0,
          usd: Math.round(Number(r.usd) || 0),
        })),
    },
  };

  try {
    await init();
    await sql`INSERT INTO deuce_live (id, data, updated_at) VALUES (1, ${JSON.stringify(snapshot)}, NOW())
              ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(snapshot)}, updated_at = NOW()`;
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'storage failed' });
  }
}
