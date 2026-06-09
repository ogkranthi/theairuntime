/**
 * Cloudflare Worker entry for events.theairuntime.com
 *
 * Static site (built by Astro into dist/) is served via the ASSETS binding.
 * Dynamic routes are handled here:
 *
 *   POST /api/subscribe, capture lead emails from the resource lead-gate.
 *                         Forwards to Substack and optionally mirrors to a webhook.
 */

interface Env {
  ASSETS: Fetcher;
  /** Origin where the Substack publication lives, Custom Domain by default. */
  SUBSTACK_ORIGIN?: string;
  /** Optional webhook (Slack, Make, Zapier) that mirrors every lead. */
  LEAD_WEBHOOK_URL?: string;
  /** Optional webhook for anonymous signal questions submitted via /signal. */
  SIGNAL_WEBHOOK_URL?: string;
  /** Cloudflare Workers AI binding. When unset, /api/ask still returns the
   *  matched reads, just without a generated answer. Add in wrangler.toml:
   *  [ai]\n binding = "AI" */
  AI?: { run: (model: string, input: unknown) => Promise<{ response?: string }> };
}

interface SubscribeBody {
  email: string;
  source?: string;
  resourceSlug?: string;
  resourceTitle?: string;
  /** Referral id this visitor arrived with (?ref=). Attribution only. */
  ref?: string;
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

  // Substack moved the publication to the Custom Domain (theairuntime.com).
  // The legacy .substack.com subdomain no longer serves the subscribe API.
  const origin = env.SUBSTACK_ORIGIN ?? 'https://theairuntime.com';
  const substackUrl = `${origin}/api/v1/free?nojs=true`;

  // Fold the referral id into the source so it rides Substack's own attribution
  // alongside our webhook mirror. Sanitize to keep the value tidy.
  const baseSource = body.source ?? 'theairuntime-site';
  const ref = (body.ref ?? '').trim().slice(0, 64).replace(/[^\w.-]/g, '');
  const source = ref ? `${baseSource}|ref:${ref}` : baseSource;

  const form = new URLSearchParams();
  form.set('email', email);
  form.set('first_url', `https://events.theairuntime.com/resources/${body.resourceSlug ?? ''}`);
  form.set('first_referrer', 'events.theairuntime.com');
  form.set('source', source);

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
          source: baseSource,
          ref: ref || null,
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

interface SignalQuestionBody {
  question: string;
}

async function handleSignalQuestion(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: SignalQuestionBody;
  try {
    body = (await request.json()) as SignalQuestionBody;
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > 1000) {
    return json({ error: 'Question must be a non-empty string (max 1000 characters).' }, { status: 400 });
  }

  if (env.SIGNAL_WEBHOOK_URL) {
    try {
      await fetch(env.SIGNAL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question,
          ts: new Date().toISOString(),
          source: 'signal-page',
        }),
      });
    } catch {
      // Webhook is best-effort.
    }
  }

  return json({ ok: true });
}

interface ReadingEntry {
  title: string;
  url: string;
  source: string;
  author: string | null;
  pillar: string;
  tags: string[];
  summary: string;
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'how', 'do',
  'i', 'is', 'what', 'with', 'my', 'me', 'about', 'best', 'should', 'can',
  'when', 'why', 'this', 'that', 'are', 'be', 'it', 'you', 'your',
]);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 2 && !STOP.has(t));
}

/** Keyword overlap score between a question and a reading entry. */
function scoreEntry(qTokens: string[], e: ReadingEntry): number {
  const hay = `${e.title} ${e.summary} ${e.tags.join(' ')} ${e.pillar} ${e.source}`.toLowerCase();
  let score = 0;
  for (const t of qTokens) {
    if (hay.includes(t)) score += 1;
    if (e.title.toLowerCase().includes(t)) score += 1; // title matches weigh more
    if (e.tags.some((tag) => tag.toLowerCase().includes(t))) score += 1;
  }
  return score;
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  let q = '';
  try {
    q = String(((await request.json()) as { question?: string }).question ?? '').trim();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (q.length < 4) {
    return json({ error: 'Ask a fuller question about shipping AI to production.' }, { status: 400 });
  }
  if (q.length > 400) q = q.slice(0, 400);

  // Retrieve the build-time knowledge index from static assets.
  let entries: ReadingEntry[] = [];
  try {
    const idxUrl = new URL('/ask-index.json', request.url);
    const res = await env.ASSETS.fetch(new Request(idxUrl.toString()));
    if (res.ok) entries = ((await res.json()) as { entries: ReadingEntry[] }).entries ?? [];
  } catch {
    /* index unavailable; fall through with empty list */
  }

  const qTokens = tokenize(q);
  const ranked = entries
    .map((e) => ({ e, s: scoreEntry(qTokens, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.e);

  const sources = ranked.map((e) => ({ title: e.title, url: e.url, source: e.source, pillar: e.pillar }));

  // No AI binding yet: still useful. Return the matched reads and let the UI
  // present them, no generated prose.
  if (!env.AI) {
    return json({
      answer: null,
      sources,
      note: ranked.length
        ? 'Here are the most relevant reads from the library.'
        : 'No direct matches yet. Browse the full library or subscribe for new reads.',
    });
  }

  // Grounded answer: only the retrieved reads are given as context, with an
  // explicit instruction to stick to them and stay practitioner-grade.
  const context = ranked
    .map((e, i) => `[${i + 1}] ${e.title} (${e.source}, ${e.pillar})\n${e.summary}`)
    .join('\n\n');
  const system =
    'You are the librarian for The AI Runtime, a publication for engineers shipping AI to production. ' +
    'Answer the question in 2-4 sentences using ONLY the provided reading list context. ' +
    'Be specific, sourced, and anti-hype. Cite reads by their number like [1]. ' +
    'If the context does not cover it, say so plainly and suggest subscribing for new reads. ' +
    'Never use em dashes.';
  const user = `Question: ${q}\n\nReading list context:\n${context || '(no matching reads)'}`;

  try {
    const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 320,
    });
    const answer = (out.response ?? '').trim() || null;
    return json({ answer, sources });
  } catch {
    // AI errored: degrade to the retrieved reads rather than failing the request.
    return json({ answer: null, sources, note: 'Here are the most relevant reads from the library.' });
  }

}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      return handleSubscribe(request, env);
    }
    if (url.pathname === '/api/ask') {
      return handleAsk(request, env);
    }

    if (url.pathname === '/api/signal-question') {
      return handleSignalQuestion(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
