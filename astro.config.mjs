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
      // Keep noindex / gated routes and non-HTML feeds out of the sitemap so
      // crawlers spend budget on indexable pages and never surface the gated
      // channel, the search page, or the .ics calendar files. Field Lab paths
      // are canonical on lab.theairuntime.com and 301 from events, so they are
      // excluded here and listed in /lab-sitemap.xml instead.
      filter: (page) =>
        !page.includes('/subscriber-only') &&
        !page.includes('/404') &&
        !page.includes('/search') &&
        !page.includes('/field-lab') &&
        !page.includes('/briefs') &&
        !page.includes('/investigations') &&
        !page.includes('/reports') &&
        !page.includes('/submit') &&
        !page.includes('/lab-home') &&
        !/\/\d{2}\/?$/.test(page) &&
        !page.endsWith('.ics'),
    }),
    react(),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { format: 'directory' },
  // Events-site redirect. Legacy lab paths (/field-lab, /briefs, /investigations)
  // are redirected in the Worker instead, since their open-ended sub-paths cannot
  // be enumerated as static redirect files.
  redirects: {
    '/host': '/partner',
  },
});
