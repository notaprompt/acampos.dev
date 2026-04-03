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
      email: 'adc.acampos@gmail.com',
    },
    services: [
      {
        name: 'ForgeFrame Setup & Integration',
        description: 'Deploy persistent memory infrastructure for AI agents. MCP-native, SQLite-backed. Works with Claude Desktop, Cursor, or any MCP client.',
        category: 'ai-infrastructure',
      },
      {
        name: 'Agent Infrastructure',
        description: 'Model routing across Anthropic, OpenAI, Ollama. Tier-based dispatch with 40-60% cost reduction. Streaming SSE normalization.',
        category: 'ai-infrastructure',
      },
      {
        name: 'Local-First Architecture Consulting',
        description: 'Audit AI stacks for cloud dependencies. Design sovereignty-preserving migration paths.',
        category: 'consulting',
      },
      {
        name: 'Memory System Design',
        description: 'Custom semantic memory with FTS5 search, embedding integration, weighted retrieval with strength decay.',
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
      email: 'adc.acampos@gmail.com',
      booking: 'https://cal.com/alexcampos/30min',
      website: 'https://campos.works',
      github: 'https://github.com/notaprompt',
    },
    availability: 'Open to consulting engagements. Book a 30-minute call to discuss scope.',
    discovery: {
      llms_txt: 'https://campos.works/llms.txt',
      agent_json: 'https://campos.works/.well-known/agent.json',
      services_page: 'https://campos.works/services',
    },
  });
}
