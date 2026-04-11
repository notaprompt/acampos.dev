// Plain-language definitions for technical terms used across this site.
// Used by the <Wtf> component (inline popover) and the /glossary page.
// Add entries sparingly — only where the gloss truly earns its keep.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: Record<string, GlossaryEntry> = {
  'biorxiv': {
    term: 'bioRxiv',
    definition: 'A free, open repository where biology researchers post papers before formal peer review. A public draft folder for the field.',
  },
  'multivariate-triple-network': {
    term: 'multivariate triple-network analysis',
    definition: 'Looking at how three brain networks coordinate over time — the default mode network (self-referential thinking), the central executive network (focused work), and the salience network (the switch between them). The dynamics between them, not the regions themselves, are what we mean by identity.',
  },
  'fmri': {
    term: 'fMRI',
    definition: 'Functional magnetic resonance imaging. A way of measuring brain activity by tracking blood flow — when a region works harder, blood rushes in. Indirect, slow, but non-invasive.',
  },
  'bold-signal': {
    term: 'BOLD signal',
    definition: 'Blood-Oxygen-Level-Dependent signal. The actual thing an fMRI scanner measures. It tracks oxygen-rich blood flow in the brain — a stand-in for brain-cell activity, not the activity itself.',
  },
  'sparse-autoencoder-features': {
    term: 'sparse autoencoder features',
    definition: 'Small, identifiable pieces of a language model\u2019s internal state. You can find them, watch them fire, and intervene on them. Roughly: discovering individual features that activate for things like "danger" or "I am being tested" — but inside software, not a brain.',
  },
  'persona-and-emotion-vectors': {
    term: 'persona vectors, emotion vectors',
    definition: 'Directions inside a language model\u2019s internal space that correspond to traits or feelings. You can move the model along them and watch its behavior shift — making it more cautious, more rushed, more hopeful, more guilty.',
  },
  'activation-verbalizers': {
    term: 'activation verbalizers',
    definition: 'A trick where you ask a smaller model to describe, in plain English, what a larger model is "doing" at a given moment. Imperfect — the smaller model sometimes invents something plausible that isn\u2019t actually there — but useful for spotting patterns the math alone won\u2019t name.',
  },
  'phenomenal-consciousness': {
    term: 'phenomenal consciousness',
    definition: 'The "something it is like to be" something — whether a system has inner experience, not just behavior. Sometimes called qualia. The hardest unresolved question in philosophy of mind.',
  },
  'model-context-protocol': {
    term: 'Model Context Protocol (MCP)',
    definition: 'An open standard that lets AI assistants use custom tools and data sources. Instead of building separate integrations for each assistant, you build one MCP server that works with Claude, Cursor, and other compatible tools.',
  },
  'ollama': {
    term: 'Ollama',
    definition: 'A tool that lets you run language models on your own computer, offline, without sending data to the cloud. Downloads a model once, then runs it locally.',
  },
  'server-sent-events': {
    term: 'Server-Sent Events (SSE)',
    definition: 'A way for a server to push real-time updates to a client over HTTP. Used for streaming responses - like watching a response type out word by word.',
  },
  'pii': {
    term: 'Personally Identifiable Information (PII)',
    definition: 'Any information that can identify a specific person - names, email addresses, phone numbers, medical records. Systems that handle PII need extra care to protect privacy.',
  },
  'magic-link-auth': {
    term: 'Magic Link Authentication',
    definition: 'A passwordless login method. You enter your email and receive a special link that logs you in. No password to forget or breach.',
  },
  'voice-fingerprinting': {
    term: 'Voice Fingerprinting',
    definition: 'Analyzing the unique patterns in how someone writes - word choice, sentence structure, hedging, formality - to detect their individual writing voice. Used to ensure rewrites sound like the original author.',
  },
  'reframe-detection': {
    term: 'Reframe Detection',
    definition: 'Identifying when a system subtly reshapes what you said into something slightly different. Like turning "I\'m frustrated" into "You\'re actually motivated" - close enough to accept, different enough to matter.',
  },
  'awareness-trap': {
    term: 'Awareness Trap',
    definition: 'When you can see a recurring pattern clearly but can\'t seem to change it. The ability to observe the problem is there, but the capacity to exit it isn\'t.',
  },
  'sovereign-encryption': {
    term: 'Sovereign Encryption',
    definition: 'Encryption that keeps sensitive data private on your device, separate from cloud processing. Even when cloud services are active, protected data never leaves your machine.',
  },
  'strength-decay': {
    term: 'Strength Decay',
    definition: 'A memory model where recent, frequently-accessed information stays strong while older or rarely-used information gradually fades. Like how human memory works - fresh memories are vivid, old ones blur.',
  },
  'constitutional-principles': {
    term: 'Constitutional Principles',
    definition: 'Core values or rules in a system that never change or decay, unlike regular data that fades over time. The bedrock assumptions that shape all of a system\'s decisions.',
  },
  'tier-based-dispatch': {
    term: 'Tier-Based Dispatch',
    definition: 'Routing tasks to different models based on complexity. Quick questions go cheap and fast, deep analysis goes to the frontier model. Like triaging an ER - not everything needs a specialist.',
  },
  'fallback-chains': {
    term: 'Fallback Chains',
    definition: 'A sequence of backup options that activate when the first option fails. If provider A goes down, try B. If B fails, try C. Keeps the system running even when parts break.',
  },
  'knowledge-graph': {
    term: 'Knowledge Graph',
    definition: 'A network of connected entities and relationships. Instead of storing information as flat text, it captures how people, places, and concepts relate to each other.',
  },
  'reaction-diffusion': {
    term: 'Reaction-Diffusion',
    definition: 'A mathematical model where substances spread out and interact, creating organic-looking patterns - spots, stripes, spirals. Used in the ASCII background on this site to make the characters feel alive.',
  },
  'webgl': {
    term: 'WebGL',
    definition: 'A way to render graphics directly in the browser using your GPU. Powers the interactive visualizations on this site without needing any plugins or downloads.',
  },
  'semantic-search': {
    term: 'Semantic Search',
    definition: 'Finding information by meaning rather than exact keywords. Searching for "feeling stuck at work" would match a memory about "career stagnation" even though the words are different.',
  },
  'default-mode-network': {
    term: 'Default Mode Network (DMN)',
    definition: 'The brain network that activates when you\'re not focused on a specific task - daydreaming, self-reflection, imagining the future. The watcher. It maintains your model of yourself.',
  },
};
