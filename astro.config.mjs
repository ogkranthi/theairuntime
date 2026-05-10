import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://theairuntime.com',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => page !== 'https://theairuntime.com/',
    }),
    react(),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { format: 'directory' },
  redirects: {
    '/': 'https://theairuntime.substack.com',
  },
});
