import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

const ADMIN_HASH = '7dfef7aed2105b7eceb4d34e1ad84fdad4693bd5de041e1b47079efeb6001a83'; // sha256 of "admin"

let initialized = false;
async function init() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS playlist (
      id SERIAL PRIMARY KEY,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      profile JSONB DEFAULT '{}',
      sort_order INT DEFAULT 0
    )
  `;
  initialized = true;
}

// Seed from static playlist.json if table is empty
async function seedIfEmpty() {
  const [row] = await sql`SELECT COUNT(*) AS count FROM playlist`;
  if (Number(row.count) > 0) return;

  const fallback = [
    { artist: 'Shigeo Sekito', title: 'the word II', url: '/audio/the-word-ii.mp3',
      profile: { hitThresh: 0.08, bendAmp: 1.0, steerSens: 1.0, midSnap: 1.0, flipThresh: 0.5, smoothing: 0.8 } },
    { artist: 'Aphex Twin', title: 'Avril 14th', url: '/audio/avril-14th.mp3',
      profile: { hitThresh: 0.02, bendAmp: 1.8, steerSens: 2.5, midSnap: 4.0, flipThresh: 0.6, smoothing: 0.55 } },
    { artist: 'Piero Piccioni', title: 'Easy Lovers', url: '/audio/easy-lovers.mp3',
      profile: { hitThresh: 0.05, bendAmp: 1.2, steerSens: 1.5, midSnap: 2.5, flipThresh: 0.55, smoothing: 0.7 } },
    { artist: 'Maison Music', title: "l'histoire de ta vie", url: '/audio/lhistoire-de-ta-vie.mp3',
      profile: { hitThresh: 0.03, bendAmp: 1.6, steerSens: 2.2, midSnap: 3.0, flipThresh: 0.6, smoothing: 0.6 } },
  ];

  for (let i = 0; i < fallback.length; i++) {
    const t = fallback[i];
    await sql`INSERT INTO playlist (artist, title, url, profile, sort_order)
              VALUES (${t.artist}, ${t.title}, ${t.url}, ${JSON.stringify(t.profile)}, ${i})`;
  }
}

function checkAuth(req: VercelRequest): boolean {
  const auth = req.headers['x-admin-hash'] as string;
  return auth === ADMIN_HASH;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await init();

    // GET — public, returns playlist
    if (req.method === 'GET') {
      await seedIfEmpty();
      const rows = await sql`SELECT artist, title, url, profile FROM playlist ORDER BY sort_order ASC, id ASC`;
      return res.json(rows);
    }

    // All write ops require auth
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // PUT — replace entire playlist (reorder, bulk update)
    if (req.method === 'PUT') {
      const tracks = req.body;
      if (!Array.isArray(tracks)) return res.status(400).json({ error: 'Expected array' });

      await sql`DELETE FROM playlist`;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        await sql`INSERT INTO playlist (artist, title, url, profile, sort_order)
                  VALUES (${t.artist}, ${t.title}, ${t.url}, ${JSON.stringify(t.profile || {})}, ${i})`;
      }
      return res.json({ ok: true, count: tracks.length });
    }

    // POST — add a single track
    if (req.method === 'POST') {
      const { artist, title, url, profile } = req.body;
      if (!artist || !title || !url) return res.status(400).json({ error: 'artist, title, url required' });

      const [max] = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM playlist`;
      await sql`INSERT INTO playlist (artist, title, url, profile, sort_order)
                VALUES (${artist}, ${title}, ${url}, ${JSON.stringify(profile || {})}, ${Number(max.next)})`;
      return res.status(201).json({ ok: true });
    }

    // DELETE — remove by id or url
    if (req.method === 'DELETE') {
      const { id, url } = req.body || {};
      if (id) {
        await sql`DELETE FROM playlist WHERE id = ${id}`;
      } else if (url) {
        await sql`DELETE FROM playlist WHERE url = ${url}`;
      } else {
        return res.status(400).json({ error: 'id or url required' });
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
