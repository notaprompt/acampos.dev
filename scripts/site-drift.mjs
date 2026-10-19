#!/usr/bin/env node
// site-drift.mjs - weekly check of what campos.works says against what is true.
//
// Reads the site's content, the machine (read-only: git history, file times,
// row counts), GitHub's public API, and the live site. Writes a report and a
// one-line notice. Never edits the site: fixing what it finds is your call.
//
//   node scripts/site-drift.mjs                # full run
//   node scripts/site-drift.mjs --no-network   # skip live site and GitHub
//   node scripts/site-drift.mjs --quiet        # report only, no notice
//
// Report:  ~/.creature/site-drift/YYYY-MM-DD.md
// Notice:  ~/.creature/notify/<ts>-site-drift.md
// Schedule: launchd com.creature.site-drift, Sundays 09:30 (before the pulse).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const HOME = homedir();
const SITE = 'https://campos.works';
const GH_USER = 'notaprompt';
const args = new Set(process.argv.slice(2));
const NETWORK = !args.has('--no-network');
const DAY = 86_400_000;
const now = Date.now();

// Where each project lives on this machine. Activity = newest of last commit and data change.
const SOURCES = {
  forgeframe: { path: '~/Desktop/repos/ForgeFrame', data: ['~/.forgeframe/memory.db'] },
  creature: { path: '~/CREATURE', data: ['~/.creature/chronicle/journal.jsonl', '~/.forgeframe/memory.db'] },
  deuce: { path: '~/repos/deuce', data: ['~/.deuce/divergence.db', '~/.deuce/crossvenue.db'] },
  distillery: { path: '~/distillery', data: ['~/distillery/distillery.db'] },
  reframed: { path: '~/Desktop/repos/reframed' },
  guardian: { path: '~/projects/guardian' },
  cipher: { path: '~/Desktop/repos/cipher' },
  strudelvision: { path: '~/projects/strudelvision' },
};

// Numbers written in prose, checked against where they come from.
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20 };
const CLAIMS = [
  {
    what: 'CREATURE organ count',
    file: 'src/content/projects/creature.md',
    pattern: /\b(\w+) organs\b/i,
    actual: () => JSON.parse(read('src/data/creature.json')).sections.reduce((n, s) => n + s.organs.length, 0),
  },
  {
    what: 'Reframed API route count',
    file: 'src/content/projects/reframed.md',
    pattern: /\b(\d+) API routes\b/,
    actual: () => countFiles(expand('~/Desktop/repos/reframed/src/app/api'), (p) => p.endsWith('/route.ts') && !p.includes('__tests__')),
  },
];

// Must never appear on a live page (the resume is allowed to name the employer).
const GUARD = [
  { name: 'a price', re: /\$\d{1,3},\d{3}(?!,\d)/, skip: /\/(resume|writing)\// },
  { name: 'consulting or booking language', re: /\b(consulting|book a (call|time|consultation)|calendly|hire me|hiring me)\b/i },
  { name: 'the employer named', re: /Capital One/, skip: /\/resume\// },
  { name: 'a family relationship', re: /\bmy (uncle|aunt|sister|brother|cousin|wife|son|daughter)\b/i },
];

// ── helpers ─────────────────────────────────────────────────────────────────

const findings = [];
const add = (level, area, text) => findings.push({ level, area, text });
const expand = (p) => p.replace(/^~/, HOME);
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
// No shell: arguments go straight to the program.
const run = (bin, argv) => { try { return execFileSync(bin, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const git = (dir, ...argv) => run('git', ['-C', dir, ...argv]);
const sql = (db, query) => run('sqlite3', [`file:${db}?mode=ro`, query]);
const days = (ms) => Math.floor((now - ms) / DAY);
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

function countFiles(dir, keep) {
  if (!existsSync(dir)) return null;
  let n = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (keep(p)) n++;
    }
  };
  walk(dir);
  return n;
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  fm.asofs = [...m[1].matchAll(/asof:\s*"([A-Z][a-z]{2} \d{4})"/g)].map((x) => x[1]);
  return fm;
}

const monthAge = (label) => {
  const t = Date.parse(`1 ${label}`);
  return Number.isNaN(t) ? null : days(t);
};

async function get(url, { text = false, timeout = 15000, headers = {} } = {}) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'campos-site-drift', ...headers }, redirect: 'follow', signal: AbortSignal.timeout(timeout) });
    return { status: res.status, body: text ? await res.text() : null };
  } catch (e) {
    return { status: 0, error: e.name === 'TimeoutError' ? 'timeout' : e.message };
  }
}

// ── checks ──────────────────────────────────────────────────────────────────

const projectDir = join(ROOT, 'src/content/projects');
const projects = readdirSync(projectDir).filter((f) => /\.mdx?$/.test(f)).map((f) => {
  const text = readFileSync(join(projectDir, f), 'utf8');
  return { slug: f.replace(/\.mdx?$/, ''), text, fm: frontmatter(text) };
});

