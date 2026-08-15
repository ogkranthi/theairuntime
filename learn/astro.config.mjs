import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './src/plugins/remark-callouts.mjs';
import { rehypeWrapTables } from './src/plugins/rehype-wrap-tables.mjs';
import { rehypeLessons } from './src/plugins/rehype-lessons.mjs';

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
    rehypePlugins: [rehypeWrapTables, rehypeLessons],
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
  build: { format: 'directory' },
  // v2 restructure (Aug 2026): the course grew from 13 to 16 modules and
  // several slugs changed. Old URLs 301 via static redirect pages.
  redirects: {
    // Generation 1 (launch) slugs, renamed in the v2 restructure.
    '/course/04-idempotency': '/courses/long-running-agents/04-side-effects',
    '/course/05-failure-handling': '/courses/long-running-agents/06-failure-handling',
    '/course/06-human-in-the-loop': '/courses/long-running-agents/07-human-control',
    '/course/07-context-engineering': '/courses/long-running-agents/08-context',
    '/course/08-observability': '/courses/long-running-agents/09-observability',
    '/course/09-evaluation': '/courses/long-running-agents/11-evaluation',
    '/course/10-industry-architectures': '/courses/long-running-agents/13-industry-architectures',
    '/course/11-deploy': '/courses/long-running-agents/14-deploy',
    '/course/12-production-gauntlet': '/courses/long-running-agents/15-production-gauntlet',
    // Generation 2 prefixes.
    '/course/[slug]': '/courses/long-running-agents/[slug]',
    '/course-001': '/courses/long-running-agents',
    '/course-001/[slug]': '/courses/long-running-agents/[slug]',
    '/labs': '/courses/long-running-agents/labs',
    '/stack': '/courses/long-running-agents/stack',
    '/sources': '/courses/long-running-agents/sources',
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
