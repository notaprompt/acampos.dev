import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { CrawlResult } from '../../src/lib/audit-types';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

function extractMeta(html: string, name: string): string | null {
  // Match both name= and property= attributes
  const re = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']` +
    `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    'i'
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
    || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1] : null;
}

function hasViewport(html: string): boolean {
  return /<meta[^>]*name=["']viewport["']/i.test(html);
}

function detectPlatform(html: string): { platform: string | null; evidence: string[] } {
  const evidence: string[] = [];
  if (/cdn\.shopify\.com/i.test(html)) {
    evidence.push('cdn.shopify.com');
    return { platform: 'Shopify', evidence };
  }
  if (/wp-content/i.test(html)) {
    evidence.push('wp-content');
    return { platform: 'WordPress', evidence };
  }
  if (/squarespace/i.test(html)) {
    evidence.push('squarespace reference');
    return { platform: 'Squarespace', evidence };
  }
  if (/wix\.com/i.test(html)) {
    evidence.push('wix.com reference');
    return { platform: 'Wix', evidence };
  }
  if (/webflow/i.test(html)) {
    evidence.push('webflow reference');
    return { platform: 'Webflow', evidence };
  }
  return { platform: 'custom', evidence: [] };
}

function detectFramework(html: string): string | null {
  if (/__next/i.test(html)) return 'Next.js';
  if (/__nuxt/i.test(html)) return 'Nuxt';
  if (/ng-version/i.test(html)) return 'Angular';
  // Check React after Next.js (Next uses React)
  if (/react/i.test(html) && /_react/i.test(html)) return 'React';
  if (/svelte/i.test(html)) return 'Svelte';
  if (/vue/i.test(html)) return 'Vue';
  return null;
}

function detectSSR(html: string): boolean {
  // Strip script and style tags, then check visible text length
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > 500;
}

function extractHeadings(html: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push({ level: parseInt(m[1]), text });
  }
  return headings;
}

function extractLinks(html: string, baseUrl: string): { internal: string[]; external: string[] } {
  const internal: string[] = [];
  const external: string[] = [];
  const origin = new URL(baseUrl).origin;
  const re = /<a[^>]*href=["']([^"'#][^"']*)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === origin) {
        if (internal.length < 100) internal.push(resolved.href);
      } else {
        if (external.length < 50) external.push(resolved.href);
      }
    } catch {
      // skip malformed URLs
    }
  }
  return { internal, external };
}

function extractImages(html: string, baseUrl: string): { images: { src: string; alt: string | null }[]; withoutAlt: number } {
  const images: { src: string; alt: string | null }[] = [];
  let withoutAlt = 0;
  const re = /<img[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null && images.length < 50) {
    const tag = m[0];
    const srcMatch = tag.match(/src=["']([^"']*)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    if (!srcMatch) continue;
    let src = srcMatch[1];
    try {
      src = new URL(src, baseUrl).href;
    } catch { /* keep as-is */ }
    const alt = altMatch ? altMatch[1] : null;
    if (alt === null || alt === '') withoutAlt++;
    images.push({ src, alt: altMatch ? altMatch[1] : null });
  }
  return { images, withoutAlt };
}

function extractJsonLd(html: string): { types: string[] } {
  const types: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      if (data['@type']) types.push(data['@type']);
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type']) types.push(item['@type']);
        }
      }
    } catch { /* skip invalid JSON-LD */ }
  }
  return { types };
}

function buildIndexablePages(internalLinks: string[], baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;
  const seen = new Set<string>();
  const pages: string[] = [];
  for (const link of internalLinks) {
    try {
      const u = new URL(link);
      const path = u.pathname;
      if (!path.startsWith('/')) continue;
      // Strip query params, use just origin + path
      const clean = origin + path;
      if (!seen.has(clean)) {
        seen.add(clean);
        if (pages.length < 50) pages.push(clean);
      }
    } catch { /* skip */ }
  }
  return pages;
}

async function safeFetch(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url: rawUrl } = req.body || {};
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'Missing url in request body' });
  }

  try {
    const url = normalizeUrl(rawUrl);
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    const origin = parsedUrl.origin;

    // Fetch main page with timing
    const start = Date.now();
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    const responseTimeMs = Date.now() - start;
    const html = await response.text();
    const contentType = response.headers.get('content-type') || 'unknown';

    // Extract meta
    const title = extractTitle(html);
    const description = extractMeta(html, 'description');
    const ogImage = extractMeta(html, 'og:image');
    const ogTitle = extractMeta(html, 'og:title');
    const canonicalUrl = extractCanonical(html);
    const hasViewportMeta = hasViewport(html);

    // Detect platform + framework + SSR
    const { platform, evidence: platformEvidence } = detectPlatform(html);
    const hasJsFramework = detectFramework(html);
    const isSSR = detectSSR(html);

    // Extract content
    const headings = extractHeadings(html);
    const { internal: internalLinks, external: externalLinks } = extractLinks(html, url);
    const { images, withoutAlt: imagesWithoutAlt } = extractImages(html, url);
    const { types: jsonLdTypes } = extractJsonLd(html);
    const indexablePages = buildIndexablePages(internalLinks, url);

    // Ancillary checks — run in parallel, all fail-safe
    let hasRobotsTxt = false;
    let hasSitemap = false;
    let sitemapUrls = 0;
    let hasAgentJson = false;
    let hasLlmsTxt = false;

    const [robotsRes, agentRes, llmsRes] = await Promise.all([
      safeFetch(`${origin}/robots.txt`, 5000),
      safeFetch(`${origin}/.well-known/agent.json`, 5000),
      safeFetch(`${origin}/llms.txt`, 5000),
    ]);

    // Parse robots.txt
    let sitemapUrl: string | null = null;
    if (robotsRes && robotsRes.ok) {
      hasRobotsTxt = true;
      try {
        const robotsText = await robotsRes.text();
        const sitemapMatch = robotsText.match(/^Sitemap:\s*(.+)$/im);
        if (sitemapMatch) sitemapUrl = sitemapMatch[1].trim();
      } catch { /* ignore */ }
    }

    // If no sitemap from robots.txt, try common location
    if (!sitemapUrl) sitemapUrl = `${origin}/sitemap.xml`;

    // Fetch sitemap
    try {
      const sitemapRes = await safeFetch(sitemapUrl, 5000);
      if (sitemapRes && sitemapRes.ok) {
        hasSitemap = true;
        const sitemapText = await sitemapRes.text();
        const locMatches = sitemapText.match(/<loc>/gi);
        sitemapUrls = locMatches ? locMatches.length : 0;
      }
    } catch { /* ignore */ }

    // Agent JSON
    if (agentRes && agentRes.ok) {
      hasAgentJson = true;
    }

    // llms.txt
    if (llmsRes && llmsRes.ok) {
      hasLlmsTxt = true;
    }

    const result: CrawlResult = {
      url,
      domain,
      isSSR,
      htmlContentLength: html.length,
      hasJsFramework,
      title,
      description,
      ogImage,
      ogTitle,
      hasRobotsTxt,
      hasSitemap,
      sitemapUrls,
      canonicalUrl,
      hasJsonLd: jsonLdTypes.length > 0,
      jsonLdTypes,
      indexablePages,
      responseTimeMs,
      contentType,
      isHttps: url.startsWith('https://'),
      hasViewportMeta,
      platform,
      platformEvidence,
      hasAgentJson,
      hasLlmsTxt,
      internalLinks,
      externalLinks,
      headings,
      images,
      imagesWithoutAlt,
    };

    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Crawl failed' });
  }
}
