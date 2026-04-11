import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { domain, crawl, scores, swot, narrative, questionnaire } = req.body;
  if (!domain || !crawl) return res.status(400).json({ error: 'Missing domain or crawl data' });

  const rows = await sql`
    INSERT INTO site_audits (domain, crawl_data, scores, swot, narrative, questionnaire)
    VALUES (
      ${domain},
      ${JSON.stringify(crawl)},
      ${scores ? JSON.stringify(scores) : null},
      ${swot ? JSON.stringify(swot) : null},
      ${narrative || null},
      ${questionnaire ? JSON.stringify(questionnaire) : null}
    )
    RETURNING id, created_at
  `;

  return res.json({ id: rows[0].id, createdAt: rows[0].created_at });
}
