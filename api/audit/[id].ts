import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });

  try {
    const rows = await sql`SELECT * FROM site_audits WHERE id = ${id}`;
    if (!rows.length) return res.status(404).json({ error: 'Audit not found' });

    const row = rows[0];
    return res.json({
      id: row.id,
      domain: row.domain,
      crawl: row.crawl_data,
      scores: row.scores,
      swot: row.swot,
      narrative: row.narrative,
      questionnaire: row.questionnaire,
      createdAt: row.created_at,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load audit' });
  }
}
