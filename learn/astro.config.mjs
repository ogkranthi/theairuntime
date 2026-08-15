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
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
