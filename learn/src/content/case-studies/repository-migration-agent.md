---
title: Repository Migration Agent
category: Developer Tools
summary: A coding agent that migrates a large codebase over many sessions, with plans, parallel workers, and verification that does not take "I finished" on faith.
concepts: [coding agents, planning, repository context, parallel work, verification]
customerAsk: "Migrate two hundred files off the deprecated library without freezing feature work for a quarter."
realRequirement: Multi-session work with durable plans, isolated parallel workers, repository-scale context discipline, and a test ratchet as the done criterion.
courses: [course-001]
modules: [12]
---

## The customer problem

A platform team must migrate a 200-file codebase from library A to library B. Done by hand
it is a quarter of grind; done by an agent in one heroic session it fails on context limits
and unreviewable diffs. The work must span sessions, parallelize safely, and prove itself.

## Architecture shape

A planner produces a migration plan as a file in the repo. Workers take file-scoped tasks in
isolated worktrees; the test suite is the done criterion per task; a ratchet forbids
regressions. Sessions hand off through the plan and progress files, so any session can die
and the next one continues. The codebase itself is the durable state.

## The decisions that matter

- **The repo is the checkpoint store.** Plans, progress and diffs live in files and
  branches, which makes resume trivial and review natural.
- **Verification is separate from generation.** The test ratchet, not the model's summary,
  decides whether a task is done.
- **Parallelism is bounded by isolation.** Worktrees keep workers from stepping on each
  other, the same ownership problem as any long-running system.

## Where Course 001 uses this case

The Deep Agents bridge (Module 12) studies this shape directly, and it recurs across the
industry architectures survey.
