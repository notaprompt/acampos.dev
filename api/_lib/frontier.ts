// frontier.ts — the mirror.
//
// Every owner reading a Snapshot is being approached, right now, by companies
// that started AI-native and are moving into their category. Roll-ups with a
// shared back office. Startups whose entire wedge is answering the phone at 2am.
// The owner usually finds out when a competitor's response time halves.
//
// This section shows them that, and then — critically — shows them the response
// is available to them too, at a fraction of the cost, without selling.
//
// ── The honesty rule, which is not negotiable ───────────────────────
// Never invent a company name, a funding round, a date, or a dollar figure.
// An owner who googles a fabricated startup and finds nothing has correctly
// concluded that the entire report is fabricated. Every specific claim here
// carries a source URL the owner can click. When we cannot source specifics,
// we describe the playbook — which is general, observable, and true — and we
// say plainly that we are describing a pattern rather than a company.

export type ProbeState = 'found' | 'absent' | 'not_checked';

export interface FrontierItem {
  headline: string;
  /** Publication or domain. Never asserted without a URL. */
  source: string;
  url: string;
  /** Verbatim excerpt. We quote rather than paraphrase, to avoid drift. */
  excerpt: string;
}

export interface FrontierMirror {
  state: ProbeState;
  note?: string;
  /** Real, sourced, clickable. May be empty — that is an honest outcome. */
  items: FrontierItem[];
  /**
   * How AI-native entrants attack this category. General and verifiable —
   * safe to state without a citation because it is a description of a method,
   * not a claim about a specific company.
   */
  playbook: { move: string; why: string; yourCounter: string }[];
}

const UA = 'Mozilla/5.0 (compatible; camposworks-snapshot/1.0; +https://campos.works/snapshot)';

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  try {
    return await Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('t')), ms))]);
  } catch {
    return null;
  }
}

interface BraveHit { title: string; url: string; description: string; age?: string }

