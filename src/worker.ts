/**
 * Cloudflare Worker entry for events.theairuntime.com
 *
 * Static site (built by Astro into dist/) is served via the ASSETS binding.
 * Dynamic routes are handled here:
 *
 *   POST /api/subscribe — capture lead emails from the resource lead-gate.
 *                         Forwards to Substack and optionally mirrors to a webhook.
 */

interface Env {
  ASSETS: Fetcher;
  SUBSTACK_PUBLICATION?: string;
  LEAD_WEBHOOK_URL?: string;
}

interface SubscribeBody {
  email: string;
  source?: string;
  resourceSlug?: string;
  resourceTitle?: string;
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return json({ error: 'Please provide a valid email.' }, { status: 400 });
  }

  const publication = env.SUBSTACK_PUBLICATION ?? 'theairuntime';
  const substackUrl = `https://${publication}.substack.com/api/v1/free?nojs=true`;

  const form = new URLSearchParams();
  form.set('email', email);
  form.set('first_url', `https://events.theairuntime.com/resources/${body.resourceSlug ?? ''}`);
  form.set('first_referrer', 'events.theairuntime.com');
  form.set('source', body.source ?? 'theairuntime-site');

  let substackOk = false;
  try {
    const res = await fetch(substackUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: form.toString(),
    });
    substackOk = res.ok;
  } catch {
    // Soft-fail; the lead is still captured via webhook below if configured.
  }

  if (env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          source: body.source ?? 'theairuntime-site',
          resourceSlug: body.resourceSlug ?? null,
          resourceTitle: body.resourceTitle ?? null,
          substackForwarded: substackOk,
          ts: new Date().toISOString(),
        }),
      });
    } catch {
      // Webhook is best-effort.
    }
  }

  if (!substackOk && !env.LEAD_WEBHOOK_URL) {
    return json(
      { error: "Couldn't reach the newsletter just now. Email info@theairuntime.com and we'll add you." },
      { status: 502 },
    );
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      return handleSubscribe(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
