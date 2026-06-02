import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  // Substack Custom Domain owns theairuntime.com (publication, /p/*, /feed, /archive).
  // The events/community/resources platform lives on this subdomain.
  site: 'https://events.theairuntime.com',
  integrations: [
    mdx(),
    sitemap({
      // Keep noindex / gated routes out of the sitemap so crawlers spend
      // budget on indexable pages and never surface the gated channel.
      filter: (page) =>
        !page.includes('/subscriber-only') && !page.includes('/404'),
    }),
    react(),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { format: 'directory' },
  redirects: {
    '/': '/boston',
  },
});
