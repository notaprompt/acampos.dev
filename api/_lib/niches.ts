// niches.ts — the knowledge layer.
//
// This file is the reason the analysis reads bespoke without costing bespoke money.
// The model is not asked to *know* an industry. It is handed the industry's real
// economics and told to apply them to one specific business. Knowledge lives here,
// math lives in code, only judgment goes to the model.
//
// SERVER-ONLY. This never ships to the browser and never appears in a response body.
// It is the moat; treat it like one.

export interface NichePack {
  id: string;
  label: string;
  /** Lowercase substrings that identify this niche in page text / meta / headings. */
  signals: string[];
  /** How money actually works here. Ranges, stated as ranges, never as false precision. */
  economics: {
    ticket: string;
    repeat: string;
    margin: string;
    seasonality: string;
  };
  /** Where their customers actually come from, ordered by real-world weight. */
  demand: string[];
  /**
   * The leaks. This is the gold — the specific, named places money goes missing in
   * this trade. Written as an owner would recognize them, not as a marketer would.
   */
  leaks: { name: string; detail: string; typicalCost: string }[];
  /** What the owner lies awake about. Drives tone, not just content. */
  cares: string[];
  /** What "modern" concretely means for this trade in 2026. */
  modern: string[];
  /** Where their competitors are usually weak — the wedge. */
  competitorWeakness: string[];
  /** Trade-specific trust signals a site must carry or lose the job. */
  trustSignals: string[];
}

