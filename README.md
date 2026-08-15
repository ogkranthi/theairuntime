# events.theairuntime.com

Web platform for [The AI Runtime](https://theairuntime.com), the publication and community for engineers shipping AI to production.

**Domain split:**
- `theairuntime.com` → Substack (Custom Domain). The publication itself: `/`, `/p/*`, `/feed`, `/archive`.
- `events.theairuntime.com` → **this repo**. Meetups, speakers, and resources library.
- `learn.theairuntime.com` → **[`learn/`](./learn)**, a standalone Astro site. AIR Course 001, the written curriculum and syllabus.

**Routes here:**
- `/boston` → Boston meetup hub (current/upcoming event, agenda, speakers, RSVP)
- `/speakers`, `/speakers/<slug>` → cross-city speaker directory
- `/resources`, `/resources/<slug>` → ebooks, checklists, playbooks (lead-gated / paid)
- `/about`, `/speak`, `/404`

**The Lab (`lab.theairuntime.com`):** the same Worker also serves the FDE Lab
on the lab host, styled via `LabLayout` and `lab-tokens.css`. Four pages: the
home (built at `/lab-home/`, served at `/`), the current Field Challenge at
`/01`, `/reports` (Field Reports), and `/about` (built at `/lab-about/`,
served at `/about` on the lab host only). The two content nouns are Field
Challenge and Field Report; submission is a GitHub issue on the challenge
repo, no forms. Retired paths (`/submit`, `/start-here`, `/investigations`,
`/artifacts`, `/problem-bank`, `/field-council`, `/field-notes`, `/field-lab`,
`/briefs`) redirect to the closest surviving page. Host routing lives in
`src/worker.ts`; lab URLs are listed in `/lab-sitemap.xml` and excluded from
the main sitemap.

**The course (`learn.theairuntime.com`):** a separate Astro project in
[`learn/`](./learn) with its own `package.json`, served by the same Worker as
the third host. The root build copies its output to `dist/learn-site/` and
`src/worker.ts` rewrites learn-host requests into that prefix. It hosts AIR
Course 001, Engineering Long-Running AI Agents: 13 module pages from
`learn/src/content/course/`, a Failure Labs index, a stack page, RSS, and
per-module OpenGraph images generated at build. See
[`learn/README.md`](./learn/README.md) and [`learn/DEPLOY.md`](./learn/DEPLOY.md).

Built with Astro + content collections, deployed to Cloudflare Pages.

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # serve dist/ locally
```

## Project structure

```
src/
├── content/                   # markdown content (Zod-validated)
│   ├── config.ts              # collection schemas
│   ├── cities/                # city meta (boston, future: nyc, sf)
│   ├── events/<city>/<slug>.md
│   ├── speakers/<slug>.md
│   └── resources/<slug>.md
├── components/                # Astro + React components
├── layouts/                   # BaseLayout
├── pages/                     # routes (file-based)
└── styles/tokens.css          # color/font tokens
public/
├── _redirects                 # /  → substack (Cloudflare Pages)
├── _headers                   # security headers
├── speakers/                  # headshots
├── resources/                 # public free PDFs
└── partners/                  # partner logos
functions/
└── api/subscribe.ts           # Cloudflare Pages Function for lead capture
```

## Adding content

### A new event
Drop `src/content/events/<city>/<YYYY-MM-DD>-<slug>.md` with frontmatter (title, date, speakers refs, agenda, lumaUrl, partners). After the event, set `status: past` and add `slidesUrl`/`recordingUrl`.

### A new speaker
Drop `src/content/speakers/<slug>.md` with bio + `talks: []` referencing event slugs. Headshot at `public/speakers/<slug>.jpg`.

### A new city
1. `src/content/cities/<city>.md`
2. `src/pages/<city>/index.astro` (copy from `boston/index.astro`, change the `e.data.city.slug === 'boston'` filter)
3. `src/pages/<city>/[slug].astro` (same)

### A new resource (ebook / checklist / playbook)
Drop `src/content/resources/<slug>.md`. Set `status` to `coming-soon`, `lead-gated`, `free`, or `paid`.
- **Free:** `pdfUrl: /resources/<slug>.pdf`, drop the PDF in `public/resources/`. Shows a no-friction download plus an "email me the PDF" path that subscribes the reader.
- **Lead-gated:** lead-gate captures email via `/api/subscribe`, then emails the link.
- **Paid:** `paymentLinkUrl: <stripe/gumroad/lemonsqueezy URL>`.

### The PDF issue series (how each new PDF grows subscribers)
`/resources` is framed as an ongoing series. The play for every new issue:
1. **Publish the new issue as `status: free`** with `featured: true` and a
   `publishedAt` date. It becomes the "Latest issue" hero (always free, the
   top-of-funnel hook). Remove `featured` from the previous issue.
2. **Demote the previous issue to `status: lead-gated`.** Back issues now
   require an email to unlock, so the archive converts. Keep its `pdfUrl`; the
   lead-gate emails the link after capture.
3. **Optionally pre-announce the next issue as `status: coming-soon`** (no
   `pdfUrl` yet). The lead-gate becomes a "Notify me" form that collects
   subscribers before the PDF exists; email them on release.
4. Sort is by `publishedAt` (newest first), so set it on every issue.
5. Add a subscribe CTA on the **last page of the PDF itself**
   ("Get the next issue: events.theairuntime.com/resources") so the asset
   converts even when shared off-site.

### A new Field Brief (Field Lab problem)
Drop `src/content/problems/<id>.json`. The format is the **Field Brief Standard
v1.0**, enforced by zod in `src/content/config.ts` and documented with a
template and review checklist in [`FIELD_BRIEFS.md`](./FIELD_BRIEFS.md). Keep
`draft: true` until it passes the checklist, then set `status: Open`. A
conformant file adds a card at `/briefs` and a detail page with no code change.

## Deploy

Connected to Cloudflare Pages. Build command `npm run build`, output `dist/`. Custom domain `events.theairuntime.com` bound to the Pages project. Root domain `theairuntime.com` is owned by Substack Custom Domain, do not bind the apex to Pages.

### Required env vars (Cloudflare Pages dashboard)

- `SUBSTACK_PUBLICATION`, defaults to `theairuntime`
- `LEAD_WEBHOOK_URL` *(optional)*, Slack/Make/Zapier webhook to mirror every lead capture

## Brand

See [`BRAND.md`](./BRAND.md) for the full brand reference, palette, typography, voice, Blink mascot spec, multi-city expansion playbook.
