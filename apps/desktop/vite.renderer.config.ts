import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  // Forge's base renderer config sets `preserveSymlinks: true`, which breaks
  // resolution of pnpm-symlinked transitive deps (e.g. `scheduler` from
  // react-dom) and externalizes them. Override it so they bundle correctly.
  resolve: {
    preserveSymlinks: false,
  },
});