function checkProjects() {
  for (const p of projects) {
    const src = SOURCES[p.slug];
    if (!src) { add('notice', 'projects', `${p.slug}: no local source mapped in site-drift.mjs, so its activity is not checked`); continue; }
    const path = expand(src.path);
    if (!existsSync(path)) { add('notice', 'projects', `${p.slug}: ${src.path} is gone`); continue; }
    const commit = Date.parse(git(path, 'log', '-1', '--format=%cI')) || 0;
    const data = Math.max(0, ...(src.data || []).map(expand).filter(existsSync).map((f) => statSync(f).mtimeMs));
    const last = Math.max(commit, data);
    const status = p.fm.status;
    if (status === 'active' && last && days(last) > 60) {
      add('notice', 'projects', `${p.slug}: listed as "${status}", but no commits or data changes since ${iso(last)} (${days(last)} days)`);
    }
    if (['parked', 'concept', 'absorbed'].includes(status) && commit && days(commit) <= 14) {
      add('notice', 'projects', `${p.slug}: listed as "${status}", but committed to on ${iso(commit)}. Has it moved?`);
    }
    for (const size of [64, 96]) {
      if (!existsSync(join(ROOT, `public/images/thumbs/${p.slug}-${size}.png`))) {
        add('action', 'figures', `${p.slug}: no ${size}px figure. Run python3 scripts/dither-thumbs.py`);
      }
    }
    const stale = p.fm.asofs.filter((a) => (monthAge(a) ?? 0) > 60);
    if (stale.length) add('notice', 'numbers', `${p.slug}: ${stale.length} metric(s) dated ${[...new Set(stale)].join(', ')}`);
  }
}

function checkClaims() {
  for (const c of CLAIMS) {
    const m = read(c.file).match(c.pattern);
    if (!m) continue;
    const said = /^\d+$/.test(m[1]) ? Number(m[1]) : WORDS[m[1].toLowerCase()];
    const actual = c.actual();
    if (said == null || actual == null) continue;
    if (said !== actual) add('action', 'claims', `${c.what}: the site says "${m[0]}", the source says ${actual} (${c.file})`);
  }
}

function checkDeskNumbers() {
  const office = JSON.parse(read('src/data/office.json'));
  const live = {
    memories: Number(sql(`${HOME}/.forgeframe/memory.db`, 'SELECT COUNT(*) FROM memories')) || null,
    forecasts: Number(sql(`${HOME}/.deuce/divergence.db`, 'SELECT COUNT(*) FROM sf_forecasts')) || null,
  };
  const drift = Object.entries(live)
    .filter(([k, v]) => v && office[k] && Math.abs(v - office[k]) / office[k] > 0.03)
    .map(([k, v]) => `${k} ${office[k].toLocaleString('en-US')} → ${v.toLocaleString('en-US')}`);
  const age = monthAge(office.asof);
  if (drift.length) add('notice', 'numbers', `desk numbers have moved (${drift.join(', ')}). Run node scripts/bake-office.mjs`);
  else if (age != null && age > 45) add('info', 'numbers', `desk numbers last baked ${office.asof}`);
}

function checkFigures() {
  const marks = JSON.parse(read('public/images/thumbs/marks.json'));
  const was = marks.inputs;
  if (!was) { add('notice', 'figures', 'figures predate input tracking. Run python3 scripts/dither-thumbs.py once'); return; }
  const counts = JSON.parse(read('src/data/creature.json')).sections.map((s) => s.organs.length);
  const rows = Number(sql(`${HOME}/distillery/distillery.db`, 'select count(*) from distillations where resonance is not null and novelty is not null')) || 0;
  const changed = [];
  if (JSON.stringify(was.projects) !== JSON.stringify(projects.map((p) => p.slug).sort())) changed.push('the project list');
  if (JSON.stringify(was.creature_counts) !== JSON.stringify(counts)) changed.push("CREATURE's organ counts");
  if (rows && Math.abs(rows - was.distillery_rows) >= 5) changed.push(`Distillery scores (${was.distillery_rows} → ${rows})`);
  if (changed.length) add('notice', 'figures', `figures were drawn before ${changed.join(', ')} changed. Run python3 scripts/dither-thumbs.py`);
}

function checkResume() {
  const pdf = expand('~/Desktop/AlexanderCampos_Resume.pdf');
  if (!existsSync(pdf)) return;
  const page = Date.parse(git(ROOT, 'log', '-1', '--format=%cI', '--', 'src/pages/resume.astro')) || 0;
  const pdfTime = statSync(pdf).mtimeMs;
  if (page && pdfTime - page > DAY) add('notice', 'resume', `the PDF resume changed ${iso(pdfTime)}, after the site's resume page (${iso(page)}). Check they still match`);
}

