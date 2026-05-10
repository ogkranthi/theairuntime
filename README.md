# events.theairuntime.com

Web platform for [The AI Runtime](https://theairuntime.com) — the publication and community for engineers shipping AI to production.

**Domain split:**
- `theairuntime.com` → Substack (Custom Domain). The publication itself: `/`, `/p/*`, `/feed`, `/archive`.
- `events.theairuntime.com` → **this repo**. Meetups, speakers, and resources library.

**Routes here:**
- `/boston` → Boston meetup hub (current/upcoming event, agenda, speakers, RSVP)
- `/speakers`, `/speakers/<slug>` → cross-city speaker directory
- `/resources`, `/resources/<slug>` → ebooks, checklists, playbooks (lead-gated / paid)
- `/about`, `/speak`, `/404`

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
- **Free:** `pdfUrl: /resources/<slug>.pdf`, drop the PDF in `public/resources/`.
- **Lead-gated:** lead-gate captures email via `/api/subscribe`, then emails the link.
- **Paid:** `paymentLinkUrl: <stripe/gumroad/lemonsqueezy URL>`.

## Deploy

Connected to Cloudflare Pages. Build command `npm run build`, output `dist/`. Custom domain `events.theairuntime.com` bound to the Pages project. Root domain `theairuntime.com` is owned by Substack Custom Domain — do not bind the apex to Pages.

### Required env vars (Cloudflare Pages dashboard)

- `SUBSTACK_PUBLICATION` — defaults to `theairuntime`
- `LEAD_WEBHOOK_URL` *(optional)* — Slack/Make/Zapier webhook to mirror every lead capture

## Brand

See [`BRAND.md`](./BRAND.md) for the full brand reference — palette, typography, voice, Blink mascot spec, multi-city expansion playbook.
