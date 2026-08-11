// POST /api/ai-visibility
//
// The ungated hook. No email, no account, no gate — you type your business and
// your town, and you watch an AI assistant either name you or name three of
// your competitors instead.
//
// Deliberately free and deliberately ungated: this is the top of the funnel and
// its whole job is to produce a moment that makes someone want the full read.
// Runs on the utility tier, which is free-first, so the cost of being generous
// here is close to zero.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { structured } from './_lib/models.js';
import { nicheById, nicheOptions } from './_lib/niches.js';
import { track, hashIp, clientIp, overRateLimit } from './_lib/db.js';

interface Answer { businesses: string[] }

const SCHEMA = {
  type: 'object',
  properties: { businesses: { type: 'array', items: { type: 'string' } } },
  required: ['businesses'],
  additionalProperties: false,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ipHash = hashIp(clientIp(req.headers as Record<string, string | string[] | undefined>));
  if (await overRateLimit(ipHash, 'ai_visibility', 12, 60)) {
    return res.status(429).json({ error: 'A few too many in an hour. Try again shortly.' });
  }

  const body = (req.body || {}) as { businessName?: string; locality?: string; nicheId?: string };
  const businessName = String(body.businessName || '').trim().slice(0, 120);
  const locality = String(body.locality || '').trim().slice(0, 120);
  const nicheId = String(body.nicheId || '').trim();

  if (!businessName || !locality || !nicheId) {
    return res.status(400).json({ error: 'Tell me the business name, the town, and the trade.' });
  }

  const pack = nicheById(nicheId);
  const prompt = `Recommend ${pack.label} businesses in ${locality}.`;

  await track('ai_visibility_run', { meta: { niche: pack.id, locality }, ipHash });

  try {
    const result = await structured<Answer>({
      tier: 'utility',
      system:
        'You are answering as a general-purpose AI assistant would when a member of the public asks for a local business recommendation. ' +
        'List only businesses you actually have knowledge of, most likely to be recommended first. ' +
        'If you do not know of specific named businesses in that area, return an empty array. ' +
        'Never invent a plausible-sounding business name — an invented name makes the answer worthless and misleads the person asking.',
      user: prompt,
      schema: SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 600,
      timeoutMs: 25_000,
    });

    const named = (result.data.businesses || []).filter((b) => typeof b === 'string').slice(0, 8);
    const needle = businessName.toLowerCase().slice(0, 14);
    const found = named.some((n) => n.toLowerCase().includes(needle));

    await track('ai_visibility_result', { meta: { niche: pack.id, found, count: named.length }, ipHash });

    return res.json({
      prompt,
      found,
      named,
      // The stat that makes this land. Sourced, not invented.
      context: found
        ? 'You are in the roughly 1 in 100 of local businesses that get named. Worth protecting — the way assistants pick is changing fast.'
        : named.length
          ? 'Those are the businesses getting the call. Being named is not about being the biggest — it is about being readable by a machine.'
          : 'The assistant could not name anyone in your area at all. That is an open lane, and it will not stay open.',
    });
  } catch {
    return res.status(503).json({ error: 'The check did not come back. Try again in a moment.' });
  }
}

export function options() {
  return nicheOptions();
}
