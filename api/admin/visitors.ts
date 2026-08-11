import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { adminHeaderMatches } from '../_lib/adminauth.js';

const sql = neon(process.env.DATABASE_URL || '');
/**
 * Auth moved to ADMIN_TOKEN via the x-admin-token header.
 *
 * Previously: an unsalted SHA-256 hash committed to the repo, checked against a
 * password accepted from `?pass=` / `?key=`. That put a brute-forceable hash in
 * git history and the password itself in access logs and browser history.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: 'Admin is not configured (set ADMIN_TOKEN).' });
  if (!adminHeaderMatches(req, expected)) return res.status(401).json({ error: 'Unauthorized' });

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
