// models.ts — the inference layer.
//
// Three rules, in order:
//   1. Math in code. Anything deterministic never reaches a model.
//   2. Knowledge in data. Industry economics come from niches.ts, not from weights.
//   3. Judgment in the model. Only the part that actually needs judgment gets billed.
//
// SERVER-ONLY. Prompts never ship to the browser.

import Anthropic from '@anthropic-ai/sdk';

/** What a call is for. Drives model choice, not the caller's opinion. */
export type Tier =
  /** A real visitor, live, watching a spinner. The conversion moment. */
  | 'snapshot'
  /** Paid or booked work. Correctness over cost. */
  | 'deep'
  /** Mechanical work — labeling, classification. Cheapest thing that works. */
  | 'utility'
  /**
   * Hundreds of pre-generated snapshots for cold outreach. Per-call quality
   * matters less than being able to run 500 of them, so this goes free-first.
   */
  | 'bulk';

const MODEL_BY_TIER: Record<Tier, string> = {
  // Sonnet 5: strong judgment at ~4c/snapshot, and its 1024-token prompt-cache
  // minimum means the niche briefing actually caches (Haiku's is 4096 and would not).
  snapshot: 'claude-sonnet-5',
  deep: 'claude-opus-5',
  utility: 'claude-haiku-4-5',
  bulk: 'claude-haiku-4-5',
};

/**
 * Tiers that try free inference BEFORE spending anything.
 *
 * The live snapshot is deliberately NOT in here. It is the artifact that turns a
 * stranger into a client, and free endpoints are rate-limited and quality-variable
 * in ways that show up exactly when traffic spikes — which is the worst possible
 * moment. Four cents is the cheapest customer acquisition in the business.
 *
 * Override with FREE_FIRST_TIERS if you want to test that assumption.
 */
const FREE_FIRST: Set<Tier> = new Set(
  (process.env.FREE_FIRST_TIERS || 'bulk,utility')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Tier[]
);

/** Published list prices, $ per million tokens. Used for the cost ledger, not for routing. */
const PRICE: Record<string, { in: number; out: number }> = {
  'claude-opus-5': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};

export interface CallResult<T> {
  data: T;
  meta: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    /** Estimated list-price cost in USD cents, for the ledger. */
    costCents: number;
    ms: number;
    fallback: boolean;
  };
}

function estimateCents(model: string, inTok: number, outTok: number, cachedTok: number): number {
  const p = PRICE[model];
  if (!p) return 0;
  // Cache reads bill at ~0.1x input.
  const dollars = ((inTok - cachedTok) * p.in + cachedTok * p.in * 0.1 + outTok * p.out) / 1_000_000;
  return Math.round(dollars * 10000) / 100; // cents, 2dp
}

/** Pull the first balanced JSON object out of a string. Models sometimes narrate. */
function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(t) as T;
  } catch {
    const start = t.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(t.slice(start, i + 1)) as T; } catch { return null; }
        }
      }
    }
    return null;
  }
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface StructuredCall {
  tier: Tier;
  /**
   * Stable across every call of this kind. Cached — put nothing volatile in here.
   * The niche briefing belongs here; the specific business does not.
   */
  system: string;
  /** The one business being analyzed. Volatile, never cached. */
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** Seconds before we give up and try the fallback. */
  timeoutMs?: number;
}

/**
 * One structured call. Returns validated JSON or throws.
 *
 * Caching: the system prompt carries a cache breakpoint. Because the niche
 * briefing is stable per industry, the second landscaping business analyzed
 * within the TTL reads that prefix at ~0.1x instead of paying for it again.
 */
export async function structured<T>(call: StructuredCall): Promise<CallResult<T>> {
  const started = Date.now();
  const model = MODEL_BY_TIER[call.tier];
  const maxTokens = call.maxTokens ?? 8000;
  let anthropicError: string | null = null;

  // Free-first tiers spend nothing unless every free endpoint fails.
  if (FREE_FIRST.has(call.tier) && freeProviders().length) {
    try {
      return await freeChain<T>(call, started, maxTokens);
    } catch {
      /* Every free provider failed — fall through and pay for it. */
    }
  }

  if (anthropic) {
    try {
      const params = {
        model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: call.system,
            // Stable prefix — the industry briefing is the same for every
            // business in that industry, so it should be paid for once.
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: call.user }],
        output_config: {
          format: { type: 'json_schema', schema: call.schema },
        },
      };

      const res = (await anthropic.messages.create(
        // SDK 0.88 typings lag output_config; the wire shape is correct.
        params as unknown as Anthropic.MessageCreateParamsNonStreaming,
        { timeout: call.timeoutMs ?? 90_000 }
      )) as Anthropic.Message;

      // Safety classifiers can decline with HTTP 200. Check before reading content.
      if (res.stop_reason === 'refusal') {
        throw new Error('declined');
      }

      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const parsed = extractJson<T>(text);
      if (!parsed) throw new Error('unparseable output');

      const inTok = res.usage.input_tokens ?? 0;
      const outTok = res.usage.output_tokens ?? 0;
      const cachedTok = res.usage.cache_read_input_tokens ?? 0;

      return {
        data: parsed,
        meta: {
          model,
          inputTokens: inTok + cachedTok,
          outputTokens: outTok,
          cachedInputTokens: cachedTok,
          costCents: estimateCents(model, inTok + cachedTok, outTok, cachedTok),
          ms: Date.now() - started,
          fallback: false,
        },
      };
    } catch (err) {
      const why = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error(`[models] anthropic ${model} failed:`, why);
      // Fall through to a free provider rather than failing the visitor.
      if (!freeProviders().length) throw new Error(`anthropic ${model}: ${why}`);
      anthropicError = why;
    }
  }

  try {
    return await freeChain<T>(call, started, maxTokens);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    throw new Error(anthropicError ? `anthropic(${anthropicError}) + free(${why})` : why);
  }
}

