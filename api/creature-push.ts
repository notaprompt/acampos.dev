import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// creature-push — the pulse lands here. Counts and booleans only; the
// allowlist below is the second wall behind the publisher's first one.
// Uses the same site-publisher token as the deuce push.

const sql = neon(process.env.DATABASE_URL || '');

let inited = false;
async function init() {
  if (inited) return;
  await sql`CREATE TABLE IF NOT EXISTS creature_live (
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

  const b = req.body;
  if (!b || typeof b.memories !== 'number') {
    return res.status(400).json({ error: 'bad snapshot' });
  }

  const snapshot = {
    memories: Number(b.memories) || 0,
    edges: Number(b.edges) || 0,
    sessions: Number(b.sessions) || 0,
    principle: Number(b.principle) || 0,
    services: Number(b.services) || 0,
    organs: Number(b.organs) || 0,
    findings: Number(b.findings) || 0,
    dream: ['waiting', 'dreaming', 'idle', 'unknown'].includes(b.dream) ? b.dream : 'unknown',
    keeper: {
      needs: Number(b.keeper?.needs) || 0,
      model_resident: Boolean(b.keeper?.model_resident),
    },
  };

  try {
    await init();
    await sql`INSERT INTO creature_live (id, data, updated_at) VALUES (1, ${JSON.stringify(snapshot)}, NOW())
              ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(snapshot)}, updated_at = NOW()`;
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'storage failed' });
  }
}
