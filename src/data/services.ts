// services.ts — the offering, as data.
//
// One source of truth. The services hub, every sub-page, agent.json, llms.txt,
// and the Snapshot's recommendation engine all read from here. Change a price
// once and it changes everywhere, including in the machine-readable surfaces.
//
// The frame: a business is not one thing. It is eight systems, and each one can
// be measured, fixed, and handed back as an artifact the owner owns. Every part
// below is something already running in production somewhere — on Alex's own
// machine, or in a client's business. Nothing here is aspirational.

export interface Proof {
  /** What exists. Stated as fact, no adjectives. */
  claim: string;
  /** Where it runs, or how you can check. Empty string if it's private client work. */
  evidence: string;
  href?: string;
}

export interface BusinessPart {
  slug: string;
  /** Owner-language name. Never jargon. */
  name: string;
  /** The question an owner asks that lands them here. */
  question: string;
  /** One line, plain, on the shelf. */
  summary: string;
  /** The failure this part is about, written so an owner recognizes it. */
  theLeak: string;
  /** What actually gets built. Concrete nouns, not capabilities. */
  whatYouGet: string[];
  /** How we know it worked. Measured, not felt. */
  howWeMeasure: string[];
  /** Why me and not the agency down the road. */
  proof: Proof[];
  /** Typical range. Real numbers — vagueness costs more deals than a high price. */
  priceFrom: number;
  priceTo: number;
  priceNote: string;
  timeline: string;
  /** Related parts, by slug. */
  pairsWith: string[];
}

