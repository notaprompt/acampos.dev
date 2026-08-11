// Preload for `node --test`: registers the .js → .ts specifier mapping so the
// api/ sources (which import each other with the .js extensions Vercel's build
// emits) can be imported directly from tests.
import { register } from 'node:module';
register('./ts-resolve.mjs', import.meta.url);
