import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// The Field Lab is canonical on lab.theairuntime.com. The main sitemap (built
// against the events site) excludes these paths, so this endpoint lists the
// lab URLs for crawlers. The .xml extension keeps it served on the lab host.
const LAB = 'https://lab.theairuntime.com';

export const GET: APIRoute = async () => {
  const labs = (await getCollection('labs')).filter((l) => l.data.status !== 'draft');
  const reports = await getCollection('reports');
  const fieldNotes = (await getCollection('field-notes')).filter((n) => n.data.status === 'published');
  const artifacts = (await getCollection('artifacts')).filter((a) => a.data.status === 'available');
  // Trailing slashes to match the directory-format canonical URLs.
  const urls = [
    `${LAB}/`,
    `${LAB}/start-here/`,
    `${LAB}/investigations/`,
    `${LAB}/field-notes/`,
    `${LAB}/artifacts/`,
    `${LAB}/problem-bank/`,
    `${LAB}/reports/`,
    `${LAB}/submit/`,
    ...labs.map((l) => `${LAB}/${String(l.data.number).padStart(2, '0')}/`),
    ...reports.map((r) => `${LAB}/reports/${r.id}/`),
    ...fieldNotes.map((n) => `${LAB}/field-notes/${n.slug}/`),
    ...artifacts.map((a) => `${LAB}/artifacts/${a.slug}/`),
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