const PACKS: NichePack[] = [
  {
    id: 'landscaping',
    label: 'landscaping & lawn care',
    signals: ['landscap', 'lawn care', 'lawn service', 'hardscap', 'irrigation', 'mulch', 'sod', 'tree service', 'jardin', 'grounds maintenance', 'snow removal'],
    economics: {
      ticket: '$60–$180 per visit for maintenance; $3k–$40k for design/build and hardscape',
      repeat: 'maintenance is the annuity — a retained account is worth 20–40x a single cut',
      margin: 'maintenance 15–30%; hardscape and install 30–50% when estimated correctly',
      seasonality: 'brutal. Spring signup window decides the year. Winter is cash-flow negative without snow or a contract base.',
    },
    demand: ['neighbor referral and truck signage', 'Google Maps / local pack', 'Nextdoor and neighborhood Facebook groups', 'drive-by of existing job sites', 'HOA and property-manager contracts'],
    leaks: [
      { name: 'the unreturned estimate call', detail: 'Crews are in the field all day. Calls go to voicemail, and a homeowner who wants a quote today calls the next three numbers on the list. This is the single largest leak in the trade.', typicalCost: '20–40% of inbound demand, silently' },
      { name: 'the quote that never got sent', detail: 'The walkthrough happened, the owner meant to write it up that night, and it went out four days later or never. Close rate collapses after 24 hours.', typicalCost: 'often the difference between a good and a flat year' },
      { name: 'spring signup compression', detail: 'Everyone calls in a three-week window. Whoever answers and quotes fastest takes the season. Capacity is not the constraint; response is.', typicalCost: 'a whole season of recurring revenue' },
      { name: 'no off-season contract base', detail: 'Selling annual agreements instead of per-visit work is a pricing and paperwork problem, not a demand problem.', typicalCost: 'winter payroll' },
      { name: 'the un-upsold maintenance account', detail: 'A customer on the mowing route is the cheapest possible buyer of mulch, aeration, lighting, or an irrigation check — and is never asked systematically.', typicalCost: '$400–$1,500 per account per year' },
    ],
    cares: ['keeping crews busy and paid through winter', 'not driving across the county for a $200 job', 'getting paid without chasing checks', 'whether the new guy quoted it right'],
    modern: ['a quote request that reaches a phone in the field, not a voicemail box', 'a written estimate out the same day, branded, in English and Spanish if the crew works bilingual', 'photos of finished work attached to the address that produced them', 'recurring billing on the maintenance base so nobody chases a check', 'a route that does not zigzag'],
    competitorWeakness: ['most local competitors have a one-page site with no service area named', 'almost none publish pricing bands, so the first honest price anchors the market', 'gallery photos are usually stock, not their own crews'],
    trustSignals: ['licensed and insured, stated plainly', 'named service area with actual towns and zips', 'real photos of their own finished jobs', 'how fast they respond to an estimate request'],
  },
  {
    id: 'hvac',
    label: 'HVAC & mechanical',
    signals: ['hvac', 'heating and cooling', 'air conditioning', 'furnace', 'heat pump', 'ac repair', 'ductwork', 'boiler', 'refrigeration', 'climate control'],
    economics: {
      ticket: '$150–$600 service call; $6k–$18k for a system replacement',
      repeat: 'maintenance agreements are the whole game — they convert to replacements at multiples of cold demand',
      margin: 'service 40–60%; equipment 15–30% with the money in labor and agreements',
      seasonality: 'violent. First heat wave and first freeze are the year. Shoulder seasons are when maintenance plans get sold or do not.',
    },
    demand: ['emergency search on a phone, in distress', 'Google Maps / local pack', 'existing maintenance agreement base', 'builder and property-manager relationships', 'referral from a past emergency handled well'],
    leaks: [
      { name: 'the after-hours emergency that rang out', detail: 'A no-heat call at 9pm in January is the highest-intent lead in the trade and the most likely to go unanswered. Whoever picks up wins a customer for a decade.', typicalCost: 'the highest-value lead you will ever get, repeatedly' },
      { name: 'maintenance agreements never systematically sold', detail: 'Every completed service call is the moment to sell the plan. Without a prompt it happens when the tech remembers, which is rarely.', typicalCost: 'the entire replacement pipeline two years out' },
      { name: 'no financing shown at the quote', detail: 'An $11k replacement quoted as a number is a shock. Quoted as a monthly figure it is a decision. Most local shops never present it.', typicalCost: '20–30% of replacement close rate' },
      { name: 'the aging-system list nobody keeps', detail: 'You know which installed systems are 14+ years old. Nobody is contacting them before they fail, so they fail on a Saturday and call whoever is open.', typicalCost: 'replacements handed to competitors' },
      { name: 'dispatch guesswork', detail: 'Which tech, which job, which order — decided by phone tag rather than by the map and the skill required.', typicalCost: '1–2 billable calls per tech per day' },
    ],
    cares: ['answering the emergency call before the competitor does', 'techs upselling honestly, not aggressively', 'permit and warranty paperwork surviving an inspection', 'not losing the replacement after doing the repair'],
    modern: ['a phone path that never rings out, even at 2am', 'financing presented inside the quote as a monthly number', 'maintenance plan billing on autopilot', 'a list of aging systems that contacts itself before the failure', 'dispatch that reads the map and the skill set'],
    competitorWeakness: ['most shops have no visible after-hours path', 'financing is buried or absent', 'service area is vague, so emergency searchers cannot tell if they are covered'],
    trustSignals: ['license number visible', 'brands certified to install', '24/7 availability stated with an actual mechanism behind it', 'warranty terms in plain language'],
  },
  {
    id: 'agency',
    label: 'marketing & creative agency',
    signals: ['marketing agency', 'digital agency', 'advertising agency', 'creative agency', 'seo agency', 'branding', 'media buying', 'growth agency', 'social media management', 'ppc'],
    economics: {
      ticket: '$2k–$15k/mo retainers; $8k–$60k projects',
      repeat: 'retainer length is the business. Average tenure under 7 months means you are running to stand still.',
      margin: '35–60% gross, entirely dependent on scope discipline',
      seasonality: 'mild, but client budget cycles bunch at Q4 and Q1',
    },
    demand: ['referral from a happy client', 'the agency\'s own visible results', 'inbound from content and case studies', 'partner and white-label relationships', 'outbound to a named vertical'],
    leaks: [
      { name: 'scope creep nobody priced', detail: 'The "quick extra" that recurs monthly. It is not a client problem, it is a change-order problem — there is no artifact that says what was agreed.', typicalCost: '10–25% of retainer margin' },
      { name: 'reporting done by hand', detail: 'Senior people assembling slide decks from six dashboards, monthly, per client. It is the most expensive labor in the shop spent on the least differentiated task.', typicalCost: '15–40 hours a month across the roster' },
      { name: 'churn that was visible 60 days early', detail: 'Engagement drops, replies slow, the champion goes quiet. Everyone feels it and nobody logs it, so the save attempt happens after the cancel email.', typicalCost: 'one retainer is a hire' },
      { name: 'the case study never written', detail: 'You got a client a real result and it lives in a Slack thread. The single highest-converting asset in the business is the one nobody has time to make.', typicalCost: 'your entire inbound pipeline' },
      { name: 'pitching without a point of view', detail: 'Competing on a deck that looks like every other deck, so the decision falls to price.', typicalCost: 'margin, on every deal' },
    ],
    cares: ['retainer tenure and predictable revenue', 'senior time spent on judgment, not assembly', 'proving the work caused the result', 'not becoming an order-taker'],
    modern: ['reporting that assembles itself and gets edited, not built', 'a change-order artifact the client signs in one click', 'churn signals surfaced while there is still time', 'case studies produced as a byproduct of the work', 'a proprietary diagnostic that opens conversations'],
    competitorWeakness: ['nearly every agency site claims "data-driven" and shows no data', 'case studies are logos, not numbers', 'no agency publishes its own operating metrics'],
    trustSignals: ['named results with real numbers', 'who actually does the work', 'what happens in the first 30 days', 'how reporting works'],
  },
  {
    id: 'contractor',
    label: 'general contracting & remodeling',
    signals: ['general contractor', 'remodel', 'renovation', 'home improvement', 'kitchen and bath', 'construction', 'builder', 'framing', 'additions', 'basement finishing'],
    economics: {
      ticket: '$15k–$150k+ per project',
      repeat: 'low direct repeat; referral and past-client reactivation is the channel',
      margin: '10–25% net, destroyed by change orders and estimating error',
      seasonality: 'moderate; permit and weather driven, with a long lead-to-start lag',
    },
    demand: ['referral and past-client word of mouth', 'Google Maps and review platforms', 'yard signs and neighborhood proximity', 'designer and realtor relationships', 'Houzz / Angi style directories'],
    leaks: [
      { name: 'estimating by feel', detail: 'Bids assembled from memory and a spreadsheet that has drifted. One mis-estimated job eats the margin on three good ones.', typicalCost: 'the difference between 8% and 20% net' },
      { name: 'change orders agreed verbally', detail: 'Said in the driveway, never written, disputed at invoice. The most common source of both lost margin and lost referrals.', typicalCost: '5–15% of project value' },
      { name: 'the long quiet between quote and start', detail: 'A homeowner waiting six weeks with no contact talks to someone else. Silence reads as disinterest.', typicalCost: 'signed jobs that unsign' },
      { name: 'no photo record of the work', detail: 'Every project is a marketing asset and a liability defense. Most are documented only in a phone camera roll nobody can search.', typicalCost: 'future leads and dispute exposure' },
      { name: 'subs coordinated by phone tag', detail: 'Schedule slips propagate silently; the client finds out before the office does.', typicalCost: 'days per project, and trust' },
    ],
    cares: ['bidding accurately enough to sleep', 'getting change orders in writing without souring the relationship', 'crews and subs showing up in the right order', 'the review at the end'],
    modern: ['estimates built from a real cost library, not memory', 'change orders signed on a phone in the driveway', 'a client-visible schedule that updates itself', 'progress photos filed by address automatically', 'a follow-up sequence that keeps a quoted job warm'],
    competitorWeakness: ['portfolios are thin and undated', 'almost nobody explains their process or payment schedule', 'licensing and insurance rarely surfaced clearly'],
    trustSignals: ['license and insurance, verifiable', 'dated project portfolio with real addresses or neighborhoods', 'written process and payment schedule', 'how change orders are handled, stated up front'],
  },
  {
    id: 'dental',
    label: 'dental & medical practice',
    signals: ['dental', 'dentist', 'orthodont', 'periodont', 'family practice', 'clinic', 'medical practice', 'chiropract', 'physical therapy', 'optometr', 'dermatolog'],
    economics: {
      ticket: '$200–$400 routine visit; $3k–$8k for major case acceptance',
      repeat: 'recall is the entire economic engine — a patient on a 6-month recall is an annuity',
      margin: '30–40% after overhead, chair-time constrained',
      seasonality: 'insurance benefit expiry drives a Q4 surge; summer soft',
    },
    demand: ['insurance network directories', 'Google Maps and reviews', 'patient referral', 'proximity — most patients pick within a short radius', 'new-mover and new-employer flows'],
    leaks: [
      { name: 'the lapsed recall list', detail: 'Patients who fell off the 6-month cycle and were never systematically brought back. It is the cheapest revenue in healthcare and it sits untouched.', typicalCost: 'often 15–25% of active patient base' },
      { name: 'no-shows with no friction', detail: 'An empty chair cannot be resold. Reminder cadence and a waitlist that fills gaps are pure recovered margin.', typicalCost: '$150–$400 per empty slot' },
      { name: 'treatment presented once and dropped', detail: 'Case acceptance is a follow-up problem, not a persuasion problem. Unaccepted treatment plans are rarely revisited.', typicalCost: 'the largest single revenue pool in the practice' },
      { name: 'phone answered by whoever is free', detail: 'New-patient calls are the highest-value inbound and are handled between other tasks, often badly, often not at all at lunch.', typicalCost: 'new patient acquisition' },
      { name: 'insurance verification by hand', detail: 'Staff hours spent on portal lookups that a process could do, and errors that become write-offs.', typicalCost: 'staff time plus collection leakage' },
    ],
    cares: ['keeping the schedule full', 'case acceptance without feeling salesy', 'HIPAA-safe handling of everything', 'staff not drowning in phone and portal work'],
    modern: ['recall that runs itself and escalates politely', 'a waitlist that fills a cancellation within the hour', 'treatment plans that follow up on their own schedule', 'new-patient calls that never go unanswered', 'anything touching patient data staying inside compliant boundaries'],
    competitorWeakness: ['most practice sites do not let you actually book', 'insurance accepted is often not listed', 'reviews unmanaged'],
    trustSignals: ['insurances accepted, listed explicitly', 'real booking, not a contact form', 'provider credentials and photos', 'new-patient expectations set clearly'],
  },
  {
    id: 'restaurant',
    label: 'restaurant & food service',
    signals: ['restaurant', 'cafe', 'bistro', 'catering', 'menu', 'pizzeria', 'bakery', 'food truck', 'brewery', 'taqueria', 'grill', 'kitchen'],
    economics: {
      ticket: '$15–$60 per cover; catering $500–$8k per event',
      repeat: 'regulars are everything; a weekly regular outweighs dozens of one-time visits',
      margin: '3–9% net — the thinnest in small business, so every leak is existential',
      seasonality: 'weekly and daily rhythm dominates; weather and events swing covers hard',
    },
    demand: ['Google Maps and "near me" search', 'Instagram and short-form video', 'delivery platform placement', 'walk-by and location', 'word of mouth and regulars'],
    leaks: [
      { name: 'delivery platform commission', detail: '20–30% off the top of every order on a business running 5% net. Direct ordering is not a nice-to-have, it is the margin.', typicalCost: 'more than net profit on platform orders' },
      { name: 'the menu that is wrong online', detail: 'Prices and items out of date across Google, the site, and three platforms. Every mismatch is a refund, a bad review, or a walkout.', typicalCost: 'reviews, which are the whole funnel' },
      { name: 'catering inquiries handled ad hoc', detail: 'The highest-margin revenue in the building arrives by email and gets answered whenever the owner sits down, which is after service, which is too late.', typicalCost: 'the best money in the business' },
      { name: 'reviews unanswered', detail: 'Response rate visibly affects both ranking and human trust. Most independents answer none.', typicalCost: 'placement in the only channel that matters' },
      { name: 'no way to reach past guests', detail: 'Hundreds of people loved the place and left no way to be told about anything ever again.', typicalCost: 'every slow Tuesday' },
    ],
    cares: ['covers tonight', 'food cost and labor cost this week', 'the review that just went up', 'catering that pays better than the dining room'],
    modern: ['direct ordering that undercuts platform commission', 'one menu source that pushes everywhere at once', 'catering inquiries that get an instant structured response', 'reviews answered fast, in a real voice', 'a way to reach people who already came'],
    competitorWeakness: ['most independent sites have a PDF menu, which is invisible to search and unusable on a phone', 'hours wrong or missing', 'no direct ordering'],
    trustSignals: ['a real HTML menu with current prices', 'accurate hours everywhere', 'recent photos of actual food', 'answered reviews'],
  },
  {
    id: 'auto',
    label: 'auto repair & service',
    signals: ['auto repair', 'mechanic', 'automotive', 'transmission', 'collision', 'body shop', 'tire', 'oil change', 'car service', 'detailing', 'muffler'],
    economics: {
      ticket: '$300–$1,200 average repair order',
      repeat: 'a retained vehicle is worth thousands a year; the customer is the car, not the visit',
      margin: 'labor 60–70%, parts 20–35%',
      seasonality: 'moderate; state inspection cycles and seasonal failures drive spikes',
    },
    demand: ['proximity and Google Maps', 'reviews — trust is the entire purchase decision', 'referral', 'fleet and small-business accounts', 'dealer-alternative search intent'],
    leaks: [
      { name: 'declined work never followed up', detail: 'The customer said "not today" to the brakes. That is a dated, specific, high-intent list and almost no shop works it.', typicalCost: 'the easiest revenue in the shop' },
      { name: 'no digital inspection', detail: 'Trust is the constraint in auto repair. Photos and video of the actual worn part convert declines into approvals better than any argument.', typicalCost: '10–20% of approval rate' },
      { name: 'phone as the only channel', detail: 'Customers at work cannot take a call to approve a repair. Approval by text closes hours faster.', typicalCost: 'bay time sitting idle waiting for a callback' },
      { name: 'no service reminders', detail: 'You know the mileage and the interval. Nobody is told when it is time.', typicalCost: 'the retention annuity' },
      { name: 'fleet accounts never pursued', detail: 'Every local business with three vans is a recurring account, and acquiring them is a relationship task nobody owns.', typicalCost: 'predictable baseline revenue' },
    ],
    cares: ['bays full and techs billing hours', 'customers trusting the recommendation', 'parts availability not stalling a job', 'the review after a big repair'],
    modern: ['photo and video inspections sent to the customer\'s phone', 'approval by text, not phone tag', 'declined work that follows up on its own', 'service reminders tied to mileage and date', 'fleet accounts on a standing schedule'],
    competitorWeakness: ['most shop sites do not show pricing or process', 'no online appointment request', 'reviews unmanaged and trust unaddressed'],
    trustSignals: ['certifications (ASE and similar)', 'warranty on work, stated', 'photos of the actual shop and team', 'how estimates and approvals work'],
  },
  {
    id: 'salon',
    label: 'salon, spa & personal services',
    signals: ['salon', 'barber', 'spa', 'hair', 'nails', 'esthetic', 'massage', 'lash', 'brow', 'med spa', 'beauty', 'waxing'],
    economics: {
      ticket: '$40–$250 per service; packages and memberships far higher',
      repeat: 'rebooking rate is the single most predictive number in the business',
      margin: '40–60% on service; retail product is high-margin and undersold',
      seasonality: 'event-driven peaks (holidays, weddings, prom); January soft',
    },
    demand: ['Instagram and TikTok — the work is the ad', 'Google Maps and reviews', 'referral and word of mouth', 'walk-by', 'booking platform discovery'],
    leaks: [
      { name: 'not rebooking at checkout', detail: 'The moment to book the next appointment is while they are standing there happy. Missed, it becomes a marketing problem instead of a habit.', typicalCost: 'the entire retention curve' },
      { name: 'no-shows and late cancels', detail: 'A chair or table empty at 2pm is unrecoverable revenue. Deposits and reminders are the fix and most independents avoid both.', typicalCost: '10–20% of capacity' },
      { name: 'booking only by DM or phone', detail: 'Clients decide at 11pm. If they cannot book then, they book with whoever lets them.', typicalCost: 'a large share of new-client demand' },
      { name: 'retail product not attached', detail: 'The highest-margin item in the building, recommended inconsistently and never followed up.', typicalCost: '$15–$60 per client visit' },
      { name: 'gaps in the day nobody fills', detail: 'A cancellation at 10am could be filled from a waitlist within minutes; usually it is just lost.', typicalCost: 'the difference between a full and a half day' },
    ],
    cares: ['a full book', 'clients coming back on a rhythm', 'stylists and techs staying', 'the portfolio looking current'],
    modern: ['24/7 self-booking with deposits', 'automatic rebooking prompts', 'a waitlist that fills gaps', 'product recommendations that follow the client home', 'a portfolio that updates from the work itself'],
    competitorWeakness: ['many still book only by DM', 'no deposit policy, so no-shows run wild', 'stale photo galleries'],
    trustSignals: ['current portfolio of actual work', 'clear pricing', 'real-time availability', 'cancellation policy stated kindly but plainly'],
  },
  {
    id: 'legal',
    label: 'law & professional services',
    signals: ['law firm', 'attorney', 'lawyer', 'legal', 'estate planning', 'family law', 'personal injury', 'immigration', 'litigation', 'counsel', 'paralegal'],
    economics: {
      ticket: '$1,500–$15k per matter; contingency and hourly vary wildly',
      repeat: 'low repeat, high referral; the referral network is the business',
      margin: 'high on the work, destroyed by unbilled time and intake leakage',
      seasonality: 'practice-area dependent; estate and tax cluster seasonally',
    },
    demand: ['referral from past clients and other professionals', 'search at the moment of need, high intent', 'directory and review presence', 'community and association presence'],
    leaks: [
      { name: 'intake handled by whoever answers', detail: 'A person in legal trouble calls three firms. The one that answers with a structured, human intake gets the matter. Most firms route to voicemail.', typicalCost: 'the majority of inbound matters' },
      { name: 'no after-hours path', detail: 'Legal need does not respect business hours, and urgency is highest exactly when the office is closed.', typicalCost: 'the highest-intent leads' },
      { name: 'unbilled time', detail: 'Work done and never captured because the entry happened days later from memory.', typicalCost: '5–15% of billable revenue' },
      { name: 'consultations that never follow up', detail: 'A consult that did not sign is not a no, it is a not-yet, and it is almost never revisited.', typicalCost: 'a meaningful share of matters' },
      { name: 'referral sources never nurtured', detail: 'The accountants and realtors who send matters are contacted when convenient, which is never.', typicalCost: 'the most durable channel there is' },
    ],
    cares: ['matter quality, not just volume', 'conflicts and confidentiality handled correctly', 'not losing a good matter to a faster firm', 'partner time on law, not admin'],
    modern: ['structured intake that qualifies before it reaches an attorney', 'an after-hours path that captures rather than deflects', 'consult follow-up on a schedule', 'referral relationships worked deliberately', 'everything confidential staying inside a boundary you control'],
    competitorWeakness: ['most firm sites are credential walls with no intake path', 'practice areas listed without explaining who they are for', 'no indication of responsiveness'],
    trustSignals: ['bar admissions and jurisdictions', 'who you actually work with', 'fee structure explained', 'confidentiality handled visibly'],
  },
  {
    id: 'realestate',
    label: 'real estate & property',
    signals: ['real estate', 'realtor', 'property management', 'brokerage', 'listings', 'homes for sale', 'leasing', 'rental property', 'broker'],
    economics: {
      ticket: '$6k–$25k per transaction side; management 8–12% of rent',
      repeat: 'sphere and past clients drive the business; management is recurring',
      margin: 'high gross, consumed by lead cost and time-to-close',
      seasonality: 'strong spring/summer skew for residential sales',
    },
    demand: ['sphere of influence and referral', 'portal and search presence', 'social proof and local visibility', 'open houses and farming a geography'],
    leaks: [
      { name: 'lead response measured in hours', detail: 'Inquiry response speed is the most studied number in the industry and the most ignored. Minutes matter, hours lose.', typicalCost: 'most of your paid lead spend' },
      { name: 'the sphere never touched', detail: 'Past clients and contacts who would refer, contacted only when something is being sold to them.', typicalCost: 'the cheapest transactions you will ever get' },
      { name: 'maintenance requests by text', detail: 'For management: requests arriving in personal texts with no record, no tracking, no vendor loop.', typicalCost: 'owner trust and legal exposure' },
      { name: 'listings not syndicated cleanly', detail: 'Inconsistent data across portals suppresses reach and confuses buyers.', typicalCost: 'days on market' },
      { name: 'no post-close relationship', detail: 'The transaction ends and so does the relationship, right when referral value is highest.', typicalCost: 'compounding repeat business' },
    ],
    cares: ['response speed on new leads', 'staying top of mind with the sphere', 'owners trusting the management reporting', 'not losing a listing to a faster agent'],
    modern: ['inbound answered in minutes, always', 'a sphere that gets touched on a rhythm without manual work', 'maintenance requests as tracked tickets with vendor loops', 'owner reporting that assembles itself', 'post-close nurture that runs for years'],
    competitorWeakness: ['agent sites are interchangeable', 'almost no local market commentary with real numbers', 'no visible response guarantee'],
    trustSignals: ['license number', 'actual recent transactions', 'local market knowledge demonstrated with numbers', 'how fast you respond'],
  },
  {
    id: 'cleaning',
    label: 'cleaning & facility services',
    signals: ['cleaning service', 'janitorial', 'maid service', 'housekeeping', 'commercial cleaning', 'carpet cleaning', 'pressure washing', 'window cleaning', 'restoration'],
    economics: {
      ticket: '$120–$400 residential visit; $500–$5k/mo commercial contract',
      repeat: 'recurring contracts are the entire business model',
      margin: '20–40%, labor dominated',
      seasonality: 'mild residential; commercial is contract-cycle driven',
    },
    demand: ['referral and neighborhood word of mouth', 'Google Maps', 'property manager and office relationships', 'move-in/move-out timing'],
    leaks: [
      { name: 'quoting by phone without seeing it', detail: 'Under-quoted jobs that take twice as long. A structured intake with photos fixes the estimate before the crew arrives.', typicalCost: 'margin on every mis-scoped job' },
      { name: 'one-time jobs never converted to recurring', detail: 'A deep clean is an audition for a contract, and the ask is usually never made.', typicalCost: 'the recurring base' },
      { name: 'crew scheduling by group text', detail: 'No-shows and route inefficiency because there is no schedule anyone can see.', typicalCost: 'hours per week per crew' },
      { name: 'no quality record', detail: 'Complaints become word against word. Checklists and photos end the dispute and prove the work.', typicalCost: 'contracts and trust' },
      { name: 'collections chased manually', detail: 'Invoices sent from a phone, paid whenever, followed up never.', typicalCost: 'weeks of cash flow' },
    ],
    cares: ['keeping recurring contracts', 'crews showing up and doing it right', 'getting paid on time', 'growing without losing quality'],
    modern: ['photo-based quoting so estimates are right the first time', 'a recurring conversion ask built into the job close', 'a schedule crews can see on a phone', 'completion checklists with photos, filed automatically', 'automatic recurring billing'],
    competitorWeakness: ['no pricing indication at all on most sites', 'no way to request a quote with photos', 'insurance and bonding rarely stated'],
    trustSignals: ['bonded and insured, plainly', 'background-checked staff', 'what is actually included, itemized', 'satisfaction policy'],
  },
  {
    id: 'fitness',
    label: 'gym, studio & coaching',
    signals: ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'personal training', 'martial arts', 'studio', 'strength', 'coaching', 'wellness center'],
    economics: {
      ticket: '$80–$250/mo membership; $400–$1,200/mo coaching',
      repeat: 'membership length is the business — retention beats acquisition every time',
      margin: '20–40% with rent and staff as the constraint',
      seasonality: 'January surge, spring fade, September secondary peak',
    },
    demand: ['proximity and Google Maps', 'social proof and member results', 'referral from members', 'trial and intro-offer funnels'],
    leaks: [
      { name: 'the trial that never got followed up', detail: 'Someone walked in, took a class, and was never contacted again. The highest-intent prospect you will ever have.', typicalCost: 'most of your conversion' },
      { name: 'silent churn', detail: 'Attendance drops for three weeks before the cancellation. It is visible in your own data and nobody looks.', typicalCost: 'the difference between growth and treading water' },
      { name: 'no referral mechanism', detail: 'Members would bring friends if asked at the right moment. There is no right moment because there is no mechanism.', typicalCost: 'the cheapest member acquisition available' },
      { name: 'class schedule friction', detail: 'Hard-to-find or hard-to-book schedules suppress attendance, which suppresses retention.', typicalCost: 'retention, compounding' },
      { name: 'results never captured', detail: 'Member transformations are the only marketing that works in fitness and they are documented by accident.', typicalCost: 'your entire top of funnel' },
    ],
    cares: ['members staying past month three', 'filling classes at off-peak times', 'coaches retaining their people', 'the community feeling real'],
    modern: ['trial follow-up that runs itself', 'attendance-drop alerts before the cancel', 'referral asks at the moment of a member win', 'frictionless booking on a phone', 'member results captured as a routine, not a favor'],
    competitorWeakness: ['schedules buried in PDFs or apps', 'no pricing shown, which kills consideration', 'no visible community proof'],
    trustSignals: ['actual schedule visible without an app', 'pricing stated', 'real member results and faces', 'coach credentials'],
  },
];

