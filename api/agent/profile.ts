import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OFFERS, PARTS, FREE_TOOLS, ENTRY_POINT, HEADLINE, USAGE_POLICY } from '../_lib/offering.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (_req.method === 'OPTIONS') return res.status(200).end();

  return res.json({
    schema_version: '2.0',
    person: {
      name: 'Alexander Campos',
      title: 'Independent Operator & Builder',
      description:
        HEADLINE,
      email: 'alex@campos.works',
      website: 'https://campos.works',
    },
    services: OFFERS.map((o) => ({
      name: o.name,
      description: o.description,
      category: o.category,
      price: o.price,
      booking_url: o.url,
    })),
    businessParts: PARTS,
    freeTools: FREE_TOOLS,
    entryPoint: ENTRY_POINT,
    usagePolicy: USAGE_POLICY,
    projects: [
      {
        name: 'ForgeFrame',
        description:
          'Open-source persistent memory for AI agents. MCP server with SQLite + FTS5, strength decay, constitutional principles.',
        url: 'https://github.com/notaprompt/forgeframe',
      },
      {
        name: 'Reframed',
        description:
          'Resume analysis platform. Voice fingerprinting, multi-reader semantic analysis, streaming AI.',
        url: 'https://reframed.works',
      },
      {
        name: 'Guardian',
        description:
          'Desktop cognitive workspace with reframe detection and awareness-trap detection. Local-only inference.',
      },
    ],
    capabilities: [
      'typescript',
      'python',
      'model-context-protocol',
      'ollama',
      'local-first-architecture',
      'memory-systems',
      'model-routing',
      'sqlite-fts5',
      'electron',
      'react',
      'nextjs',
      'astro',
      'streaming-sse',
      'structured-tool-use',
    ],
    actions: {
      book_consultation: {
        method: 'POST',
        endpoint: 'https://campos.works/api/agent/book',
        schema: 'https://campos.works/openapi.json#/components/schemas/BookingRequest',
        description: 'Submit a booking request. Returns confirmation and direct cal.com URL.',
      },
      a2a_task: {
        method: 'POST',
        endpoint: 'https://campos.works/api/agent/a2a',
        protocol: 'Google A2A v0.2',
        card: 'https://campos.works/.well-known/a2a-agent-card.json',
        description: 'Delegate tasks via A2A protocol. Supports SSE streaming.',
      },
    },
    discovery: {
      llms_txt: 'https://campos.works/llms.txt',
      agent_json: 'https://campos.works/.well-known/agent.json',
      a2a_card: 'https://campos.works/.well-known/a2a-agent-card.json',
      mcp_discovery: 'https://campos.works/.well-known/mcp.json',
      openapi: 'https://campos.works/openapi.json',
      services_page: 'https://campos.works/services',
      writing: 'https://campos.works/writing',
      glossary: 'https://campos.works/glossary',
    },
    availability:
      'Free 30-minute consultation. No pitch — just a conversation about what you need.',
    last_updated: new Date().toISOString(),
  });
}