export const PARTS: BusinessPart[] = [
  {
    slug: 'front-door',
    name: 'The front door',
    question: 'Can people — and now machines — actually find me?',
    summary:
      'The site, the map listing, the structured data, and the machine-readable layer that decides whether an AI assistant recommends you or never mentions you.',
    theLeak:
      'Someone needed exactly what you sell, searched for it, and got your competitor. You never found out it happened. In 2026 that search increasingly happens inside ChatGPT or Claude rather than Google — and only about 1 in 100 local businesses ever gets named when someone asks an assistant for a recommendation. The businesses that do get named are not the biggest. They are the ones whose site states plainly what they do, where they do it, and who they are, in a form a machine can read without guessing.',
    whatYouGet: [
      'A site that loads fast and says what you do, where you do it, and what it costs to start',
      'Structured data (schema.org) so search engines and assistants read your business as a business, not as a wall of text',
      'An agent.json and llms.txt — the machine-readable profile assistants actually fetch',
      'Google Business Profile and map listings corrected and consistent (name, address, phone identical everywhere)',
      'Service-area pages that name real towns and zip codes instead of "the surrounding area"',
      'A monthly visibility check: what an assistant says when asked to recommend someone in your trade, in your town',
    ],
    howWeMeasure: [
      'Before/after: what ChatGPT, Claude, and Gemini say when asked for your trade in your zip',
      'Map-pack position for your three highest-intent search terms',
      'Time-to-first-byte and mobile render, measured, not estimated',
      'Count of pages an assistant can actually read (server-rendered, not JS-only)',
    ],
    proof: [
      {
        claim: 'This site publishes its own agent surface — machine-readable profile, structured data, and an llms.txt.',
        evidence: 'campos.works/agent.json',
        href: '/agent.json',
      },
      {
        claim: 'The free Snapshot grades any site on exactly these signals, including whether an assistant can read it at all.',
        evidence: 'Run it on your own site',
        href: '/snapshot',
      },
    ],
    priceFrom: 2400,
    priceTo: 6500,
    priceNote: 'Flat. A single-location service business is usually near the bottom of that range.',
    timeline: '2–3 weeks',
    pairsWith: ['intake', 'the-picture'],
  },
  {
    slug: 'intake',
    name: 'Intake',
    question: 'What happens when someone tries to give me money at 9pm?',
    summary:
      'The path from stranger to booked job — the form, the phone, the after-hours gap, and the reply that goes out before your competitor wakes up.',
    theLeak:
      'This is the largest and quietest leak in almost every small business. Crews are in the field, the office is closed, or three calls came in at once — and a person who was ready to buy called the next number on the list. Nobody logs a lead that never became a lead. In most trades this is 20–40% of inbound demand, and the owner genuinely does not know it is happening.',
    whatYouGet: [
      'A single intake path that captures name, job, address, urgency, and photos — on a phone, in under a minute',
      'An after-hours responder that answers immediately, qualifies, and books or escalates — instead of a voicemail box',
      'Routing rules: emergencies wake someone, price-shoppers get a price band, everything else queues',
      'Every inquiry landing in one place with a timestamp, so response time becomes a number you can see',
      'Bilingual intake where your customers or crews need it',
      'Nothing lost: a missed call, a form, a text, and a Facebook message all end up in the same list',
    ],
    howWeMeasure: [
      'Median time from inquiry to first human-quality response',
      'Percentage of inquiries answered inside 5 minutes, inside 1 hour, and after close',
      'Count of inquiries that reach you outside business hours — usually the number that surprises owners most',
      'Inquiry-to-quote and quote-to-job conversion, tracked as a ratio over time',
    ],
    proof: [
      {
        claim:
          'An email organ that triages and drafts locally runs on my own machine as a live system, with an approval queue before anything sends.',
        evidence: 'Production, private',
      },
      {
        claim:
          'Six years running regulated operations where a missed handoff is an audit finding, not an inconvenience — 300+ daily regulatory transmissions across a $600M+ file exchange network.',
        evidence: 'Capital One, Senior Process Manager',
        href: '/resume',
      },
    ],
    priceFrom: 1800,
    priceTo: 5000,
    priceNote: 'Flat. The after-hours responder is usually the single highest-return item on this list.',
    timeline: '1–2 weeks',
    pairsWith: ['quoting', 'follow-up'],
  },
  {
    slug: 'quoting',
    name: 'Quoting & estimates',
    question: 'Why does it take me four days to send a number?',
    summary:
      'From walkthrough to a clean, branded, defensible quote in the customer\'s hands the same day — priced from a real cost library instead of memory.',
    theLeak:
      'Two failures wearing the same coat. The first is speed: close rate falls off a cliff after the first 24 hours, and the quote you meant to write up that night went out on Thursday. The second is accuracy: bids assembled from memory and a spreadsheet that has quietly drifted. One badly estimated job eats the margin on three good ones, and you find out at the end.',
    whatYouGet: [
      'Field notes in, finished quote out — same day, on your letterhead, in the language the customer reads',
      'A cost library so pricing comes from your actual numbers, not from what you remember charging last spring',
      'Good/better/best presented as options, because a single number invites a single answer',
      'Financing or payment terms shown as a monthly figure where the ticket is large enough to need one',
      'Change orders signed on a phone in the driveway, before the work happens',
      'Every quote stored, searchable, and attached to the address that produced it',
    ],
    howWeMeasure: [
      'Median hours from site visit to quote delivered',
      'Quote acceptance rate, before and after',
      'Estimated vs. actual cost variance per job — the number that tells you if pricing is real',
      'Change orders captured in writing as a percentage of change orders that happened',
    ],
    proof: [
      {
        claim:
          'Built a bilingual proposal generator for a landscaping company in Woodbridge, VA. Field notes go in, a clean bilingual PDF comes out.',
        evidence: 'Client work, shipped',
      },
      {
        claim:
          'Paired with a QuickBooks integration that creates an invoice from field notes and records payments — both confirm before they write anything.',
        evidence: 'Client work, delegation-safe from the first line',
      },
    ],
    priceFrom: 2500,
    priceTo: 8000,
    priceNote: 'Flat. Scales with how complicated your pricing genuinely is, not with how big you are.',
    timeline: '2–4 weeks',
    pairsWith: ['intake', 'money'],
  },
  {
    slug: 'follow-up',
    name: 'Follow-up',
    question: 'What happened to everyone who almost bought?',
    summary:
      'The list of people who said "not right now" — worked deliberately instead of whenever someone remembers.',
    theLeak:
      'The cheapest revenue available to any business is the customer it already earned, and it is the revenue almost nobody works. Declined repairs. Unaccepted treatment plans. Quotes that went quiet. Customers from three years ago who would absolutely call you again if anything ever reminded them you exist. This list already exists in your business. It is simply nobody\'s job.',
    whatYouGet: [
      'Every quoted-but-not-closed job on one list, with the date and the number, ordered by how winnable it is',
      'A follow-up sequence that runs on its own and sounds like you, not like a marketing platform',
      'Past-customer reactivation timed to the thing that actually triggers the next job — season, mileage, interval, anniversary',
      'Review requests sent at the moment the customer is happiest, not two weeks later',
      'Referral asks placed where they land: right after a win',
      'A stop rule, so nobody ever gets chased into annoyance',
    ],
    howWeMeasure: [
      'Revenue recovered from the not-yet list, tracked as a dollar figure per month',
      'Reactivation rate on dormant customers',
      'Review volume and response rate before and after',
      'Referrals attributed to an ask rather than to luck',
    ],
    proof: [
      {
        claim:
          'I run a nightly system on my own machine that reviews the day, finds what went unaddressed, and files proposals for what to do about it. It has run unattended for nights at a stretch.',
        evidence: 'Production, private',
      },
      {
        claim:
          'Reframed is live in production, built on exactly this shape: watch a pipeline, surface what needs attention, act on it.',
        evidence: 'reframed.works',
        href: 'https://reframed.works',
      },
    ],
    priceFrom: 1500,
    priceTo: 4500,
    priceNote: 'Flat, then usually folded into the monthly if you want it maintained.',
    timeline: '1–2 weeks',
    pairsWith: ['intake', 'the-picture'],
  },
  {
    slug: 'scheduling',
    name: 'Scheduling & dispatch',
    question: 'Who is doing what, where, and does everyone actually know?',
    summary:
      'A schedule the crew can see on a phone, routes that stop zigzagging, and a customer who gets told before they have to ask.',
    theLeak:
      'Scheduling by group text means the schedule lives in the owner\'s head, and every change costs three phone calls. Slips propagate silently — the customer usually finds out before the office does. Meanwhile crews cross the county twice a day because nobody is looking at the map, which is one or two billable jobs a day evaporating into fuel.',
    whatYouGet: [
      'One schedule, visible on a phone, that updates for everyone at once',
      'Route ordering that respects geography instead of the order calls came in',
      'Automatic customer notification on booking, on the day, and on the way',
      'A waitlist that fills a cancellation instead of leaving the slot dead',
      'Job completion capture — photos, checklist, signature — filed to the address automatically',
      'Recurring work that schedules itself, so the maintenance base stops needing to be rebooked by hand',
    ],
    howWeMeasure: [
      'Jobs completed per crew per day',
      'Drive time as a share of paid time',
      'Cancellation slots refilled vs. lost',
      'Customer no-shows and callbacks about "when are you coming"',
    ],
    proof: [
      {
        claim:
          'I run 27 scheduled background services on one machine with lease-based conflict handling, so heavy jobs never collide over the same resource.',
        evidence: 'Production, private',
      },
      {
        claim:
          'A monitoring layer I built for a $600M+ regulatory file exchange cut manual monitoring by 78%.',
        evidence: 'Capital One',
        href: '/resume',
      },
    ],
    priceFrom: 2000,
    priceTo: 7000,
    priceNote: 'Flat. Multi-crew and route optimization sit at the top of the range.',
    timeline: '2–4 weeks',
    pairsWith: ['intake', 'money'],
  },
  {
    slug: 'money',
    name: 'Getting paid',
    question: 'Why am I still chasing checks?',
    summary:
      'Invoices that go out on completion, deposits collected before work starts, recurring billing that runs itself, and a collections list that works itself.',
    theLeak:
      'Invoices sent from a phone whenever the owner sits down. Paid whenever. Followed up never. For a business running on thin margins, weeks of float is not an annoyance — it is the difference between making payroll comfortably and not. Recurring customers billed by hand are the worst version of this: the same work, every month, re-created from scratch.',
    whatYouGet: [
      'Invoices generated from the completed job, not retyped from it',
      'Deposits and card-on-file collected at booking where your trade supports it',
      'Recurring and contract billing on autopilot',
      'An aging list that escalates politely and on a schedule, without you being the bad guy',
      'Books that reconcile — the invoice, the payment, and the accounting record agreeing without manual repair',
      'Clean handoff to whoever does your taxes, in the format they actually want',
    ],
    howWeMeasure: [
      'Days sales outstanding — how long your money sits with someone else',
      'Percentage of invoices sent same-day as completion',
      'Collections recovered from the aging list',
      'Hours per month spent on billing admin',
    ],
    proof: [
      {
        claim:
          'Stripe billing wired end to end in production — checkout, webhooks, and subscription state — on a live product.',
        evidence: 'reframed.works',
        href: 'https://reframed.works',
      },
      {
        claim:
          'A QuickBooks integration for a client that creates invoices and records check payments from field notes — confirming before every write.',
        evidence: 'Client work, shipped',
      },
    ],
    priceFrom: 1800,
    priceTo: 5500,
    priceNote: 'Flat. Processor fees are yours and I will tell you honestly what they will cost.',
    timeline: '1–3 weeks',
    pairsWith: ['quoting', 'records'],
  },
  {
    slug: 'records',
    name: 'Records & proof',
    question: 'What happens when someone asks me to prove it?',
    summary:
      'Every job documented as a byproduct of doing it — so a dispute, an inspection, an insurer, or a good review all have something real to stand on.',
    theLeak:
      'Every completed job is two assets at once: proof for the next customer, and protection if this one goes sideways. Most are documented only in a phone camera roll nobody can search. When the dispute comes — and in trades with permits, licenses, or bodily risk it does — it becomes word against word. This is the part owners ignore until exactly once, and then never again.',
    whatYouGet: [
      'Before/during/after photos filed automatically against the job and the address',
      'Completion checklists the crew fills in ninety seconds, signed by the customer on site',
      'Licenses, insurance certificates, warranties, and permits stored where you can find them under pressure',
      'A clean, dated trail of who changed what and when — the thing that ends arguments',
      'Customer-facing job history, so a repeat customer sees you already know their property',
      'Export on demand, in a form an inspector or an insurer accepts',
    ],
    howWeMeasure: [
      'Percentage of jobs with a complete photo and checklist record',
      'Time to produce documentation when someone asks for it',
      'Disputes resolved with evidence rather than negotiation',
      'Portfolio-usable job photos generated per month, at zero extra effort',
    ],
    proof: [
      {
        claim:
          'I build provenance into systems by default: every record carries where it came from, when, and from what source. This is the part of my work that comes straight from regulated finance.',
        evidence: 'ForgeFrame, open source',
        href: 'https://github.com/notaprompt/forgeframe',
      },
      {
        claim:
          'Resolved a 20,000+ account logic failure by building an investigative SQL framework, isolating root cause, and documenting the failure taxonomy so it could not recur silently.',
        evidence: 'Capital One',
        href: '/resume',
      },
    ],
    priceFrom: 1500,
    priceTo: 5000,
    priceNote: 'Flat. Regulated trades (medical, legal, licensed contractors) sit higher and are worth it.',
    timeline: '1–3 weeks',
    pairsWith: ['scheduling', 'money'],
  },
  {
    slug: 'the-picture',
    name: "The owner's picture",
    question: 'What is actually happening in my business right now?',
    summary:
      'One page, on your phone, with the six numbers that matter — assembled automatically and honest about what it does not know.',
    theLeak:
      'Most owners run on feel plus whatever their accountant says ninety days late. That is not a character flaw; it is that assembling the real numbers takes hours nobody has. So decisions get made on the loudest recent event instead of the trend, and problems get discovered a quarter after they started.',
    whatYouGet: [
      'Six numbers, chosen for your trade — not a dashboard with forty tiles nobody reads',
      'Where the work came from, so you stop guessing which channel is carrying you',
      'Jobs quoted, won, lost, and still open — with the dollar value of "still open"',
      'Cash position and what is owed to you, current as of this morning',
      'A weekly digest that arrives without being asked for',
      'Every number stamped with where it came from and when — and marked unknown when it genuinely is',
    ],
    howWeMeasure: [
      'The owner can answer "how did last month go" in under a minute, from a phone',
      'Decisions made on current data rather than on last quarter',
      'Hours per month previously spent assembling reports',
      'Problems caught in the week they start instead of the quarter they surface',
    ],
    proof: [
      {
        claim:
          'I run a live operating picture of my own systems — a typed state block computed on every request, where each field carries its own provenance or the literal word "unknown". It caught a timezone bug in itself and was right.',
        evidence: 'Production, private',
      },
      {
        claim:
          'Automated business reviews across 3 teams and 6 operational vectors; the standardized one-pagers became the department\'s quarterly review format.',
        evidence: 'Capital One',
        href: '/resume',
      },
    ],
    priceFrom: 2000,
    priceTo: 6000,
    priceNote: 'Flat to build. Usually kept current under the monthly.',
    timeline: '2–3 weeks',
    pairsWith: ['follow-up', 'front-door'],
  },
];