/** The fallback. Deliberately still specific — a generic pack produces generic output. */
const DEFAULT_PACK: NichePack = {
  id: 'general',
  label: 'local service business',
  signals: [],
  economics: {
    ticket: 'varies — the analysis below reasons from what the site actually sells',
    repeat: 'in most local businesses the retained customer is worth many multiples of the first sale',
    margin: 'labor and response time are usually the binding constraints, not demand',
    seasonality: 'most local demand is seasonal or event-driven in ways the owner can predict',
  },
  demand: ['referral and word of mouth', 'Google Maps and local search', 'proximity', 'repeat customers', 'relationships with adjacent businesses'],
  leaks: [
    { name: 'inbound that goes unanswered', detail: 'The most common and most expensive leak in any small business: someone tried to give you money and nobody got back to them fast enough.', typicalCost: '20–40% of inbound demand' },
    { name: 'quotes that go out late', detail: 'Close rate falls sharply after the first day. Speed beats polish on almost every local job.', typicalCost: 'a large share of winnable work' },
    { name: 'past customers never contacted again', detail: 'The cheapest revenue available, sitting in a list nobody works.', typicalCost: 'the repeat business you already earned' },
    { name: 'work not documented', detail: 'Every completed job is both proof for the next customer and protection in a dispute. Most are recorded nowhere searchable.', typicalCost: 'future leads' },
    { name: 'the owner as the only integration point', detail: 'Everything routes through one person, so everything waits for that person.', typicalCost: 'the ceiling on the whole business' },
  ],
  cares: ['steady work without feast and famine', 'getting paid without chasing', 'not dropping the ball on a customer', 'the business running when the owner is not in it'],
  modern: ['inbound that reaches a human or a good machine within minutes, at any hour', 'quotes out the same day, branded and clear', 'past customers reachable on purpose', 'work documented as a byproduct of doing it', 'the owner not being the bottleneck'],
  competitorWeakness: ['most local competitors have a thin site with no clear next step', 'few publish pricing or process', 'almost none are readable by AI assistants'],
  trustSignals: ['licensed and insured where relevant', 'named service area', 'real photos of real work', 'a clear, fast way to get a price'],
};

