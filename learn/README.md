# learn.theairuntime.com

FDE Commons: the open learning site for Forward Deployed Engineering, home to
the AIR course library.

**Course 001, Engineering Long-Running AI Agents.** Sixteen modules from a
simple agent loop to a durable production system, fourteen Failure Labs numbered
independently of the modules, one deliberately boring application (a Vendor
Review Agent), and every failure reproducible against a deterministic fixture
server.

**Course 002, Agentic AI System Design.** Seventeen modules that build one
system, Atlas, end to end: authority boundaries, tool contracts, context,
durable execution, security, evaluation and operations. Ships with a 51-question
quiz bank, twelve timed practice scenarios with staged constraint reveals, a
twelve-section design canvas, and sixteen reference artifacts.

Standalone Astro site on its own subdomain, separate from the events platform on
`events.theairuntime.com` and the Field Lab on `lab.theairuntime.com`. Static
output, light theme per `BRAND.md`, zero JavaScript required to read a lesson.

This is the canonical curriculum. It is not an LMS: no accounts, no server-side
progress, no paywall, no comments. What progress exists (module completion, quiz
scores, canvas drafts, interview attempts) lives in the reader's own browser
under one versioned localStorage key. Downloadable artifacts live in the public
course repos and are linked from here. Nothing is gated.

## Routes

```
/                          FDE Commons home: positioning, journeys, specializations, courses
/learn/                    Learn hub: depth model, content types, flagship courses
/learn/courses/            Course catalog (data-driven from src/data/courses.json)

/learn/courses/long-running-agents/            Course 001 landing
/learn/courses/long-running-agents/<module>/   16 lessons, three-column learner layout
/learn/courses/long-running-agents/labs|stack|sources

/learn/courses/agentic-system-design/                    Course 002 landing
/learn/courses/agentic-system-design/modules/<slug>/     17 lessons, quiz per module
/learn/courses/agentic-system-design/practice/           12 practice scenarios
/learn/courses/agentic-system-design/practice/<slug>/    timed interview mode
/learn/courses/agentic-system-design/canvas/             design canvas, local only
/learn/courses/agentic-system-design/capstone/           the Atlas brief
/learn/courses/agentic-system-design/glossary/           108 terms, filterable
/learn/courses/agentic-system-design/sources/            primary source map
/learn/courses/agentic-system-design/reference/          16 templates and rubrics
/agentic-system-design/**                                301s to the routes above

/learn/case-studies/       Industry case study library (src/content/case-studies/)
/learn/concepts|patterns|systems/    Knowledge library
/paths/, /career/, /practice/        Journeys, career intelligence, proof
/search/                   Static client-side index, "/" or Cmd+K from anywhere
/about                     Who is behind this, contact
/rss.xml                   Module feed
/og/<slug>.png             Generated OpenGraph image per page, module and scenario
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

## Course 001: adding or updating a module

Drop a markdown file in `src/content/course/`. The filename is the URL slug and
must follow the convention `NN-short-name` (`04-idempotency`). The schema lives
in `src/content/config.ts` (Zod):

| Field | Required | Notes |
|---|---|---|
| `module` | yes | 0 to 15, drives order, ledger and prev/next |
| `question` | yes | the production question, shown in the module hero and syllabus |
| `labNumber` | no | sequential Failure Lab number 1 to 14, independent of module number |
| `invariant` | no | the invariant badge text |
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

## Course 002: Agentic AI System Design

The upstream package ships markdown plus three JSON files. Everything is
validated at build time, so bad content fails `npm run build` with a readable
message instead of rendering a broken page.

```
src/content/asd-modules/     17 lessons, NN-slug.md, frontmatter below
src/content/asd-practice/    12 scenarios, NN-slug.md
src/content/asd-reference/   16 reference documents, no required frontmatter
src/data/asd/manifest.json      course metadata and canonical module order
src/data/asd/quiz-bank.json     51 questions, single and multi select
src/data/asd/scenario-manifest.json   scenario order, focus tags, durations
course-src/                  upstream validator, file index, dash normalizer
```

Lesson frontmatter: `id` (`"07"`), `slug`, `title`, `track`, `duration_minutes`,
`difficulty` (`Core` | `Advanced` | `Capstone`), `build_milestone`, `objectives`
(3 or more), `prerequisites` (slugs).

`src/lib/asd.ts` parses the three JSON files with Zod and re-checks the upstream
validator's invariants on every page that lists modules. The build fails on: a
module count that disagrees with the manifest, a duplicate id or slug, a file
out of manifest order, a filename that does not start with its module id, an
unknown prerequisite, a prerequisite that does not precede its module, a quiz
question pointing at a module that does not exist, or a correct option id that
is not among that question's options.

### Components

| Component | What it does |
|---|---|
| `CourseMap` | Modules grouped by track, with duration and completion ticks |
| `LessonHeader` | Module number, track, time, difficulty, build milestone, prerequisites |
| `Quiz` | Single and multi select, marks correct and missed, reveals rationale, retryable |
| `DesignCanvas` | 12 sections, 72 fields, autosave, Markdown and JSON export, print, reset |
| `InterviewMode` | Timer with pause and reset, RUNTIME order, timeline, scratchpad, required checks, self-score |
| `ScenarioGate` | Staged constraint reveals, and the answer sections gated until the learner finishes |
| `MermaidRuntime` | Lazy client render, expand to full bleed, text definition as the fallback |
| `ProgressPanel` | Course progress bar and per-module completion toggle |

`src/scripts/asd-progress.ts` owns the store: one key (`air-asd-progress`), one
schema version, and a `migrate()` that upgrades field by field rather than
discarding a reader's work. Every accessor is failure-tolerant, because storage
can be unavailable and the course must stay fully usable when it is. No learner
text is ever transmitted.

### Pipeline

`remark-mermaid` converts ```` ```mermaid ```` fences into a figure with the
graph source kept as the accessible text definition, which is also what the
client renderer reads. `rehype-asd-sections` tags the pedagogy the course keeps
in its heading text (`SHIP:`, `RUN:`, `DESIGN:`, `Failure injection:`), drops
the duplicate leading `<h1>`, and demotes any later `<h1>` to `<h2>`.


## Learner experience

Every lesson follows the first-principles anatomy from the course rewrite
brief: production question (in the hero), concrete situation, what fails and
why, new concept defined before use, under-the-hood execution timelines, a
compact build, the Failure Lab, and Check your understanding. Exit-criteria
checkboxes persist in localStorage; when all are checked the module is
recorded complete and the course page shows it. No accounts: progress lives
in the reader's browser.

Lesson headings render with number chips via `src/plugins/rehype-lessons.mjs`;
the rhythm sections are styled blocks (`block-diagnose`, `block-prove`,
`block-exit`, `details.checkpoint`) defined in `tokens.css`.

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

Locked brand, warm off-white and one orange, in `src/styles/tokens.css`. Inter
for headings and prose; IBM Plex Mono is reserved for code, labels, metadata and
the state ledger. Text-level accent is `#C2410C` (5.2:1 on the canvas); the
brighter `#EA580C` is imagery only, where no contrast rule applies. Fonts are
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
