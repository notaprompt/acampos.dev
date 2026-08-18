// Scrub guard for the anatomy snapshot.
//
// src/data/creature.json was extracted from a private census of a machine I
// still run. Three classes of thing were stripped on the way out: file paths
// and ports (a map of that machine), unbuilt work (the roadmap is the part
// worth keeping), and anything naming a person. If the data is ever
// regenerated from a newer census, these fail the build rather than let it
// ship quietly.

import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/creature.json' with { type: 'json' };

const organs = data.sections.flatMap((s) => s.organs);
const prose = [
  ...organs.map((o) => `${o.name} ${o.what} ${o.why ?? ''}`),
  ...data.crypt.map((c) => `${c.name} ${c.what}`),
  data.diagram,
].join('\n');

test('no file paths, home directories, or ports', () => {
  const leaks: string[] = [];
  const patterns: [string, RegExp][] = [
    ['file path', /[\w-]+\/[\w-]+\.(?:ts|tsx|py|sh|mjs|json|db)\b/g],
    ['home dir', /~\/|\/Users\//g],
    ['port', /:\d{4}\b/g],
    ['ip address', /\b\d{1,3}(?:\.\d{1,3}){3}\b/g],
    ['api route', /\/api\/\w+/g],
  ];
  for (const [label, re] of patterns) {
    for (const hit of prose.match(re) ?? []) leaks.push(`${label}: ${hit}`);
  }
  assert.deepEqual(leaks, [], `the anatomy leaks machine detail:\n  ${leaks.join('\n  ')}`);
});

test('only shipped organs are published', () => {
  // `wanted` and `scoped` describe approaches that are not built yet and
  // explain why they would work. That is the roadmap; it does not ship.
  const unshipped = organs.filter((o) => o.status !== 'live' && o.status !== 'partial');
  assert.deepEqual(
    unshipped.map((o) => `${o.name} (${o.status})`),
    [],
    'unbuilt work is in the published anatomy'
  );
});

test('no organ name appears twice', () => {
  // The dedupe pass collapsed overlapping organs — three separate entries once
  // claimed "proprioception", and one mechanism was written up in two sections.
  // A duplicate here means a merge got undone.
  const seen = new Map<string, number>();
  for (const o of organs) seen.set(o.name, (seen.get(o.name) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([n]) => n);
  assert.deepEqual(dupes, [], `duplicate organs: ${dupes.join(', ')}`);
});

test('the snapshot states the date it was taken', () => {
  // An undated census of a system that changes is just a claim.
  assert.match(data.surveyed, /^\d{4}-\d{2}-\d{2}$/);
});

test('counts match the data they summarize', () => {
  assert.equal(data.counts.shown, organs.length);
  assert.equal(data.counts.retired, data.crypt.length);
});

test('every organ says what it does', () => {
  const empty = organs.filter((o) => !o.what || o.what.length < 20).map((o) => o.name);
  assert.deepEqual(empty, [], `organs with no description: ${empty.join(', ')}`);
});

test('nothing merged away is still published', () => {
  // The dedupe collapsed overlapping organs — three entries once claimed
  // "proprioception", and one approval mechanism was written up in two
  // sections. The diagram labels organs by name, so a merge that misses the
  // picture leaves it contradicting the list beneath it. This caught three.
  const live = new Set(organs.map((o) => o.name));
  const resurrected = data.deduped.filter((name) => live.has(name));
  assert.deepEqual(resurrected, [], `merged-away organs are back in the list: ${resurrected}`);

  const labels = [...data.diagram.matchAll(/>([^<>]+)<\/text>/g)]
    .flatMap((m) => m[1].split('·'))
    .map((s) => s.trim().toLowerCase());
  const stale = data.deduped.filter((name) => {
    const bare = name.replace(/^the /, '');
    return labels.some((l) => l === name || l === bare);
  });
  assert.deepEqual(stale, [], `the diagram still names merged-away organs: ${stale}`);
});
