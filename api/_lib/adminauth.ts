// adminauth.ts — one way to check the admin token, used everywhere.
//
// Header only, on purpose. A token accepted as `?token=…` is a secret written
// down in public: it lands in the platform's access logs, the browser's history,
// and the Referer header of every outbound link from that page. Convenience for
// one person is not worth a credential in three log stores.
//
// Constant-time comparison, because a plain `!==` leaks the token a character at
// a time through response timing, and these endpoints return the whole warm list.

import { timingSafeEqual } from 'crypto';

type HeaderBag = { headers: Record<string, string | string[] | undefined> };

export function adminHeaderMatches(req: HeaderBag, expected: string): boolean {
  if (!expected) return false;
  const raw = req.headers['x-admin-token'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so gate on length first.
  return a.length === b.length && timingSafeEqual(a, b);
}
