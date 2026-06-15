# Daily Scouting Prompt

Reusable guide for Claude (and human contributors) running the daily content and codebase workflow for The AI Runtime platform.

---

## What this is

A standing instruction set for any Claude session working on `events.theairuntime.com`. Run it to:

- Scout new content (reading list, tools, speakers, events)
- Audit the codebase for drift from conventions
- Log what worked, what failed, and what to carry forward

**Before starting any session:** read `CLAUDE.md`, `BRAND.md`, and this file. They are the source of truth.

---

## Daily scouting routine

### 1. Reading list (15 min)

Look for new practitioner-grade writing published in the last 7 days across these five pillars:

- **Evals and Observability** — benchmarks, eval harnesses, tracing, LLM-as-judge
- **Agents in Production** — orchestration, tool use, multi-agent, self-healing pipelines
- **Inference and Serving** — latency, throughput, batching, quantization, model selection
- **Reliability and Incidents** — failure modes, incident reports, rollback, human-in-the-loop
- **Cost and Performance** - token budgets, caching, fine-tune vs. prompt tradeoffs

**Test before adding:** Would a senior engineer at Anthropic, OpenAI, or DeepMind forward this to their team? If not, skip it.

To add an entry, create a file in `src/content/reading/<slug>.md` using this schema:

```md
---
title: ""
url: ""
source: ""            # e.g. "Anthropic Blog", "Simon Willison", "Eugene Yan"
author: ""
pillar: agents        # evals | agents | inference | reliability | cost
tags: []
summary: ""           # 1-2 sentences. No hype. Specific claim only.
addedAt: YYYY-MM-DD
relatedEvents: []
relatedSpeakers: []
highlight: false      # true = surfaces on /library homepage (keep to 3-4 max)
---
```

No em dashes anywhere. Summaries should lead with the specific claim, not the author's credentials.

---

### 2. Tools (5 min)

Scout one new tool per week. Criteria:

- Used by practitioners shipping AI to production (not vibe-coded toys)
- Has a clear category: `productivity | evals | inference | agents | observability | testing | deployment | data`
- If you have a referral arrangement, set `isReferral: true` (mandatory for honesty)

File: `src/content/tools/<slug>.md`

---

### 3. Speakers (10 min)

Identify one upcoming speaker candidate per meetup cycle. Criteria from `BRAND.md`:

- Ships AI to production (not just thinks about it)
- Has a talk topic with a specific claim and a concrete takeaway
- Not a vendor pitch

Check the `/speak` page for the current editorial bar before outreach.

---

### 4. Events (5 min)

One meetup per month per city is the cadence. When a new event is confirmed:

1. Create `src/content/events/<city>/<YYYY-MM-DD-slug>.md`
2. Add speaker slugs under `speakers:` (must match existing files in `src/content/speakers/`)
3. Set `status: upcoming`
4. After the event: update to `status: past`, fill in `recapTakeaways[]` and `recapPhotos[]`

Run `npm run build` before committing. It must pass.

---

### 5. Codebase hygiene check (5 min)

Before any session ends, verify:

- No em dashes anywhere in content, copy, or comments
- All subscribe buttons and forms point to `https://theairuntime.com/subscribe`
- Free PDFs are in `public/resources/` and resources with `status: free` have a `pdfUrl`
- `npm run build` passes

---

## Retrospective: what the development history shows

The following is derived from auditing all 30 commits (May 10 to June 2, 2026) and the full codebase.

---

### What worked

**Astro and content collections as source of truth**

Zod-validated markdown schemas catch type errors at build time, not at runtime. Adding a new event, speaker, or reading entry requires no code changes. The schema in `src/content/config.ts` acts as a contract between content authors and the frontend.

**Soft-fail patterns everywhere**

The Substack RSS fetch in `src/lib/substack.ts` has a 5-second timeout and returns an empty array on failure. The Cloudflare Worker at `/api/subscribe` soft-fails if Substack is unreachable and still mirrors to the webhook. Network blips never break builds or user-facing flows.

**Build-time data fetching**

Substack posts are pulled at build time, not client-side. No hydration delay on the library or home page. The tradeoff (stale posts until next deploy) is acceptable given Cloudflare Pages rebuilds on every push.

**Domain split**

Separating the publication (Substack, `theairuntime.com`) from the platform (Astro/Pages, `events.theairuntime.com`) is clean. Each domain does one thing. SEO authority stays on Substack. Event archive, speakers, and resources live on the platform.

**Pillar system as organizational backbone**

Every reading entry, resource, and tool maps to one of five pillars: evals, agents, inference, reliability, cost. This makes cross-linking predictable and keeps the library from becoming an undifferentiated list. Filtering, recommended reading on speaker pages, and event-specific reading lists all derive from the same pillar field.

**Speaker-first design**

