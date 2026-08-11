// Drift guard.
//
// The offering exists in two places by necessity: src/data/services.ts drives
// the pages (rich, with proof and prose), api/_lib/offering.ts drives the agent
// surfaces (compact, machine-readable). They previously drifted badly enough
// that five agent endpoints were advertising services and prices that no longer
// existed. These tests fail the build if that starts happening again.

import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFERS as HUMAN_OFFERS, PARTS as HUMAN_PARTS } from '../src/data/services.ts';
import { OFFERS as AGENT_OFFERS, PARTS as AGENT_PARTS, ENTRY_POINT, FREE_TOOLS } from '../api/_lib/offering.ts';

test('the same offers exist on both surfaces, in the same order', () => {
  assert.deepEqual(
    AGENT_OFFERS.map((o) => o.slug),
    HUMAN_OFFERS.map((o) => o.slug),
    'agent offer list has drifted from the page offer list'
  );
});

test('offer names match exactly', () => {
  for (const a of AGENT_OFFERS) {
    const h = HUMAN_OFFERS.find((x) => x.slug === a.slug)!;
    assert.equal(a.name, h.name, `name mismatch for ${a.slug}`);
  }
});

test('offer prices agree', () => {
  // The page writes "$1,500 – $8,000" (en dash, spaces); the agent surface
  // writes "$1,500-$8,000". Compare on digits so formatting can differ but
  // the actual numbers cannot.
  const digits = (s: string) => (s.match(/\d[\d,]*/g) || []).join('|');
  for (const a of AGENT_OFFERS) {
    const h = HUMAN_OFFERS.find((x) => x.slug === a.slug)!;
    assert.equal(
      digits(a.price),
      digits(h.price),
      `price mismatch for ${a.slug}: agent says "${a.price}", page says "${h.price}"`
    );
  }
});

test('the same eight business parts exist on both surfaces', () => {
  assert.equal(HUMAN_PARTS.length, 8, 'there should be exactly eight parts');
  assert.deepEqual(
    AGENT_PARTS.map((p) => p.slug),
    HUMAN_PARTS.map((p) => p.slug),
    'agent part list has drifted from the page part list'
  );
});

test('part names, questions, and price bands agree', () => {
  for (const a of AGENT_PARTS) {
    const h = HUMAN_PARTS.find((x) => x.slug === a.slug)!;
    assert.equal(a.name, h.name, `name mismatch for ${a.slug}`);
    assert.equal(a.question, h.question, `question mismatch for ${a.slug}`);
    assert.equal(a.priceFrom, h.priceFrom, `priceFrom mismatch for ${a.slug}`);
    assert.equal(a.priceTo, h.priceTo, `priceTo mismatch for ${a.slug}`);
  }
});

test('every agent URL points at a page that exists', () => {
  const partSlugs = new Set(HUMAN_PARTS.map((p) => p.slug));
  for (const p of AGENT_PARTS) {
    assert.equal(p.url, `https://campos.works/services/${p.slug}`, `bad url for ${p.slug}`);
    assert.ok(partSlugs.has(p.slug));
  }
  for (const o of AGENT_OFFERS) {
    assert.match(o.url, /^https:\/\/campos\.works\//, `bad url for ${o.slug}`);
  }
});

test('the free entry point is the Snapshot and stays free', () => {
  assert.equal(ENTRY_POINT.url, 'https://campos.works/snapshot');
  assert.equal(ENTRY_POINT.cost, 'free');
  const snapshot = AGENT_OFFERS.find((o) => o.slug === 'snapshot')!;
  assert.equal(snapshot.price, 'free');
  assert.equal(HUMAN_OFFERS.find((o) => o.slug === 'snapshot')!.priceValue, 0);
});

test('free tools are actually free and point at real pages', () => {
  assert.ok(FREE_TOOLS.length >= 2);
  for (const t of FREE_TOOLS) {
    assert.match(t.url, /^https:\/\/campos\.works\/(ai-visibility|the-index)$/);
    assert.ok(t.description.length > 40);
  }
});

test('no offer makes a revenue claim we cannot back', () => {
  // A false "paying users" claim on a page selling honesty is the most
  // expensive copy on the site. This caught five instances once already.
  const banned = /paying (users?|customers?)|revenue of|\bARR\b|\bMRR\b/i;
  const corpus = [
    ...AGENT_OFFERS.map((o) => `${o.name} ${o.description}`),
    ...HUMAN_OFFERS.map((o) => `${o.name} ${o.what} ${o.who} ${o.includes.join(' ')}`),
    ...HUMAN_PARTS.flatMap((p) => p.proof.map((x) => `${x.claim} ${x.evidence}`)),
  ].join('\n');
  const hit = corpus.split('\n').find((line) => banned.test(line));
  assert.equal(hit, undefined, `unbacked revenue claim: ${hit}`);
});
