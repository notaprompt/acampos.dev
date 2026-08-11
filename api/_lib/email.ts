// email.ts — the gate.
//
// The Snapshot costs real inference money and produces something an owner would
// pay for. An email is a fair trade. But a gate that rejects real buyers is worse
// than no gate at all, so the rules below are tuned to catch *fakes*, not to catch
// people who use an unusual address.
//
// Deliberately NOT blocked: role addresses (info@, office@, service@, sales@).
// For a landscaping company or an HVAC shop that IS the owner's inbox. Blocking
// them would reject exactly the buyers we want.

import { promises as dns } from 'dns';

/** Burner and disposable providers. These are never a real business owner. */
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'throwawaymail.com', 'trashmail.com',
  'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com',
  'mailnesia.com', 'mintemail.com', 'spamgourmet.com', 'mytemp.email', 'moakt.com',
  'emailondeck.com', 'tempr.email', 'discard.email', 'burnermail.io', 'mailsac.com',
  'inboxkitten.com', 'harakirimail.com', 'grr.la', 'spam4.me', 'tempmailo.com',
  'minuteinbox.com', 'mohmal.com', 'nowmymail.com', 'tmpmail.org', 'linshiyouxiang.net',
]);

/** Obvious placeholder locals. Someone typing these is not giving a real address. */
const JUNK_LOCAL = new Set([
  'test', 'testing', 'asdf', 'asdfasdf', 'qwerty', 'aaa', 'abc', 'abcd', 'a', 'x',
  'xxx', 'none', 'nobody', 'noone', 'fake', 'nope', 'no', 'na', 'foo', 'bar', 'baz',
  'example', 'email', 'user', 'anonymous', 'anon', 'spam', 'junk', 'sdfsdf', '123',
]);

/** Domains that are placeholders by RFC or by convention. */
const JUNK_DOMAIN = new Set([
  'test.com', 'test.net', 'test.org', 'example.com', 'example.net', 'example.org',
  'domain.com', 'email.com', 'yourdomain.com', 'company.com', 'mysite.com',
  'localhost', 'test.test', 'a.com', 'abc.com', 'asdf.com', 'fake.com', 'none.com',
]);

/**
 * Practical email syntax. Deliberately stricter than RFC 5322 (which permits
 * things no real business address uses) and looser than a marketing-tool regex
 * (which rejects valid ones). Requires a dotted TLD of 2+ letters.
 */
const SHAPE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

export interface EmailVerdict {
  ok: boolean;
  /** Lowercased, trimmed. What we store and show back. */
  email: string;
  /** Provider-normalized, for dedup only. Never displayed. */
  dedupKey: string;
  domain: string;
  /** Present when ok === false. Written for the visitor, not for a log. */
  reason?: string;
  /** True when the domain resolved a mail exchanger. */
  mxVerified: boolean;
}

/**
 * Collapse provider-specific aliasing so one person can't farm the gate with
 * plus-tags. Stored separately from the address we actually display.
 */
function normalizeForDedup(local: string, domain: string): string {
  let l = local.toLowerCase();
  const d = domain.toLowerCase();
  // Plus-tagging is near-universal.
  l = l.split('+')[0];
  // Gmail ignores dots.
  if (d === 'gmail.com' || d === 'googlemail.com') l = l.replace(/\./g, '');
  return `${l}@${d === 'googlemail.com' ? 'gmail.com' : d}`;
}

/**
 * Does the domain actually accept mail? This is the real anti-spoofing check —
 * syntax and blocklists catch lazy fakes, but only DNS catches an invented domain
 * that happens to look plausible.
 *
 * Fails OPEN: a DNS hiccup must never cost a real lead. We record whether the
 * check succeeded so the warm list can be sorted by confidence later.
 */
async function hasMailExchanger(domain: string): Promise<boolean | null> {
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('dns timeout')), 3500)),
    ]);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch {
    // Fall through — some domains serve mail via A record only.
  }
  try {
    const a = await Promise.race([
      dns.resolve4(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('dns timeout')), 2500)),
    ]);
    if (Array.isArray(a) && a.length > 0) return true;
  } catch {
    return null; // Genuinely could not determine. Do not punish the visitor.
  }
  return false;
}

export async function verifyEmail(raw: unknown): Promise<EmailVerdict> {
  const fail = (reason: string, email = ''): EmailVerdict => ({
    ok: false, email, dedupKey: '', domain: '', reason, mxVerified: false,
  });

  if (typeof raw !== 'string') return fail('Enter an email address.');
  const email = raw.trim().toLowerCase();

  if (!email) return fail('Enter an email address.');
  if (email.length > 254) return fail('That address is too long to be real.');
  if (!SHAPE.test(email)) return fail("That doesn't look like a working email address.");

  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length > 64) return fail('That address is too long to be real.', email);
  if (email.includes('..')) return fail("That doesn't look like a working email address.", email);

  if (DISPOSABLE.has(domain)) {
    return fail('Please use an address you actually check — this one is a burner.', email);
  }
  if (JUNK_DOMAIN.has(domain)) {
    return fail('That looks like a placeholder. Use the address you actually check.', email);
  }
  if (JUNK_LOCAL.has(local)) {
    return fail('That looks like a placeholder. Use the address you actually check.', email);
  }
  // Same string on both sides of the @ is a tell (asdf@asdf.com).
  if (domain.split('.')[0] === local && local.length <= 6) {
    return fail('That looks like a placeholder. Use the address you actually check.', email);
  }

  const mx = await hasMailExchanger(domain);
  if (mx === false) {
    return fail("That domain can't receive email. Check the spelling?", email);
  }

  return {
    ok: true,
    email,
    dedupKey: normalizeForDedup(local, domain),
    domain,
    mxVerified: mx === true,
  };
}

export interface NameVerdict {
  ok: boolean;
  name: string;
  reason?: string;
}

/** Light. A name field exists to personalize follow-up, not to be a checkpoint. */
export function verifyName(raw: unknown): NameVerdict {
  if (typeof raw !== 'string') return { ok: false, name: '', reason: 'Enter your name.' };
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return { ok: false, name, reason: 'Enter your name.' };
  if (name.length > 80) return { ok: false, name: name.slice(0, 80), reason: 'That name is too long.' };
  if (/^(test|asdf|qwerty|aaa+|xxx+|none|na|n\/a)$/i.test(name)) {
    return { ok: false, name, reason: 'Enter your real name — I read these myself.' };
  }
  if (/https?:\/\/|www\./i.test(name)) return { ok: false, name, reason: 'Enter your name.' };
  return { ok: true, name };
}
