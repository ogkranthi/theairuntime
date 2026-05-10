// Cloudflare Pages Function: /api/subscribe
// Captures emails from the resource lead-gate. Forwards to Substack via the
// public newsletter signup endpoint, then optionally mirrors to a webhook
// (Slack/Make/Zapier/etc) for offline routing.
//
// Required env vars (set in Cloudflare Pages → Settings → Environment variables):
//   SUBSTACK_PUBLICATION  — e.g. "theairuntime" (defaults to that if unset)
// Optional:
//   LEAD_WEBHOOK_URL      — POST a copy of every lead here (Slack/Make/Zapier)

interface Env {
  SUBSTACK_PUBLICATION?: string;
  LEAD_WEBHOOK_URL?: string;
}

interface Body {
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
      ...(init.headers ?? {}),
    },
  });

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return json({ error: 'Please provide a valid email.' }, { status: 400 });
  }

  const publication = env.SUBSTACK_PUBLICATION ?? 'theairuntime';
  const substackUrl = `https://${publication}.substack.com/api/v1/free?nojs=true`;

  // Substack expects form-encoded POST.
  const form = new URLSearchParams();
  form.set('email', email);
  form.set('first_url', `https://theairuntime.com/resources/${body.resourceSlug ?? ''}`);
  form.set('first_referrer', 'theairuntime.com');
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
    // Soft-fail; the lead is still captured via webhook below.
  }

  // Mirror to optional webhook (Slack incoming webhook, Make, Zapier, etc).
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
};

// Reject other methods.
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  return json({ error: 'Not found' }, { status: 404 });
};
