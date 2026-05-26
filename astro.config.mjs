import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://dreamhelpers2025.github.io',
  base: '/stormforge/',
  integrations: [tailwind()],
});
