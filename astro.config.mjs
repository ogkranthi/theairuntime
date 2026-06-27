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
        !/\/01\/?$/.test(page) &&
        !page.endsWith('.ics'),
    }),
    react(),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  build: { format: 'directory' },
  // Field Briefs moved from /field-lab/briefs to /briefs (the Field Lab home
  // path). Keep the old URL working for any shared links.
  redirects: {
    '/field-lab/briefs': '/briefs',
    '/host': '/partner',
  },
});
