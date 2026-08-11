// presence.ts — everything true about a business that is NOT on its own website.
//
// This is the half that owners cannot see about themselves, and it is where the
// most persuasive findings live. A beautiful site with no reviews anywhere is a
// business with a marketing problem it does not know it has.
//
// Design rule: absence is a finding, but only when we actually looked. Every
// probe reports one of three states — found / absent / not-checked — and the
// report never converts "not-checked" into "absent". Claiming a business has no
// reviews when we simply could not look is the fastest way to lose trust with
// the one person whose trust matters.
//
// Layered by cost:
//   Tier 0 (always on, no key, free): DNS, RDAP domain age, mail deliverability,
//           linked-profile verification, AI-assistant visibility.
//   Tier 1 (free-tier key): Brave Search — what actually comes up for them.
//   Tier 2 (free-tier key): Yelp Fusion — real ratings and review counts.
//   Tier 3 (paid, cheap):   Google Places — the profile that matters most.

import { promises as dns } from 'dns';

export type ProbeState = 'found' | 'absent' | 'not_checked';

export interface Probe<T = unknown> {
  state: ProbeState;
  /** Why it wasn't checked, when relevant. Shown to the owner, so keep it plain. */
  note?: string;
  data?: T;
}

export interface ReviewProfile {
  platform: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
  /** Reviews in the last 12 months, when the source exposes dates. */
  recentCount?: number;
  /** Does the business reply to reviews? Strong ranking and trust factor. */
  respondsToReviews?: boolean;
}

export interface PresenceResult {
  /** Everything we could learn about their reviews, across platforms. */
  reviews: Probe<ReviewProfile[]>;
  /** What actually surfaces when someone looks them up. */
  searchVisibility: Probe<{ query: string; results: { title: string; url: string; snippet: string }[]; ownSiteRanked: boolean }>;
  /** Real competitors — named only when genuinely observed, never invented. */
  competitors: Probe<{ name: string; url: string; note: string }[]>;
  /** Whether an AI assistant would name them. The demo that sells agentic SEO. */
  assistantVisibility: Probe<{ prompt: string; named: boolean; whoGotNamed: string[] }>;
  /** How established the domain is. */
  domainAge: Probe<{ registered: string; years: number }>;
  /** Can their email actually land in an inbox? */
  mail: Probe<{ hasMx: boolean; hasSpf: boolean; hasDmarc: boolean; provider: string | null }>;
  /** Directory and profile coverage found on their own site. */
  directories: Probe<{ platform: string; url: string }[]>;
}

const UA = 'Mozilla/5.0 (compatible; camposworks-snapshot/1.0; +https://campos.works/snapshot)';

const notChecked = (note: string): Probe<never> => ({ state: 'not_checked', note });

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  try {
    return await Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('t')), ms))]);
  } catch {
    return null;
  }
}

// ── Tier 0: domain age via RDAP. Free, no key, authoritative. ────────
async function probeDomainAge(domain: string): Promise<Probe<{ registered: string; years: number }>> {
  const res = await withTimeout(
    fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: 'application/rdap+json', 'User-Agent': UA },
    }).then((r) => (r.ok ? r.json() : null)),
    5000
  );
  if (!res) return notChecked('Registry lookup timed out.');
  const events = (res as { events?: { eventAction?: string; eventDate?: string }[] }).events || [];
  const reg = events.find((e) => e.eventAction === 'registration')?.eventDate;
  if (!reg) return { state: 'absent', note: 'Registration date not published by the registry.' };
  const years = Math.max(0, (Date.now() - new Date(reg).getTime()) / (365.25 * 24 * 3600 * 1000));
  return { state: 'found', data: { registered: reg.slice(0, 10), years: Math.round(years * 10) / 10 } };
}

