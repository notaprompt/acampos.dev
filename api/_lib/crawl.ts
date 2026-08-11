// crawl.ts — everything we can know for free.
//
// Rule 1 of the pipeline: math in code. Every check here is deterministic and
// costs nothing, so the model is never asked to judge something a regex can settle.
// The model's whole job is the part that needs judgment.
//
// The important upgrade over a metadata-only crawl: we extract the page's actual
// prose. A model that can read what a business SAYS about itself produces a
// tailored analysis. A model that only sees <meta> tags produces horoscopes.

import { safeFetch, assertPublicUrl, BlockedUrlError } from './ssrf.js';

const UA = 'Mozilla/5.0 (compatible; camposworks-snapshot/1.0; +https://campos.works/snapshot)';

export interface CrawlResult {
  ok: boolean;
  error?: string;
  url: string;
  domain: string;
  finalUrl: string;

  // Delivery
  isHttps: boolean;
  responseTimeMs: number;
  statusCode: number;
  htmlBytes: number;
  isSSR: boolean;
  framework: string | null;
  platform: string | null;

  // Meta
  title: string | null;
  description: string | null;
  canonical: string | null;
  hasViewport: boolean;
  ogImage: string | null;

  // Machine readability
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrls: number;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  hasAgentJson: boolean;
  hasLlmsTxt: boolean;

  // Content
  headings: { level: number; text: string }[];
  /** Cleaned main prose. The single most valuable field for tailoring. */
  bodyText: string;
  wordCount: number;
  imagesTotal: number;
  imagesWithoutAlt: number;
  internalLinks: string[];
  externalLinks: string[];

  // Business signals — what a customer needs to see
  phones: string[];
  emails: string[];
  zips: string[];
  states: string[];
  /** Booking / quote / contact affordances found anywhere on the page. */
  hasContactForm: boolean;
  hasOnlineBooking: boolean;
  hasPricingSignal: boolean;
  hasReviewSignal: boolean;
  hasLicenseSignal: boolean;
  hasHoursSignal: boolean;
  hasServiceAreaSignal: boolean;
  socialProfiles: string[];
  /** Extra pages we followed for context. */
  pagesRead: string[];
}

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  u = u.replace(/^https?:\/\//i, (m) => m.toLowerCase());
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Prefer the real content region. Falls back to the whole body, because a broken
 * heuristic that returns nothing is worse than a blunt one that returns too much.
 */
function extractMain(html: string): string {
  const candidates = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*(?:id|class)=["'][^"']*(?:content|main|page|wrapper)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (m && m[1]) {
      const text = stripTags(m[1]);
      if (text.length > 300) return text;
    }
  }
  // Drop chrome before falling back.
  const body = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  return stripTags(body);
}

