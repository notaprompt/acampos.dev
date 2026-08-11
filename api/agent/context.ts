import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OFFERS, PARTS, FREE_TOOLS, ENTRY_POINT } from '../_lib/offering.js';

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
    services: OFFERS.map((o) => ({
      name: o.name,
      description: o.description,
      category: o.category,
      price: o.price,
      url: o.url,
    })),
    businessParts: PARTS,
    freeTools: FREE_TOOLS,
    entryPoint: ENTRY_POINT,
    projects: [
      {
        name: 'ForgeFrame',
        url: 'https://github.com/notaprompt/forgeframe',
        description: 'Open-source memory for agents. MCP-native. SQLite + FTS5, strength decay, principle tier.',
        status: 'active',
      },
      {
        name: 'Reframed',
        url: 'https://reframed.works',
        description: 'Resume analysis platform. Voice fingerprinting, multi-reader analysis, signed honesty receipts.',
        status: 'shipped',
      },
      {
        name: 'Guardian',
        description: 'Desktop workspace with reframe detection. The engine became ForgeFrame; the shell is retired.',
        status: 'absorbed',
      },
      {
        name: 'CREATURE',
        url: 'https://campos.works/projects/creature',
        description: 'A mind that runs on one machine - memory, dreams, judgment, a maintainer watching the body. Local by construction.',
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
      booking: 'https://calendly.com/alex-campos-8chs/30min',
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
