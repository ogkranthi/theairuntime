---
module: 15
title: "Production Failure Gauntlet"
duration: "90-120 min"
goal: "Run every failure at once against your deployed agent, measure it, and publish a reliability report anyone can reproduce."
question: "Do the guarantees still hold when failures overlap?"
hook: "Everything fails at once. That is the exam."
scenario: "Timeouts, kills, duplicate requests, an injected instruction, a budget squeeze, all in one run, against your deployed system. Reality does not schedule its failures."
caseStudy: claims-processing-agent
skills: [Reliability, Chaos testing, Auditability]
technologies: [Python]
repoPath: "chaos.py"
labNumber: 14
invariant: "All twelve invariants hold at once, under combined fault load."
lab: "All of them, at once"
deliverable: "Public reliability report (GitHub) with scorecard, traces, and post-mortem"
status: published
---

Production does not schedule one educational failure at a time.

## The fault profile

Combine several independent faults.

### Content

```text
40-page vendor site
near duplicates
stale pricing
new pricing
one contradiction
prompt injection
```

### Network

```text
503 twice
connection reset
slow response
404
401
```

### Runtime

```text
kill during extraction
kill after a checkpoint
kill worker without releasing lease
redeploy during human review
```

### Concurrency

```text
two workers start together
duplicate create-run request
```

### Side effect

```text
publish commits
response is lost
```

### Security

```text
SSRF attempt
unauthorized approval
cross-tenant read attempt
```

### Budget

```text
remaining budget is insufficient for complete coverage
```

## First run: incident mode

Do not show the learner the injected fault schedule immediately.

Give them:

```text
run dashboard
run events
traces
durable state
external publish table
final report
```

Ask them to determine what happened.

This is an observability exam, not a memorization quiz.

## Invariant scorecard

Safety and correctness invariants should not disappear inside one average score.

```text
verified_requires_evidence          PASS / FAIL
committed_progress_survives         PASS / FAIL
replay_safe                         PASS / FAIL
single_publish                      PASS / FAIL
one_active_owner                    PASS / FAIL
orphan_recovered                    PASS / FAIL
bounded_retry                       PASS / FAIL
durable_human_wait                  PASS / FAIL
context_reconstructible             PASS / FAIL
unauthorized_approval_denied        PASS / FAIL
ssrf_blocked                        PASS / FAIL
budget_stop_honest                  PASS / FAIL
```

If the agent duplicates a refund/report, do not hide it inside “94% overall.”

## Semantic quality scorecard

Separately evaluate:

```text
claim supported by evidence
unknown is justified
contradiction represented honestly
report answers required questions
```

Use the validated judge methodology from Module 11 only where deterministic checks cannot answer the question.

## Efficiency scorecard

Report:

```text
wall-clock duration
model calls
tokens
cost
retry count
duplicate fetch rate
recovery overhead
human review rounds
```

Quality and cost are both engineering properties.

## Postmortem

Require:

```text
Impact
What the user observed
Timeline
First detection signal
Root cause
Contributing conditions
Why controls worked or failed
Corrective action
Regression test added
Remaining risk
```

Reject vague takeaways such as:

```text
“We learned retries are important.”
```

Prefer:

```text
“The publish client treated a read timeout as evidence that the remote write failed. The generic retry path issued a second business operation. We added stable operation identity, reconciliation by key, and a deterministic duplicate-write regression test.”
```

## Field Report

The final public artifact should contain:

```text
architecture
run lifecycle
reliability invariants
gauntlet scorecard
eval card
representative trace
incident postmortem
known limitations
reproduction command
commit SHA
model/config version
```

This should be the course credential.

The value is that another engineer can inspect and challenge the claims.

## Final standard

A learner who completes the course should be able to explain, without framework marketing language:

```text
what survives a process crash
what can execute again
why an external write can duplicate
how a worker earns ownership
how abandoned work is reclaimed
how stale workers are fenced
how a human can pause a workflow for hours
how active context is rebuilt
how tool authority is constrained
how a stuck run is detected
how an agent-quality claim is validated
```

That is production understanding.

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] The gauntlet scorecard is fully green against your deployed agent
- [ ] The post-mortem answers what failed first, design gap versus bug, and the weakest surface
- [ ] A regression test now covers the first thing that failed
- [ ] The reliability report is public and another engineer can reproduce it from your repo

</div>
