# REDESIGN_PLAN: learn.theairuntime.com as AIR FDE Engineering

## Phase 1 audit

| Area | Finding |
|---|---|
| Framework | Astro v5.18.2, static output, no client framework. MDX integration installed but unused (lessons are .md). Sitemap + RSS present. |
| Routing | File-based: `/`, `/course-001/{index,[slug],labs,stack,sources}`, `/about`, `/404`, `/og/[slug].png.ts` (satori-generated OG PNGs), `/rss.xml`. Redirect map in `astro.config.mjs` covers two earlier URL generations. |
| Content | 16 lesson files in `src/content/course/`, Zod-validated (Content Layer glob loader). Frontmatter: module, title, subtitle, duration, goal, question, labNumber, invariant, lab, deliverable, youtube, substack, status. Lessons follow a build/break/diagnose/prove/exit/checkpoint rhythm with class-based callout divs. |
| Styles | One `tokens.css` design-token sheet plus scoped per-page styles. Light theme, but IBM Plex Mono for ALL headings (terminal look), 4px radius, light code surfaces. |
| Components | Wordmark, StateLedger (terminal-style module checklist, rendered on every lesson + 404), CourseNav, CtaBlock, Toc. Plugins: remark-callouts, rehype-wrap-tables, rehype-lessons (lesson chips). |
| Metadata model | Course-level constants in `lib/course.ts` (CHANNELS, UTM builder, per-module subscribe copy). One course hardcoded throughout (CourseNav, OG list, ledger). |
| Responsive | Manual media queries; verified zero horizontal overflow at 320px+. No mobile menu (nav wraps). |
| A11y | Lighthouse 100 on audited pages; skip link, aria-labels on task-list checkboxes, details/summary checkpoints, focus rings. |
| SEO | Canonical, per-page OG images, sitemap, RSS. No JSON-LD, no breadcrumbs. |
| Course 001 deps | `/course-001/` prefix hardcoded in CourseNav, StateLedger, lib hrefs, OG slug list, localStorage keys (`air-c001-*`). |
| Dead links | `make lab LAB=NN` targets referenced in lessons exist only as a declared contract in the repo (README says so). External links (33 unique in lessons/sources) are current official docs. |
| GitHub links | `CHANNELS.repo` = github.com/ogkranthi/air-course-long (live, scaffold). |
| Video | `youtube` frontmatter renders as links only; no embed component. No video shipped yet, so disabled "Watch" affordances appear in several places. |
| Diagrams | All ASCII inside `pre` blocks, including the six-surfaces diagram used as primary architecture communication on marketing pages. |

## Decisions

1. **16 modules and 14 labs stay.** The brief's "13 modules / 11 labs" describes an older
   structure; Phase 20 (do not delete educational content) wins. Course metadata shows real
   numbers.
2. **Course slug** `/courses/long-running-agents/`. Course title updated to the brief's
   "Engineering Long-Running AI Systems". Old `/course-001/*`, `/course/*`, and root-level
   `/labs|stack|sources` all 301.
3. **Lessons stay `.md`.** The FDE content components (FDELens, InTheField, FailureCallout,
   DecisionCard, TechnologyResource, ArchitectureDiagram) ship as Astro components for pages
   plus class-based markdown equivalents, so lesson files can adopt them without an MDX
   migration. One exemplar usage each on course/lesson surfaces.
4. **StateLedger dies.** Removed everywhere per "no giant terminal-style module block".
   Lesson navigation moves to a left sidebar (course outline, current module highlighted).
5. **Design system refresh**: warm off-white canvas (#FAFAF9), white cards, near-black
   editorial headings in Inter (semibold), mono reserved for labels/metadata/code, 10px
   radius, 1px borders, dark graphite code surfaces (Shiki github-dark-default on #17171A).
   Two-color brand held: neutrals + AIR orange (#C2410C text-safe, #EA580C imagery).
6. **Data model**: new collections `caseStudies` (md content), `courses` (json data),
   `skills` (json), `resources` (json). Module frontmatter gains hook, scenario, caseStudy,
   skills, technologies, repoPath. Adding Course 002 = one json entry + md files.
7. **Passive-first**: every module card and lesson leads Watch/Read; Explore/Build labeled
   optional. Missing video renders a quiet "Video coming soon" note, never a disabled button.
8. **Progress** stays local-only: per-lesson Watched/Read/Explored/Built marks +
   existing exit-criteria checklists; "Continue learning" on the course page; reset control.
   Site fully functional with storage unavailable.
9. **SEO**: JSON-LD (Course on course pages, TechArticle + BreadcrumbList on lessons),
   existing sitemap/RSS/OG kept.
10. **Out of scope for this pass** (recorded as TODOs): real video production, per-skill
    lesson backlinks beyond Course 001, case-study long-form deep dives beyond the initial
    five summaries, `make lab` harness implementation in the reference repo.

## Route map after redesign

```
/                      AIR Learning home (FDE Engineering)
/courses/              Course catalog (5 courses, 1 live)
/courses/long-running-agents/            Course 001 landing
/courses/long-running-agents/[module]/   16 lessons
/courses/long-running-agents/labs/       Optional labs index
/courses/long-running-agents/stack/      Technologies
/courses/long-running-agents/sources/    Curated primary sources (course-level)
/case-studies/         Library, filterable by industry category
/case-studies/[slug]/  5 case studies
/skills/               Skills map taxonomy (6 domains)
/resources/            Curated resource library
/about/                Rewritten around FDE engineering
```
