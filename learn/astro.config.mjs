import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './src/plugins/remark-callouts.mjs';
import { rehypeWrapTables } from './src/plugins/rehype-wrap-tables.mjs';
import { rehypeLessons } from './src/plugins/rehype-lessons.mjs';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';
import { rehypeAsdSections } from './src/plugins/rehype-asd-sections.mjs';

// learn.theairuntime.com is the home of AIR Course 001. It is a standalone
// static site on its own subdomain, separate from the events platform on
// events.theairuntime.com and the Lab on lab.theairuntime.com.
// Dark only, no client framework, no analytics beyond Cloudflare Web Analytics.
export default defineConfig({
  site: 'https://learn.theairuntime.com',
  integrations: [
    react(),
    mdx(),
    sitemap({
      // OG images are generated as routes; keep the binaries out of the sitemap.
      filter: (page) => !page.includes('/og/'),
    }),
  ],
  markdown: {
    // `:::failure-lab`, `:::deliverable`, `:::takeaway`, `:::note` compile to
    // semantic <aside> callouts. See src/plugins/remark-callouts.mjs.
    remarkPlugins: [remarkDirective, remarkCallouts, remarkMermaid],
    rehypePlugins: [rehypeWrapTables, rehypeLessons, rehypeAsdSections],
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
  build: { format: 'directory' },
  // v2 restructure (Aug 2026): the course grew from 13 to 16 modules and
  // several slugs changed. Old URLs 301 via static redirect pages.
  redirects: {
    // FDE Commons information architecture: old peer content routes now live
    // beneath Learn, Career, and Paths. Keep every published URL resolvable.
    '/concepts': '/learn/concepts',
    '/concepts/[slug]': '/learn/concepts/[slug]',
    '/patterns': '/learn/patterns',
    '/patterns/[slug]': '/learn/patterns/[slug]',
    '/systems': '/learn/systems',
    '/systems/[slug]': '/learn/systems/[slug]',
    '/case-studies': '/learn/case-studies',
    '/case-studies/[slug]': '/learn/case-studies/[slug]',
    '/courses': '/learn/courses',
    '/courses/long-running-agents': '/learn/courses/long-running-agents',
    '/courses/long-running-agents/[slug]': '/learn/courses/long-running-agents/[slug]',
    '/skills': '/paths',
    '/fde': '/career',
    '/fde/segments': '/career/segments',
    '/fde/segments/[slug]': '/career/segments/[slug]',
    '/fde/roles': '/career/roles',
    '/fde/companies': '/career/companies',
    '/fde/jobs': '/career/jobs',
    // Generation 1 (launch) slugs, renamed in the v2 restructure.
    '/course/04-idempotency': '/learn/courses/long-running-agents/04-side-effects',
    '/course/05-failure-handling': '/learn/courses/long-running-agents/06-failure-handling',
    '/course/06-human-in-the-loop': '/learn/courses/long-running-agents/07-human-control',
    '/course/07-context-engineering': '/learn/courses/long-running-agents/08-context',
    '/course/08-observability': '/learn/courses/long-running-agents/09-observability',
    '/course/09-evaluation': '/learn/courses/long-running-agents/11-evaluation',
    '/course/10-industry-architectures': '/learn/courses/long-running-agents/13-industry-architectures',
    '/course/11-deploy': '/learn/courses/long-running-agents/14-deploy',
    '/course/12-production-gauntlet': '/learn/courses/long-running-agents/15-production-gauntlet',
    // Generation 2 prefixes.
    '/course/[slug]': '/learn/courses/long-running-agents/[slug]',
    '/course-001': '/learn/courses/long-running-agents',
    '/course-001/[slug]': '/learn/courses/long-running-agents/[slug]',
    '/labs': '/learn/courses/long-running-agents/labs',
    '/stack': '/learn/courses/long-running-agents/stack',
    '/sources': '/learn/courses/long-running-agents/sources',
    // Course 002 ships with the spec's top-level URLs; the site nests every
    // course under /learn/courses/<slug>/, so honor both.
    '/agentic-system-design': '/learn/courses/agentic-system-design',
    '/agentic-system-design/canvas': '/learn/courses/agentic-system-design/canvas',
    '/agentic-system-design/capstone': '/learn/courses/agentic-system-design/capstone',
    '/agentic-system-design/glossary': '/learn/courses/agentic-system-design/glossary',
    '/agentic-system-design/sources': '/learn/courses/agentic-system-design/sources',
    '/agentic-system-design/practice': '/learn/courses/agentic-system-design/practice',
    '/agentic-system-design/practice/[slug]': '/learn/courses/agentic-system-design/practice/[slug]',
    '/agentic-system-design/modules/[slug]': '/learn/courses/agentic-system-design/modules/[slug]',
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
