import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

let initialized = false;
async function init() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS guestbook (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      message TEXT NOT NULL,
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await init();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT name, website, message, created_at
        FROM guestbook ORDER BY created_at DESC LIMIT 100
      `;
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { name, website, message } = req.body || {};
      const n = String(name || '').trim().slice(0, 50);
      const w = String(website || '').trim().slice(0, 200);
      const m = String(message || '').trim().slice(0, 500);

      if (!n || !m) return res.status(400).json({ error: 'Name and message required' });

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.headers['x-real-ip'] as string
        || 'unknown';

      // Rate limit: 5 per IP per hour
      const [recent] = await sql`
        SELECT COUNT(*) AS count FROM guestbook
        WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '1 hour'
      `;
      if (Number(recent.count) >= 5) {
        return res.status(429).json({ error: 'Slow down. Try again later.' });
      }

      await sql`INSERT INTO guestbook (name, website, message, ip) VALUES (${n}, ${w || null}, ${m}, ${ip})`;
      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
}
