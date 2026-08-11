// ssrf.ts — outbound fetch guard.
//
// /api/snapshot/run is public, unauthenticated, and takes a URL from a stranger,
// then fetches it from inside our infrastructure. That is the exact shape of a
// server-side request forgery, and it has to be closed at the network layer
// rather than by pattern-matching the string a user typed.
//
// Two rules, both necessary:
//   1. Resolve the hostname and check every address it maps to. A name check is
//      useless — attacker.com can simply have an A record of 127.0.0.1.
//   2. Re-check on every redirect hop. A public host that 302s to
//      169.254.169.254 defeats any check performed only on the original URL,
//      which is why redirects are followed manually here.

import { promises as dns } from 'dns';
import net from 'net';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** Standard web ports only. Anything else is internal-port-scan shaped. */
const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

const MAX_REDIRECTS = 4;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

/** CIDR blocks that must never be reachable from a user-supplied URL. */
const V4_BLOCKS: [string, number][] = [
  ['0.0.0.0', 8],        // "this" network
  ['10.0.0.0', 8],       // RFC1918
  ['100.64.0.0', 10],    // CGNAT
  ['127.0.0.0', 8],      // loopback
  ['169.254.0.0', 16],   // link-local — cloud metadata lives here
  ['172.16.0.0', 12],    // RFC1918
  ['192.0.0.0', 24],     // IETF protocol assignments
  ['192.0.2.0', 24],     // TEST-NET-1
  ['192.168.0.0', 16],   // RFC1918
  ['198.18.0.0', 15],    // benchmarking
  ['198.51.100.0', 24],  // TEST-NET-2
  ['203.0.113.0', 24],   // TEST-NET-3
  ['224.0.0.0', 4],      // multicast
  ['240.0.0.0', 4],      // reserved (covers 255.255.255.255)
];

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable — fail closed
  for (const [base, bits] of V4_BLOCKS) {
    const b = ipv4ToInt(base);
    if (b === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((n & mask) === (b & mask)) return true;
  }
  return false;
}

function isPrivateV6(ip: string): boolean {
  const a = ip.toLowerCase().split('%')[0]; // strip zone id

  if (a === '::1' || a === '::') return true;

  // IPv4-mapped / IPv4-compatible — judge the embedded v4 address.
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/) || a.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);

  // Hex-form IPv4-mapped, e.g. ::ffff:7f00:1
  const hexMapped = a.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const hi = parseInt(hexMapped[1], 16);
    const lo = parseInt(hexMapped[2], 16);
    const v4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return isPrivateV4(v4);
  }

  if (/^f[cd][0-9a-f]{2}:/.test(a)) return true;  // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(a)) return true;  // fe80::/10 link-local
  if (/^ff[0-9a-f]{2}:/.test(a)) return true;     // ff00::/8 multicast
  if (a.startsWith('64:ff9b:')) return true;      // NAT64
  if (a.startsWith('2001:db8:')) return true;     // documentation

  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) return isPrivateV4(ip);
  if (v === 6) return isPrivateV6(ip);
  return true; // not an IP at all — fail closed
}

export class BlockedUrlError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'BlockedUrlError';
  }
}

/**
 * Validate one URL: scheme, port, and every address its hostname resolves to.
 * Throws BlockedUrlError rather than returning false so a miss cannot be
 * silently ignored at a call site.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BlockedUrlError('That URL is not valid.');
  }

  if (!ALLOWED_PROTOCOLS.has(u.protocol)) {
    throw new BlockedUrlError('Only http and https addresses can be read.');
  }
  if (!ALLOWED_PORTS.has(u.port)) {
    throw new BlockedUrlError('That port is not one this tool will connect to.');
  }

  const host = u.hostname.replace(/^\[|\]$/g, '');

  // A literal IP skips DNS entirely — check it directly.
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new BlockedUrlError('That address is not publicly routable.');
    return u;
  }

  // Reject names that cannot be public, before spending a DNS lookup.
  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local') ||
      lower.endsWith('.internal') || lower.endsWith('.home.arpa') || !lower.includes('.')) {
    throw new BlockedUrlError('That address is not publicly routable.');
  }

  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new BlockedUrlError('That domain could not be resolved.');
  }
  if (!addrs.length) throw new BlockedUrlError('That domain could not be resolved.');

  // EVERY address must be public. One private answer is enough to refuse —
  // a round-robin record with a single internal address is the classic bypass.
  for (const a of addrs) {
    if (isBlockedAddress(a.address)) {
      throw new BlockedUrlError('That address resolves to a private network and will not be read.');
    }
  }

  return u;
}

export interface SafeResponse {
  text: string;
  status: number;
  finalUrl: string;
  contentType: string;
}

/**
 * Fetch with the guard applied on the initial URL and on every redirect hop.
 * Redirects are handled manually — `redirect: 'follow'` would let a public host
 * bounce us into the metadata service without the guard ever seeing it.
 */
export async function safeFetch(
  raw: string,
  opts: { timeoutMs?: number; method?: 'GET' | 'HEAD'; maxBytes?: number; userAgent?: string } = {}
): Promise<SafeResponse | null> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const maxBytes = opts.maxBytes ?? 3_000_000;
  const started = Date.now();

  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let url: URL;
    try {
      url = await assertPublicUrl(current);
    } catch (err) {
      if (err instanceof BlockedUrlError) throw err;
      return null;
    }

    const remaining = timeoutMs - (Date.now() - started);
    if (remaining <= 0) return null;

    let res: Response;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), remaining);
      res = await fetch(url.href, {
        method: opts.method ?? 'GET',
        headers: {
          'User-Agent': opts.userAgent ?? 'Mozilla/5.0 (compatible; camposworks-snapshot/1.0; +https://campos.works/snapshot)',
          Accept: 'text/html,application/xhtml+xml,application/json,text/plain,*/*',
        },
        redirect: 'manual',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return null;
      try {
        current = new URL(loc, url.href).href; // resolve relative redirects
      } catch {
        return null;
      }
      continue; // re-validate on the next iteration
    }

    const contentType = res.headers.get('content-type') || '';

    // Cap the body so a hostile server cannot exhaust the function's memory.
    const declared = Number(res.headers.get('content-length') || '0');
    if (declared && declared > maxBytes) {
      return { text: '', status: res.status, finalUrl: url.href, contentType };
    }

    let text = '';
    try {
      const buf = await res.arrayBuffer();
      text = new TextDecoder('utf-8', { fatal: false }).decode(
        buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf
      );
    } catch {
      return null;
    }

    return { text, status: res.status, finalUrl: url.href, contentType };
  }

  return null; // too many redirects
}