/**
 * Detect a niche from crawl text. Weighted by signal specificity and where it
 * appears — a term in the title counts far more than one in the footer.
 */
export function detectNiche(input: {
  title?: string | null;
  description?: string | null;
  headings?: string[];
  bodyText?: string;
  hint?: string | null;
}): { pack: NichePack; confidence: number; matched: string[] } {
  const strong = `${input.hint || ''} ${input.title || ''} ${input.description || ''} ${(input.headings || []).join(' ')}`.toLowerCase();
  const weak = (input.bodyText || '').toLowerCase().slice(0, 20000);

  let best: { pack: NichePack; score: number; matched: string[] } | null = null;

  for (const pack of PACKS) {
    let score = 0;
    const matched: string[] = [];
    for (const sig of pack.signals) {
      if (strong.includes(sig)) {
        score += 10;
        matched.push(sig);
      } else if (weak.includes(sig)) {
        score += 2;
        matched.push(sig);
      }
    }
    if (!best || score > best.score) best = { pack, score, matched };
  }

  if (!best || best.score < 4) {
    return { pack: DEFAULT_PACK, confidence: 0, matched: [] };
  }
  // Confidence saturates — 30+ points is as sure as we get.
  return {
    pack: best.pack,
    confidence: Math.min(1, best.score / 30),
    matched: [...new Set(best.matched)].slice(0, 6),
  };
}

