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
  /** KV namespace for the student cohort waitlist. When unset, /api/waitlist
   *  returns 503 and the UI falls back to PUBLIC_COHORT_JOIN_URL. Create with
   *  `npx wrangler kv namespace create WAITLIST` and bind in wrangler.toml. */
  WAITLIST?: { put: (key: string, value: string) => Promise<void>; get: (key: string) => Promise<string | null> };
  /** KV namespace for the Field Lab intake review queue. When unset, /api/intake
   *  returns 503 and the intake page falls back to the per-branch env URLs. The
   *  problem branch writes a Field Brief draft (status Draft); build and partner
   *  branches write interest records. Nothing here is ever auto-published. */
  INTAKE?: { put: (key: string, value: string) => Promise<void>; get: (key: string) => Promise<string | null> };
  /** Optional webhook that mirrors every intake submission (Slack, Make). */
  INTAKE_WEBHOOK_URL?: string;
  /** Airtable personal access token (scope data.records:write on the base).
   *  When set with AIRTABLE_BASE_ID, intake submissions are written straight
   *  to Airtable, the readable review queue. Server secret, never exposed. */
  AIRTABLE_TOKEN?: string;
  /** Airtable base id (looks like appXXXXXXXXXXXXXX). */
  AIRTABLE_BASE_ID?: string;
  /** Table names per branch. Default to Problems / Builders / Mentors / Partners. */
  AIRTABLE_PROBLEMS_TABLE?: string;
  AIRTABLE_BUILDERS_TABLE?: string;
  AIRTABLE_MENTORS_TABLE?: string;
  AIRTABLE_PARTNERS_TABLE?: string;
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

// --- Host routing ---------------------------------------------------------
// One Worker serves two Custom Domains. The main community site lives on
// events.theairuntime.com; the Lab (investigations record + the Field Lab build
// library) lives on lab.theairuntime.com. Both hosts back onto the same dist/,
// so the Worker steers each path to its home.
const EVENTS_HOST = 'events.theairuntime.com';
const LAB_HOST = 'lab.theairuntime.com';

// Hosts where redirects must be a no-op: local dev, preview deploys, and the
// raw workers.dev URL all serve everything from a single origin.
function isPassthroughHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.workers.dev')
  );
}

// The Field Lab pages that belong on the lab host. Matches the bare path and
// any sub-path, with or without a trailing slash.
function isFieldLabPath(p: string): boolean {
  return (
    p === '/field-lab' || p.startsWith('/field-lab/') ||
    p === '/briefs' || p.startsWith('/briefs/')
  );
}

// The investigations record (lab.theairuntime.com front door). Matches the bare
// path and any sub-path, with or without a trailing slash.
function isInvestigationsPath(p: string): boolean {
  return p === '/investigations' || p.startsWith('/investigations/');
}

function isApiPath(p: string): boolean {
  return p.startsWith('/api/');
}

// Static assets and machine files must serve on whichever host requests them,
// so a page that 301'd keeps its CSS/JS/images and crawlers can read sitemaps
// and robots on both hosts. Page routes use format:'directory' (no file
// extension); every static file has a dot in its last segment.
const ASSET_PREFIXES = [
  '/_astro/', '/pagefind/', '/resources/', '/events/',
  '/speakers/', '/slides/', '/audio/',
];
function isAssetPath(p: string): boolean {
  if (ASSET_PREFIXES.some((pre) => p.startsWith(pre))) return true;
  const last = p.slice(p.lastIndexOf('/') + 1);
  return last.includes('.');
}

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
    'You are the librarian for The AI Runtime, a community of AI practitioners shipping AI to production. ' +
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

async function handleWaitlist(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return json({ error: 'Please provide a valid email.' }, { status: 400 });
  }

  // No KV bound yet: tell the client so it can hand off to the join URL.
  if (!env.WAITLIST) {
    return json({ error: 'Waitlist is not enabled.' }, { status: 503 });
  }

  try {
    const existing = await env.WAITLIST.get(`cohort:${email}`);
    if (existing) {
      return json({ ok: true, duplicate: true });
    }
    await env.WAITLIST.put(`cohort:${email}`, new Date().toISOString());
    return json({ ok: true });
  } catch {
    return json({ error: 'Could not save your spot. Please try again.' }, { status: 500 });
  }
}

/** Split a textarea value into a clean list (one per line or comma separated). */
function toList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Flatten an intake record into Airtable column fields, per branch. Column
 *  names here must match the Airtable table columns exactly (see INTAKE.md). */