Each speaker gets a permanent `/speakers/<slug>` page with schema.org Person markup, a list of all their talks, and a recommended reading section filtered by their talk pillar. Slides and recordings link from the event page. This creates durable value after each meetup.

**SEO and AI engine indexing from the start**

`robots.txt` explicitly allows AI crawlers (Claude-SearchBot, OAI-SearchBot, PerplexityBot, GPTBot). Schema.org markup covers Organization, WebSite, Event, Person, BreadcrumbList, FAQPage. The sitemap excludes `/subscriber-only` and `/404`. These decisions were made early and consistently applied.

**Referral transparency**

`isReferral: true` on tool entries flags affiliate links. The UI discloses affiliation. This is a low-cost, high-trust signal for practitioners.

**Lead-gating with graceful degradation**

`ResourceLeadGate.tsx` captures email via POST `/api/subscribe`, which forwards to Substack and optionally mirrors to a webhook (Slack, Make, Zapier). If Substack is down, the webhook still fires. If the webhook is unconfigured, the API still returns success to the user. Fail open, capture what you can.

---

### What failed or was revised

**Dark theme**

Initial launch used a dark theme. Replaced with a light/minimalist theme (commit `05df58c`, May 24) after recognizing that the target audience reads long-form content and the Medium/Substack aesthetic is the established visual contract for practitioner writing. The brand orange (`#FB923C`, `#EA580C`) now has much more visual weight against white backgrounds.

**Multiple navigation iterations**

Three rounds of nav simplification: initial nav with several links, simplified to (Events, Library, Subscribe), then subscribe-first home with nav stripped further (commit `1ded421`, Jun 2). The lesson: fewer nav links means each one carries more weight. Secondary links belong in the footer.

**`/hub` naming**

The subscriber-only resource hub launched as `/hub`, renamed to `/subscriber-only` in the same PR (branch `e6e6109`). The original name was ambiguous. `/subscriber-only` is self-describing and signals to crawlers and users what to expect. It is also excluded from the sitemap and set to `noindex`.

**Substack API endpoint**

The initial Worker pointed at `.substack.com` as the API origin. When the publication moved to the custom domain `theairuntime.com`, the Worker had to be retargeted (commit `20e2e1a`, May 10). The lesson: store the origin in an environment variable (`SUBSTACK_ORIGIN`) and never hardcode third-party domain patterns into application logic.

**Two subscribe form patterns**

`SubscribeForm.tsx` redirects to `theairuntime.com/subscribe` on submit (Substack handles the opt-in). `ResourceLeadGate.tsx` makes an actual POST to `/api/subscribe`. These exist for different reasons: newsletter subscription is Substack-owned (double opt-in, GDPR compliance), lead capture is platform-owned. Both patterns are correct for their context, but the distinction is non-obvious. Any new form needs to decide which flow it belongs to before implementation.

---

### Patterns to replicate in future work

1. Always run `npm run build` before committing. The build catches schema errors, TypeScript errors, and broken imports.
2. New content types (cities, event types, resource formats) belong in `src/content/config.ts` as Zod schemas before any markdown files are created.
3. When adding a new page, check whether it needs: JSON-LD schema, breadcrumbs, sitemap inclusion/exclusion, OG metadata, and a subscribe block.
4. Every commit message should state what changed and why, not just what. The git log is the audit trail for this project.
5. Never use em dashes. No exceptions. Rewrite the sentence.

---

### Patterns to avoid

1. Hardcoding third-party API endpoints. Use environment variables.
2. Client-side data fetching for content that can be static. Astro's build step is the right place for Substack RSS, not `useEffect`.
3. Adding navigation items without removing something else. The nav has a cost ceiling.
4. Overloading a single page with too many content types. `/library` already holds reading entries, Substack posts, and tools. Adding more categories to that page degrades signal.
5. Using the subscriber-only gate for anything that should be publicly indexed. Gated content should be a deliberate choice, not a default.

---

### Open questions (as of June 2026)

- **Multi-city expansion.** BRAND.md describes a 30-minute playbook (copy `src/pages/boston/`, add `src/content/cities/<city>.md`). No second city has been added yet. The architecture is ready.
- **Agentic Architecture Checklist.** Listed as `coming-soon` in `src/content/resources/agentic-architecture-checklist.md`. No PDF exists in `public/resources/` yet. This is the first lead-gated resource and needs the PDF before it can launch.
- **Wispr Flow is the only tool.** One entry in `src/content/tools/`. The tools section has room for 4-6 curated entries before it needs pagination or filtering.
- **Three speakers total.** Content volume is appropriate for the current stage. The architecture supports dozens without code changes.
- **No test runner configured.** `package.json` has no test script. TypeScript strict mode and build-time Zod validation are the current quality gates. Adequate for this scale.