export function partBySlug(slug: string): BusinessPart | undefined {
  return PARTS.find((p) => p.slug === slug);
}

// ── The offer ladder ────────────────────────────────────────────────
// Priced so the decision is about fit, not about risk. Every rung ends
// with something the owner keeps whether or not they buy the next one.

export interface Offer {
  slug: string;
  name: string;
  price: string;
  priceValue: number | null;
  /** What it actually is. */
  what: string;
  /** Who it's for — and, honestly, who it isn't. */
  who: string;
  includes: string[];
  /** The thing you walk away owning. */
  artifact: string;
  timeline: string;
  cta: { label: string; href: string };
  featured?: boolean;
}

export const OFFERS: Offer[] = [
  {
    slug: 'snapshot',
    name: 'The Snapshot',
    price: 'Free',
    priceValue: 0,
    what:
      'Give me a URL — or just describe the business if you do not have a site. In about a minute you get a read on where you stand: what is working, what is leaking, who you are up against, and what an AI assistant currently says about your trade in your zip code.',
    who:
      'Any owner who wants an honest second opinion. No call, no login, no obligation. If it tells you everything is fine, that is a real answer and you should keep your money.',
    includes: [
      'Graded across the eight parts of your business',
      'SWOT built from your actual site and your actual industry, not a template',
      'Competitors identified and compared on the things customers see',
      'The specific leaks known to cost money in your trade, with typical dollar figures',
      'Every field editable — correct anything I got wrong and it re-reads',
      'A shareable artifact you keep',
    ],
    artifact: 'A dated Snapshot you can download, share, or hand to someone else to act on.',
    timeline: 'About a minute',
    cta: { label: 'Run my Snapshot', href: '/snapshot' },
    featured: true,
  },
  {
    slug: 'teardown',
    name: 'The Teardown',
    price: '$500',
    priceValue: 500,
    what:
      'A week with your business in front of me. I go through all eight parts properly — not from your website, but from your calendar, your inbox, your invoices, and one long conversation with you. You get a prioritized plan with real numbers attached.',
    who:
      'Owners who know something is leaking but cannot name it, and would rather find out before spending on a build. If you hire me afterward, the $500 comes off the build.',
    includes: [
      'A 90-minute working session — the actual business, not a discovery call',
      'All eight parts audited against how your trade actually makes money',
      'Every finding priced: what it costs you now, what it costs to fix',
      'A sequenced plan — what to do first, second, and what to deliberately not do',
      'The vendor question answered honestly, including where off-the-shelf beats custom',
      'Yours to keep and to execute without me',
    ],
    artifact: 'A written plan with priorities, costs, and sequencing. Useful even if you never call me again.',
    timeline: '1 week',
    cta: { label: 'Book a Teardown', href: '/contact?offer=teardown' },
  },
  {
    slug: 'fix-one-thing',
    name: 'Fix One Thing',
    price: '$1,500 – $8,000',
    priceValue: 1500,
    what:
      'Pick the single part that is costing you the most. I build it, wire it into what you already use, train whoever needs training, and hand it over running. Fixed scope, fixed price, agreed before I start.',
    who:
      'Owners who know exactly what is broken. Usually intake or quoting — those two are where the money is in most trades.',
    includes: [
      'One business part, built properly end to end',
      'Integrated with the tools you already pay for, rather than replacing them for the sake of it',
      'Your team trained on it, with documentation written for them and not for me',
      'A before/after measurement so you can see whether it worked',
      '30 days of adjustments included after handover',
      'Fixed price. If it takes me longer than I estimated, that is my problem.',
    ],
    artifact: 'A working system you own, plus the numbers proving what changed.',
    timeline: '1–4 weeks',
    cta: { label: 'Start with one thing', href: '/contact?offer=fix-one-thing' },
  },
  {
    slug: 'modern-build',
    name: 'The Modern Build',
    price: '$9,000 – $25,000',
    priceValue: 9000,
    what:
      'Front door, intake, quoting, and follow-up built as one connected system, so a stranger who finds you at 9pm becomes a booked, quoted, invoiced job without anyone retyping anything.',
    who:
      'Owners doing real volume who are personally the integration point between every system. If everything waits for you, this is the one.',
    includes: [
      'Four to six parts built and connected, chosen from the Teardown',
      'A single record of a customer, so nothing is entered twice',
      'Weekly demos — you see it working every week, not at the end',
      'Migration of your existing data, done carefully',
      'Full team training and written runbooks',
      '90 days of support after handover',
    ],
    artifact: 'A connected operating system for your business, documented, with the keys handed to you.',
    timeline: '6–10 weeks',
    cta: { label: 'Scope a Modern Build', href: '/contact?offer=modern-build' },
  },
  {
    slug: 'operator',
    name: 'Operator',
    price: '$800 – $2,500 / mo',
    priceValue: 800,
    what:
      'I keep it running and keep improving it. You get a monthly operating picture, a standing block of build time, and someone who already knows your systems when something breaks.',
    who:
      'Owners who have had something built — by me or by anyone — and do not want a technical person on payroll. Cancel any month; no lock-in, because lock-in is how vendors avoid earning it.',
    includes: [
      'Monitoring, maintenance, and fixes on what is already running',
      'A monthly operating picture with the numbers that matter to your trade',
      'A standing block of build hours each month for the next improvement',
      'A named response time, in writing',
      'Quarterly review of what to build next and what to retire',
      'Month to month. No annual contract, no termination fee.',
    ],
    artifact: 'A monthly picture, and systems that keep working.',
    timeline: 'Ongoing',
    cta: { label: 'Talk about Operator', href: '/contact?offer=operator' },
  },
];

