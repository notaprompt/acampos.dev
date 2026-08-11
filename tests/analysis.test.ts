// Niche detection and deterministic scoring. These decide what the model is
// told, so a regression here quietly degrades every report without erroring.

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectNiche, nicheById, nicheOptions, briefing } from '../api/_lib/niches.ts';
import { scoreParts, healthScore, type CrawlResult } from '../api/_lib/crawl.ts';

// A minimal but realistic crawl result. Fields default to the worst case so a
// test only has to state what it is actually exercising.
function crawlFixture(over: Partial<CrawlResult> = {}): CrawlResult {
  return {
    ok: true, url: 'https://x.com', domain: 'x.com', finalUrl: 'https://x.com',
    isHttps: true, responseTimeMs: 300, statusCode: 200, htmlBytes: 5000,
    isSSR: true, framework: null, platform: null,
    title: null, description: null, canonical: null, hasViewport: true, ogImage: null,
    hasRobotsTxt: false, hasSitemap: false, sitemapUrls: 0, hasJsonLd: false, jsonLdTypes: [],
    hasAgentJson: false, hasLlmsTxt: false,
    headings: [], bodyText: '', wordCount: 0, imagesTotal: 0, imagesWithoutAlt: 0,
    internalLinks: [], externalLinks: [],
    phones: [], emails: [], zips: [], states: [],
    hasContactForm: false, hasOnlineBooking: false, hasPricingSignal: false,
    hasReviewSignal: false, hasLicenseSignal: false, hasHoursSignal: false,
    hasServiceAreaSignal: false, socialProfiles: [], pagesRead: ['https://x.com'],
    ...over,
  } as CrawlResult;
}

test('detects trade from the title with high confidence', () => {
  const r = detectNiche({ title: 'Orellana Landscaping & Lawn Care — Woodbridge VA' });
  assert.equal(r.pack.id, 'landscaping');
  assert.ok(r.confidence > 0.3, 'a title match should be confident');
});

test('detects from body text with lower confidence than a title match', () => {
  const strong = detectNiche({ title: 'Acme HVAC and Heating' });
  const weak = detectNiche({ bodyText: 'we do a bit of hvac work sometimes' });
  assert.equal(strong.pack.id, 'hvac');
  assert.ok(strong.confidence > weak.confidence, 'title signal must outweigh body signal');
});

test('falls back to the general pack rather than guessing', () => {
  const r = detectNiche({ title: 'Welcome', bodyText: 'We are a company that does things.' });
  assert.equal(r.pack.id, 'general');
  assert.equal(r.confidence, 0);
});

test('an explicit hint drives detection', () => {
  const r = detectNiche({ hint: 'we run a dental practice in Fairfax' });
  assert.equal(r.pack.id, 'dental');
});

test('every niche option resolves to a real pack', () => {
  for (const o of nicheOptions()) {
    const pack = nicheById(o.id);
    assert.ok(pack, `${o.id} must resolve`);
    assert.equal(pack.label, o.label);
  }
});

test('unknown niche id degrades to general rather than throwing', () => {
  assert.equal(nicheById('not-a-real-niche').id, 'general');
});

test('every briefing carries economics, leaks, and counters', () => {
  for (const o of nicheOptions()) {
    const b = briefing(nicheById(o.id));
    assert.match(b, /Typical ticket/);
    assert.match(b, /KNOWN REVENUE LEAKS/);
    assert.ok(b.length > 500, `${o.id} briefing is suspiciously thin`);
  }
});

test('a bare site scores badly across the board', () => {
  const parts = scoreParts(crawlFixture());
  const visible = parts.filter((p) => !p.notVisible);
  assert.ok(visible.length >= 5, 'should grade at least five visible parts');
  for (const p of visible) {
    assert.ok(p.score < 70, `${p.slug} should score poorly on an empty site, got ${p.score}`);
  }
});

test('a well-equipped site scores well', () => {
  const parts = scoreParts(crawlFixture({
    title: 'Acme', description: 'We do things', hasJsonLd: true, jsonLdTypes: ['LocalBusiness'],
    hasSitemap: true, sitemapUrls: 12, hasAgentJson: true, hasLlmsTxt: true,
    phones: ['555-123-4567'], emails: ['a@acme.com'],
    hasContactForm: true, hasOnlineBooking: true, hasHoursSignal: true,
    hasPricingSignal: true, hasServiceAreaSignal: true,
    hasReviewSignal: true, hasLicenseSignal: true,
    imagesTotal: 10, imagesWithoutAlt: 0,
    socialProfiles: ['https://facebook.com/acme'],
    bodyText: 'Join our newsletter to subscribe for updates',
  }));
  const intake = parts.find((p) => p.slug === 'intake');
  assert.ok(intake && intake.score >= 90, `intake should score high, got ${intake?.score}`);
  assert.ok(healthScore(parts) >= 75, 'a complete site should be healthy');
});

test('scores never leave 0-100', () => {
  for (const fixture of [crawlFixture(), crawlFixture({ isHttps: false, isSSR: false, hasViewport: false, responseTimeMs: 9000 })]) {
    for (const p of scoreParts(fixture)) {
      if (p.notVisible) continue;
      assert.ok(p.score >= 0 && p.score <= 100, `${p.slug} out of range: ${p.score}`);
    }
  }
});

test('parts we cannot observe are marked, not guessed', () => {
  const parts = scoreParts(crawlFixture());
  const hidden = parts.filter((p) => p.notVisible).map((p) => p.slug).sort();
  assert.deepEqual(hidden, ['money', 'scheduling', 'the-picture']);
  for (const p of parts.filter((x) => x.notVisible)) {
    assert.equal(p.grade, '—', 'an unobservable part must not carry a letter grade');
  }
});

test('health ignores unobservable parts', () => {
  const parts = scoreParts(crawlFixture());
  const visible = parts.filter((p) => !p.notVisible);
  const expected = Math.round(visible.reduce((a, p) => a + p.score, 0) / visible.length);
  assert.equal(healthScore(parts), expected);
});

test('every finding carries text a human can read', () => {
  for (const p of scoreParts(crawlFixture())) {
    for (const f of p.findings) {
      assert.equal(typeof f.ok, 'boolean');
      assert.ok(f.text && f.text.length > 10, `finding on ${p.slug} is too terse: "${f.text}"`);
    }
  }
});