export function nicheById(id: string): NichePack {
  return PACKS.find((p) => p.id === id) || DEFAULT_PACK;
}

/** Public-safe list for the "correct my industry" picker. Labels only, no IP. */
export function nicheOptions(): { id: string; label: string }[] {
  return [...PACKS.map((p) => ({ id: p.id, label: p.label })), { id: 'general', label: DEFAULT_PACK.label }];
}

/**
 * Render a pack as the model's briefing. This is the only place pack content is
 * serialized, and it goes into a system prompt — never into a response body.
 */
export function briefing(pack: NichePack): string {
  return [
    `INDUSTRY BRIEFING — ${pack.label}`,
    ``,
    `Unit economics:`,
    `- Typical ticket: ${pack.economics.ticket}`,
    `- Repeat dynamics: ${pack.economics.repeat}`,
    `- Margin structure: ${pack.economics.margin}`,
    `- Seasonality: ${pack.economics.seasonality}`,
    ``,
    `Where their customers actually come from, in order of real weight:`,
    ...pack.demand.map((d, i) => `${i + 1}. ${d}`),
    ``,
    `KNOWN REVENUE LEAKS in this trade (use these — they are the substance of the analysis):`,
    ...pack.leaks.map((l) => `- ${l.name}: ${l.detail} (typical cost: ${l.typicalCost})`),
    ``,
    `What the owner actually worries about: ${pack.cares.join('; ')}.`,
    ``,
    `What "modern" concretely means in this trade: ${pack.modern.join('; ')}.`,
    ``,
    `Where their competitors are usually weak: ${pack.competitorWeakness.join('; ')}.`,
    ``,
    `Trust signals this trade's site must carry: ${pack.trustSignals.join('; ')}.`,
  ].join('\n');
}
