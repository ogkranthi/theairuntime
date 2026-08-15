---
module: 13
title: "Industry Architectures and Case Studies"
duration: "45-60 min"
goal: "Recognise the same six primitives you built inside every credible production long-running agent, and spot the marketing that hides their absence."
question: "Can you find the same runtime concerns when the product and domain look completely different?"
hook: "Every credible system has the same skeleton."
scenario: "Coding agents, claims pipelines, incident responders, data agents: strip the marketing and the same six primitives appear, or the incident report explains why not."
skills: [Architecture tradeoffs, Case analysis]
deliverable: "case_study_extraction.md + re-classified exercise_00"
status: published
---

Do not make this page a list of logos or marketing claims.

Use one architecture extraction lens throughout.

## The extraction lens

For every system ask:

```text
BUSINESS TASK
What valuable work is delegated?

WHY AGENTIC
Which future choices cannot be fully predetermined?

STATE
What useful facts/progress must survive?

EXECUTION
Who runs the work and what happens after failure?

CONTEXT
How is the working set selected and refreshed?

CONTROL
Where can humans/policies constrain the run?

SIDE EFFECTS
What external changes can occur?

OBSERVABILITY
How do operators understand progress?

EVALUATION
What proves the output/trajectory is good?
```

## Case 1: Incident investigation

### Problem

An incident agent investigates:

```text
logs
metrics
recent deploys
tickets
service dependencies
```

### Why long-running

The system may fan out into independent investigations. Some branches fail while others produce useful evidence. The final hypothesis depends on discoveries made during execution.

### Architecture

```text
incident
  ↓
planner
  ├─ log investigation
  ├─ metric investigation
  ├─ deployment investigation
  └─ ticket investigation
          ↓
     durable findings
          ↓
   correlate hypotheses
          ↓
    human incident lead
          ↓
     final narrative
```

### Runtime mapping

```text
State          findings/evidence per branch
Execution      resumable subtasks
Context        compact hypotheses + relevant evidence
Control        investigator steering/cancellation
Observability  subtask status + trace timeline
Evaluation     factual support + recovery + utility
```

### Failure question

If three branches succeed and one log query fails, does the system throw away the successful work?

It should not.

This is the same “committed progress survives” invariant from the Vendor Review Agent.

## Case 2: Claims/document operations

### Problem

Read claim documents, apply policy, identify missing information, route uncertain cases to a reviewer, then write the decision into a system of record.

### The key production lesson

The model may be only one piece.

The high-consequence architecture includes:

```text
document identity/version
policy version
evidence provenance
human decision
authorization
external write
audit trail
```

A fluent explanation without source-document evidence is not a defensible claim decision.

## Case 3: Customer account operations

### Problem

Investigate an account and potentially:

```text
create a support draft
apply a credit
issue a refund
open an escalation
```

### The key production lesson

Tool calls are business effects.

The architecture needs:

```text
permission policy
approval thresholds
idempotency/reconciliation
audit events
```

A better model does not eliminate these distributed-systems requirements.

## Case 4: Enterprise data agent

### Problem

Answer questions across enterprise systems and data sources.

### Why long-running can appear

One question may require:

```text
permission-aware source discovery
business-definition lookup
multiple query attempts
cross-source reconciliation
semantic verification
```

### The key production lesson

Context engineering is not only token trimming.

The working context must respect:

```text
user permissions
business definitions
data freshness
source authority
current question
```

## Case 5: Repository migration agent

### Problem

Migrate a large repository across many files and working sessions.

### Durable artifacts

```text
Git commits
migration plan
progress file
test results
open failures
```

### Done criterion

Not:

```text
“The model says migration complete.”
```

But:

```text
required changes applied
build succeeds
unit/integration tests pass
migration-specific checks pass
review gate passes
```

### Context strategy

A fresh worker can reconstruct from:

```text
current task
relevant files
progress artifact
test failures
```

rather than inheriting an unlimited transcript.

## What public long-running systems keep rediscovering

The implementation differs, but mature systems repeatedly need some version of:

```text
externalized progress
explicit completion criteria
separate verification
context/handoff artifacts
recovery instead of restart
bounded tool authority
human control at high-consequence boundaries
```

Do not claim every public system implements the course architecture identically. The point is to recognize the underlying engineering questions.

## Architecture extraction exercise

Choose two primary-source production write-ups and fill:

```text
Problem:
Why agentic:
Run identity:
Durable state:
Execution owner:
Recovery semantics:
Context strategy:
Done criterion:
Human control:
External side effects:
Security boundary:
Evaluation:
Most important missing detail:
Failure test I would run:
```

The “missing detail” is often the most useful part of architecture reading.

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Which runtime questions recur across industries?
2. Why can the model be a small part of a claims system?
3. What is a credible done criterion for a repository migration?
4. Why should successful incident-investigation branches survive another branch failing?
5. When a case study says “resumable,” what would you ask next?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] Two published case studies extracted into the eight-line template, including what is missing or unclear
- [ ] Exercise 00's twelve scenarios re-classified, with notes on what changed and why
- [ ] For any architecture you read this week, you can say where durable state lives and what happens when its process dies

</div>

## Primary sources

- [Anthropic, how we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system): a production long-horizon system described with unusual candor; extract the six primitives from it as your first exercise case.
- [OpenAI, harness engineering](https://openai.com/index/harness-engineering/) and [unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/): the coding-agent architecture in Lesson 13.2, from the team shipping it.
- [Replit, evaluating and improving Agent at scale](https://replit.com/blog/evaluating-and-improving-agent-at-scale): evals as the development loop at production scale, which is Module 11's argument made by someone with millions of runs.
