import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  return res.json({
    person: {
      name: 'Alexander Campos',
      title: 'Independent Engineer',
      location: 'Virginia',
      url: 'https://campos.works',
      email: 'alex@campos.works',
    },
    services: [
      {
        name: 'Full Online Presence Build',
        description: 'Website, scheduling, calendar, contact forms, SEO, automations. One build for small businesses.',
        category: 'web-development',
      },
      {
        name: 'Agentic SEO & AI Discoverability',
        description: 'Structured data, machine-readable profiles, agent discovery endpoints. Findable by AI agents, not just Google.',
        category: 'seo',
      },
      {
        name: 'AI Cost Optimization',
        description: 'Model routing and tiered dispatch that cuts API spend 40-60%. Audit included.',
        category: 'ai-infrastructure',
      },
      {
        name: 'Custom AI Automation',
        description: 'Agent orchestration, scheduling, monitoring, reporting, intake flows. Describe the process, get the pipeline.',
        category: 'automation',
      },
      {
        name: 'Claude Code & MCP Setup',
        description: 'Custom MCP servers, persistent memory, team configurations, hooks. Enterprise setup for teams using Claude.',
        category: 'ai-infrastructure',
      },
    ],
    projects: [
      {
        name: 'ForgeFrame',
        url: 'https://github.com/notaprompt/forgeframe',
        description: 'Open-source memory for AI agents. MCP server with 12 tools. SQLite + FTS5.',
        status: 'active',
      },
      {
        name: 'Reframed',
        url: 'https://reframed.works',
        description: 'Resume analysis platform. Voice fingerprinting, multi-reader analysis, streaming AI.',
        status: 'shipped',
      },
      {
        name: 'Guardian',
        description: 'Desktop cognitive workspace with reframe detection and awareness-trap detection. Local-only.',
        status: 'active',
      },
      {
        name: 'Distillery',
        description: 'Phone-to-local-inference pipeline. Share a URL from iOS, Mac distills through constitutional lens.',
        status: 'active',
      },
    ],
    capabilities: [
      'typescript', 'python', 'sql',
      'model-context-protocol', 'ollama', 'anthropic-api', 'openai-api',
      'local-first-architecture', 'memory-systems', 'model-routing',
      'sqlite-fts5', 'electron', 'react', 'nextjs', 'astro',
      'streaming-sse', 'structured-tool-use',
    ],
    contact: {
      email: 'alex@campos.works',
      booking: 'https://cal.com/alexander-campos-yrnz8m/30min',
      website: 'https://campos.works',
      github: 'https://github.com/notaprompt',
    },
    availability: 'Free 30-minute consultation. No pitch, just a conversation about what you need.',
    discovery: {
      llms_txt: 'https://campos.works/llms.txt',
      agent_json: 'https://campos.works/.well-known/agent.json',
      services_page: 'https://campos.works/services',
    },
  });
}
