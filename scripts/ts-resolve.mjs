// ts-resolve.mjs — module resolver hook for running the api/ TypeScript
// directly under Node's native type stripping.
//
// The api/ sources import each other with `.js` extensions, which is what
// Vercel's TypeScript build emits and expects. Node's --experimental-strip-types
// resolves those specifiers literally, so `./ssrf.js` fails to find `ssrf.ts`.
//
// This maps a `.js` specifier back to its `.ts` source when the `.ts` exists.
// Build output is unaffected — this only applies to local script runs.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    try {
      const asTs = new URL(specifier.replace(/\.js$/, '.ts'), context.parentURL);
      if (existsSync(fileURLToPath(asTs))) {
        return next(specifier.replace(/\.js$/, '.ts'), context);
      }
    } catch {
      /* fall through to default resolution */
    }
  }
  return next(specifier, context);
}