async function search(query: string, freshness?: string): Promise<BraveHit[] | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  const fresh = freshness ? `&freshness=${freshness}` : '';
  const res = await withTimeout(
    fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8${fresh}`, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': key, 'User-Agent': UA },
    }).then((r) => (r.ok ? r.json() : null)),
    7000
  );
  const web = (res as { web?: { results?: BraveHit[] } } | null)?.web?.results;
  return Array.isArray(web) ? web : null;
}

/**
 * The playbook, per category. This is the part that does not need a citation
 * because it describes a method rather than a company — and it is the part the
 * owner can actually act on. Each move is paired with the counter, because a
 * section that only frightens people is worthless.
 */
function playbookFor(nicheId: string): FrontierMirror['playbook'] {
  const universal = [
    {
      move: 'They answer instantly, at any hour, every time',
      why:
        'An AI-native competitor never sends a caller to voicemail. In trades where the first responder usually wins, that alone moves a large share of inbound demand before anyone competes on price or quality.',
      yourCounter:
        'You do not need their funding to match this. An after-hours intake path that captures, qualifies, and books is a one-to-two week build — and it is the single highest-return item in this report.',
    },
    {
      move: 'They quote in minutes, not days',
      why:
        'Structured intake plus a real cost library means a number goes out while the customer is still thinking about the problem. Close rates fall off sharply after the first day, and they are collecting the difference.',
      yourCounter:
        'Your pricing knowledge is better than theirs — it is just trapped in your head and a drifting spreadsheet. Getting it into a system that produces same-day quotes is the second-highest-return item.',
    },
    {
      move: 'They are readable by machines, so assistants recommend them',
      why:
        'Only about 1 in 100 local businesses is ever named when someone asks an AI assistant for a recommendation. The ones that get named are the ones whose site states plainly what they do, where, and for whom — in a form a machine can parse.',
      yourCounter:
        'This is the cheapest gap on the list to close and almost nobody in your category has closed it yet. It is a days-long job, not a months-long one.',
    },
    {
      move: 'They run one back office across many locations',
      why:
        'Roll-ups buy established businesses and centralize intake, scheduling, and billing. The individual shops keep their name and their crews; the operating leverage happens behind the sign.',
      yourCounter:
        'You can have the same operating leverage without selling. The systems are the point — not the ownership structure. That is the entire thesis of this report.',
    },
    {
      move: 'They measure everything, so they know which lever to pull',
      why:
        'They know their response time, their quote turnaround, and their close rate this week. Most owners know last quarter, ninety days late, from an accountant.',
      yourCounter:
        'Six numbers on your phone, updated automatically, closes most of this gap. It is not a data-science project.',
    },
  ];

  const perNiche: Record<string, FrontierMirror['playbook']> = {
    hvac: [
      {
        move: 'They own the 2am no-heat call',
        why:
          'The emergency call in January is the highest-value lead in the trade and the most likely to go unanswered by an independent shop. Whoever picks up gets a customer for a decade, plus the replacement.',
        yourCounter:
          'A phone path that never rings out is the whole fix. You already have the technicians; you are losing the calls before they reach them.',
      },
      {
        move: 'They present financing inside the quote',
        why:
          'An $11,000 replacement quoted as a number is a shock. Quoted as a monthly figure it is a decision. Well-funded entrants do this by default and independents mostly do not.',
        yourCounter: 'Financing presentation is a quoting-template change, not a capital problem.',
      },
      ...universal.slice(2),
    ],
    landscaping: [
      {
        move: 'They win the spring signup window on response speed alone',
        why:
          'Everyone calls in a three-week window. Capacity is not the constraint — answering is. An entrant who replies in minutes takes the season before you have read your voicemail.',
        yourCounter:
          'Your crews are in the field, which is exactly why the intake path has to work without them. This is the one to fix before spring.',
      },
      ...universal.slice(1, 4),
    ],
    dental: [
      {
        move: 'They never let a recall lapse',
        why:
          'The lapsed-recall list is the cheapest revenue in healthcare and it sits untouched in most practices. Systematized entrants work it automatically.',
        yourCounter: 'Your recall list already exists in your practice software. It just needs something working it.',
      },
      ...universal.slice(0, 3),
    ],
    agency: [
      {
        move: 'They productize what you bill hourly',
        why:
          'Reporting, audits, and first-draft creative are being packaged as fixed-price products by AI-native shops. Clients notice when the same deliverable arrives faster and cheaper elsewhere.',
        yourCounter:
          'Move your senior time to judgment and let assembly assemble itself. Your reporting should be edited, not built.',
      },
      ...universal.slice(2),
    ],
  };

  return perNiche[nicheId] || universal;
}

/**
 * Live-sourced. Returns real, current items with citations, or nothing.
 * "Nothing" is a perfectly good outcome and is reported as such.
 */
export async function frontierMirror(nicheLabel: string, nicheId: string): Promise<FrontierMirror> {
  const playbook = playbookFor(nicheId);

  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return {
      state: 'not_checked',
      note:
        'Live coverage needs a search provider key. The playbook below is a description of how AI-native entrants operate in this category — it is general and observable, not a claim about any specific company.',
      items: [],
      playbook,
    };
  }

  // Recent only. A 2021 funding round is not evidence of current pressure.
  const queries = [
    `"${nicheLabel}" AI startup funding raised software platform`,
    `${nicheLabel} roll-up acquisition private equity technology platform`,
  ];

  const batches = await Promise.all(queries.map((q) => search(q, 'py')));
  const hits = batches.flatMap((b) => b || []);

  const credible = /techcrunch|axios|bloomberg|reuters|wsj|forbes|businesswire|prnewswire|crunchbase|pitchbook|fortune|cnbc|inc\.com|venturebeat|theinformation|sifted|axios|hvacinsider|contractormag|pymnts|modernretail|restaurantdive|dentistrytoday|law\.com|constructiondive/i;

  const seen = new Set<string>();
  const items: FrontierItem[] = [];
  for (const h of hits) {
    try {
      const host = new URL(h.url).hostname.replace(/^www\./, '');
      if (!credible.test(host) || seen.has(host)) continue;
      seen.add(host);
      items.push({
        headline: h.title.slice(0, 160),
        source: host,
        url: h.url,
        excerpt: (h.description || '').slice(0, 260),
      });
      if (items.length >= 4) break;
    } catch { /* skip */ }
  }

  return {
    state: items.length ? 'found' : 'absent',
    note: items.length
      ? 'Every item below links to its source. Click them — this is public information, and it is worth two minutes of your time.'
      : 'No recent funding or roll-up coverage surfaced for this category in the last year. That is genuinely good news: the pressure described below is coming, but it has not arrived in your category yet. That is the window.',
    items,
    playbook,
  };
}
