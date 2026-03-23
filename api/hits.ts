import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

let initialized = false;
async function init() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS site_hits (
      id SERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_hits_ip ON site_hits (ip)`;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await init();

    if (req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.headers['x-real-ip'] as string
        || 'unknown';

      // One count per IP per 24 hours
      const [existing] = await sql`
        SELECT 1 FROM site_hits
        WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `;

      if (!existing) {
        await sql`INSERT INTO site_hits (ip) VALUES (${ip})`;
      }
    }

    const [row] = await sql`SELECT COUNT(DISTINCT ip) AS count FROM site_hits`;
    return res.json({ count: Number(row.count) });
  } catch {
    return res.json({ count: 0 });
  }
}
