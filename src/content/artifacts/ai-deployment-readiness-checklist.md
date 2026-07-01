---
title: AI Deployment Readiness Checklist
artifact_type: checklist
use_case: Before an AI system that worked in a demo is allowed to touch a real workflow.
problem_solved: Demos that ship on answer quality and fail on everything around the answer.
status: available
date: 2026-06-27
---

## When to use it

Run this before an AI system that worked in a demo is allowed to touch a
real workflow: real users, real data, real consequences. It is written for
the person accountable for the rollout, not the person who built the demo.

## What problem it solves

AI systems rarely fail because the demo could not produce an answer. They
fail because the surrounding system cannot handle stale data, weak evidence,
conflicting sources, policy boundaries, permissions, cost, latency,
escalation, and ownership. This checklist walks that surrounding system,
section by section.

## The checklist

### 1. The problem and the bar

- [ ] The workflow being improved is written down, with a named owner.
- [ ] "Solved" is defined as a measurable bar, agreed before the build.
- [ ] The bar grades two directions: catching the bad and keeping the good.
- [ ] Someone can say what happens if the system is simply not used.

### 2. Data and grounding

- [ ] Every claim the system makes can be traced to a source.
- [ ] Freshness is checked: evidence carries a timestamp and time-sensitive
      claims fail closed on old evidence.
- [ ] Conflicting sources route to review, not to a silent pick.
- [ ] Missing evidence produces a missing field, not a guess.

### 3. Evals

- [ ] A frozen eval set exists, with known answers, including planted
      failure cases, not just happy paths.
- [ ] The eval runs in one command and prints pass or fail against the bar.
- [ ] The rubric is versioned. Rules change by re-scoring from scratch,
      never by editing a rule to match what the system already produces.

### 4. Failure handling

- [ ] The system degrades instead of padding: it hands over what it can
      stand behind and names the gaps.
- [ ] Every rejection or refusal carries a reason.
- [ ] There is a defined escalation path to a human, and that human knows
      they are on it.

### 5. Observability

- [ ] Each output emits a trace: inputs, sources, checks run, what was
      rejected and why.
- [ ] Someone can answer "why did it say that" for any single output,
      after the fact.
- [ ] Quality is measured in production, not only at ship time.

### 6. Boundaries and permissions

- [ ] The system's authority is written down: what it may read, what it may
      write, what it may send, and on whose behalf.
- [ ] Policy and fit logic is separated from truth checking, so business
      rules never contaminate verification.
- [ ] Data leaving the boundary (to models, tools, or third parties) is
      known and approved.

### 7. Cost and latency

- [ ] Cost per run is measured, and someone has multiplied it by the real
      volume.
- [ ] Latency is acceptable at the workflow's real cadence, not the demo's.
- [ ] There is a cheaper degraded mode if the budget or the provider fails.

### 8. Ownership

- [ ] A named person owns the system after launch, including the eval set,
      the rubric, and the escalation path.
- [ ] There is a plan for the first bad week: how it is detected, who rolls
      it back, and what the workflow falls back to.

## How to read the result

Unchecked boxes are not blockers by default. They are the risk register.
The honest output of this checklist is a sentence of the form: "we are
shipping with these gaps, on purpose, and this person owns them."