export function offerBySlug(slug: string): Offer | undefined {
  return OFFERS.find((o) => o.slug === slug);
}

/** The honest constraint, stated once and reused. Credibility beats polish. */
export const HOW_I_WORK = {
  headline: 'How I actually work',
  points: [
    {
      title: 'Fixed scope, fixed price',
      body: 'We agree what gets built and what it costs before I start. If I estimated badly, that is mine to absorb, not yours.',
    },
    {
      title: 'I work nights and weekends, on purpose',
      body: 'I hold a day job running operations in regulated finance. That is not a caveat — it is why I know what happens when a process fails an audit. Your build gets scheduled, demoed weekly, and delivered on a date we agreed. If a deadline needs my daytime, I will tell you before you sign, not after.',
    },
    {
      title: 'You own everything',
      body: 'Your accounts, your data, your code, your domain. I set things up in your name from day one. If you fire me, nothing stops working and nothing is held hostage.',
    },
    {
      title: 'I will talk you out of things',
      body: 'If off-the-shelf software solves your problem for $40 a month, I will tell you that and point you at it. I would rather lose the project than sell you something that does not earn its keep.',
    },
    {
      title: 'One person, not an agency',
      body: 'You talk to the person building it. Nothing gets lost in a handoff to an account manager, because there is no account manager.',
    },
  ],
};
