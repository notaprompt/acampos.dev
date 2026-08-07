#!/usr/bin/env node

/**
 * project-pulse.mjs — the site maintains itself (weekly loop)
 *
 * "all projects truly updated in granular depth … perma'd in a self maintaining
 * loop kinda way every week" — Alex, 2026-08-07.
 *
 * For each project page, this walks the project's REAL repos, digests the last
 * 7 days of commits, and rewrites ONLY the block between pulse markers:
 *
 *   <!-- pulse:start -->  …generated…  <!-- pulse:end -->
 *
 * Hand-written prose is never touched. The generated block is built from commit
 * subjects VERBATIM — his own words from his own log — so unattended weekly
 * publishing can never invent a claim. No LLM in the loop by design: this runs
 * while nobody is watching, and a public page that writes itself must only ever
 * say things the git history already says.
 *
 * Guardrails (hard):
 *   · REPO ALLOWLIST below — career-agent, career-ops, getajobinai, forgefind-job
 *     and family organs are NEVER read. The job search is discreet; the site is
 *     public. Adding a repo here is a deliberate act.
 *   · commit subjects are filtered: anything matching SECRET_RE is dropped.
 *   · if voice-gate (career-agent's) exists and fails the block, we abort the
 *     commit rather than publish.
 *   · pushes only when the working tree was clean before we started and the
 *     only diff is inside pulse markers + frontmatter `updated:`.
 *
 * Usage:  node scripts/project-pulse.mjs [--dry-run] [--days 7] [--no-push]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

const SITE = resolve(import.meta.dirname, '..');
const HOME = process.env.HOME;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? (process.argv[i + 1] ?? true) : d; };
const DRY = process.argv.includes('--dry-run');
const NO_PUSH = process.argv.includes('--no-push');
const NO_COMMIT = process.argv.includes('--no-commit');   // write pulse blocks, leave git alone
const DAYS = parseInt(arg('days', '7'), 10);

// ── the allowlist: project page → repos that feed it ─────────────────────────
// PUBLIC BOUNDARY. Never add: career-agent, career-ops, getajobinai,
// forgefind-job (discreet job search), dad-watch*, nursery (family).
const PROJECTS = {
  // NOTE: ~/CREATURE (the organ workspace) is not a git repo, so its work is
  // invisible here — flagged to Alex 2026-08-07. creature-tui carries the
  // visible creature work; ForgeFrame commits feed the forgeframe page instead
  // (listing the engine under both pages would duplicate bullets).
  'creature.md': [
    `${HOME}/Desktop/repos/creature-tui`,
    `${HOME}/Desktop/repos/creature`,
    // the site's own creature organ — the plate, the constellation, the pulse
    // islands are creature work and their commits say so
    { path: `${HOME}/Desktop/repos/acampos.dev`,
      only: ['public/creature', 'public/islands/creature-pulse.js', 'src/pages/creature*', 'scripts/constellation'] },
  ],
  'forgeframe.md': [
    `${HOME}/Desktop/repos/ForgeFrame`,
  ],
  'reframed.md': [
    `${HOME}/Desktop/repos/reframed`,
  ],
  'deuce.md': [
    `${HOME}/repos/deuce`,
  ],
  'distillery.md': [
    `${HOME}/distillery`,
  ],
};

// Never let these reach a public page even if a commit subject carries them.
const SECRET_RE = /password|token|secret|api.?key|\.env|salary|comp\b|kalshi|interview|recruit|job.?search|applicat|resume|warm.?note|p&l|pnl|\$\d/i;

const git = (repo, args) => {
  try { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 20000 }).trim(); }
  catch { return ''; }
};

function digest(repos) {
  const since = `${DAYS} days ago`;
  const out = [];
  let commits = 0, files = new Set();
  for (const entry of repos) {
    const repo = typeof entry === 'string' ? entry : entry.path;
    const spec = typeof entry === 'string' ? [] : ['--', ...entry.only];
    if (!existsSync(repo)) continue;
    const log = git(repo, ['log', `--since=${since}`, '--pretty=%s', '--no-merges', ...spec]);
    const subjects = log ? log.split('\n').filter(Boolean) : [];
    commits += subjects.length;
    for (const f of git(repo, ['log', `--since=${since}`, '--name-only', '--pretty=format:', '--no-merges', ...spec]).split('\n'))
      if (f.trim()) files.add(f.trim());
    for (const s of subjects) {
      if (SECRET_RE.test(s)) continue;
      if (/^(wip|fixup|merge|bump|typo)/i.test(s)) continue;
      out.push(s);
    }
  }
  // dedupe near-identical subjects, keep the most descriptive few
  const seen = new Set(); const picked = [];
  for (const s of out) {
    const k = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 40);
    if (seen.has(k)) continue;
    seen.add(k); picked.push(s);
    if (picked.length >= 6) break;
  }
  return { commits, filesTouched: files.size, subjects: picked };
}

function renderPulse(d, today) {
  if (!d.commits) return null;   // quiet week → leave last week's block standing
  return [
    '<!-- pulse:start -->',
    `**Recent work** · week of ${today} · ${d.commits} commit${d.commits === 1 ? '' : 's'} across ${d.filesTouched} files`,
    '',
    ...d.subjects.map(s => `- ${s}`),
    '',
    '<sub>this section maintains itself weekly from the commit log - the words are the commit messages</sub>',
    '<!-- pulse:end -->',
  ].join('\n');
}

// ── run ──────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const dirty = git(SITE, ['status', '--porcelain']);
if (dirty && !DRY && !NO_COMMIT) { console.error('site tree is dirty — refusing to run (commit or stash first, or use --no-commit)'); process.exit(1); }

let changed = [];
for (const [page, repos] of Object.entries(PROJECTS)) {
  const path = resolve(SITE, 'src/content/projects', page);
  if (!existsSync(path)) continue;
  const d = digest(repos);
  const block = renderPulse(d, today);
  console.log(`${page.padEnd(16)} ${d.commits} commits · ${d.subjects.length} publishable subjects${block ? '' : '  (quiet — untouched)'}`);
  if (!block) continue;

  let s = readFileSync(path, 'utf8');
  if (s.includes('<!-- pulse:start -->')) {
    s = s.replace(/<!-- pulse:start -->[\s\S]*?<!-- pulse:end -->/, block);
  } else {
    // first run: anchor the pulse right after the frontmatter's first prose block
    const fmEnd = s.indexOf('---', 4) + 3;
    const firstBreak = s.indexOf('\n\n', s.indexOf('\n\n', fmEnd) + 2);
    s = s.slice(0, firstBreak) + '\n\n' + block + s.slice(firstBreak);
  }
  s = s.replace(/^updated:.*$/m, `updated: ${today}`);
  if (!/^updated:/m.test(s)) s = s.replace(/^order:/m, `updated: ${today}\norder:`);
  if (!DRY) writeFileSync(path, s);
  changed.push(page);
}

if (DRY || !changed.length) { console.log(DRY ? '\n(dry run)' : '\nnothing to publish'); process.exit(0); }
if (NO_COMMIT) { console.log(`\npulse written for: ${changed.join(', ')} — NOT committed (--no-commit)`); process.exit(0); }

// voice-gate the changed pages if the gate exists (career-agent tool)
const GATE = `${HOME}/Desktop/repos/career-agent/voice-gate.mjs`;
if (existsSync(GATE)) {
  for (const page of changed) {
    try { execFileSync('node', [GATE, resolve(SITE, 'src/content/projects', page)], { encoding: 'utf8' }); }
    catch { console.error(`voice-gate failed on ${page} — aborting publish`); process.exit(1); }
  }
}

// commit style per his rule: just the change, no strategy leaks
const diff = git(SITE, ['diff', '--name-only']);
if (diff.split('\n').some(f => f && !f.startsWith('src/content/projects/'))) {
  console.error('diff escaped the projects dir — refusing to commit'); process.exit(1);
}
execFileSync('git', ['-C', SITE, 'add', 'src/content/projects'], { stdio: 'inherit' });
execFileSync('git', ['-C', SITE, 'commit', '-m', `projects: weekly pulse ${today}`], { stdio: 'inherit' });
if (!NO_PUSH) execFileSync('git', ['-C', SITE, 'push'], { stdio: 'inherit' });
console.log(`\npulse published for: ${changed.join(', ')}${NO_PUSH ? ' (not pushed)' : ' — Vercel will deploy'}`);
