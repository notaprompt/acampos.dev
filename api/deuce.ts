import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// deuce — public read of the signed-forecast ledger snapshot.
// Whatever the publisher last pushed, plus how stale it is. Nothing else.

const sql = neon(process.env.DATABASE_URL || '');

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = await sql`SELECT data, updated_at FROM deuce_live WHERE id = 1`;
    if (!rows.length) return res.status(200).json({ empty: true });
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ ...rows[0].data, as_of: rows[0].updated_at });
  } catch {
    return res.status(200).json({ empty: true });
  }
}