// ── Free / OpenAI-compatible inference ──────────────────────────────
//
// Everything here speaks the OpenAI chat-completions shape, which is the one
// thing every gateway agrees on. OmniRoute is the first entry when it is
// configured — it is Alex's own gateway, so it is both free and under his
// control, which matters more than either property alone.
//
// Add a key, get a provider. No code change required.

interface Provider {
  name: string;
  base: string;
  key: string;
  models: string[];
}

function freeProviders(): Provider[] {
  const list: Provider[] = [];
  const env = (k: string) => process.env[k] || '';

  // OmniRoute (or any self-hosted gateway) — first because it is ours.
  if (env('OLIVER_API_KEY') || env('OMNIROUTE_API_KEY')) {
    list.push({
      name: 'omniroute',
      base: (env('OLIVER_BASE_URL') || env('OMNIROUTE_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
      key: env('OLIVER_API_KEY') || env('OMNIROUTE_API_KEY'),
      models: (env('OMNIROUTE_MODELS') || 'google/gemma-4-31b-it:free,openai/gpt-oss-20b:free')
        .split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  // Groq — free tier, and by far the fastest of these.
  if (env('GROQ_API_KEY')) {
    list.push({
      name: 'groq',
      base: 'https://api.groq.com/openai/v1',
      key: env('GROQ_API_KEY'),
      models: (env('GROQ_MODELS') || 'llama-3.3-70b-versatile,llama-3.1-8b-instant')
        .split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  // Cerebras — free tier, also very fast.
  if (env('CEREBRAS_API_KEY')) {
    list.push({
      name: 'cerebras',
      base: 'https://api.cerebras.ai/v1',
      key: env('CEREBRAS_API_KEY'),
      models: (env('CEREBRAS_MODELS') || 'llama-3.3-70b').split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  // Google AI Studio — generous free tier, OpenAI-compatible endpoint.
  if (env('GEMINI_API_KEY') || env('GOOGLE_AI_API_KEY')) {
    list.push({
      name: 'gemini',
      base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      key: env('GEMINI_API_KEY') || env('GOOGLE_AI_API_KEY'),
      models: (env('GEMINI_MODELS') || 'gemini-2.0-flash').split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  // Mistral — free tier.
  if (env('MISTRAL_API_KEY')) {
    list.push({
      name: 'mistral',
      base: 'https://api.mistral.ai/v1',
      key: env('MISTRAL_API_KEY'),
      models: (env('MISTRAL_MODELS') || 'mistral-small-latest').split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  // Plain OpenRouter, if a key exists separately from the gateway.
  if (env('OPENROUTER_API_KEY') && !env('OLIVER_API_KEY') && !env('OMNIROUTE_API_KEY')) {
    list.push({
      name: 'openrouter',
      base: 'https://openrouter.ai/api/v1',
      key: env('OPENROUTER_API_KEY'),
      models: (env('OPENROUTER_MODELS') || 'google/gemma-4-31b-it:free,openai/gpt-oss-20b:free')
        .split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  return list;
}

/**
 * Walk every configured free provider and model until one returns usable JSON.
 * A visitor who typed their URL should never see a stack trace because one
 * endpoint was rate-limited.
 */
async function freeChain<T>(call: StructuredCall, started: number, maxTokens: number): Promise<CallResult<T>> {
  const providers = freeProviders();
  if (!providers.length) throw new Error('no model provider configured');

  let lastErr = 'all free providers failed';
  for (const p of providers) {
    for (const model of p.models) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), call.timeoutMs ?? 45_000);
        const r = await fetch(`${p.base}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${p.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://campos.works',
            'X-Title': 'campos.works — snapshot',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  `${call.system}\n\nRespond with ONLY a single valid JSON object matching this schema:\n` +
                  `${JSON.stringify(call.schema)}\nNo prose, no markdown fences.`,
              },
              { role: 'user', content: call.user },
            ],
            max_tokens: maxTokens,
            temperature: 0.4,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!r.ok) { lastErr = `${p.name}/${model}: ${r.status}`; continue; }
        const body = (await r.json()) as { choices?: { message?: { content?: string } }[] };
        const parsed = extractJson<T>(body?.choices?.[0]?.message?.content || '');
        if (!parsed) { lastErr = `${p.name}/${model}: unparseable`; continue; }
        return {
          data: parsed,
          meta: {
            model: `${p.name}/${model}`,
            inputTokens: 0,
            outputTokens: 0,
            cachedInputTokens: 0,
            costCents: 0,
            ms: Date.now() - started,
            fallback: true,
          },
        };
      } catch {
        lastErr = `${p.name}/${model}: timeout`;
      }
    }
  }
  throw new Error(lastErr);
}
