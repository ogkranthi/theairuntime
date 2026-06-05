import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildIcs, type IcsEvent } from '../../lib/ics';

const ORIGIN = 'https://events.theairuntime.com';

export async function getStaticPaths() {
  const events = await getCollection('events', (e) => e.slug.startsWith('boston/'));
  return events.map((event) => ({
    params: { slug: event.slug.replace(/^boston\//, '') },
    props: { event },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const event = (props as any).event;
  const d = event.data;
  const ev: IcsEvent = {
    dateSlug: event.slug.replace(/^boston\//, ''),
    title: d.title,
    date: d.date,
    doorsAt: d.doorsAt,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    venueName: d.venue?.name,
    description: d.description,
  };
  return new Response(buildIcs([ev], ORIGIN), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${ev.dateSlug}.ics"`,
    },
  });
};