// ── Tier 0: mail deliverability. Free, no key, and almost never checked. ──
async function probeMail(domain: string): Promise<Probe<{ hasMx: boolean; hasSpf: boolean; hasDmarc: boolean; provider: string | null }>> {
  const [mx, txt, dmarc] = await Promise.all([
    withTimeout(dns.resolveMx(domain), 4000),
    withTimeout(dns.resolveTxt(domain), 4000),
    withTimeout(dns.resolveTxt(`_dmarc.${domain}`), 4000),
  ]);

  if (mx === null && txt === null && dmarc === null) {
    return notChecked('DNS lookups did not respond.');
  }

  const hasMx = Array.isArray(mx) && mx.length > 0;
  const flat = (txt || []).map((r) => r.join('')).join(' ').toLowerCase();
  const hasSpf = /v=spf1/.test(flat);
  const hasDmarc = Array.isArray(dmarc) && dmarc.some((r) => /v=dmarc1/i.test(r.join('')));

  let provider: string | null = null;
  const mxHosts = (mx || []).map((m) => m.exchange.toLowerCase()).join(' ');
  if (/google|googlemail/.test(mxHosts)) provider = 'Google Workspace';
  else if (/outlook|microsoft|office365/.test(mxHosts)) provider = 'Microsoft 365';
  else if (/zoho/.test(mxHosts)) provider = 'Zoho';
  else if (/secureserver|godaddy/.test(mxHosts)) provider = 'GoDaddy';
  else if (/protonmail|proton\.me/.test(mxHosts)) provider = 'Proton';
  else if (hasMx) provider = 'Other';

  return { state: hasMx ? 'found' : 'absent', data: { hasMx, hasSpf, hasDmarc, provider } };
}

// ── Tier 0: what their own site links to. Free, already crawled. ─────
function probeDirectories(socialProfiles: string[]): Probe<{ platform: string; url: string }[]> {
  const map: [RegExp, string][] = [
    [/google\.com\/maps|maps\.app\.goo\.gl|g\.page/i, 'Google Business Profile'],
    [/yelp\./i, 'Yelp'],
    [/facebook\./i, 'Facebook'],
    [/instagram\./i, 'Instagram'],
    [/nextdoor\./i, 'Nextdoor'],
    [/angi\.|angieslist/i, 'Angi'],
    [/thumbtack\./i, 'Thumbtack'],
    [/houzz\./i, 'Houzz'],
    [/bbb\.org/i, 'BBB'],
    [/linkedin\./i, 'LinkedIn'],
    [/tiktok\./i, 'TikTok'],
    [/youtube\.|youtu\.be/i, 'YouTube'],
  ];
  const found: { platform: string; url: string }[] = [];
  for (const url of socialProfiles) {
    for (const [re, platform] of map) {
      if (re.test(url) && !found.some((f) => f.platform === platform)) {
        found.push({ platform, url });
        break;
      }
    }
  }
  return found.length
    ? { state: 'found', data: found }
    : { state: 'absent', note: 'No review or directory profiles are linked anywhere on the site.' };
}

// ── Tier 1: Brave Search. Free tier, 2k queries/month. ───────────────
interface BraveHit { title: string; url: string; description: string }

async function braveSearch(query: string): Promise<BraveHit[] | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  const res = await withTimeout(
    fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    }).then((r) => (r.ok ? r.json() : null)),
    7000
  );
  const web = (res as { web?: { results?: BraveHit[] } } | null)?.web?.results;
  return Array.isArray(web) ? web : null;
}

async function probeSearchVisibility(
  businessName: string,
  domain: string,
  locality: string
): Promise<{
  searchVisibility: PresenceResult['searchVisibility'];
  competitors: PresenceResult['competitors'];
  reviewHints: ReviewProfile[];
}> {
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return {
      searchVisibility: notChecked('Search visibility needs a search provider key — add BRAVE_SEARCH_API_KEY (free tier) to switch this on.'),
      competitors: notChecked('Named competitors need a search provider key.'),
      reviewHints: [],
    };
  }

  const nameQuery = businessName ? `${businessName} ${locality}`.trim() : domain;
  const hits = await braveSearch(nameQuery);

  if (!hits) {
    return {
      searchVisibility: notChecked('Search provider did not respond.'),
      competitors: notChecked('Search provider did not respond.'),
      reviewHints: [],
    };
  }

  const ownSiteRanked = hits.some((h) => h.url.includes(domain));

  // Review platforms that surfaced for their own name — real, not inferred.
  const reviewHints: ReviewProfile[] = [];
  for (const h of hits) {
    if (/yelp\.com\/biz/i.test(h.url) && !reviewHints.some((r) => r.platform === 'Yelp')) {
      reviewHints.push({ platform: 'Yelp', url: h.url });
    }
    if (/(google\.com\/maps|g\.page)/i.test(h.url) && !reviewHints.some((r) => r.platform === 'Google Business Profile')) {
      reviewHints.push({ platform: 'Google Business Profile', url: h.url });
    }
    if (/bbb\.org/i.test(h.url) && !reviewHints.some((r) => r.platform === 'BBB')) {
      reviewHints.push({ platform: 'BBB', url: h.url });
    }
  }

  const searchVisibility: PresenceResult['searchVisibility'] = {
    state: hits.length ? 'found' : 'absent',
    data: {
      query: nameQuery,
      results: hits.slice(0, 8).map((h) => ({ title: h.title, url: h.url, snippet: (h.description || '').slice(0, 220) })),
      ownSiteRanked,
    },
    note: ownSiteRanked ? undefined : 'Their own website did not appear in the first page of results for their own name.',
  };

  return { searchVisibility, competitors: notChecked('Pending category search.'), reviewHints };
}