function airtableFields(record: Record<string, unknown>): Record<string, unknown> {
  if (record.kind === 'problem') {
    const d = record.draft as Record<string, unknown>;
    const raw = (d._raw ?? {}) as Record<string, unknown>;
    return {
      Status: 'Draft',
      Conformance: 'draft',
      Provenance: d.provenance,
      'Submitted By': record.submitted_by,
      Company: record.company ?? '',
      Email: record.contact_email,
      'Mention Company': record.mention_company,
      Persona: d.persona,
      'AI Workflow': d.ai_workflow,
      'Pain (raw)': raw.pain ?? '',
      Inputs: (d.inputs as string[]).join('\n'),
      Outputs: (d.outputs as string[]).join('\n'),
      'Example Input': d.example_input,
      'Example Output': d.example_output,
      'Reliability Focus': (d.reliability_focus as string[]).join('\n'),
      'Definition of Done (raw)': raw.definition_of_done ?? '',
      'Data Plan': d.data_plan ?? '',
      Track: d.track,
      'Failure Family': d.failure_family ?? '',
      'Scoping Call': record.scoping_call === true,
      'Submitted At': record.submitted_at,
      'Editor Todo': (d._todo as string[]).join(', '),
      'Draft JSON': JSON.stringify(record.draft, null, 2),
    };
  }
  if (record.kind === 'builder-interest') {
    return {
      Name: record.name,
      Email: record.contact_email,
      LinkedIn: record.linkedin ?? '',
      Portfolio: record.portfolio ?? '',
      Shipped: record.shipped ?? '',
      Track: record.track,
      Target: record.target ?? '',
      'Solo OK': record.solo ?? '',
      'Write-up OK': record.writeup ?? '',
      Subscribe: record.subscribe === true,
      'Submitted At': record.submitted_at,
    };
  }
  if (record.kind === 'mentor-interest') {
    return {
      Name: record.name,
      Email: record.contact_email,
      Role: record.role ?? '',
      LinkedIn: record.linkedin ?? '',
      Expertise: record.expertise ?? '',
      'Help With': record.help ?? '',
      Track: record.track,
      Availability: record.availability ?? '',
      Note: record.note ?? '',
      Subscribe: record.subscribe === true,
      'Submitted At': record.submitted_at,
    };
  }
  return {
    Name: record.name,
    Company: record.company,
    Role: record.role ?? '',
    Email: record.contact_email,
    'Partner Type': record.partner_type,
    Contribution: record.contribution ?? '',
    Note: record.note ?? '',
    'Submitted At': record.submitted_at,
  };
}

/** Write one intake record to Airtable. Returns true on a 2xx response. The
 *  table is chosen by branch; typecast lets Airtable coerce single-selects and
 *  checkboxes. No-op (false) when the token or base id is not configured. */
async function sendToAirtable(env: Env, branch: string, record: Record<string, unknown>): Promise<boolean> {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE_ID) return false;
  const table =
    branch === 'problem'
      ? env.AIRTABLE_PROBLEMS_TABLE || 'Problems'
      : branch === 'build'
        ? env.AIRTABLE_BUILDERS_TABLE || 'Builders'
        : branch === 'mentor'
          ? env.AIRTABLE_MENTORS_TABLE || 'Mentors'
          : env.AIRTABLE_PARTNERS_TABLE || 'Partners';
  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ records: [{ fields: airtableFields(record) }], typecast: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Field Lab intake. One endpoint, three branches.
 *
 *   problem -> a Field Brief draft (status "Draft", conformance "draft"). The
 *              form fields map onto the schema; editor-only fields are left
 *              empty with a _todo list. Never auto-published.
 *   build   -> a builder-interest record.
 *   mentor  -> a mentor-interest record.
 *   partner -> a private partner-inquiry record (never published).
 *
 * Records are written to Airtable (the readable review queue) and mirrored to
 * the INTAKE KV namespace as a durable backup, plus an optional webhook. When
 * none of these is configured, returns 503 so the page falls back to the
 * per-branch env URL.
 */
