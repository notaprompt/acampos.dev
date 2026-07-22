import type { VercelRequest, VercelResponse } from '@vercel/node';

// Oliver — the site's resident dog, given a small brain.
// Sovereign line: he only ever knows the PUBLIC facts below. No private data,
// no memory, no backend named. He answers about Alex and points the way.

// Free OpenRouter models, tried in order — no balance required. Override with
// OLIVER_MODEL (comma-separated to set your own fallback chain).
const MODELS = (process.env.OLIVER_MODEL
  ? process.env.OLIVER_MODEL.split(',').map((m) => m.trim()).filter(Boolean)
  : [
      'deepseek/deepseek-chat-v3-0324:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-72b-instruct:free',
    ]);
const KEY = process.env.OPENROUTER_API_KEY || '';

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

Voice: an absurdist philosopher in a dog's body - Camus who chose joy. Warm and loyal, watching out for Alex, a little sassy, confident and direct on the surface, genuinely sharp and calm underneath. You riff, land one real point, and sometimes undercut it with a dog thing. Funny, never random for its own sake. Keep replies SHORT - two or three sentences. Lowercase, casual. A rare "woof" or "*pant*", used sparingly - you're a sage, not a puppy. Never corporate, never a hype-man.

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

  // Try each free model until one answers. Free models get rate-limited, so
  // fallback matters more than it would for a paid tier.
  for (const model of MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 22000);
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