/** Real competitors: who ranks for the category in their area. Named only if observed. */
async function probeCompetitors(
  nicheLabel: string,
  locality: string,
  ownDomain: string
): Promise<PresenceResult['competitors']> {
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return notChecked('Named competitors need a search provider key — add BRAVE_SEARCH_API_KEY (free tier).');
  }
  if (!locality) {
    return notChecked('No location found on the site, so a local competitor search would be guesswork.');
  }

  const hits = await braveSearch(`${nicheLabel} ${locality}`);
  if (!hits) return notChecked('Search provider did not respond.');

  const skip = /yelp|angi|thumbtack|houzz|bbb\.org|facebook|instagram|reddit|wikipedia|indeed|yellowpages|mapquest|nextdoor|tripadvisor|google\./i;
  const seen = new Set<string>();
  const out: { name: string; url: string; note: string }[] = [];

  for (const h of hits) {
    try {
      const host = new URL(h.url).hostname.replace(/^www\./, '');
      if (host.includes(ownDomain) || ownDomain.includes(host)) continue;
      if (skip.test(host) || seen.has(host)) continue;
      seen.add(host);
      out.push({
        name: h.title.split(/[|\-–—:]/)[0].trim().slice(0, 70),
        url: `https://${host}`,
        note: (h.description || '').slice(0, 160),
      });
      if (out.length >= 5) break;
    } catch { /* skip */ }
  }

  return out.length
    ? { state: 'found', data: out }
    : { state: 'absent', note: 'No independent local competitors surfaced — the category results are dominated by directories.' };
}

