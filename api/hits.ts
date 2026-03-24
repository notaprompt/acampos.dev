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
      vid TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Add vid column if table existed before the fingerprint update
  try { await sql`ALTER TABLE site_hits ADD COLUMN IF NOT EXISTS vid TEXT`; } catch {}
  await sql`CREATE INDEX IF NOT EXISTS idx_hits_ip ON site_hits (ip)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_hits_vid ON site_hits (vid)`;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await init();

    if (req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.headers['x-real-ip'] as string
        || 'unknown';
      const ua = (req.headers['user-agent'] || '').toLowerCase();
      const vid = req.body?.vid || null;

      // Filter bots
      const isBot = !ua
        || /bot|crawl|spider|slurp|curl|wget|python|go-http|node-fetch|axios|vercel|pingdom|uptimerobot|monitor|check|scan|headless/i.test(ua);

      if (isBot) {
        const [row] = await sql`SELECT COUNT(DISTINCT vid) AS count FROM site_hits WHERE vid IS NOT NULL`;
        return res.json({ count: Number(row.count) });
      }

      // Check if this visitor already counted (by vid first, then IP fallback)
      let exists = false;
      if (vid) {
        const [existing] = await sql`SELECT 1 FROM site_hits WHERE vid = ${vid} LIMIT 1`;
        exists = !!existing;
      }
      if (!exists) {
        const [existing] = await sql`
          SELECT 1 FROM site_hits
          WHERE ip = ${ip} AND vid IS NULL AND created_at > NOW() - INTERVAL '24 hours'
          LIMIT 1
        `;
        exists = !!existing;
      }

      if (!exists) {
        await sql`INSERT INTO site_hits (ip, vid) VALUES (${ip}, ${vid})`;
      }
    }

    // Count unique visitors: prefer vid, fall back to ip for old entries
    const [row] = await sql`SELECT COUNT(DISTINCT vid) AS count FROM site_hits WHERE vid IS NOT NULL`;
    return res.json({ count: Number(row.count) });
  } catch {
    return res.json({ count: 0 });
  }
}
