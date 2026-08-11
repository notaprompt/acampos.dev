// Regression guard for the whole class of bug, not one instance of it.
//
// api/audit/crawl.ts once had a function literally named `safeFetch` that did a
// plain fetch with redirect:'follow' and no address validation — a public SSRF
// wearing a reassuring name. A test for that one file would not have caught it
// being reintroduced somewhere else, so this scans every server file instead.
//
// The rule: any fetch that can be pointed at a user-supplied URL must go through
// api/_lib/ssrf.ts. Fetches to hardcoded third-party APIs are fine and are
// listed as exempt below.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const API_DIR = new URL('../api', import.meta.url).pathname;

/**
 * Files whose fetches only ever target hardcoded, trusted hosts (their own
 * provider APIs). Each entry is a deliberate decision, not a blanket pass.
 */
const EXEMPT: Record<string, string> = {
  '_lib/models.ts': 'fetches only the configured inference gateways, from env-set base URLs',
  '_lib/presence.ts': 'fetches only rdap.org, Brave, Yelp, and Google Places — all hardcoded hosts',
  '_lib/frontier.ts': 'fetches only the Brave Search API — hardcoded host',
  '_lib/ssrf.ts': 'this IS the guard',
  'audit/score.ts': 'fetches only the configured inference gateway (OLIVER_BASE_URL / OpenRouter) — hardcoded host',
  'oliver.ts': 'fetches only the configured inference gateway (OLIVER_BASE_URL / OpenRouter) — hardcoded host',
  'seen.ts': 'fetches only ip-api.com for geo lookup — hardcoded host',
};

/**
 * Strip comments before scanning. A doc comment that *describes* the dangerous
 * pattern (explaining why it was removed) must not fail the build — that would
 * punish the code for documenting its own history.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else if (entry.endsWith('.ts')) out.push(rel);
  }
  return out;
}

test('no server file follows redirects on a raw fetch', () => {
  const offenders: string[] = [];
  for (const rel of walk(API_DIR)) {
    if (EXEMPT[rel]) continue;
    const src = stripComments(readFileSync(join(API_DIR, rel), 'utf8'));
    // Following redirects on a user-supplied URL is the bypass that defeats any
    // check done only on the original address.
    if (/redirect:\s*['"]follow['"]/.test(src)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these files follow redirects without revalidating each hop — route them through api/_lib/ssrf.ts:\n  ${offenders.join('\n  ')}`
  );
});

test('every file that fetches a user-supplied URL imports the guard', () => {
  const offenders: string[] = [];
  for (const rel of walk(API_DIR)) {
    if (EXEMPT[rel]) continue;
    const src = stripComments(readFileSync(join(API_DIR, rel), 'utf8'));
    const doesFetch = /\bfetch\s*\(/.test(src);
    if (!doesFetch) continue;
    const guarded = /from '(\.\.\/)*_lib\/ssrf\.js'/.test(src);
    if (!guarded) offenders.push(rel);
  }
  assert.deepEqual(
    offenders,
    [],
    `these files call fetch() without importing the SSRF guard:\n  ${offenders.join('\n  ')}\n` +
      `If the target host is hardcoded and trusted, add the file to EXEMPT with a reason.`
  );
});

test('the guard itself is still wired into the main crawler', () => {
  const crawl = stripComments(readFileSync(join(API_DIR, '_lib/crawl.ts'), 'utf8'));
  assert.match(crawl, /from '\.\/ssrf\.js'/, 'crawl.ts must import the guard');
  assert.match(crawl, /assertPublicUrl/, 'crawl.ts must validate the entry URL');
  assert.doesNotMatch(crawl, /redirect:\s*['"]follow['"]/, 'crawl.ts must not follow redirects blindly');
});

test('share tokens come from a CSPRNG, not Math.random', () => {
  const db = readFileSync(join(API_DIR, '_lib/db.ts'), 'utf8');
  const tokenFn = db.slice(db.indexOf('export function shareToken'));
  assert.doesNotMatch(tokenFn, /Math\.random/, 'share tokens must not use Math.random');
  assert.match(tokenFn, /randomBytes/, 'share tokens must use randomBytes');
});

test('IP hashing is keyed, not a bare digest', () => {
  const db = readFileSync(join(API_DIR, '_lib/db.ts'), 'utf8');
  const fn = db.slice(db.indexOf('export function hashIp'));
  assert.match(fn, /createHmac/, 'the IPv4 space is 2^32 — an unkeyed hash is reversible');
});

test('admin endpoints compare tokens in constant time', () => {
  // A plain `!==` on a secret leaks it a character at a time through response
  // timing. These endpoints return the whole warm list, so it matters.
  for (const rel of ['leads/export.ts', 'admin/pipeline.ts']) {
    const src = readFileSync(join(API_DIR, rel), 'utf8');
    assert.match(src, /timingSafeEqual/, `${rel} must compare its admin token in constant time`);
  }
});
