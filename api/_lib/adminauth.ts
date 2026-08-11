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

/** Constant-time string compare. Length is gated first because timingSafeEqual throws on mismatch. */
export function constantTimeEqual(provided: string | undefined | null, expected: string | undefined | null): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminHeaderMatches(req: HeaderBag, expected: string): boolean {
  if (!expected) return false;
  const raw = req.headers['x-admin-token'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  return constantTimeEqual(provided, expected);
}

/**
 * Rate-limit bypass for the owner, deliberately NOT the admin token.
 *
 * The bypass has to live in a cookie, because a browser will not send a custom
 * header — and a cookie goes out on every request to the site and is readable
 * by any XSS. Putting ADMIN_TOKEN there would expose the whole warm list to
 * protect a throttle. SNAPSHOT_OWNER_KEY grants exactly one thing: skipping the
 * rate limit. If it leaks, someone can run unlimited Snapshots. That is
 * annoying, not dangerous.
 */
export function ownerCookieMatches(req: HeaderBag): boolean {
  const expected = process.env.SNAPSHOT_OWNER_KEY;
  if (!expected) return false;
  const cookies = String(req.headers.cookie || '');
  const value = /(?:^|;\s*)cw_owner=([^;]+)/.exec(cookies)?.[1];
  return constantTimeEqual(value, expected);
}