function meta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']` +
      `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    'i'
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function detectPlatform(html: string): string | null {
  if (/cdn\.shopify\.com|shopify\.theme/i.test(html)) return 'Shopify';
  if (/wp-content|wp-includes|wp-json/i.test(html)) return 'WordPress';
  if (/squarespace|static1\.squarespace/i.test(html)) return 'Squarespace';
  if (/wix\.com|wixstatic/i.test(html)) return 'Wix';
  if (/webflow/i.test(html)) return 'Webflow';
  if (/godaddy|websitebuilder/i.test(html)) return 'GoDaddy';
  if (/duda(?:one)?\.|dudamobile/i.test(html)) return 'Duda';
  if (/weebly/i.test(html)) return 'Weebly';
  return null;
}

function detectFramework(html: string): string | null {
  if (/__NEXT_DATA__|\/_next\//i.test(html)) return 'Next.js';
  if (/__NUXT__|\/_nuxt\//i.test(html)) return 'Nuxt';
  if (/ng-version=/i.test(html)) return 'Angular';
  if (/astro-island|data-astro-cid/i.test(html)) return 'Astro';
  if (/svelte-/i.test(html)) return 'Svelte';
  return null;
}

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/g;
const STATE_RE = /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/g;

/**
 * All outbound fetches go through safeFetch, which validates the host's resolved
 * addresses on the initial request and on every redirect hop. This endpoint is
 * public and takes a URL from a stranger, so an unguarded fetch here is an SSRF
 * straight into the private network and the cloud metadata service.
 */
async function fetchText(url: string, timeoutMs: number): Promise<{ text: string; status: number; finalUrl: string } | null> {
  try {
    const r = await safeFetch(url, { timeoutMs, userAgent: UA });
    if (!r) return null;
    return { text: r.text, status: r.status, finalUrl: r.finalUrl };
  } catch {
    // BlockedUrlError included — a blocked sub-resource is simply "not found".
    return null;
  }
}

async function exists(url: string): Promise<boolean> {
  try {
    const r = await safeFetch(url, { timeoutMs: 4000, userAgent: UA, maxBytes: 200_000 });
    if (!r || r.status >= 400) return false;
    // A SPA that 200s an HTML page for /agent.json has not got an agent surface.
    if (r.contentType.includes('text/html')) return false;
    return true;
  } catch {
    return false;
  }
}

export async function crawl(rawUrl: string): Promise<CrawlResult> {
  const url = normalizeUrl(rawUrl);
  let origin = '';
  let domain = '';

  // Validate before anything is fetched, and surface the refusal to the caller
  // rather than silently returning an empty crawl.
  try {
    const u = await assertPublicUrl(url);
    origin = u.origin;
    domain = u.hostname.replace(/^www\./, '');
  } catch (err) {
    if (err instanceof BlockedUrlError) return blank(url, err.message);
    return blank(url, 'That URL does not look valid.');
  }

  const started = Date.now();
  const primary = await fetchText(url, 12000);
  const responseTimeMs = Date.now() - started;

  if (!primary) {
    return blank(url, "Could not reach that site — it may be down, or blocking automated requests.", domain);
  }

  const html = primary.text;
  const lower = html.toLowerCase();

  // Cheap parallel probes for the machine-readable surface.
  const [robots, sitemapRaw, agentJson, llmsTxt] = await Promise.all([
    fetchText(`${origin}/robots.txt`, 4000),
    fetchText(`${origin}/sitemap.xml`, 5000),
    exists(`${origin}/agent.json`),
    exists(`${origin}/llms.txt`),
  ]);

  const headings: { level: number; text: string }[] = [];
  const hRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hRe.exec(html)) !== null && headings.length < 40) {
    const text = stripTags(hm[2]);
    if (text) headings.push({ level: parseInt(hm[1], 10), text: text.slice(0, 160) });
  }

  const internal: string[] = [];
  const external: string[] = [];
  const social: string[] = [];
  const aRe = /<a[^>]*href=["']([^"'#][^"']*)["']/gi;
  let am: RegExpExecArray | null;
  while ((am = aRe.exec(html)) !== null) {
    const href = am[1].trim();
    if (!href || /^(javascript:|mailto:|tel:|sms:)/i.test(href)) continue;
    try {
      const r = new URL(href, primary.finalUrl);
      if (r.origin === origin) {
        if (internal.length < 80 && !internal.includes(r.href)) internal.push(r.href);
      } else {
        if (/facebook|instagram|linkedin|x\.com|twitter|yelp|nextdoor|tiktok|youtube|google\.com\/maps|angi|thumbtack|houzz|bbb\.org/i.test(r.hostname + r.pathname)) {
          if (!social.includes(r.href) && social.length < 20) social.push(r.href);
        }
        if (external.length < 40 && !external.includes(r.href)) external.push(r.href);
      }
    } catch { /* skip */ }
  }

  let imagesTotal = 0;
  let imagesWithoutAlt = 0;
  const imgRe = /<img\b[^>]*>/gi;
  let im: RegExpExecArray | null;
  while ((im = imgRe.exec(html)) !== null) {
    imagesTotal++;
    const tag = im[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i);
    if (!alt || !alt[1].trim()) imagesWithoutAlt++;
  }

  const jsonLdTypes: string[] = [];
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = ldRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(lm[1].trim());
      const walk = (n: unknown) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === 'object') {
          const t = (n as Record<string, unknown>)['@type'];
          if (typeof t === 'string' && !jsonLdTypes.includes(t)) jsonLdTypes.push(t);
          else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && !jsonLdTypes.includes(x) && jsonLdTypes.push(x));
          const g = (n as Record<string, unknown>)['@graph'];
          if (g) walk(g);
        }
      };
      walk(parsed);
    } catch { /* malformed JSON-LD is itself a finding, but not a crash */ }
  }

  // Read a couple of high-signal internal pages so the model sees what they sell.
  const wanted = internal
    .filter((h) => /\/(services?|about|pricing|rates|contact|book|quote|estimate|work|gallery|products?)\b/i.test(h))
    .slice(0, 2);
  const extras = await Promise.all(wanted.map((h) => fetchText(h, 7000)));
  const pagesRead = [primary.finalUrl];
  let combined = extractMain(html);
  extras.forEach((e, i) => {
    if (e && e.status < 400) {
      pagesRead.push(wanted[i]);
      combined += '\n\n' + extractMain(e.text);
    }
  });
  const allHtml = html + extras.map((e) => e?.text || '').join('');
  const allLower = allHtml.toLowerCase();

  const bodyText = combined.slice(0, 14000);

  const sitemapUrls = sitemapRaw?.text ? (sitemapRaw.text.match(/<loc>/gi) || []).length : 0;

  const uniq = (arr: string[], n: number) => [...new Set(arr)].slice(0, n);

  return {
    ok: true,
    url,
    domain,
    finalUrl: primary.finalUrl,
    isHttps: primary.finalUrl.startsWith('https://'),
    responseTimeMs,
    statusCode: primary.status,
    htmlBytes: html.length,
    isSSR: stripTags(html).length > 500,
    framework: detectFramework(html),
    platform: detectPlatform(html),

    title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim() || null,
    description: meta(html, 'description'),
    canonical: html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || null,
    hasViewport: /<meta[^>]*name=["']viewport["']/i.test(html),
    ogImage: meta(html, 'og:image'),

    hasRobotsTxt: Boolean(robots && robots.status < 400 && !/<html/i.test(robots.text)),
    hasSitemap: sitemapUrls > 0,
    sitemapUrls,
    hasJsonLd: jsonLdTypes.length > 0,
    jsonLdTypes,
    hasAgentJson: agentJson,
    hasLlmsTxt: llmsTxt,

    headings,
    bodyText,
    wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    imagesTotal,
    imagesWithoutAlt,
    internalLinks: uniq(internal, 40),
    externalLinks: uniq(external, 20),

    phones: uniq((allHtml.match(PHONE_RE) || []).map((s) => s.trim()), 5),
    emails: uniq((allHtml.match(EMAIL_RE) || []).filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/i.test(e)), 5),
    zips: uniq(combined.match(ZIP_RE) || [], 8),
    states: uniq(combined.match(STATE_RE) || [], 6),

    hasContactForm: /<form/i.test(allHtml) && /(name|email|phone|message)/i.test(allLower),
    hasOnlineBooking: /(book\s*(now|online|appointment)|schedule\s*(now|online|a\s|an\s)|calendly|acuity|squareup\.com\/appointments|setmore|booksy|vagaro|housecallpro|jobber|servicetitan)/i.test(allLower),
    hasPricingSignal: /(\$\s?\d|pricing|our rates|price list|starting at|per (hour|visit|month|sq))/i.test(allLower),
    hasReviewSignal: /(review|testimonial|★|5[\s-]star|what our (clients|customers))/i.test(allLower),
    hasLicenseSignal: /(licens|insured|bonded|certified|accredit|epa|ase|nate)/i.test(allLower),
    hasHoursSignal: /(hours|open\s*(mon|tue|wed|thu|fri|sat|sun)|monday\s*[-–—]\s*friday|24\/7|open 24)/i.test(allLower),
    hasServiceAreaSignal: /(service area|areas we serve|we serve|serving\s+[A-Z]|surrounding areas|counties)/i.test(allHtml),
    socialProfiles: uniq(social, 10),
    pagesRead,
  };
}

function blank(url: string, error: string, domain = ''): CrawlResult {
  return {
    ok: false, error, url, domain, finalUrl: url,
    isHttps: url.startsWith('https://'), responseTimeMs: 0, statusCode: 0, htmlBytes: 0,
    isSSR: false, framework: null, platform: null,
    title: null, description: null, canonical: null, hasViewport: false, ogImage: null,
    hasRobotsTxt: false, hasSitemap: false, sitemapUrls: 0, hasJsonLd: false, jsonLdTypes: [],
    hasAgentJson: false, hasLlmsTxt: false,
    headings: [], bodyText: '', wordCount: 0, imagesTotal: 0, imagesWithoutAlt: 0,
    internalLinks: [], externalLinks: [],
    phones: [], emails: [], zips: [], states: [],
    hasContactForm: false, hasOnlineBooking: false, hasPricingSignal: false,
    hasReviewSignal: false, hasLicenseSignal: false, hasHoursSignal: false,
    hasServiceAreaSignal: false, socialProfiles: [], pagesRead: [],
  };
}

// ── Deterministic scoring ───────────────────────────────────────────
// Every point below is a fact, not an opinion. The model never grades;
// it explains. That keeps grades stable across runs and keeps cost down.

export interface PartScore {
  slug: string;
  label: string;
  score: number;      // 0-100
  grade: string;      // A-F
  /** Observed facts that produced this score. Shown to the owner verbatim. */
  findings: { ok: boolean; text: string }[];
  /** True when we genuinely cannot see this from outside. Honesty beats coverage. */
  notVisible?: boolean;
}

function grade(n: number): string {
  if (n >= 90) return 'A';
  if (n >= 80) return 'B';
  if (n >= 68) return 'C';
  if (n >= 55) return 'D';
  return 'F';
}

export function scoreParts(c: CrawlResult): PartScore[] {
  const f = (ok: boolean, text: string) => ({ ok, text });
  const out: PartScore[] = [];

  // ── Front door ──
  {
    let s = 100;
    const findings = [];
    if (!c.isHttps) { s -= 20; findings.push(f(false, 'No HTTPS — browsers warn visitors before they read a word')); }
    else findings.push(f(true, 'HTTPS is on'));

    if (!c.isSSR) { s -= 22; findings.push(f(false, 'Content only appears after JavaScript runs — many crawlers and AI assistants see an empty page')); }
    else findings.push(f(true, 'Content is in the HTML, so crawlers and assistants can read it'));

    if (!c.title) { s -= 10; findings.push(f(false, 'No page title')); }
    if (!c.description) { s -= 8; findings.push(f(false, 'No meta description — search engines are writing your summary for you')); }
    if (!c.hasJsonLd) { s -= 14; findings.push(f(false, 'No structured data, so machines have to guess what kind of business this is')); }
    else findings.push(f(true, `Structured data present (${c.jsonLdTypes.slice(0, 3).join(', ') || 'unspecified'})`));

    if (!c.hasSitemap) { s -= 8; findings.push(f(false, 'No sitemap found')); }
    else findings.push(f(true, `Sitemap lists ${c.sitemapUrls} pages`));

    if (!c.hasAgentJson && !c.hasLlmsTxt) { s -= 12; findings.push(f(false, 'No agent.json or llms.txt — nothing written for AI assistants to read')); }
    else findings.push(f(true, 'Machine-readable profile present for AI assistants'));

    if (!c.hasViewport) { s -= 10; findings.push(f(false, 'No mobile viewport tag — the site likely renders badly on a phone')); }
    if (c.responseTimeMs > 1800) { s -= 8; findings.push(f(false, `Slow first response (${c.responseTimeMs}ms)`)); }
    else if (c.responseTimeMs > 0) findings.push(f(true, `Responds in ${c.responseTimeMs}ms`));

    out.push({ slug: 'front-door', label: 'The front door', score: Math.max(0, s), grade: grade(Math.max(0, s)), findings });
  }

  // ── Intake ──
  {
    let s = 100;
    const findings = [];
    if (c.phones.length === 0) { s -= 22; findings.push(f(false, 'No phone number found on the page')); }
    else findings.push(f(true, `Phone number visible (${c.phones[0]})`));

    if (!c.hasContactForm) { s -= 20; findings.push(f(false, 'No contact form — the only way in is to phone you')); }
    else findings.push(f(true, 'Contact form present'));

    if (!c.hasOnlineBooking) { s -= 24; findings.push(f(false, 'No way to book or request a quote without talking to someone — this is where after-hours demand goes to your competitors')); }
    else findings.push(f(true, 'Online booking or quote request available'));

    if (!c.hasHoursSignal) { s -= 12; findings.push(f(false, 'Business hours not stated, so nobody knows when you answer')); }
    else findings.push(f(true, 'Hours are stated'));

    if (c.emails.length === 0) { s -= 8; findings.push(f(false, 'No email address published')); }

    out.push({ slug: 'intake', label: 'Intake', score: Math.max(0, s), grade: grade(Math.max(0, s)), findings });
  }

  // ── Quoting ──
  {
    let s = 100;
    const findings = [];
    if (!c.hasPricingSignal) { s -= 34; findings.push(f(false, 'No pricing information of any kind — visitors who want a ballpark leave to find one')); }
    else findings.push(f(true, 'Some pricing or "starting at" information is published'));
    if (!c.hasOnlineBooking) { s -= 18; findings.push(f(false, 'No structured quote request, so estimates start with phone tag')); }
    if (!c.hasServiceAreaSignal) { s -= 16; findings.push(f(false, 'Service area not named — people cannot tell if you cover them')); }
    else findings.push(f(true, 'Service area is described'));

    out.push({ slug: 'quoting', label: 'Quoting & estimates', score: Math.max(0, s), grade: grade(Math.max(0, s)), findings });
  }

  // ── Records & proof ──
  {
    let s = 100;
    const findings = [];
    if (!c.hasLicenseSignal) { s -= 26; findings.push(f(false, 'No licensing, insurance, or certification mentioned — the first thing a cautious customer looks for')); }
    else findings.push(f(true, 'Licensing, insurance, or certification is mentioned'));
    if (!c.hasReviewSignal) { s -= 24; findings.push(f(false, 'No reviews or testimonials on the page')); }
    else findings.push(f(true, 'Reviews or testimonials are present'));
    if (c.imagesTotal === 0) { s -= 18; findings.push(f(false, 'No images at all — no proof of your own work')); }
    else if (c.imagesWithoutAlt / Math.max(1, c.imagesTotal) > 0.5) {
      s -= 10;
      findings.push(f(false, `${c.imagesWithoutAlt} of ${c.imagesTotal} images have no alt text — invisible to search and to screen readers`));
    } else findings.push(f(true, `${c.imagesTotal} images, most with alt text`));

    out.push({ slug: 'records', label: 'Records & proof', score: Math.max(0, s), grade: grade(Math.max(0, s)), findings });
  }

  // ── Follow-up ──
  {
    let s = 100;
    const findings = [];
    const hasNewsletter = /(newsletter|subscribe|mailing list|join our list|sign up for)/i.test(c.bodyText);
    if (!hasNewsletter) { s -= 22; findings.push(f(false, 'No way to stay in touch with someone who is not ready to buy today')); }
    else findings.push(f(true, 'A way to capture people who are not ready yet exists'));
    if (c.socialProfiles.length === 0) { s -= 18; findings.push(f(false, 'No linked social or review profiles')); }
    else findings.push(f(true, `${c.socialProfiles.length} social or review profiles linked`));
    if (!c.hasReviewSignal) { s -= 16; findings.push(f(false, 'No sign that reviews are being asked for')); }

    out.push({ slug: 'follow-up', label: 'Follow-up', score: Math.max(0, s), grade: grade(Math.max(0, s)), findings });
  }

  // Parts we genuinely cannot see from outside. Say so rather than invent a grade.
  for (const [slug, label] of [
    ['scheduling', 'Scheduling & dispatch'],
    ['money', 'Getting paid'],
    ['the-picture', "The owner's picture"],
  ] as const) {
    out.push({
      slug, label, score: -1, grade: '—', notVisible: true,
      findings: [f(true, 'Not visible from outside your website — this one needs a conversation, and it is free to have.')],
    });
  }

  return out;
}

/** Overall health across only the parts we could actually observe. */
export function healthScore(parts: PartScore[]): number {
  const visible = parts.filter((p) => !p.notVisible);
  if (!visible.length) return 0;
  return Math.round(visible.reduce((a, p) => a + p.score, 0) / visible.length);
}
