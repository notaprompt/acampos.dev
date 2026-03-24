import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';

const sql = neon(process.env.DATABASE_URL || '');
const ADMIN_HASH = '7dfef7aed2105b7eceb4d34e1ad84fdad4693bd5de041e1b47079efeb6001a83';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const auth = req.headers['x-admin-hash'] as string
    || req.query.key as string;

  if (auth !== ADMIN_HASH) {
    // Also accept raw password as query param for easy browser access
    if (req.query.pass) {
      const hash = createHash('sha256').update(String(req.query.pass)).digest('hex');
      if (hash !== ADMIN_HASH) return res.status(401).json({ error: 'Unauthorized' });
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Total unique visitors
    const [total] = await sql`SELECT COUNT(DISTINCT ip) AS count FROM visitors`;

    // Visitors today
    const [today] = await sql`SELECT COUNT(DISTINCT ip) AS count FROM visitors WHERE created_at > NOW() - INTERVAL '24 hours'`;

    // Visitors this week
    const [week] = await sql`SELECT COUNT(DISTINCT ip) AS count FROM visitors WHERE created_at > NOW() - INTERVAL '7 days'`;

    // Recent visitors (last 50, grouped by IP)
    const visitors = await sql`
      SELECT ip, COUNT(*) AS visits,
        MIN(created_at) AS first_visit,
        MAX(created_at) AS last_visit
      FROM visitors
      GROUP BY ip
      ORDER BY last_visit DESC
      LIMIT 50
    `;

    // Daily breakdown (last 14 days)
    const daily = await sql`
      SELECT DATE(created_at) AS day, COUNT(DISTINCT ip) AS unique_visitors
      FROM visitors
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `;

    // Guestbook entries
    const guestbook = await sql`
      SELECT name, website, message, created_at
      FROM guestbook
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return res.json({
      summary: {
        total: Number(total.count),
        today: Number(today.count),
        thisWeek: Number(week.count),
        guestbookEntries: guestbook.length,
      },
      daily,
      recentVisitors: visitors,
      guestbook,
    });
  } catch (e) {
    return res.status(500).json({ error: 'DB query failed' });
  }
}
