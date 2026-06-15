import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// The Field Lab is canonical on lab.theairuntime.com. The main sitemap (built
// against the events site) excludes these paths, so this endpoint lists the
// lab URLs for crawlers. The .xml extension keeps it served on the lab host.
const LAB = 'https://lab.theairuntime.com';

export const GET: APIRoute = async () => {
  const problems = await getCollection('problems');
  // Trailing slashes to match the directory-format canonical URLs.
  const urls = [
    `${LAB}/field-lab/`,
    `${LAB}/field-lab/intake/`,
    `${LAB}/briefs/`,
    ...problems.map((p) => `${LAB}/briefs/${p.id}/`),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { 'content-type': 'application/xml' },
  });
};
