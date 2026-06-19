// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

// Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the
// Vite plugin, which is currently incompatible with Astro's rolldown-vite.
// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
});
