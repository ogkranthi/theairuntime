---
title: Incident Response Agent
category: Enterprise Operations
summary: A production investigation agent that fans out across logs, metrics, deploys and tickets, survives partial failure, and synthesizes a defensible incident narrative.
concepts: [parallel execution, partial failure, long-running agents, observability, synthesis]
customerAsk: "When something breaks at 3am, we want a first investigation done before the on-call engineer is even awake."
realRequirement: Parallel evidence gathering across systems that fail independently, with progress that survives worker loss and a synthesis a human can audit under pressure.
courses: [course-001]
modules: [3, 5, 6, 9, 14]
---

## The customer problem

A platform team runs hundreds of services. When an incident fires, the first forty minutes
are spent gathering: recent deploys, error budgets, adjacent alerts, similar past incidents,
suspicious config changes. The on-call engineer does this half-asleep, and the quality of the
eventual fix depends on the quality of this sweep.

The ask is speed. The real requirement is trustworthy parallelism: six investigation tasks
running at once against systems that each fail in their own way, folding into one narrative
with every claim traceable to its source.

## Architecture shape

An orchestrator decomposes the incident into investigation tasks (deploy diff, log cluster,
metric anomaly, dependency scan, incident history, config drift). Workers claim tasks with
leases; each task checkpoints independently; a synthesis step waits for all tasks, tolerating
declared partial results. Every finding carries evidence pointers into the source system.

## The decisions that matter

- **Partial results are first-class.** A task that cannot complete (log store timeout)
  reports an honest gap; synthesis proceeds and says what is missing. Blocking the whole
  investigation on the slowest system would defeat the purpose.
- **A worker dying mid-task must not restart the investigation.** Checkpointed task state
  and lease-based reclaim keep a 37-minute investigation alive through worker loss.
- **Synthesis is evidence-linked**, because at 3am nobody trusts an unsourced paragraph.

## Where Course 001 uses this case

Durable execution (Module 03), work ownership (Module 05), failure routing (Module 06),
observability (Module 09), and deploy-survival (Module 14) all ground their scenarios here.
