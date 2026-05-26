import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://dreamhelpers2025.github.io',
  base: '/stormforge/',
  integrations: [tailwind(), react()],
  vite: {
    optimizeDeps: {
      exclude: ['@tiptap/pm'],
    },
  },
});
