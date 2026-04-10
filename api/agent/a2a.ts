import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── A2A Protocol v0.2 types ──────────────────────────────────────────────────

type TaskState = 'submitted' | 'working' | 'completed' | 'failed';

interface TaskStatus {
  state: TaskState;
  timestamp: string;
  message?: string;
}

interface MessagePart {
  type: 'text' | 'data';
  text?: string;
  data?: Record<string, unknown>;
}

interface TaskMessage {
  role: 'user' | 'agent';
  parts: MessagePart[];
}

interface A2ATask {
  id: string;
  skill: string;
  message: TaskMessage;
  sessionId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

function sseEvent(id: string, status: TaskStatus, result?: TaskMessage): string {
  const payload: Record<string, unknown> = { id, status };
  if (result) payload.result = result;
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function extractInput(task: A2ATask): Record<string, unknown> {
  const dataParts = task.message.parts.filter((p) => p.type === 'data');
  if (dataParts.length > 0) {
    return Object.assign({}, ...dataParts.map((p) => p.data ?? {}));
  }
  const textParts = task.message.parts.filter((p) => p.type === 'text');
  if (textParts.length > 0) {
    try {
      return JSON.parse(textParts[0].text ?? '{}');
    } catch {
      return { message: textParts.map((p) => p.text).join(' ') };
    }
  }
  return {};
}

// ── Skill handlers ───────────────────────────────────────────────────────────

function handleGetProfile(): Record<string, unknown> {
  return {
    person: {
      name: 'Alexander Campos',
      title: 'Independent Researcher & Engineer',
      description:
        'Builds local-first cognitive infrastructure. Memory systems, model routing, cognitive architecture.',
      email: 'alex@campos.works',
      website: 'https://campos.works',
    },
    services: [
      { name: 'Full Online Presence Build', category: 'web-development' },
      { name: 'Agentic SEO & AI Discoverability', category: 'seo' },
      { name: 'AI Cost Optimization', category: 'ai-infrastructure' },
      { name: 'Custom AI Automation', category: 'automation' },
      { name: 'Claude Code & MCP Setup', category: 'ai-infrastructure' },
    ],
    capabilities: [
      'typescript', 'python', 'model-context-protocol', 'ollama',
      'local-first-architecture', 'memory-systems', 'model-routing',
    ],
    availability: 'Free 30-minute consultation. No pitch — just a conversation about what you need.',
    booking_url: 'https://cal.com/alexander-campos-yrnz8m/30min',
    full_profile: 'https://campos.works/api/agent/profile',
  };
}

function handleBookConsultation(
  input: Record<string, unknown>
): { status: string; message: string; booking_url: string } | { error: string } {
  const { name, email } = input;
  if (!name || !email) {
    return { error: 'name and email are required' };
  }
  const nameStr = String(name).slice(0, 200);
  const emailStr = String(email).slice(0, 200);
  if (!emailStr.includes('@')) {
    return { error: 'email appears invalid' };
  }
  // v1: return confirmation + booking URL (no DB write — scheduling happens on cal.com)
  return {
    status: 'received',
    message: `Got it, ${nameStr}. Use the link below to pick a time that works for you.`,
    booking_url: 'https://cal.com/alexander-campos-yrnz8m/30min',
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const task = req.body as A2ATask;
  if (!task?.id || !task?.skill || !task?.message) {
    return res.status(400).json({
      error: 'Invalid A2A task: id, skill, and message are required',
    });
  }

  const wantsSSE = (req.headers['accept'] ?? '').includes('text/event-stream');

  // ── SSE path ────────────────────────────────────────────────────────────────
  if (wantsSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(sseEvent(task.id, { state: 'submitted', timestamp: now() }));
    res.write(sseEvent(task.id, { state: 'working', timestamp: now() }));

    let resultData: Record<string, unknown>;
    let error: string | undefined;

    if (task.skill === 'get-profile') {
      resultData = handleGetProfile();
    } else if (task.skill === 'book-consultation') {
      const out = handleBookConsultation(extractInput(task));
      if ('error' in out) {
        error = out.error;
      } else {
        resultData = out as Record<string, unknown>;
      }
    } else {
      error = `Unknown skill: "${task.skill}". Available: get-profile, book-consultation`;
    }

    if (error) {
      res.write(
        sseEvent(task.id, { state: 'failed', timestamp: now(), message: error })
      );
    } else {
      const result: TaskMessage = {
        role: 'agent',
        parts: [{ type: 'data', data: resultData! }],
      };
      res.write(sseEvent(task.id, { state: 'completed', timestamp: now() }, result));
    }

    return res.end();
  }

  // ── JSON path ───────────────────────────────────────────────────────────────
  if (task.skill === 'get-profile') {
    const result: TaskMessage = {
      role: 'agent',
      parts: [{ type: 'data', data: handleGetProfile() }],
    };
    return res.json({
      id: task.id,
      status: { state: 'completed', timestamp: now() },
      result,
    });
  }

  if (task.skill === 'book-consultation') {
    const out = handleBookConsultation(extractInput(task));
    if ('error' in out) {
      return res.status(400).json({
        id: task.id,
        status: { state: 'failed', timestamp: now(), message: out.error },
      });
    }
    const result: TaskMessage = {
      role: 'agent',
      parts: [{ type: 'data', data: out as Record<string, unknown> }],
    };
    return res.json({
      id: task.id,
      status: { state: 'completed', timestamp: now() },
      result,
    });
  }

  return res.status(400).json({
    id: task.id,
    status: { state: 'failed', timestamp: now() },
    error: `Unknown skill: "${task.skill}". Available: get-profile, book-consultation`,
  });
}
