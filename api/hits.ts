import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

let initialized = false;
async function init() {
  if (initialized) return;
  // Use a new table name to avoid column mismatch with the old one
  await sql`
    CREATE TABLE IF NOT EXISTS visitors (
      id SERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      vid TEXT,
      ua TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_visitors_vid ON visitors (vid)`;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await init();

    if (req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.headers['x-real-ip'] as string
        || 'unknown';
      const ua = (req.headers['user-agent'] || '');
      const vid = req.body?.vid || null;

      // Filter bots by user-agent
      const isBot = !ua
        || /bot|crawl|spider|slurp|curl|wget|python|go-http|node-fetch|axios|vercel|pingdom|uptimerobot|monitor|check|scan|headless/i.test(ua);

      if (!isBot && vid) {
        // Check if this vid already exists
        const rows = await sql`SELECT 1 FROM visitors WHERE vid = ${vid} LIMIT 1`;
        if (rows.length === 0) {
          await sql`INSERT INTO visitors (ip, vid, ua) VALUES (${ip}, ${vid}, ${ua.slice(0, 200)})`;
        }
      }
    }

    const rows = await sql`SELECT COUNT(DISTINCT vid) AS count FROM visitors WHERE vid IS NOT NULL`;
    const count = rows.length > 0 ? Number(rows[0].count) : 0;
    return res.json({ count });
  } catch (e) {
    // Do NOT return count: 0 here. A DB blip would then be indistinguishable
    // from a site that genuinely has no visitors, and the client would render
    // (and cache) a zero over a real number. Signal the failure with a status
    // and no count, so the client keeps showing the last good value.
    return res.status(503).json({ error: String(e).slice(0, 200) });
  }
}
