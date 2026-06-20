// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// `site` is required for absolute canonical/OG URLs and for sitemap generation.
// Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the
// Vite plugin, which is currently incompatible with Astro's rolldown-vite.
// https://astro.build/config
export default defineConfig({
  site: 'https://renderical.com',
  adapter: cloudflare(),
  integrations: [react(), sitemap()],
});
