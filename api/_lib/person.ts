// The public profile every agent endpoint returns. One copy, so the
// endpoints cannot drift from each other or from llms.txt.

export const PERSON = {
  name: 'Alexander Campos',
  title: 'Operations & AI systems',
  description:
    'Operations by day, local-first AI tools by night. Six years in regulated bank operations (monitoring, controls, vendor integrations, automation). Builds agent memory, model routing, and evaluation tooling.',
  location: 'Virginia',
  email: 'alex@campos.works',
  website: 'https://campos.works',
};

export const PROJECTS = [
  {
    name: 'ForgeFrame',
    url: 'https://campos.works/projects/forgeframe',
    description: 'Open-source memory for agents. MCP-native. SQLite + FTS5, strength decay, a principle tier that never decays.',
    status: 'active',
  },
  {
    name: 'CREATURE',
    url: 'https://campos.works/projects/creature',
    description: 'A personal agent system that runs on one machine: memory, consolidation, judgment, and a queue in front of anything consequential.',
    status: 'active',
  },
  {
    name: 'Reframed',
    url: 'https://reframed.works',
    description: "Resume analysis that keeps the writer's voice. Voice fingerprinting, multi-reader analysis, signed honesty receipts.",
    status: 'shipped',
  },
  {
    name: 'DEUCE',
    url: 'https://campos.works/projects/deuce',
    description: 'A calibration-first forecasting instrument for tennis prediction markets. Signs each forecast before resolution. Paper only.',
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
  resume: 'https://campos.works/resume',
};

export const DISCOVERY = {
  llms_txt: 'https://campos.works/llms.txt',
  agent_json: 'https://campos.works/.well-known/agent.json',
  a2a_card: 'https://campos.works/.well-known/a2a-agent-card.json',
  mcp_discovery: 'https://campos.works/.well-known/mcp.json',
  openapi: 'https://campos.works/openapi.json',
};
