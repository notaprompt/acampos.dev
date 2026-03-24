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
      const ua = (req.headers['user-agent'] || '').toLowerCase();

      // Filter bots/crawlers
      const isBot = !ua
        || /bot|crawl|spider|slurp|curl|wget|python|go-http|node-fetch|axios|vercel|pingdom|uptimerobot|monitor|check|scan|headless/i.test(ua)
        || /^(52\.53|54\.176|54\.219|54\.193|54\.153|54\.177|54\.151|54\.67|13\.56|13\.52|18\.144|3\.101|3\.236|3\.80|3\.94|3\.234|100\.26)\./.test(ip);

      if (isBot) {
        const [row] = await sql`SELECT COUNT(DISTINCT ip) AS count FROM site_hits`;
        return res.json({ count: Number(row.count) });
      }

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
