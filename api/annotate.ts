import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// "me mode" editorial annotations. Founder-only, gated by ME_MODE_TOKEN.
// POST saves a highlight + note; GET (with the token) returns the pending
// queue as markdown so the next Claude Code pass can read and apply it.

const sql = neon(process.env.DATABASE_URL || '');
const TOKEN = process.env.ME_MODE_TOKEN || '';

let initialized = false;
async function init() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS annotations (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      selection TEXT,
      note TEXT NOT NULL,
      applied BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  initialized = true;
}

function authed(req: VercelRequest): boolean {
  if (!TOKEN) return false;
  const t = String(req.query.token || req.headers['x-me-token'] || (req.body && req.body.token) || '');
  return t === TOKEN;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!TOKEN) return res.status(503).json({ error: 'me-mode not configured' });
  if (!authed(req)) return res.status(403).json({ error: 'nope' });

  try {
    await init();

    if (req.method === 'POST') {
      const b = (req.body || {}) as { path?: string; selection?: string; note?: string };
      const path = String(b.path || '').slice(0, 400);
      const selection = String(b.selection || '').slice(0, 4000);
      const note = String(b.note || '').trim().slice(0, 4000);
      if (!path || !note) return res.status(400).json({ error: 'need path + note' });
      await sql`INSERT INTO annotations (path, selection, note) VALUES (${path}, ${selection}, ${note})`;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const showApplied = String(req.query.all || '') === '1';
      const rows = showApplied
        ? await sql`SELECT * FROM annotations ORDER BY created_at DESC`
        : await sql`SELECT * FROM annotations WHERE applied = false ORDER BY path, created_at`;
      if (String(req.query.format || 'md') === 'json') return res.status(200).json({ annotations: rows });
      // markdown queue for the next editorial pass
      let md = `# Editorial queue — ${rows.length} pending\n`;
      let lastPath = '';
      for (const r of rows as { id: number; path: string; selection: string; note: string; created_at: string }[]) {
        if (r.path !== lastPath) { md += `\n## ${r.path}\n`; lastPath = r.path; }
        md += `\n- **#${r.id}** — ${r.note}\n`;
        if (r.selection) md += `  > ${r.selection.replace(/\n+/g, ' ').slice(0, 300)}\n`;
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.status(200).send(md);
    }

    if (req.method === 'PATCH') {
      // mark applied: { ids: [1,2,3] }
      const ids = ((req.body || {}).ids || []) as number[];
      if (Array.isArray(ids) && ids.length) {
        await sql`UPDATE annotations SET applied = true WHERE id = ANY(${ids})`;
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'failed' });
  }
}
