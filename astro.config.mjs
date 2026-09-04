// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://campos.works',
  prefetch: true,
  integrations: [
    mdx(),
    // The admin pages already carry `noindex`, but they were still listed in
    // sitemap.xml — which tells a crawler to go look at the thing you just told
    // it to ignore, and puts "pipeline" and "playlist admin" in front of anyone
    // reading the sitemap by hand. Keep them out of the index entirely.
    sitemap({ filter: (page) => !/\/admin(\/|$)/.test(new URL(page).pathname) }),
  ],
});
