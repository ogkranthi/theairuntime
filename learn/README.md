# learn.theairuntime.com

Home of **AIR Course 001: Engineering Long-Running AI Agents**, from a simple
agent loop to a durable production system. Thirteen modules, eleven Failure
Labs, one deliberately boring application (a Vendor Review Agent), and every
failure reproducible against a deterministic fixture server.

Standalone Astro site on its own subdomain, separate from the events platform on
`events.theairuntime.com` and the Field Lab on `lab.theairuntime.com`. Static
output, dark only, zero JS required to read a module.

This is the canonical syllabus and written curriculum. It is not an LMS: no
accounts, no progress tracking, no paywall, no comments. Downloadable artifacts
(fixture server, golden datasets, trace bundles, evaluators, starter repo) live
in the public course repo and are linked from here. Nothing is gated.

## Routes

```
/                          Course home: thesis, what we build, stack, 13-module syllabus
/course/00-mental-model     ... /course/12-production-gauntlet
/labs                      Failure Labs index + fixture server snippet
/stack                     Why this stack, free hosting matrix, when to leave the free tier
/about                     Who is behind this, contact
/rss.xml                   Module feed
/og/<slug>.png             Generated OpenGraph image per page and per module
/sitemap-index.xml         Generated sitemap
```

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site -> dist/
npm run preview  # serve dist/ locally
npm run check    # astro check, must report 0 errors
```

## Adding or updating a module

Drop a markdown file in `src/content/course/`. The filename is the URL slug and
must follow the convention `NN-short-name` (`04-idempotency`). The schema lives
in `src/content/config.ts` (Zod):

| Field | Required | Notes |
|---|---|---|
| `module` | yes | 0 to 12, drives order, ledger and prev/next |
| `title` | yes | H1 and OG image title |
| `duration` | yes | e.g. `50-60 min` |
| `goal` | yes | one sentence, also the meta description |
| `lab` | no | Failure Lab title. Omit for modules with an exercise instead |
| `deliverable` | no | filename(s) |
| `youtube` | no | set when the lab video ships, turns on Watch links |
| `substack` | no | set when the longform ships, turns on Notes links |
| `subtitle` | no | renders under the H1 |
| `status` | no | `published` (default) or `draft`, drafts are excluded everywhere |

Setting `youtube` or `substack` is the only edit needed as videos and longforms
ship. The syllabus, the labs index and the module CTA all pick it up.

### Callouts

The curriculum ships callouts as HTML blocks, which is what the module pages
style:

```html
<div class="callout failure-lab">

**FAILURE LAB 04: The Duplicate Report**

Body markdown.

</div>
```

Classes: `failure-lab`, `deliverable`, `takeaway`, `note`. Remark directives
(`:::failure-lab{title="..."}`) compile to the same styling and are supported
for new content; see `src/plugins/remark-callouts.mjs`.

### House style

No em dashes and no en dashes, anywhere, per the parent repo's `CLAUDE.md`. Use
a hyphen for ranges (`45-60 min`), and a comma, colon, period or parentheses in
place of a dash. Curriculum prose is otherwise left exactly as written; the only
edits applied on import were punctuation normalisation for this rule.

## Distribution

Every outbound link carries
`?utm_source=learn&utm_medium=site&utm_campaign=course001&utm_content=<page-slug>-<cta>`,
built by `utm()` in `src/lib/course.ts`. The three-column CTA block (Subscribe,
Watch, Listen) renders on the home page and in every module footer, with the
per-module subscribe copy defined in the same file.

The "reach out" line renders exactly once per page: in the module CTA footer and
on `/about`. Module 12 already carries it in its closing prose, so the CTA there
stands down automatically.

## Design

Locked brand, black and warm orange only, in `src/styles/tokens.css`. IBM Plex
Mono for headings, labels and the state ledger; Inter for prose. Fonts are
self-hosted and subset to Latin, with metric-matched fallbacks so the swap
causes no layout shift.

The signature element is the **state ledger**: the course rendered as an agent
checklist, static on the home page and marking the current module on every
module page. It also drives the OG images, generated at build with satori and
resvg (`src/pages/og/[slug].png.ts`).

ASCII diagrams stay monospace and never wrap; they scroll horizontally on small
screens, on purpose. Do not convert them to images.

## Deploy

The course site ships through the repo's existing Worker deploy. The root build
(`npm run build` at the repo root) builds this project and copies its output to
`dist/learn-site/`; `src/worker.ts` serves it on `learn.theairuntime.com` by
path rewrite, the same way the Lab is served on its host. Merge to `main` and
it deploys with everything else.

One-time domain attachment, verification commands and the failure table:
[`DEPLOY.md`](./DEPLOY.md).
