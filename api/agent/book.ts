import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

let initialized = false;
async function init() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS booking_requests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT,
      message TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    await init();

    const { name, email, service, message } = req.body || {};

    if (!name || typeof name !== 'string' || name.length > 200) {
      return res.status(400).json({ error: 'name required (max 200 chars)' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 200) {
      return res.status(400).json({ error: 'valid email required' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';

    // Rate limit: 3 per IP per hour
    const recent = await sql`
      SELECT COUNT(*) as cnt FROM booking_requests
      WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (Number(recent[0]?.cnt) >= 3) {
      return res.status(429).json({ error: 'Rate limit: 3 requests per hour' });
    }

    await sql`
      INSERT INTO booking_requests (name, email, service, message, ip)
      VALUES (${name.slice(0, 200)}, ${email.slice(0, 200)}, ${(service || '').slice(0, 200)}, ${(message || '').slice(0, 2000)}, ${ip})
    `;

    return res.json({
      status: 'received',
      message: 'Booking request submitted. You can also schedule directly.',
      booking_url: 'https://cal.com/alexcampos/30min',
    });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
