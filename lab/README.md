# lab.theairuntime.com

The engineering arm of [The AI Runtime](https://theairuntime.com). A public
record of production AI engineering investigations. Each investigation starts
with a real customer-shaped problem, defines a reliability bar, builds the
smallest system needed to test it, and publishes the failures, evals, decisions,
and final field report.

Standalone Astro site, separate from the events/community platform on
`events.theairuntime.com`. Static output, deployed to Cloudflare Pages on its
own subdomain. Dark only. No CMS, no database, no analytics.

## Routes

Three routes, nothing more:

- `/` homepage. Hero, then investigation cards, newest first. The card leads
  with the question, not the title.
- `/investigations/<slug>` one detail page per investigation, routed by the
  frontmatter `slug` (stable even if the file is renamed).
- `/about` what an investigation is, the lifecycle as static text, links back to
  the publication and newsletter.

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site -> dist/
npm run preview  # serve dist/ locally
npm run check    # astro type check
```

## Adding an investigation

Drop a markdown file in `src/content/investigations/`. The schema lives in
`src/content/config.ts` (Zod). A conformant file appears on the homepage and
gets its own detail page with no code change. The URL comes from the
frontmatter `slug`, not the filename.

Frontmatter, required fields: `id`, `slug`, `title`, `question`, `status`
(`investigating` | `in-eval` | `published`), `customer`, `problem`, `summary`,
`started`, `updated`. Optional: `pillar`, `tags`, and the evidence-artifact URLs
`repo`, `evalUrl`, `datasetUrl`, `reportUrl`. Evidence links render only when
present; the block hides entirely when none are set.

The body is plain markdown. Author `## Why this is not a solved problem`,
`## Open questions`, `## Decision records`, and `## Investigation log` as real
headings so they stay scannable and extractable. The investigation log is dated
newest-last and is what makes the page feel like an active record.

## Design

Black and warm orange only, locked in `src/styles/tokens.css`. IBM Plex Mono for
headers, labels, status pills, the card question, and dates. Inter for body
prose. House rule from the parent repo applies: no em dashes or en dashes,
anywhere.

## Deploy

Cloudflare Pages. Build command `npm run build`, output directory `dist`, root
directory `lab`. Bind the custom domain `lab.theairuntime.com` to the Pages
project.
