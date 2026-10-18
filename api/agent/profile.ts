import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PERSON, PROJECTS, CAPABILITIES, LINKS, DISCOVERY } from '../_lib/person.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (_req.method === 'OPTIONS') return res.status(200).end();

  return res.json({
    schema_version: '3.0',
    person: PERSON,
    projects: PROJECTS,
    capabilities: CAPABILITIES,
    links: LINKS,
    actions: {
      a2a_task: {
        method: 'POST',
        endpoint: 'https://campos.works/api/agent/a2a',
        protocol: 'Google A2A v0.2',
        card: DISCOVERY.a2a_card,
        description: 'Fetch this profile via A2A. Supports SSE streaming.',
      },
    },
    discovery: DISCOVERY,
    last_updated: new Date().toISOString(),
  });
}
