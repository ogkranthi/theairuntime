---
module: 13
title: "Industry Architectures & Case Studies"
duration: "45-60 min"
goal: "Recognise the same six primitives you built inside every credible production long-running agent, and spot the marketing that hides their absence."
question: "How do real systems instantiate the same primitives?"
deliverable: "case_study_extraction.md + re-classified exercise_00"
status: published
---

Everything in this module maps back to what you already built. Read each case study looking for **State · Execution · Context · Control · Observability · Evaluation**, the Module 00 diagram. This module is also the written companion to the **FDE Talks Podcast**: each case study is an episode with a practitioner who shipped it.

## Lesson 13.1: The pattern that keeps appearing

Across public engineering write-ups from labs and companies shipping long-running agents, the same primitives recur:

```text
External artifacts        plan files, progress logs, git commits, feature lists
Explicit done criteria    tests, checklists, coverage, never "the model said so"
Separate verification     judge / test ratchet / human gate, not self-grading
Clean handoffs            fresh context per session/sub-agent + structured notes
Durable execution         checkpoints, event logs, resumable identity
HITL at high stakes       approval before irreversible side effects
```

Pure "set and forget" autonomy still fails more often than the marketing claims. When a case study lacks one of the six, that is the interesting question to ask its authors.

## Lesson 13.2: Software engineering (the most mature domain)

**Autonomous coding harnesses (Anthropic, Cursor, OpenHands, others).** Multi-hour runs are now routine. Common design: a *brain* (planner) separated from *hands* (executor) with sessions that hand off through files in the repo: plan, progress log, test results. The codebase is the durable state; the test suite is the done criterion; git worktrees isolate parallel workers; a judge role or test ratchet stops "I finished" from being taken on faith.

Map it: State = repo + plan file. Execution = session restarts. Context = fresh worker per task + notes. Control = tests as gates. Observability = commits + logs. Evaluation = test pass rate + review.

## Lesson 13.3: Enterprise operations

**Managed agent platforms (e.g. Google's Agent Platform with sessions + memory bank, LangSmith deployments, Azure AI Foundry agents).** The vendor sells the checkpointer, session store, and HITL primitives you built by hand in Modules 03 to 07. Knowing what is underneath is what lets you evaluate one.

**Regulated back-office (banks, insurers, healthcare):** legacy modernisation, credit-memo drafting, prior-authorisation review, claims triage. What makes them work in production is never the model: it is policy-as-code gates, evidence-linked outputs, audit event logs, and human approval before anything external happens. Exactly Modules 04, 07, 09.

## Lesson 13.4: Long-horizon experiments in the open

**Agents running small businesses / open-ended goals for weeks** (public experiments by labs and independent groups) surface failure modes coding agents hide: prioritisation drift, susceptibility to manipulation, loops with no progress, and confident wrongness about their own state. Read them as extended Failure Labs.

## Lesson 13.5: Other verticals

Procurement assistants, security-investigation multi-agent systems, field-engineering expert agents, clinical workflows with strict policy gates. Same six primitives, different tools.

## Exercise 13: Case study extraction

Pick two published case studies (from the module's link list or ones you find). For each, fill:

```text
Domain:
Durable state lives in:
Done criterion:
Verification role:
Handoff mechanism:
Recovery story:
HITL point(s):
What is missing / unclear:
One question I'd ask the authors:
```

Then re-do Exercise 00's twelve classifications. Note what changed and why.

<div class="callout deliverable">

**Deliverable:** `case_study_extraction.md` (two case studies) and your re-classified `exercise_00_classification.md`.

</div>

<div class="callout note">

**FDE Talks Podcast.** Every episode aligned to this module ends with the same six-primitive extraction, live, with the guest. Guest suggestions and your own case-study submissions: see the contact page.

</div>

<div class="callout takeaway">

**Production takeaway:** you can now read any agent architecture and say what it will do when the process dies. Most people can't.

</div>

## Primary sources

- [Anthropic, how we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system): a production long-horizon system described with unusual candor; extract the six primitives from it as your first exercise case.
- [OpenAI, harness engineering](https://openai.com/index/harness-engineering/) and [unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/): the coding-agent architecture in Lesson 13.2, from the team shipping it.
- [Replit, evaluating and improving Agent at scale](https://replit.com/blog/evaluating-and-improving-agent-at-scale): evals as the development loop at production scale, which is Module 11's argument made by someone with millions of runs.
