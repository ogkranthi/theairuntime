import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './src/plugins/remark-callouts.mjs';
import { rehypeWrapTables } from './src/plugins/rehype-wrap-tables.mjs';

// learn.theairuntime.com is the home of AIR Course 001. It is a standalone
// static site on its own subdomain, separate from the events platform on
// events.theairuntime.com and the Lab on lab.theairuntime.com.
// Dark only, no client framework, no analytics beyond Cloudflare Web Analytics.
export default defineConfig({
  site: 'https://learn.theairuntime.com',
  integrations: [
    mdx(),
    sitemap({
      // OG images are generated as routes; keep the binaries out of the sitemap.
      filter: (page) => !page.includes('/og/'),
    }),
  ],
  markdown: {
    // `:::failure-lab`, `:::deliverable`, `:::takeaway`, `:::note` compile to
    // semantic <aside> callouts. See src/plugins/remark-callouts.mjs.
    remarkPlugins: [remarkDirective, remarkCallouts],
    rehypePlugins: [rehypeWrapTables],
    shikiConfig: { theme: 'github-light-default', wrap: false },
  },
  build: { format: 'directory' },
  // v2 restructure (Aug 2026): the course grew from 13 to 16 modules and
  // several slugs changed. Old URLs 301 via static redirect pages.
  redirects: {
    '/course/04-idempotency': '/course/04-side-effects',
    '/course/05-failure-handling': '/course/06-failure-handling',
    '/course/06-human-in-the-loop': '/course/07-human-control',
    '/course/07-context-engineering': '/course/08-context',
    '/course/08-observability': '/course/09-observability',
    '/course/09-evaluation': '/course/11-evaluation',
    '/course/10-industry-architectures': '/course/13-industry-architectures',
    '/course/11-deploy': '/course/14-deploy',
    '/course/12-production-gauntlet': '/course/15-production-gauntlet',
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
