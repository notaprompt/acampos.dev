// db.ts — the pipeline's memory.
//
// Two jobs: hold a completed analysis server-side until it is paid for with an
// email, and keep a warm list that is actually exportable.
//
// The gate depends on this file. A snapshot's findings live here and are NOT
// returned by /run — only /unlock reads them out. That is what makes the gate
// real rather than a div someone can delete.

import { neon } from '@neondatabase/serverless';
import { createHmac, randomBytes } from 'crypto';

const url = process.env.DATABASE_URL || '';
export const sql = neon(url);

export function dbConfigured(): boolean {
  return Boolean(url);
}

/**
 * Idempotent schema. Called on first write rather than kept in a migration tool,
 * because this is one small service and a missing table at 2am is worse than a
 * few wasted milliseconds.
 */
export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS snapshots (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      domain        text,
      input_kind    text NOT NULL DEFAULT 'url',
      raw_input     text,
      niche_id      text,
      niche_label   text,
      niche_conf    real,
      zip           text,
      crawl         jsonb,
      enrichment    jsonb,
      report        jsonb NOT NULL,
      teaser        jsonb NOT NULL,
      model         text,
      cost_cents    real DEFAULT 0,
      unlocked      boolean NOT NULL DEFAULT false,
      unlocked_at   timestamptz,
      lead_id       uuid,
      share_token   text UNIQUE,
      visibility    text NOT NULL DEFAULT 'private',
      source        jsonb,
      ip_hash       text,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name           text NOT NULL,
      email          text NOT NULL,
      dedup_key      text NOT NULL,
      email_domain   text,
      mx_verified    boolean NOT NULL DEFAULT false,
      business_name  text,
      website        text,
      niche_id       text,
      niche_label    text,
      zip            text,
      snapshot_count int NOT NULL DEFAULT 1,
      first_snapshot uuid,
      last_snapshot  uuid,
      /* What the analysis thought was wrong — the reason to call them. */
      top_gaps       jsonb,
      health_score   int,
      est_leak_low   int,
      est_leak_high  int,
      intent         text,
      notes          text,
      status         text NOT NULL DEFAULT 'new',
      source         jsonb,
      ip_hash        text,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS leads_dedup_key_idx ON leads (dedup_key)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status)`;
  await sql`CREATE INDEX IF NOT EXISTS snapshots_created_idx ON snapshots (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS snapshots_domain_idx ON snapshots (domain)`;

  /* Every meaningful step, so the funnel is measurable rather than felt. */
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id          bigserial PRIMARY KEY,
      kind        text NOT NULL,
      snapshot_id uuid,
      lead_id     uuid,
      meta        jsonb,
      ip_hash     text,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS events_kind_idx ON events (kind, created_at DESC)`;
}

/** Fire-and-forget. An analytics write must never break a visitor's flow. */
export async function track(
  kind: string,
  opts: { snapshotId?: string | null; leadId?: string | null; meta?: unknown; ipHash?: string | null } = {}
): Promise<void> {
  if (!dbConfigured()) return;
  try {
    await sql`
      INSERT INTO events (kind, snapshot_id, lead_id, meta, ip_hash)
      VALUES (
        ${kind},
        ${opts.snapshotId ?? null},
        ${opts.leadId ?? null},
        ${opts.meta ? JSON.stringify(opts.meta) : null},
        ${opts.ipHash ?? null}
      )
    `;
  } catch {
    /* Intentionally swallowed. */
  }
}

/**
 * Keyed pseudonym so the events table can rate-limit and dedupe without storing
 * IP addresses. HMAC-SHA256 rather than a fast hash: the IPv4 space is only 2^32,
 * so an unkeyed digest can be exhaustively reversed in seconds and would not
 * actually protect anything.
 */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || 'campos-works-default-salt';
  return 'ip_' + createHmac('sha256', salt).update(ip).digest('base64url').slice(0, 22);
}

export function clientIp(headers: Record<string, string | string[] | undefined>): string | undefined {
  const fwd = headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  return raw?.split(',')[0]?.trim();
}

/** Rough per-IP throttle. Inference costs money and the endpoint is public. */
export async function overRateLimit(ipHash: string | null, kind: string, max: number, windowMin: number): Promise<boolean> {
  if (!dbConfigured() || !ipHash) return false;
  try {
    const rows = await sql`
      SELECT count(*)::int AS n FROM events
      WHERE kind = ${kind}
        AND ip_hash = ${ipHash}
        AND created_at > now() - (${windowMin} * interval '1 minute')
    `;
    return (rows[0]?.n ?? 0) >= max;
  } catch {
    return false;
  }
}

/**
 * Unguessable share token. This is a capability URL — anyone holding it can read
 * a business's report — so it must come from a CSPRNG. Math.random() is seeded
 * predictably and Date.now() is public, which together would let one token be
 * derived from another.
 *
 * 24 bytes = 192 bits, base64url-encoded.
 */
export function shareToken(): string {
  return randomBytes(24).toString('base64url');
}
