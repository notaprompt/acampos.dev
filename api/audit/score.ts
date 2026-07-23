import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { CrawlResult, ScoreCard, SWOT, AuditNarrative } from '../../src/lib/audit-types';

// OpenAI-compatible endpoint (OpenRouter by default, or a tunneled OmniRoute).
const BASE_URL = (process.env.OLIVER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const KEY = process.env.OLIVER_API_KEY || process.env.OPENROUTER_API_KEY || '';
// Free models, tried in order. Override with AUDIT_MODEL (comma-separated).
const MODELS = (process.env.AUDIT_MODEL
  ? process.env.AUDIT_MODEL.split(',').map((m) => m.trim()).filter(Boolean)
  : [
      'google/gemma-4-31b-it:free', // verified available 2026-07
      'openai/gpt-oss-20b:free',
      'google/gemma-4-26b-a4b-it:free',
    ]);

const SYSTEM = `You are a sharp, opinionated web strategist analyzing a business website. You've seen thousands of sites and you know exactly what works and what doesn't. Your analysis is honest, specific, and actionable - never generic.

You will receive crawl data from a website. Produce a JSON object with three keys:

1. "scores" - an array; grade each category A-F with a 0-100 score and 2-4 specific findings:
   SEO (meta tags, content in HTML, sitemap, robots.txt, structured data, indexability),
   Content (real content vs JS-only, headings, image alt text),
   Performance (response time, HTTPS, delivery),
   Mobile (viewport meta, responsive signals),
   Agent Readiness (agent.json, llms.txt, structured data for AI discovery).

2. "swot" - specific to THIS site, not generic (strengths, weaknesses, opportunities, threats - each an array of strings; name the actual thing, "no sitemap" not "SEO needs work").

3. "narrative" - direct, warm tone, not corporate, not salesy: headline (one punchy sentence), whatsWorking (2-3 sentences), whatsBroken (2-3 sentences), biggestOpportunity (1 sentence).

Be honest. If the site is good, say so. If it's broken, say why. Never pad with generic advice.

Respond with ONLY a single valid JSON object and nothing else - no prose, no markdown code fences. Exact shape:
{"scores":[{"category":"SEO","grade":"B","score":82,"findings":["..."]}],"swot":{"strengths":["..."],"weaknesses":["..."],"opportunities":["..."],"threats":["..."]},"narrative":{"headline":"...","whatsWorking":"...","whatsBroken":"...","biggestOpportunity":"..."}}`;

type AuditResult = { scores: ScoreCard[]; swot: SWOT; narrative: AuditNarrative };

function extractJson(text: string): AuditResult | null {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(t) as AuditResult;
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1)) as AuditResult;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function valid(r: AuditResult | null): r is AuditResult {
  return !!(r && Array.isArray(r.scores) && r.scores.length && r.swot && r.narrative && r.narrative.headline);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const crawl = req.body as CrawlResult;
  if (!crawl?.domain) return res.status(400).json({ error: 'Missing crawl data' });
  if (!KEY) return res.status(503).json({ error: 'Analysis is not configured (no model key set).' });

  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Analyze this website crawl data:\n\n${JSON.stringify(crawl, null, 2)}` },
  ];

  const deadline = Date.now() + 45000; // total budget across model fallbacks
  let lastErr = 'analysis failed';
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 4000) break;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(30000, remaining));
      const r = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://campos.works',
          'X-Title': 'campos.works - Audit',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4000,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) { lastErr = `model ${model} returned ${r.status}`; continue; }
      const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
      if (valid(parsed)) return res.json(parsed);
      lastErr = `model ${model} returned unusable output`;
    } catch {
      lastErr = `model ${model} timed out`;
    }
  }
  return res.status(502).json({ error: lastErr });
}
