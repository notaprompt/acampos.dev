// The public profile every agent endpoint returns. One copy, so the
// endpoints cannot drift from each other or from llms.txt.

export const PERSON = {
  name: 'Alexander Campos',
  title: 'Software and operations',
  description:
    'Builds software, works in operations, and writes about the systems people depend on. Research interests include compute economics, ownership, and individual agency. Background includes six years in regulated finance.',
  location: 'Virginia',
  email: 'alex@campos.works',
  website: 'https://campos.works',
};

export const PROJECTS = [
  {
    name: 'ForgeFrame',
    url: 'https://campos.works/projects/forgeframe',
    description: 'Open-source agent memory over MCP, using SQLite and FTS5. Supports retrieval, use-based strengthening, decay, and protected principles.',
    status: 'active',
  },
  {
    name: 'CREATURE',
    url: 'https://campos.works/projects/creature',
    description: 'A personal agent system running on one machine: memory, model routing, scheduled jobs, and approval queues. An experiment in making context, permissions, and failures inspectable.',
    status: 'active',
  },
  {
    name: 'Reframed',
    url: 'https://reframed.works',
    description: "A live resume tool with several analytical perspectives and signed records of text changes. Its receipts document editing; they do not prove a claim is true.",
    status: 'shipped',
  },
  {
    name: 'DEUCE',
    url: 'https://campos.works/projects/deuce',
    description: 'A tennis forecasting experiment that signs forecasts before outcomes are known so calibration can be evaluated. Paper only; no capital at risk.',
    status: 'active',
  },
];

export const CAPABILITIES = [
  'typescript', 'python', 'sql',
  'model-context-protocol', 'ollama', 'local-first-architecture',
  'memory-systems', 'model-routing', 'evaluation-and-rubric-design',
  'sqlite-fts5', 'react', 'nextjs', 'astro', 'streaming-sse', 'structured-tool-use',
];

export const LINKS = {
  github: 'https://github.com/notaprompt',
  linkedin: 'https://linkedin.com/in/alexander-d-campos',
  x: 'https://x.com/flapfinned',
  writing: 'https://campos.works/writing',
  research: 'https://campos.works/research/claims-capacity-collateral',
  resume: 'https://campos.works/resume',
};

export const DISCOVERY = {
  llms_txt: 'https://campos.works/llms.txt',
  agent_json: 'https://campos.works/.well-known/agent.json',
  a2a_card: 'https://campos.works/.well-known/a2a-agent-card.json',
  mcp_discovery: 'https://campos.works/.well-known/mcp.json',
  openapi: 'https://campos.works/openapi.json',
};
