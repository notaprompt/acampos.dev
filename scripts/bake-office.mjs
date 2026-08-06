// bake-office.mjs - refresh src/data/office.json from the machine, read-only.
// Run before build when the numbers should catch up: node scripts/bake-office.mjs
// Counts only, never content - the membrane stays closed by construction.
import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const out = { asof: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }) };

try {
  out.memories = Number(sh(`sqlite3 ${homedir()}/.forgeframe/memory.db "SELECT COUNT(*) FROM memories"`));
} catch { out.memories = null; }
try {
  out.forecasts = Number(sh(`sqlite3 ${homedir()}/.deuce/divergence.db "SELECT COUNT(*) FROM sf_forecasts"`));
} catch { out.forecasts = null; }
try {
  out.services = readdirSync(join(homedir(), 'Library/LaunchAgents'))
    .filter((f) => /^com\.(creature|deuce|distillery|forgeframe)\..*\.plist$/.test(f)).length;
} catch { out.services = null; }

writeFileSync(new URL('../src/data/office.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n');
console.log('office.json:', out);
