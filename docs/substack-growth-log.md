# Building a Substack growth engine that optimizes for subscribers, not vanity

A working log of how The AI Runtime automated its Substack Notes growth strategy,
what the live data actually says converts, and how the loop keeps learning. This
doc is appended to on every weekly run. Newest entries at the bottom.

## Why we built this

Substack's discovery algorithm rewards Network Overlap: the density of
connections between accounts, not raw posting volume. When you restack or
genuinely engage an authoritative account, and that account engages a third
authoritative account, the algorithm triangulates your position and starts
showing your work to that third account's followers. Notes are the town square
where this plays out.

The goal was to turn that into a repeatable system instead of a vibe: engage the
right accounts, post Notes that bring real subscribers rather than impressions,
measure which is which, and feed the result back in.

## What we built

A reusable Claude skill, `substack-growth`, that runs a five-phase loop on the
WriteStack Notes MCP tools:

- **Phase 0, calibrate.** Pull writing style, all-time and recent note
  statistics, and open posting slots.
- **Phase 1, target.** Read the activity feed and research authoritative niche
  accounts, then produce a ranked engagement list with comment angles.
- **Phase 2, draft.** Write 2 to 4 notes that mirror the patterns that have
  actually converted, as drafts only.
- **Phase 3, schedule.** On approval, schedule into open slots with a 24-hour
  auto-restack for a second visibility wave.
- **Phase 4, measure.** Classify each published note as subscriber-driving or
  vanity and log the verdict so future drafts bias toward what works.

The skill has a draft-only mode for the weekly recurring run, so each batch lands
as drafts for human review before anything publishes.

### The one honest constraint

The WriteStack tooling can draft, schedule, and auto-restack your own notes, but
it has no write action to restack or comment on other writers' notes. So the
Network Overlap engagement half is delivered as a ranked target list that gets
actioned by hand in the Substack app. Everything else is automated.

## What the live data says (first run, 2026-06-05)

We pulled all-time note statistics and the pattern was not subtle. Three formats
drive nearly all free-subscriber conversion. Reach alone converts no one.

| Format | Reach | Free subs |
| --- | --- | --- |
| Community invite ("I'd love to connect, let's chat") | 3,136 impressions | 29 |
| Hot take plus named framework plus deep-dive link (the MRE note) | 1,794 impressions | 27 |
| Crisp single concept (the "harness defaults" note) | 126 impressions | 4 |

The lesson that reframes everything: impressions are not the bottleneck, format
is. A relatable-complaint note pulled 198 impressions and zero subscribers. A
community invite with similar engagement pulled 29. The winning structures:

1. **Community invite.** Ask practitioners to reply with what they are building,
   promise to feature the best. Highest converter. Run it roughly every two
   weeks, not more, since novelty decays.
2. **Hot take plus framework plus link.** Bold claim, three short contrast lines,
   name the discipline (MRE, CPCT, harness as moat), one key insight, a link.
   The workhorse.
3. **Crisp single concept.** One declarative idea, no preamble. Cheap to produce
   and the best converter per impression.

Vanity traps to avoid: relatable complaints, empty image-only notes, and generic
"use AI for free" posts. They get reach and convert no one.

## Network Overlap bridges (first run)

Surfaced from the activity feed and niche research. Warm bridges already in the
graph are worth the most.

- **Opinion AI** (@opinionai), bestseller tier, warm. Posts agentic-workflow
  content, already in a thread with us on token trimming.
- **Paolo Perrone** (@paoloap), warm. Agent-security threads, high reciprocity
  odds.
- **Cameron Wolfe** (Deep Learning Focus), cold, top authority on agent evals.
- **Ludovico Bessi** (Machine Learning at Scale), cold, coined Agentic Context
  Engineering.
- **Karo Zieminski** (Product with Attitude, 17k plus), cold, large adjacent
  AI-PM audience for spillover.

## How the loop runs now

A weekly recurring scheduled session runs the skill in draft-only mode. Each week
it reads the latest stats, drops 2 to 4 fresh drafts into WriteStack, refreshes
the engagement target list, appends new learnings here and to the skill's
playbook, then stops for human review. The terse, machine-facing memory lives in
`.claude/skills/substack-growth/playbook.md`. This doc is the narrative version.

## Weekly changelog

Each weekly run appends a dated entry below: what was drafted, what the newest
stats showed, and any pattern that changed.

### 2026-06-05 (first run, full cycle)

- Drafted and scheduled 3 notes (community invite, CPCT hot take, harness
  concept) into Jun 6 to 7 slots with 24-hour auto-restack.
- Confirmed the three converting formats above from all-time stats.
- Surfaced the five engagement bridges above.
- Built the skill, the draft-only weekly mode, and this log.