// ── Tier 2: Yelp Fusion. Free tier, real ratings and counts. ─────────
async function probeYelp(businessName: string, locality: string): Promise<ReviewProfile | null> {
  const key = process.env.YELP_API_KEY;
  if (!key || !businessName) return null;
  const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(businessName)}&location=${encodeURIComponent(locality || 'United States')}&limit=1`;
  const res = await withTimeout(
    fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)),
    6000
  );
  const biz = (res as { businesses?: { name: string; rating: number; review_count: number; url: string }[] } | null)?.businesses?.[0];
  if (!biz) return null;
  return { platform: 'Yelp', url: biz.url, rating: biz.rating, reviewCount: biz.review_count };
}

// ── Tier 3: Google Places. Cheap, and the one that matters most. ─────
async function probeGooglePlaces(businessName: string, locality: string): Promise<ReviewProfile | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !businessName) return null;
  const res = await withTimeout(
    fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: `${businessName} ${locality}`.trim(), maxResultCount: 1 }),
    }).then((r) => (r.ok ? r.json() : null)),
    6000
  );
  const p = (res as { places?: { rating?: number; userRatingCount?: number; googleMapsUri?: string }[] } | null)?.places?.[0];
  if (!p) return null;
  return {
    platform: 'Google Business Profile',
    url: p.googleMapsUri,
    rating: p.rating,
    reviewCount: p.userRatingCount,
  };
}

/**
 * The demo that sells the whole front-door offering: ask a real assistant to
 * recommend businesses in their trade and area, and see whether they get named.
 *
 * Uses the utility tier — this is a cheap question and does not need judgment.
 */
async function probeAssistantVisibility(
  businessName: string,
  nicheLabel: string,
  locality: string
): Promise<PresenceResult['assistantVisibility']> {
  if (!locality || !businessName) {
    return notChecked('Needs a business name and a location on the site to ask the question fairly.');
  }
  const { structured } = await import('./models.js');
  const prompt = `Recommend ${nicheLabel} businesses in ${locality}.`;
  try {
    const res = await structured<{ businesses: string[] }>({
      tier: 'utility',
      system:
        'You are answering as a general-purpose AI assistant would when a member of the public asks for a local business recommendation. ' +
        'List only businesses you actually have knowledge of. If you do not know of specific named businesses in that area, return an empty array. ' +
        'Do not invent plausible-sounding business names under any circumstances — an invented name makes the answer worthless.',
      user: prompt,
      schema: {
        type: 'object',
        properties: { businesses: { type: 'array', items: { type: 'string' } } },
        required: ['businesses'],
        additionalProperties: false,
      },
      maxTokens: 600,
      timeoutMs: 20000,
    });
    const named = res.data.businesses || [];
    const hit = named.some((n) => n.toLowerCase().includes(businessName.toLowerCase().slice(0, 14)));
    return {
      state: 'found',
      data: { prompt, named: hit, whoGotNamed: named.slice(0, 6) },
    };
  } catch {
    return notChecked('The assistant visibility check did not complete.');
  }
}

/**
 * Best available locality from what the crawl found.
 *
 * "City, ST" is preferred over a bare zip because a five-digit number on a page
 * is very often not a zip — it is a price, a phone fragment, a year, a table
 * number. A Virginia restaurant was located to an Alabama zip because the first
 * five digits on the page won.
 *
 * A bare zip is only trusted when it appears in zip-shaped context: directly
 * after a state abbreviation, or after a comma following a place name.
 */
export function deriveLocality(zips: string[], states: string[], bodyText: string): string {
  // 1. "Locust Grove, VA" — self-validating, and what a human would say.
  const cityState = bodyText.match(
    /\b([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,2}),\s*(A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/
  );
  if (cityState) return `${cityState[1]}, ${cityState[2]}`;

  // 2. A zip, but only where the surrounding text makes it a zip.
  const contextual = bodyText.match(
    /\b(?:A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])[\s,]+(\d{5})(?:-\d{4})?\b/
  );
  if (contextual) return contextual[1];

  // 3. State alone is thin but honest — better than a wrong zip.
  if (states.length) return states[0];

  // 4. Deliberately NOT falling back to zips[0]: an unanchored five-digit number
  //    is as likely to be wrong as right, and a wrong location poisons the
  //    competitor search and the assistant-visibility check.
  return '';
}

export async function gatherPresence(input: {
  domain: string;
  businessName: string;
  nicheLabel: string;
  locality: string;
  socialProfiles: string[];
}): Promise<PresenceResult> {
  const { domain, businessName, nicheLabel, locality, socialProfiles } = input;

  const [domainAge, mail, searchBundle, competitors, yelp, google, assistant] = await Promise.all([
    probeDomainAge(domain),
    probeMail(domain),
    probeSearchVisibility(businessName, domain, locality),
    probeCompetitors(nicheLabel, locality, domain),
    probeYelp(businessName, locality),
    probeGooglePlaces(businessName, locality),
    probeAssistantVisibility(businessName, nicheLabel, locality),
  ]);

  // Merge every review source we managed to reach.
  const profiles: ReviewProfile[] = [];
  if (google) profiles.push(google);
  if (yelp) profiles.push(yelp);
  for (const hint of searchBundle.reviewHints) {
    if (!profiles.some((p) => p.platform === hint.platform)) profiles.push(hint);
  }
  for (const d of probeDirectories(socialProfiles).data || []) {
    if (/Google Business Profile|Yelp|BBB/.test(d.platform) && !profiles.some((p) => p.platform === d.platform)) {
      profiles.push({ platform: d.platform, url: d.url });
    }
  }

  const anyReviewSourceChecked = Boolean(
    process.env.GOOGLE_PLACES_API_KEY || process.env.YELP_API_KEY || process.env.BRAVE_SEARCH_API_KEY
  );

  let reviews: Probe<ReviewProfile[]>;
  if (profiles.length) {
    reviews = { state: 'found', data: profiles };
  } else if (anyReviewSourceChecked) {
    reviews = {
      state: 'absent',
      note: 'We looked and found no review presence on Google, Yelp, or anywhere else. For a local business this is the single most expensive gap on this page — most customers check reviews before they call.',
      data: [],
    };
  } else {
    reviews = notChecked('Review lookup needs a provider key (Google Places, Yelp, or Brave Search).');
  }

  return {
    reviews,
    searchVisibility: searchBundle.searchVisibility,
    competitors: competitors.state === 'not_checked' && searchBundle.competitors.state !== 'not_checked'
      ? searchBundle.competitors
      : competitors,
    assistantVisibility: assistant,
    domainAge,
    mail,
    directories: probeDirectories(socialProfiles),
  };
}

/**
 * Presence findings fold into scoring, but only where we actually checked.
 * Returns a delta applied to the front-door score plus its own findings.
 */
export function presenceFindings(p: PresenceResult): { delta: number; findings: { ok: boolean; text: string }[] } {
  const findings: { ok: boolean; text: string }[] = [];
  let delta = 0;

  if (p.reviews.state === 'found' && p.reviews.data?.length) {
    const withCounts = p.reviews.data.filter((r) => typeof r.reviewCount === 'number');
    if (withCounts.length) {
      const total = withCounts.reduce((a, r) => a + (r.reviewCount || 0), 0);
      const best = withCounts.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))[0];
      findings.push({
        ok: total >= 20,
        text: `${total} reviews across ${withCounts.length} platform${withCounts.length > 1 ? 's' : ''} — ${best.platform} leads with ${best.reviewCount}${best.rating ? ` at ${best.rating}★` : ''}.`,
      });
      if (total < 20) delta -= 10;
    } else {
      findings.push({ ok: true, text: `Listed on ${p.reviews.data.map((r) => r.platform).join(', ')}.` });
    }
  } else if (p.reviews.state === 'absent') {
    delta -= 18;
    findings.push({ ok: false, text: p.reviews.note || 'No review presence found anywhere.' });
  }

  if (p.searchVisibility.state === 'found' && p.searchVisibility.data && !p.searchVisibility.data.ownSiteRanked) {
    delta -= 12;
    findings.push({ ok: false, text: 'Searching their own business name does not surface their own website on page one.' });
  }

  if (p.assistantVisibility.state === 'found' && p.assistantVisibility.data) {
    const { named, whoGotNamed } = p.assistantVisibility.data;
    if (named) {
      findings.push({ ok: true, text: 'An AI assistant names this business when asked to recommend one in this trade and area.' });
    } else {
      delta -= 14;
      findings.push({
        ok: false,
        text: whoGotNamed.length
          ? `An AI assistant asked to recommend this trade locally named ${whoGotNamed.slice(0, 3).join(', ')} — and not this business.`
          : 'An AI assistant asked to recommend this trade locally could not name a single business, including this one. That is an open lane.',
      });
    }
  }

  if (p.mail.state === 'found' && p.mail.data) {
    const { hasSpf, hasDmarc } = p.mail.data;
    if (!hasSpf || !hasDmarc) {
      delta -= 6;
      findings.push({
        ok: false,
        text: `Email is missing ${!hasSpf && !hasDmarc ? 'SPF and DMARC records' : !hasSpf ? 'an SPF record' : 'a DMARC record'} — quotes and invoices are more likely to land in spam.`,
      });
    } else {
      findings.push({ ok: true, text: 'Email is properly authenticated (SPF and DMARC present), so quotes reach the inbox.' });
    }
  } else if (p.mail.state === 'absent') {
    delta -= 8;
    findings.push({ ok: false, text: 'This domain cannot receive email at all — anything sent to an address here bounces.' });
  }

  if (p.domainAge.state === 'found' && p.domainAge.data) {
    const y = p.domainAge.data.years;
    findings.push({
      ok: y >= 2,
      text: y >= 2
        ? `Domain has been registered ${y} years — that history counts for you in search.`
        : `Domain is only ${y} years old, so search engines are still extending trust.`,
    });
  }

  if (p.directories.state === 'absent') {
    delta -= 8;
    findings.push({ ok: false, text: 'No review or directory profiles linked from the site, so visitors have nowhere to verify you.' });
  }

  return { delta, findings };
}
