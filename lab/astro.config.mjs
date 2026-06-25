import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The Lab is the engineering arm of The AI Runtime. It deploys to Cloudflare
// Pages on its own subdomain, separate from the events/community platform on
// events.theairuntime.com. Static output, minimal client JS, dark only.
export default defineConfig({
  site: 'https://lab.theairuntime.com',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
