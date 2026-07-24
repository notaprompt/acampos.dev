import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// "seen" — the model, turned around to face its subject.
// Returns a coarse world map of everyone who has visited (city-level dots, never
// anyone else's raw IP) plus the current visitor's own record: where the machine
// thinks they are, their device, their visit count, and yes, their address.

const sql = neon(process.env.DATABASE_URL || '');

let inited = false;
async function init() {
  if (inited) return;
  await sql`CREATE TABLE IF NOT EXISTS ip_geo (
    ip TEXT PRIMARY KEY, city TEXT, country TEXT,
    lat DOUBLE PRECISION, lon DOUBLE PRECISION, created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  inited = true;
}

async function geolocate(ips: string[]): Promise<Record<string, { city: string; country: string; lat: number; lon: number }>> {
  const out: Record<string, { city: string; country: string; lat: number; lon: number }> = {};
  for (let i = 0; i < ips.length; i += 100) {
    const batch = ips.slice(i, i + 100);
    try {
      const r = await fetch('http://ip-api.com/batch?fields=query,status,country,city,lat,lon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch),
      });
      const data = (await r.json()) as { query: string; status: string; country: string; city: string; lat: number; lon: number }[];
      for (const d of data) if (d.status === 'success') out[d.query] = { city: d.city, country: d.country, lat: d.lat, lon: d.lon };
    } catch { /* skip batch */ }
  }
  return out;
}

function device(ua: string): string {
  ua = ua || '';
  const huawei = ua.match(/(HUAWEI|Honor)[\s;]*([A-Z0-9\- ]+)?/i);
  if (huawei) return 'a Huawei' + (huawei[2] ? ' ' + huawei[2].trim() : '');
  if (/iPhone/i.test(ua)) return 'an iPhone';
  if (/iPad/i.test(ua)) return 'an iPad';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'a Mac';
  if (/Windows/i.test(ua)) return 'a Windows PC';
  if (/Pixel/i.test(ua)) return 'a Pixel';
  if (/Android/i.test(ua)) return 'an Android phone';
  if (/CrOS/i.test(ua)) return 'a Chromebook';
  if (/Linux/i.test(ua)) return 'a Linux box';
  return 'a device i cannot quite place';
}
function browser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'a browser';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await init();
    const ip = (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim())
      || String(req.headers['x-real-ip'] || '') || 'unknown';
    const ua = String(req.headers['user-agent'] || '');
    const vid = String(req.query.vid || '');

    // Geolocate any visitor IPs (and this requester) not already cached.
    const need = await sql`SELECT DISTINCT v.ip FROM visitors v LEFT JOIN ip_geo g ON v.ip = g.ip WHERE g.ip IS NULL AND v.ip <> 'unknown'` as { ip: string }[];
    const needIps = need.map((r) => r.ip);
    if (ip !== 'unknown') {
      const has = await sql`SELECT 1 FROM ip_geo WHERE ip = ${ip}` as unknown[];
      if (!has.length) needIps.push(ip);
    }
    if (needIps.length) {
      const geo = await geolocate([...new Set(needIps)]);
      for (const [ipk, g] of Object.entries(geo)) {
        await sql`INSERT INTO ip_geo (ip, city, country, lat, lon) VALUES (${ipk}, ${g.city}, ${g.country}, ${g.lat}, ${g.lon}) ON CONFLICT (ip) DO NOTHING`;
      }
    }

    // Coarse world map — grouped by place, never exposing anyone else's IP.
    const world = await sql`
      SELECT g.city, g.country, g.lat, g.lon, COUNT(*)::int AS c
      FROM visitors v JOIN ip_geo g ON v.ip = g.ip
      WHERE g.lat IS NOT NULL
      GROUP BY g.city, g.country, g.lat, g.lon` as { city: string; country: string; lat: number; lon: number; c: number }[];

    // The subject, shown their own model in full.
    const me = await sql`SELECT city, country, lat, lon FROM ip_geo WHERE ip = ${ip}` as { city: string; country: string; lat: number; lon: number }[];
    let visits: number | null = null;
    if (vid) {
      const vn = await sql`SELECT COUNT(*)::int AS c FROM visitors WHERE vid = ${vid}` as { c: number }[];
      visits = vn[0]?.c ?? null;
    }
    const totals = await sql`SELECT COUNT(DISTINCT vid)::int AS people, COUNT(DISTINCT ip)::int AS places FROM visitors WHERE vid IS NOT NULL` as { people: number; places: number }[];

    // The IP is used server-side to place you on the map, but never returned -
    // the reveal shows the model, not your address.
    const you = {
      city: me[0]?.city ?? null,
      country: me[0]?.country ?? null,
      lat: me[0]?.lat ?? null,
      lon: me[0]?.lon ?? null,
      device: device(ua),
      browser: browser(ua),
      visits,
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ you, world, totals: totals[0] || { people: 0, places: 0 } });
  } catch (e) {
    return res.status(200).json({ you: null, world: [], totals: { people: 0, places: 0 }, error: String(e).slice(0, 150) });
  }
}
