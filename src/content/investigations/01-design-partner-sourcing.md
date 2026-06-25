---
id: "01"
slug: "design-partner-sourcing"
title: "Can a sourcing agent hit a hard reliability bar under a fixed budget?"
question: "Does selective source-verification buy enough precision to justify its cost and recall hit?"
status: "investigating"
customer: "Two-person pre-seed dev-tools startup, no growth hire."
problem: "50 qualified design-partner candidates per week from messy public data, under a real budget."
summary: "An FDE-style investigation into reliable design-partner sourcing on Tavily, Apify, and a verification layer, measured against a frozen rubric and a blind golden set."
pillar: "Lessons from the Trenches"
started: 2026-06-25
updated: 2026-06-25
stages:
  - stage: "Question"
    state: "done"
    note: "Customer problem framed and the reliability bar set at the rubric's qualified-precision threshold."
  - stage: "Hypothesis"
    state: "done"
    note: "H1 selective verification on boundary candidates; H2 widen retrieval to recover the recall it costs."
  - stage: "Experiment"
    state: "active"
    note: "Smallest system wired on Tavily, Apify, and a separable verification layer. Baseline run next."
  - stage: "Evaluation"
    state: "todo"
    note: "Blind golden set and frozen rubric; baseline versus selective-verification ablation."
  - stage: "Reliability"
    state: "todo"
  - stage: "Production Trial"
    state: "todo"
  - stage: "Field Report"
    state: "todo"
repo: "https://github.com/ogkranthi/the-ai-runtime-lab"
evalUrl: "https://github.com/ogkranthi/the-ai-runtime-lab/tree/main/eval-harness"
tags: ["agents", "evaluation", "reliability", "retrieval"]
---

## Why this is not a solved problem

"Find me 50 leads" looks solved. There are dozens of sourcing tools, a working
demo is a weekend, and a language model will happily return a list of companies
that look right. The hard part is not generating candidates. It is generating
candidates that survive a second look, every week, without a human re-checking
each one, and without the bill growing faster than the pipeline.

Off-the-shelf tools fail this in specific ways. Lead databases sell stale rows
and over-index on companies large enough to have been indexed, which is the
opposite of a pre-seed design partner. General web agents hallucinate a
plausible contact and a plausible reason, and the failure is invisible until a
founder sends a cold email to a person who left two years ago. Both are tuned
for recall and demo coverage, not for precision under a frozen definition of
"qualified."

The constraint that makes this an engineering problem, not a procurement one:
the customer is two people with no growth hire and a real budget. They cannot
absorb a 30% false-positive rate by manually filtering, and they cannot pay
per-seat enrichment pricing across hundreds of speculative rows. The question is
whether a verification layer can be added selectively, on the candidates that
matter, so precision clears the bar without the cost or the recall loss making
it pointless.

## Open questions

These are unresolved as of the latest log entry. They are the reason this is an
investigation and not a tutorial.

- What is the precision floor a two-person team will actually trust enough to
  send cold outreach without a manual pass? The rubric assumes it, the field
  trial has to confirm it.
- Does verification need to run on every candidate, or only on the ones near the
  qualification boundary? Verifying everything is the safe default and the
  expensive one.
- How much recall does selective verification cost? A precise pipeline that only
  surfaces 18 candidates a week misses the target as badly as a noisy one.
- Does the qualification rubric hold across verticals, or is it silently fit to
  the seed customer's market? The blind golden set is meant to catch this.
- What is the real per-qualified-candidate cost once retries, re-crawls, and
  verification calls are counted, not just the happy path?

## Constraints

The investigation is scoped to one customer shape and one set of hard limits, so
the result is falsifiable rather than general.

- **Volume:** 50 qualified candidates per week, sustained, not a one-time batch.
- **Budget:** a fixed monthly tooling spend that has to cover retrieval,
  crawling, verification, and model calls combined. The per-qualified-candidate
  cost is the headline metric, not raw throughput.
- **Data:** public sources only. Company sites, job boards, public profiles,
  press. No purchased contact database, no private graph.
