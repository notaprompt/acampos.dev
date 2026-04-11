import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { CrawlResult, ScoreCard, SWOT, AuditNarrative } from '../../src/lib/audit-types';

const client = new Anthropic();

const SYSTEM = `You are a sharp, opinionated web strategist analyzing a business website. You've seen thousands of sites and you know exactly what works and what doesn't. Your analysis is honest, specific, and actionable - never generic.

You will receive crawl data from a website. Produce:

1. SCORE CARDS - grade each category A-F with a 0-100 score and 2-4 specific findings:
   - SEO (meta tags, content in HTML, sitemap, robots.txt, structured data, indexability)
   - Content (is there real content in the HTML or is it JS-only? headings structure, image alt text)
   - Performance (response time, HTTPS, content delivery)
   - Mobile (viewport meta, responsive signals)
   - Agent Readiness (agent.json, llms.txt, structured data for AI discovery)

2. SWOT - specific to THIS site, not generic:
   - Strengths: what they're doing well (be specific - name the actual thing)
   - Weaknesses: what's broken or missing (be specific - "no sitemap" not "SEO needs work")
   - Opportunities: what would have the biggest impact if fixed
   - Threats: competitive or technical risks they may not see

3. NARRATIVE - write in a direct, warm tone (not corporate, not salesy):
   - headline: one punchy sentence that captures the biggest finding
   - whatsWorking: 2-3 sentences about genuine strengths
   - whatsBroken: 2-3 sentences about the most impactful problems
   - biggestOpportunity: 1 sentence - the single change that would move the needle most

Be honest. If the site is good, say so. If it's broken, say why. Never pad with generic advice.`;

const TOOL: Anthropic.Tool = {
  name: "submit_audit",
  description: "Submit the complete site audit with scores, SWOT, and narrative",
  input_schema: {
    type: "object" as const,
    required: ["scores", "swot", "narrative"],
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          required: ["category", "grade", "score", "findings"],
          properties: {
            category: { type: "string" },
            grade: { type: "string" },
            score: { type: "number" },
            findings: { type: "array", items: { type: "string" } },
          },
        },
      },
      swot: {
        type: "object",
        required: ["strengths", "weaknesses", "opportunities", "threats"],
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          opportunities: { type: "array", items: { type: "string" } },
          threats: { type: "array", items: { type: "string" } },
        },
      },
      narrative: {
        type: "object",
        required: ["headline", "whatsWorking", "whatsBroken", "biggestOpportunity"],
        properties: {
          headline: { type: "string" },
          whatsWorking: { type: "string" },
          whatsBroken: { type: "string" },
          biggestOpportunity: { type: "string" },
        },
      },
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const crawl = req.body as CrawlResult;
  if (!crawl?.domain) return res.status(400).json({ error: 'Missing crawl data' });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_audit" },
      messages: [{
        role: "user",
        content: `Analyze this website crawl data:\n\n${JSON.stringify(crawl, null, 2)}`,
      }],
    });

    const toolUse = response.content.find(b => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return res.status(500).json({ error: "No structured output from analysis" });
    }

    const result = toolUse.input as { scores: ScoreCard[]; swot: SWOT; narrative: AuditNarrative };
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Scoring failed' });
  }
}
