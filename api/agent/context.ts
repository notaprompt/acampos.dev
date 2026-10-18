import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PERSON, PROJECTS, CAPABILITIES, LINKS, DISCOVERY } from '../_lib/person.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  return res.json({
    person: PERSON,
    projects: PROJECTS,
    capabilities: CAPABILITIES,
    contact: { email: PERSON.email, website: PERSON.website, ...LINKS },
    discovery: DISCOVERY,
  });
}