- **People:** no analyst in the loop on the weekly run. A human reviews the
  rubric and spot-checks, but does not hand-qualify rows.
- **Definition of qualified:** frozen in a written rubric before any tuning, so
  the target cannot drift to match whatever the pipeline happens to produce.

## Architecture

The smallest system that can test the thesis, nothing speculative.

- **Retrieval (Tavily):** structured search over public sources to produce raw
  candidate companies and a first-pass reason-to-believe.
- **Crawl and extract (Apify):** targeted crawls on the surviving candidates to
  pull the signals the rubric scores: recent hiring, stack, stage markers,
  public contact surface.
- **Verification layer:** a separate pass that re-checks the load-bearing claims
  against a second source before a candidate is marked qualified. This is the
  layer under test. It is the expensive step and the one that buys precision.
- **Scoring:** the frozen rubric applied as a deterministic scorer, so a given
  candidate gets the same verdict on every run.

The verification layer is deliberately separable. The baseline runs retrieval
plus scoring with no verification. The treatment adds selective verification.
The whole point is to measure the delta.

## Targets and hypotheses

- **Reliability bar:** precision at or above the rubric's qualified threshold on
  a blind golden set, sustained across weekly runs, not on a single favorable
  sample.
- **Throughput bar:** 50 qualified candidates per week after verification, not
  before.
- **Cost bar:** per-qualified-candidate cost under the budget ceiling with the
  verification layer included.
- **Hypothesis (H1):** selective verification on boundary candidates raises
  precision enough to clear the bar while costing less than verifying every
  candidate.
- **Hypothesis (H2):** the recall lost to verification is recoverable by widening
  retrieval, because the bottleneck is precision, not raw candidate supply.

## Eval plan

- **Golden set:** a blind, hand-labeled set of companies with qualified or
  not-qualified verdicts, built before the pipeline is tuned and held out from
  every tuning loop.
- **Frozen rubric:** the qualification criteria are written down and versioned.
  Any change to the rubric is a new rubric version, re-scored from scratch, never
  an in-place edit.
- **Metrics:** precision and recall against the golden set, per-qualified-
  candidate cost, and weekly sustained throughput. Precision is the gate.
- **Ablation:** baseline (no verification) versus treatment (selective
  verification) on the same golden set, so the precision and cost delta is
  attributable to the layer and nothing else.
- **Field trial:** once the harness numbers clear the bar, a live weekly run for
  the seed customer, measured against the same rubric, to test whether harness
  precision survives real messy input.

## Decision records

### DR-001: Cheap pass before enrichment

Run the cheap retrieval and scoring pass first, and only spend on crawl and
verification for candidates that survive it. Verifying every raw candidate is
simpler to reason about but blows the budget on rows that the rubric rejects on
free signals alone. The cost is added pipeline complexity and a risk that the
cheap pass drops a candidate that verification would have saved. We accept that
risk and measure the recall hit explicitly in the ablation.

### DR-002: Freeze the rubric before tuning

The qualification rubric is written and versioned before any pipeline tuning,
and the golden set is labeled against it blind. The temptation is to let
"qualified" drift toward whatever the pipeline produces well, which manufactures
a passing grade. Freezing the rubric makes the precision number mean something a
third party can check. The cost is that an early-frozen rubric may be wrong; we
handle that by versioning, not by silent edits.

### DR-003: Selective verification, not universal

Verification runs only on candidates near the qualification boundary, where a
second source changes the verdict. Candidates that are clearly qualified or
clearly rejected on first-pass signals skip it. This is the core bet of the
investigation: that precision is won at the boundary, so spend belongs there. If
the ablation shows boundary-only verification underperforms universal
verification on precision, this decision is wrong and gets reversed.

## Investigation log

The log is dated newest-last. It is the running record of what actually
happened, including the parts that did not work.

- 2026-06-25: Brief published. Rubric v1 frozen. Eval harness next.
- 2026-06-25: Artifacts repo wired up. Code and eval-harness links now point to the dedicated the-ai-runtime-lab repo. Baseline run next.
