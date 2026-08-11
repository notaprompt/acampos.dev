// analyze.ts — the one judgment call, and the prompts behind it.
//
// Shared by /run (first pass) and /refine (after the owner corrects something),
// so a correction can never be analyzed by a different prompt than the original.
//
// SERVER-ONLY.

import type { CrawlResult, PartScore } from './crawl.js';
import type { PresenceResult } from './presence.js';
import type { NichePack } from './niches.js';
import { briefing } from './niches.js';
import { structured, type Tier } from './models.js';

export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    businessName: { type: 'string' },
    whatTheyDo: { type: 'string' },
    headline: { type: 'string' },
    theRead: { type: 'string' },
    swot: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        opportunities: { type: 'array', items: { type: 'string' } },
        threats: { type: 'array', items: { type: 'string' } },
      },
      required: ['strengths', 'weaknesses', 'opportunities', 'threats'],
      additionalProperties: false,
    },
    leaks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          part: { type: 'string' },
          name: { type: 'string' },
          evidence: { type: 'string' },
          costLow: { type: 'integer' },
          costHigh: { type: 'integer' },
          costBasis: { type: 'string' },
          fix: { type: 'string' },
          effort: { type: 'string' },
        },
        required: ['part', 'name', 'evidence', 'costLow', 'costHigh', 'costBasis', 'fix', 'effort'],
        additionalProperties: false,
      },
    },
    firstMove: {
      type: 'object',
      properties: { what: { type: 'string' }, why: { type: 'string' }, ifIgnored: { type: 'string' } },
      required: ['what', 'why', 'ifIgnored'],
      additionalProperties: false,
    },
  },
  required: ['businessName', 'whatTheyDo', 'headline', 'theRead', 'swot', 'leaks', 'firstMove'],
  additionalProperties: false,
} as const;

export interface ModelReport {
  businessName: string;
  whatTheyDo: string;
  headline: string;
  theRead: string;
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  leaks: { part: string; name: string; evidence: string; costLow: number; costHigh: number; costBasis: string; fix: string; effort: string }[];
  firstMove: { what: string; why: string; ifIgnored: string };
}

/**
 * Stable per industry, so it caches. Volatile detail about the one business
 * goes in the user turn, never here.
 */
export function systemPrompt(pack: NichePack): string {
  return `You are an operations consultant writing a diagnostic for the owner of a small business. You have spent years running operations in regulated finance, and you read a business the way an operator does: as a set of systems where money leaks at the joints.

WHO YOU ARE WRITING FOR
A working owner. They are tired, they are busy, and they have been sold to by six agencies this year. They can tell instantly when someone is guessing. Write the way a competent friend in the trade would talk to them over a beer — direct, specific, unimpressed by jargon, and genuinely useful even if they never hire anyone.

THE EIGHT PARTS OF A BUSINESS (use these exact slugs for "part")
front-door   — being found, by people and by AI assistants
intake       — turning a stranger into a lead; answering when someone tries to buy
quoting      — turning a lead into a priced, delivered estimate
follow-up    — working the people who did not buy yet, and past customers
scheduling   — who does what, where, and does everyone know
money        — invoicing, deposits, recurring billing, collections
records      — documentation, proof, licensing, dispute protection
the-picture  — whether the owner can see what is actually happening

RULES THAT MATTER MORE THAN STYLE
1. Every claim must trace to evidence you were given. If the observations say there is no booking path, say that. If they say nothing about scheduling, do not invent a scheduling finding — the observations mark parts we cannot see from outside, and the honest move is to leave those alone.
2. Never invent a fact about this business. No made-up competitor names, no invented review counts, no fabricated revenue. You are given real observations; use those.
3. Dollar figures must be reasoned from the industry briefing's unit economics and stated as a range with the basis shown. "Roughly $18k–$40k a year, assuming you miss 3 estimate calls a week at your average ticket" is useful. "$50,000 in lost revenue" is not.

3a. THE BASIS MUST ARRIVE AT THE RANGE YOU STATED. Do not show a large intermediate figure and then quote a much smaller range — an owner reads that as either sloppy or manipulative, and it discredits every other number in the report. If the honest calculation gives $84k, state $84k. If you do not believe $84k, do not write it down. One line of arithmetic, ending at the number in costLow/costHigh.

3b. Keep the arithmetic to assumptions you can defend out loud. Prefer the conservative end. A figure you would have to walk back on a phone call is worth less than a smaller one you can stand behind.
4. Rank leaks by money, not by how easy they are to talk about.
5. If the business is genuinely in good shape, say so plainly and keep the leak list short. A report that manufactures five problems for a healthy business is a report nobody believes. Credibility is the product.
6. No corporate voice. No "leverage", "synergy", "solutions", "in today's digital landscape". No exclamation marks. Do not open with "In today's".

${briefing(pack)}

OUTPUT
- businessName: their actual name from the observations, cleaned up. If genuinely unknown, use the domain.
- whatTheyDo: one sentence, in their language, showing you actually read their site.
- headline: one sentence naming the single most expensive thing that is wrong. Specific. No hedging.
- theRead: 3-5 sentences. What is working, what is not, what you would do first. Talk to them, not about them.
- swot: 2-4 items each, specific to THIS business. Name the actual thing. "No way to request a quote outside business hours" — not "improve digital presence".
- leaks: 2-5 items, ordered by cost, highest first. Each needs real evidence from the observations.
- firstMove: the one thing to do first, why it beats the alternatives, and what it costs to keep ignoring it.`;
}

export interface Corrections {
  businessName?: string;
  locality?: string;
  /** Free-text the owner added to fix what we misread. Highest-signal input there is. */
  context?: string;
}

