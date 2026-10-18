import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PERSON, PROJECTS, CAPABILITIES, LINKS } from '../_lib/person.js';

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

// ── Skill handlers ───────────────────────────────────────────────────────────

function handleGetProfile(): Record<string, unknown> {
  return {
    person: PERSON,
    projects: PROJECTS,
    capabilities: CAPABILITIES,
    links: LINKS,
    full_profile: 'https://campos.works/api/agent/profile',
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
    } else {
      error = `Unknown skill: "${task.skill}". Available: get-profile`;
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

  return res.status(400).json({
    id: task.id,
    status: { state: 'failed', timestamp: now() },
    error: `Unknown skill: "${task.skill}". Available: get-profile`,
  });
}
