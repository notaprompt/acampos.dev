// The niche packs in api/_lib/niches.ts are the thing that makes the Snapshot
// read bespoke — hand-written unit economics and named revenue leaks per trade.
// They are server-only by design.
//
// Astro pages CAN import them (ai-visibility.astro does, for the dropdown
// labels), which means one careless `{JSON.stringify(pack)}` in a template
// would ship the entire moat to anyone who views source. This test reads the
// built output and fails if any of it escaped.
//
// Requires `npm run build` first; skips with a clear message otherwise.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

/** Strings that must never appear in a built asset. */
const MUST_NOT_SHIP = [
  // Niche pack structure
  'KNOWN REVENUE LEAKS',
  'competitorWeakness',
  'trustSignals',
  'typicalCost',
  'INDUSTRY BRIEFING',
  // Verbatim leak copy — the actual IP
  'the unreturned estimate call',
  'spring signup compression',
  'the aging-system list nobody keeps',
  'the lapsed recall list',
  'declined work never followed up',
  // Prompts
  'You are an operations consultant',
  'RULES THAT MATTER MORE THAN STYLE',
  'Never invent a fact about this business',
];

/**
 * The admin surface must never be indexable. Checked separately from the leak
 * scan because the *word* ADMIN_TOKEN legitimately appears there as an input
 * placeholder — it is the variable name, not a value.
 */
const ADMIN_PAGES = ['admin/pipeline/index.html'];

/** Labels are fine — the industry dropdown needs them. */
const ALLOWED = ['landscaping & lawn care', 'HVAC & mechanical'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(html|js|json|css|txt)$/.test(entry)) out.push(full);
  }
  return out;
}

test('no server-only IP ships in the built site', { skip: !existsSync(DIST) && 'run `npm run build` first' }, () => {
  const files = walk(DIST);
  assert.ok(files.length > 10, 'dist looks empty — build first');

  const leaks: string[] = [];
  for (const file of files) {
    // agent.json and llms.txt are deliberately public offering documents.
    const src = readFileSync(file, 'utf8');
    for (const needle of MUST_NOT_SHIP) {
      if (src.includes(needle)) {
        leaks.push(`${file.replace(DIST, 'dist')} contains "${needle}"`);
      }
    }
  }

  assert.deepEqual(
    leaks,
    [],
    `server-only content leaked into the build:\n  ${leaks.join('\n  ')}\n` +
      `Niche packs and prompts must stay in api/_lib and never reach a template.`
  );
});

test('admin surfaces are noindex', { skip: !existsSync(DIST) && 'run `npm run build` first' }, () => {
  for (const rel of ADMIN_PAGES) {
    const file = join(DIST, rel);
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    assert.match(src, /name="robots"\s+content="noindex/, `${rel} must be noindex`);
    // A real token must never be baked into the page.
    assert.doesNotMatch(src, /token=['"][A-Za-z0-9_-]{12,}/, `${rel} must not contain a literal token`);
  }
});

test('industry labels DO ship — the dropdown needs them', { skip: !existsSync(DIST) && 'run `npm run build` first' }, () => {
  const page = join(DIST, 'ai-visibility', 'index.html');
  if (!existsSync(page)) return; // page not built in this configuration
  const src = readFileSync(page, 'utf8');
  const found = ALLOWED.filter((label) => src.includes(label) || src.includes(label.replace(/&/g, '&amp;')));
  assert.ok(found.length > 0, 'the industry picker should render its labels');
});