function checkWriting() {
  const dir = join(ROOT, 'src/content/essays');
  const dates = readdirSync(dir).map((f) => frontmatter(readFileSync(join(dir, f), 'utf8')))
    .filter((fm) => fm.status === 'published' && fm.date).map((fm) => Date.parse(fm.date)).filter(Boolean);
  if (dates.length && days(Math.max(...dates)) > 60) add('info', 'writing', `last essay published ${iso(Math.max(...dates))} (${days(Math.max(...dates))} days ago)`);
}

async function checkLive() {
  const map = await get(`${SITE}/sitemap-0.xml`, { text: true });
  if (map.status !== 200) { add('action', 'pages', `sitemap did not load (${map.status || map.error})`); return; }
  const urls = [...map.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const url of urls) {
    const page = await get(url, { text: true });
    const path = new URL(url).pathname;
    if (page.status !== 200) { add('action', 'pages', `${path} returns ${page.status || page.error}`); continue; }
    const text = page.body.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
    for (const g of GUARD) {
      if (g.skip && g.skip.test(path)) continue;
      const m = text.match(g.re);
      if (m) add('action', 'sanitize', `${path} shows ${g.name}: "…${text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30).replace(/\s+/g, ' ').trim()}…"`);
    }
  }
  const links = new Set();
  for (const p of projects) for (const k of ['repo', 'demo']) if (p.fm[k]?.startsWith('http')) links.add(p.fm[k]);
  for (const url of links) {
    // npmjs.com blocks automated visitors; ask the registry whether the package exists instead.
    const npm = url.match(/^https:\/\/www\.npmjs\.com\/package\/(.+)$/);
    const r = await get(npm ? `https://registry.npmjs.org/${npm[1].replace('/', '%2F')}` : url);
    if (r.status === 0 || r.status >= 400) add('action', 'links', `${url} returns ${r.status || r.error}`);
  }
}

async function checkGitHub() {
  const token = run('gh', ['auth', 'token']);
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const res = await get(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`, { text: true, headers });
  if (res.status !== 200) { add('info', 'github', `could not read GitHub (${res.status || res.error})`); return; }
  const repos = JSON.parse(res.body);
  const publicNames = new Set(repos.map((r) => r.name.toLowerCase()));
  const corpus = [
    ...projects.map((p) => p.text),
    read('public/llms.txt'),
    ...readdirSync(join(ROOT, 'src/pages')).filter((f) => f.endsWith('.astro')).map((f) => read(`src/pages/${f}`)),
  ].join('\n').toLowerCase();
  // repos the site links to that are not public
  for (const m of corpus.matchAll(new RegExp(`github\\.com/${GH_USER}/([\\w.-]+)`, 'g'))) {
    const name = m[1].replace(/\.git$/, '');
    if (!publicNames.has(name)) add('action', 'links', `the site links github.com/${GH_USER}/${name}, which is not a public repo`);
  }
  // public work that moved recently and is not on the site
  for (const r of repos) {
    if (r.fork || r.archived || days(Date.parse(r.pushed_at)) > 30) continue;
    const name = r.name.toLowerCase();
    if (name === 'acampos.dev' || corpus.includes(name) || corpus.includes(name.replace(/[-_.]/g, ' '))) continue;
    add('info', 'unlisted', `${r.name}: public, pushed ${r.pushed_at.slice(0, 10)}, not mentioned on the site`);
  }
}

// ── run ─────────────────────────────────────────────────────────────────────

checkProjects();
checkClaims();
checkDeskNumbers();
checkFigures();
checkResume();
checkWriting();
if (NETWORK) {
  await checkLive();
  await checkGitHub();
}

const order = { action: 0, notice: 1, info: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.area.localeCompare(b.area));
const count = (l) => findings.filter((f) => f.level === l).length;
const date = new Date().toISOString().slice(0, 10);
const titles = { action: 'Fix', notice: 'Look at', info: 'For the record' };

let md = `# campos.works drift · ${date}\n\n`;
md += findings.length
  ? `${count('action')} to fix · ${count('notice')} to look at · ${count('info')} for the record${NETWORK ? '' : ' · network checks skipped'}\n`
  : 'Nothing drifted.\n';
for (const level of ['action', 'notice', 'info']) {
  const group = findings.filter((f) => f.level === level);
  if (!group.length) continue;
  md += `\n## ${titles[level]}\n\n` + group.map((f) => `- **${f.area}** · ${f.text}`).join('\n') + '\n';
}

const reportDir = join(HOME, '.creature/site-drift');
mkdirSync(reportDir, { recursive: true });
const reportPath = join(reportDir, `${date}.md`);
writeFileSync(reportPath, md);
console.log(md);

if (!args.has('--quiet')) {
  const notifyDir = join(HOME, '.creature/notify');
  mkdirSync(notifyDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const line = findings.length
    ? `site drift: ${count('action')} to fix, ${count('notice')} to look at. ${reportPath.replace(HOME, '~')}`
    : 'site drift: clean.';
  writeFileSync(join(notifyDir, `${ts}-site-drift.md`), line + '\n');
}