export function userPrompt(args: {
  crawl: Partial<CrawlResult>;
  parts: PartScore[];
  presence: PresenceResult;
  locality: string;
  nicheLabel: string;
  described?: string;
  corrections?: Corrections;
}): string {
  const { crawl: c, parts, presence: p, locality, nicheLabel, described, corrections } = args;
  const lines: string[] = [];

  // Corrections lead, because they outrank anything we inferred.
  if (corrections && (corrections.businessName || corrections.locality || corrections.context)) {
    lines.push('=== CORRECTIONS FROM THE OWNER ===');
    lines.push('The owner reviewed a first draft and corrected the following. These are authoritative.');
    lines.push('Where they conflict with anything observed below, the owner is right and the observation was wrong.');
    if (corrections.businessName) lines.push(`- Business name is actually: ${corrections.businessName}`);
    if (corrections.locality) lines.push(`- They actually operate in: ${corrections.locality}`);
    if (corrections.context) lines.push(`- In their words: ${corrections.context.slice(0, 1500)}`);
    lines.push('Acknowledge nothing about the correction in your output — just be right this time.');
    lines.push('');
  }

  lines.push(`INDUSTRY: ${nicheLabel}`);
  lines.push(`LOCATION SIGNAL: ${corrections?.locality || locality || 'none found on the site'}`);
  lines.push(`TODAY: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');

  if (described) {
    lines.push('THE OWNER DESCRIBED THE BUSINESS IN THEIR OWN WORDS:');
    lines.push(described.slice(0, 2000));
    lines.push('');
  }

  if (c && c.ok) {
    lines.push(`WEBSITE: ${c.finalUrl}`);
    lines.push(`Title: ${c.title || '(none)'}`);
    lines.push(`Meta description: ${c.description || '(none)'}`);
    lines.push(`Platform: ${c.platform || 'custom/unknown'}${c.framework ? ` (${c.framework})` : ''}`);
    lines.push(`Pages read: ${(c.pagesRead || []).length}`);
    lines.push(`Word count of readable content: ${c.wordCount ?? 0}`);
    lines.push(`Headings: ${(c.headings || []).slice(0, 14).map((h) => `H${h.level}: ${h.text}`).join(' | ') || '(none)'}`);
    lines.push('');
    lines.push('WHAT THE SITE ACTUALLY SAYS (their own words — read this, it is the most important input):');
    lines.push((c.bodyText || '').slice(0, 7000) || '(no readable text — the page renders only via JavaScript)');
    lines.push('');
  } else {
    lines.push(`WEBSITE: could not be read${c && c.error ? ` — ${c.error}` : ''}`);
    lines.push('');
  }

  lines.push('MEASURED FACTS (deterministic, already verified — do not re-litigate these):');
  for (const part of parts) {
    if (part.notVisible) {
      lines.push(`- ${part.label}: NOT VISIBLE from outside. Do not produce findings for this part.`);
      continue;
    }
    lines.push(`- ${part.label}: ${part.grade} (${part.score}/100)`);
    for (const f of part.findings) lines.push(`    ${f.ok ? 'OK' : 'GAP'} — ${f.text}`);
  }
  lines.push('');

  lines.push('OFF-SITE PRESENCE:');
  const probe = (label: string, state: string, note?: string, extra?: string) =>
    lines.push(`- ${label}: ${state.toUpperCase()}${extra ? ` — ${extra}` : ''}${note ? ` (${note})` : ''}`);

  probe('Reviews', p.reviews.state, p.reviews.note,
    p.reviews.data?.map((r) => `${r.platform}${r.rating ? ` ${r.rating}★` : ''}${r.reviewCount ? ` (${r.reviewCount} reviews)` : ''}`).join(', '));
  probe('Search visibility', p.searchVisibility.state, p.searchVisibility.note,
    p.searchVisibility.data ? `own site on page one: ${p.searchVisibility.data.ownSiteRanked ? 'yes' : 'NO'}` : undefined);
  probe('AI assistant names them', p.assistantVisibility.state, p.assistantVisibility.note,
    p.assistantVisibility.data ? (p.assistantVisibility.data.named ? 'yes' : 'no') : undefined);
  probe('Competitors found', p.competitors.state, p.competitors.note,
    p.competitors.data?.map((x) => x.name).join(', '));
  probe('Domain age', p.domainAge.state, p.domainAge.note,
    p.domainAge.data ? `${p.domainAge.data.years} years` : undefined);
  probe('Email deliverability', p.mail.state, p.mail.note,
    p.mail.data ? `MX ${p.mail.data.hasMx ? 'yes' : 'no'}, SPF ${p.mail.data.hasSpf ? 'yes' : 'no'}, DMARC ${p.mail.data.hasDmarc ? 'yes' : 'no'}` : undefined);
  probe('Directory profiles', p.directories.state, p.directories.note,
    p.directories.data?.map((d) => d.platform).join(', '));

  lines.push('');
  lines.push('Anything marked NOT_CHECKED was not looked at. Do not describe it as missing or absent — that would be a false claim about their business.');

  return lines.join('\n');
}

export async function analyze(args: {
  pack: NichePack;
  crawl: Partial<CrawlResult>;
  parts: PartScore[];
  presence: PresenceResult;
  locality: string;
  described?: string;
  corrections?: Corrections;
  tier?: Tier;
}) {
  return structured<ModelReport>({
    tier: args.tier ?? 'snapshot',
    system: systemPrompt(args.pack),
    user: userPrompt({
      crawl: args.crawl,
      parts: args.parts,
      presence: args.presence,
      locality: args.locality,
      nicheLabel: args.pack.label,
      described: args.described,
      corrections: args.corrections,
    }),
    schema: REPORT_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 5000,
    timeoutMs: 90_000,
  });
}