async function handleIntake(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const branch = str(body.branch);
  if (!['problem', 'build', 'mentor', 'partner'].includes(branch)) {
    return json({ error: 'Unknown branch.' }, { status: 400 });
  }

  const email = str(body.email).toLowerCase();
  if (!isValidEmail(email)) {
    return json({ error: 'Please provide a valid email.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  let record: Record<string, unknown>;

  if (branch === 'problem') {
    // The cheapest conformance gate: a concrete example pair must be present.
    const exampleInput = str(body.example_input);
    const exampleOutput = str(body.example_output);
    if (!exampleInput || !exampleOutput) {
      return json(
        { error: 'A concrete example input and its expected output are required.' },
        { status: 400 },
      );
    }

    const company = str(body.company);
    // Provenance: a named company makes it company-submitted; an individual
    // without a company is operator-sourced.
    const provenance = company ? 'company-submitted' : 'operator-sourced';

    // Editor-only fields, completed in review before a brief is published.
    const editorTodo = [
      'id',
      'title',
      'one_line',
      'definition_of_done',
      'run_level',
      'difficulty',
      'build_type',
      'non_goals',
      'evaluation_ideas',
      'vertical',
    ];

    // A schema-shaped Field Brief draft. Mapped fields are filled from the
    // form; editor-only fields stay empty and are tracked in _todo.
    const draft: Record<string, unknown> = {
      id: '',
      title: '',
      one_line: '',
      persona: str(body.persona),
      ai_workflow: str(body.ai_workflow),
      // The editor splits the raw pain statement into why_it_matters and
      // current_workflow during review.
      why_it_matters: '',
      current_workflow: '',
      inputs: toList(body.inputs),
      outputs: toList(body.outputs),
      example_input: exampleInput,
      example_output: exampleOutput,
      reliability_focus: toList(body.reliability),
      definition_of_done: '',
      data_plan: str(body.data_ok) === 'no' ? '' : 'synthetic',
      track: str(body.track),
      failure_family:
        str(body.failure_family) && str(body.failure_family) !== 'Not sure'
          ? str(body.failure_family)
          : '',
      run_level: '',
      difficulty: '',
      build_type: '',
      non_goals: [],
      evaluation_ideas: [],
      vertical: '',
      provenance,
      status: 'Draft',
      conformance: 'draft',
      draft: true,
      // Raw, unedited applicant inputs the editor rewrites into the schema.
      _raw: {
        pain: str(body.pain),
        definition_of_done: str(body.definition_of_done),
        reliability: str(body.reliability),
        data_ok: str(body.data_ok),
      },
      _todo: editorTodo,
    };

    record = {
      kind: 'problem',
      submitted_by: str(body.submitted_by),
      company: company || null,
      contact_email: email,
      mention_company: str(body.mention_company) || 'no',
      scoping_call: body.scoping_call === true,
      submitted_at: now,
      draft,
    };
  } else if (branch === 'build') {
    record = {
      kind: 'builder-interest',
      name: str(body.name),
      contact_email: email,
      linkedin: str(body.linkedin) || null,
      portfolio: str(body.portfolio) || null,
      shipped: str(body.shipped) || null,
      track: str(body.track),
      target: str(body.target) || null,
      solo: str(body.solo) || null,
      writeup: str(body.writeup) || null,
      subscribe: body.subscribe === true,
      submitted_at: now,
    };
  } else if (branch === 'mentor') {
    record = {
      kind: 'mentor-interest',
      name: str(body.name),
      contact_email: email,
      role: str(body.role) || null,
      linkedin: str(body.linkedin) || null,
      expertise: str(body.expertise) || null,
      help: str(body.help) || null,
      track: str(body.track),
      availability: str(body.availability) || null,
      note: str(body.note) || null,
      subscribe: body.subscribe === true,
      submitted_at: now,
    };
  } else {
    record = {
      kind: 'partner-inquiry',
      private: true,
      name: str(body.name),
      company: str(body.company),
      role: str(body.role) || null,
      contact_email: email,
      partner_type: str(body.partner_type),
      contribution: str(body.contribution) || null,
      note: str(body.note) || null,
      submitted_at: now,
    };
  }

  let stored = false;

  // Airtable is the readable review queue a human triages.
  if (await sendToAirtable(env, branch, record)) {
    stored = true;
  }

  // KV is a durable backup, independent of Airtable being reachable.
  if (env.INTAKE) {
    try {
      const key = `intake:${branch}:${now}:${email}`;
      await env.INTAKE.put(key, JSON.stringify(record));
      stored = true;
    } catch {
      // Fall through to webhook / 503.
    }
  }

  if (env.INTAKE_WEBHOOK_URL) {
    try {
      await fetch(env.INTAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });
      stored = true;
    } catch {
      // Best-effort mirror.
    }
  }

  // Nothing configured to receive the submission: tell the client to fall back
  // to the per-branch env URL rather than silently dropping it.
  if (!stored) {
    return json({ error: 'Intake is not enabled.' }, { status: 503 });
  }

  return json({ ok: true });
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

    if (url.pathname === '/api/waitlist') {
      return handleWaitlist(request, env);
    }

    if (url.pathname === '/api/intake') {
      return handleIntake(request, env);
    }

    // Host routing runs after the API handlers (so an intake POST on the lab
    // host is handled, not 301'd, which would drop its body) and before
    // ASSETS. No-ops on dev/preview hosts.
    const { hostname, pathname, search } = url;
    if (!isPassthroughHost(hostname)) {
      // events: push Lab traffic (investigations + Field Lab) to the lab host.
      if (
        hostname === EVENTS_HOST &&
        (isInvestigationsPath(pathname) || isFieldLabPath(pathname))
      ) {
        return Response.redirect(`https://${LAB_HOST}${pathname}${search}`, 301);
      }
      // lab: root opens the investigations record; keep investigations, Field
      // Lab, API, and assets here; send any stray main-site page to events.
      if (hostname === LAB_HOST) {
        if (pathname === '/') {
          // 302 (temporary): the root destination changed once already (was
          // /field-lab), and browsers/edge cache 301s hard. Keep this
          // re-evaluatable so the root is never stuck behind a cached 301.
          return Response.redirect(`https://${LAB_HOST}/investigations/${search}`, 302);
        }
        const stayOnLab =
          isInvestigationsPath(pathname) ||
          isFieldLabPath(pathname) ||
          isApiPath(pathname) ||
          isAssetPath(pathname);
        if (!stayOnLab) {
          return Response.redirect(`https://${EVENTS_HOST}${pathname}${search}`, 301);
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
