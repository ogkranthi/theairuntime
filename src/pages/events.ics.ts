import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildIcs, type IcsEvent } from '../lib/ics';

const ORIGIN = 'https://events.theairuntime.com';

export const GET: APIRoute = async () => {
  const events = await getCollection('events');
  events.sort((a, b) => +a.data.date - +b.data.date);

  const items: IcsEvent[] = events.map((event) => {
    const d = event.data;
    return {
      dateSlug: event.slug.replace(/^[^/]+\//, ''),
      title: d.title,
      date: d.date,
      doorsAt: d.doorsAt,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      venueName: d.venue?.name,
      description: d.description,
    };
  });

  return new Response(buildIcs(items, ORIGIN), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="the-ai-runtime-events.ics"',
    },
  });
};
