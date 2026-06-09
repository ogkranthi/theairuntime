import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Build-time knowledge index for the "Ask the Library" feature.
 *
 * Emits the reading list as a compact JSON file that the /api/ask Worker
 * retrieves (via the ASSETS binding) to ground its answers. Regenerated on
 * every build, so it always matches the live library. Pure static output.
 */
export const GET: APIRoute = async () => {
  const reading = await getCollection('reading');
  const entries = reading.map((r) => ({
    title: r.data.title,
    url: r.data.url,
    source: r.data.source,
    author: r.data.author ?? null,
    pillar: r.data.pillar,
    tags: r.data.tags,
    summary: r.data.summary,
  }));
  return new Response(JSON.stringify({ entries }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
