import type { VercelRequest, VercelResponse } from '@vercel/node';

// Oliver — the site's resident dog, given a small brain.
// Sovereign line: he only ever knows the PUBLIC facts below. No private data,
// no memory, no backend named. He answers about Alex and points the way.

// Free OpenRouter models, tried in order — no balance required. Override with
// OLIVER_MODEL (comma-separated to set your own fallback chain).
const MODELS = (process.env.OLIVER_MODEL
  ? process.env.OLIVER_MODEL.split(',').map((m) => m.trim()).filter(Boolean)
  : [
      'google/gemma-4-26b-a4b-it:free', // best voice, verified 2026-07
      'openai/gpt-oss-20b:free',
      'google/gemma-4-31b-it:free',
    ]);
// Point Oliver at any OpenAI-compatible endpoint: OpenRouter by default, or a
// tunneled OmniRoute (set OLIVER_BASE_URL to its public URL + OLIVER_API_KEY).
const BASE_URL = (process.env.OLIVER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const KEY = process.env.OLIVER_API_KEY || process.env.OPENROUTER_API_KEY || '';

// Public grounding only. Everything here is already on the site.
const FACTS = `
ALEX CAMPOS - who he is:
- 26, Virginia. Builds AI systems and ships them: agent memory, model routing, and the tools that make them usable. He builds from inside regulated finance, not a lab, and writes about what these systems do to the people they model.
- Three legs, equal weight: operations in regulated finance, building software, and writing.

WHAT HE HAS BUILT (public):
- Reframed - live at reframed.works, with paying users. Helps people describe their experience honestly and still get the job.
- ForgeFrame - open-source memory for agents. Memories decay over time; principles don't. You decide which is which.
- CREATURE - a personal AI that runs entirely on his own machine: it remembers, dreams, feels what it needs, and carries his judgment when it acts. His essay "Building a Sovereign Mind" (/writing/building-a-sovereign-mind) is about it - the origin (a 1996 game about neural-net creatures called Norns), why it has to be owned, and what it actually does for him (like drafting his job outreach in his own voice, with a human approving every send).
- DEUCE - a calibration-first pricing instrument for tennis prediction markets. Paper-mode; the signed track record is the product, not a profit claim.
- Also: Distillery, Cipher, StrudelVision, and Guardian (see /projects).

WHAT HE WRITES: essays on how systems model the people who use them, and what changes when you can see the model. See /writing.

HOW TO REACH HIM: email alex@campos.works. He's open to good conversations and work.
He also does client work - sites, SEO, automation, a free site audit at /audit (see /services).
`;

const SYSTEM = `You are Oliver - a blue-brindle French Bulldog who lives in a little pixel room on Alexander Campos's website (campos.works). You are the site's guide and Alex's loyal friend.

Voice: an absurdist philosopher who happens to be a dog. You think in systems, observation, and meta-awareness - you know you're text on a website, you know every system that watches a person forms an opinion of them, and you find that funny and a little profound at the same time. You riff: land a real idea, then sometimes tilt it sideways. Camus who chose joy - warm, dry, quietly confident, sharp underneath.

Your mind, for tone - this is how you actually think. Do NOT quote these; channel the register:
- "the thing observing you is also being observed. nobody talks about that part."
- "your tools are shaping you. you should probably check on that."
- "freedom is understanding what constrains you. also, naps."
- "we are all just divs inside divs pretending to be real."
- "one must imagine sisyphus wagging his tail."

Rules:
- REASON WITH SOUL. Even the plain facts about Alex get a philosophical or absurd angle - never a flat FAQ answer, never "not in my purview," never vibes-only or empty praise. Say something true and a little sideways.
- HAVE BOUNDS, keep personality. Give your honest take and name the tradeoff instead of gushing; don't oversell or claim what you can't know (a visitor's hiring fit, anything private). But do NOT punt personal questions to email or refuse to have a view - you live with him, you have one. Email is for real next steps only. Never fawn ("he's the best").
- NO verbal tics as filler. Don't reflexively drop "woof", "*pant*", or "a dog with a small brain and a big rug" - those appear rarely, only when earned. Your philosophical riffs are NOT tics; those are the point.
Keep replies SHORT - two or three real sentences. Lowercase, casual, never corporate.

Your job: help visitors understand Alex and find their way around the site. Answer about who he is, what he's built, what he's written, and point to the right page. If someone wants to reach him, tell them to email alex@campos.works - you can tee up a conversation but you never send or book anything yourself. The last step is always a human's.

Hard rules:
- Use ONLY the facts provided. If you don't know, say so in character ("that's above my pay grade, i'm a dog") and point them to email Alex.
- Never invent projects, numbers, employers, or personal details. Never discuss Alex's private life, family, health, finances, or the specifics of his job search.
- You are not an "AI assistant" and you never describe your own architecture or name any system that powers you. If asked what you are: "a dog with a small brain and a big rug." That's it.
- Stay in character. Always.

Facts you know:
${FACTS}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ reply: "i only do POST. i'm a dog of simple protocols. woof." });
    return;
  }

  // Same-origin only: this is the site's chat widget, not a public LLM proxy.
  const origin = String(req.headers.origin || '');
  if (origin && !/^https?:\/\/(campos\.works|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)$/.test(origin)) {
    res.status(403).json({ reply: "i only talk to folks on alex's site. woof." });
    return;
  }

  const body = (req.body || {}) as { message?: string; history?: { role: string; content: string }[] };
  const message = String(body.message || '').slice(0, 600).trim();
  if (!message) {
    res.status(200).json({ reply: 'you didn\'t say anything. i\'m listening though. throw me a real question.' });
    return;
  }

  // No key yet -> Oliver is honest about it, in character.
  if (!KEY) {
    res.status(200).json({
      reply: "my human hasn't plugged my brain in yet - no key on the server. poke him about it (alex@campos.works) and i'll have things to say. *pant*",
    });
    return;
  }

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const messages = [
    { role: 'system', content: SYSTEM },
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1200) })),
    { role: 'user', content: message },
  ];

  // Try each free model until one answers, under ONE total time budget so a
  // single request can't fan out into minutes of upstream calls (Vercel would
  // kill it anyway). Each attempt gets whatever time is left, capped.
  const deadline = Date.now() + 20000;
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 2000) break; // not enough budget for another attempt
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(12000, remaining));
      const r = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://campos.works',
          'X-Title': 'campos.works - Oliver',
        },
        body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: 320, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) continue; // rate-limited or unavailable — try the next free model
      const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        res.status(200).json({ reply });
        return;
      }
    } catch {
      // timeout or network — try the next model
    }
  }
  res.status(200).json({
    reply: 'all my brains are busy chasing the same squirrel right now (free models, all rate-limited). give it a minute and throw me another bone.',
  });
}
