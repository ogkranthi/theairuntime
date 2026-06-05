---
name: substack-growth
description: >-
  Run The AI Runtime's Substack "Network Overlap" growth loop. Use when the user
  wants to grow their Substack, plan or draft Notes, restack, engage
  authoritative accounts, find what drives subscribers vs vanity metrics, or
  schedule notes. Drafts notes in their voice and proposes a schedule, but never
  publishes or schedules without approval (draft and review). Drives the
  WriteStack Notes MCP tools end to end.
---

# Substack Network Overlap growth loop

A repeatable, draft-and-review workflow for growing The AI Runtime on Substack.

## The idea (why this works)

Substack's discovery algorithm rewards **Network Overlap**: the density of
connections between accounts. When you restack or genuinely engage an
authoritative account, and that account engages a third authoritative account,
the algorithm triangulates your position and starts showing your work to that
third account's followers. Notes are the town square where this happens.

Two levers compound:
1. **Engagement with authoritative accounts** (restacks, substantive comments)
   pulls you into denser parts of the graph.
2. **Notes that convert** (drive free or paid subscribers) instead of notes that
   only rack up impressions (vanity).

This skill works both levers and measures the result.

## Hard rules (do not skip)

- **No em dashes (—) and no en dashes (–) in any note copy or file.** Use
  periods, colons, commas, or parentheses. Hyphens only for ranges and compound
  modifiers. This is a repo-wide rule from `CLAUDE.md`.
- Voice: confident, specific, sourced, anti-hype, practitioner-first. Drafts
  must read like the user's profile in `get_writing_style`, not generic growth
  copy. See `strategy.md` for the voice rubric.
- Subscribe CTAs point to `https://theairuntime.com/subscribe`.
- **Draft and review gate:** create notes as `status: "draft"` and present them.
  Do not call `schedule_notes` until the user approves.
- The WriteStack tools cannot restack or comment on *other* people's notes.
  `autoRestackAfterHours` only re-posts the user's *own* note. Other-writer
  engagement is delivered as a target list the user actions in the app.

## Tooling map

All tools are on the WriteStack Notes MCP server
(`mcp__d6d5cff4-…__<tool>`). Read `strategy.md` and `playbook.md` before drafting.

## Modes

- **Full run (default):** Phases 0 to 4. Drafts are presented, and on approval
  the skill schedules them (Phase 3).
- **Draft-only:** run Phases 0, 1, 2, and the measurement half of 4, then STOP.
  Create every note as `status: "draft"` and never call `schedule_notes` or
  publish. Use this for the recurring weekly run so the user reviews and
  schedules each batch by hand. Trigger phrase: "draft-only mode".

### Weekly recurring run

This environment cannot self-schedule a 7-day loop (no cron primitive, and the
remote container is ephemeral). To run weekly, set up a recurring scheduled
session in Claude Code on the web
(https://code.claude.com/docs/en/claude-code-on-the-web) with this prompt:

> Run the substack-growth skill in draft-only mode: calibrate, produce the
> Network Overlap engagement target list, and create 2 to 4 notes as drafts for
> my review. Do not schedule or publish anything. Update playbook.md with any
> new stats learnings and commit it to branch claude/loving-mendel-0U3CT.

## The loop

### Phase 0: Calibrate (read only)

1. `get_writing_style` to load voice, topics, publication profile.
2. `get_notes_statistics` with `dateRange: "all_time"`, then `last_30_days`.
   Order once by `totalFreeSubscriptions` and once by `totalPaidSubscriptions`
   to see what actually drove subscribers. Note the formats that convert.
3. `get_queue` and `get_next_available_slots` (count 5) to see current cadence
   and open posting slots.
4. Read `playbook.md` for prior learnings.

### Phase 1: Network Overlap targeting (research, produces a target list)

1. `list_activities` with `filter: "all"`, then `filter: "mentions"`. Note which
   authoritative accounts already appear in the user's thread graph and who is
   engaging.
2. `WebSearch` for authoritative accounts in the niche (production AI / agent
   engineering, MRE, context and harness engineering) worth triangulating
   against. Prefer accounts that themselves engage other authorities (that is
   what makes them good overlap bridges).
3. Output a ranked **"engage today" list**, max 5 rows. Each row:
   account or note, why it is a good overlap bridge, and a one-line comment
   angle in the user's voice. Apply the rubric in `strategy.md`.
   The user actions these manually in the Substack app.

### Phase 2: Draft subscriber-driving Notes (draft, then stop)

1. Using Phase 0 learnings, draft 2 to 4 notes that mirror the *patterns* of
   past subscriber-converting notes, not the vanity ones. Stay in voice.
2. `create_note` with `status: "draft"` for each.
3. **Stop.** Present the drafts and the Phase 1 target list together and ask for
   approval. Do not schedule anything yet.

### Phase 3: Schedule on approval

1. Once approved: `get_next_available_slots`, then `schedule_notes` with the
   approved note IDs and `autoRestackAfterHours: 24` (a second visibility wave
   one day later). Adjust the hours if the user prefers.
2. Tell the user auto-restack needs the WriteStack browser extension v1.4.78 or
   higher to actually fire.

### Phase 4: Measure and learn (closes the loop)

1. On a later run, `get_notes_statistics` and compare `totalImpressions` against
   `totalFreeSubscriptions`, `totalPaidSubscriptions`, and
   `totalProfileVisits`. Classify each note **subscriber-driving** vs **vanity**
   using the rule in `strategy.md`.
2. Append the verdict and the pattern to the "What converts" log in
   `playbook.md` so future drafts bias toward what works.

## Definition of done for one run

A ranked engagement target list, 2 to 4 in-voice note drafts visible via
`list_notes`, and either an approved schedule or a clear pending-approval state.
Nothing published or scheduled without the user saying yes.
