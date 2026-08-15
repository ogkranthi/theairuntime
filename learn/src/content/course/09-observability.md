---
module: 9
title: "Observability and Run UX"
duration: "45-60 min"
goal: "Make every run explainable to a human in under a minute, from the dashboard, from the trace, and from the database."
question: "Can a human tell what the run is doing, whether it is stuck, and what happened after failure?"
hook: "The run looks dead. Is it?"
scenario: "A fetch has hung for 41 seconds. The dashboard, the trace and the event log each answer a different question about it, and an operator needs all three."
caseStudy: incident-response-agent
skills: [Tracing, Event logs, Run UX]
technologies: [Python, HTMX, LangSmith]
repoPath: "dashboard.html"
labNumber: 9
invariant: "I10: an operator can determine what a run is doing and why."
lab: "Silent Run"
deliverable: "dashboard.html + tracing config + runs/events tables"
status: published
---

## Three audiences

Design observability for different users.

### Reviewer/user

Needs:

```text
progress
evidence
unknowns
what is waiting on me
```

### Operator

Needs:

```text
is the run alive?
is it making progress?
who owns it?
is the lease healthy?
can I cancel/recover it?
```

### Engineer

Needs:

```text
model inputs/outputs
tool calls
latency
exceptions
state transitions
retries
versions
```

A raw trace is not a good end-user progress UI.

## Logs, traces, metrics, and audit events

Explain the difference.

### Logs

Diagnostic records.

```text
worker started
timeout calling vendor
retry scheduled
```

### Traces

A causal tree/timeline for one execution.

```text
run_123
  ├─ plan next action
  │    └─ model call
  ├─ fetch pricing
  │    └─ HTTP call
  └─ verify evidence
       └─ model call
```

### Metrics

Aggregated numerical behavior across many runs.

```text
p95 duration
run failure rate
median cost
orphan count
```

### Audit events

Business-significant facts that must be independently inspectable.

```text
approval requested
approval received
publish attempted
publish reconciled
run cancelled
```

Do not depend on parsing debug logs to reconstruct an approval audit trail.

## Application event table

```sql
CREATE TABLE run_events (
    event_id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type TEXT NOT NULL,
    node TEXT,
    attempt INT,
    payload JSONB NOT NULL
);
```

Useful events:

```text
run_created
work_claimed
node_started
node_completed
node_failed
retry_scheduled
evidence_added
checkpoint_committed
approval_requested
approval_received
cancel_requested
side_effect_started
side_effect_reconciled
run_terminal
```

## Correlation

Every important model/tool/runtime record should include:

```text
run_id
```

Often also:

```text
thread_id
worker_id
code_version
model_id
```

Without correlation IDs, production debugging becomes timestamp archaeology.

## Alive versus making progress

This must be a major concept.

A recent heartbeat means:

```text
worker appears alive
```

It does not mean:

```text
run is accomplishing useful work
```

Track:

```text
last_heartbeat_at
last_progress_at
```

Define progress as a meaningful state change, for example:

```text
new evidence
requirement verified
contradiction found
human decision received
```

## Silent loop example

```text
planner chooses page A
planner chooses page B
planner chooses page A
planner chooses page B
...
```

The worker can heartbeat forever.

The HTTP service is healthy.

Nothing throws an exception.

The run is still bad.

Add a progress watchdog:

```python
if decisions_since_progress > 8:
    emit("suspected_loop")
    pause_or_replan()
```

## Operator dashboard

The top of the page should answer operational questions quickly:

```text
Run: run_123
Status: researching

Owner: worker-2
Lease remaining: 38s
Last heartbeat: 3s ago
Last useful progress: 42s ago

Current requirement: security
Coverage: 3 / 5
Unknowns: 1
Errors: 2 transient

Model calls: 17
Cost: $0.14 / $0.40
Pages fetched: 11

[Cancel] [Pause] [Open trace]
```

Then show a compact event timeline and evidence-backed progress.

## Cost attribution

Long-running systems must answer:

```text
What did this run cost?
What caused the cost?
```

Track cost by at least:

```text
run
model
operation type
code version
```

For multi-tenant systems, also tenant/user.

## SLO thinking

Introduce service-level indicators without inventing universal thresholds.

Examples:

```text
accepted runs reaching a terminal state
orphan recovery time
approval-to-resume latency
duplicate side-effect count
time to first useful progress
```

Choose thresholds from business consequence, not tutorial convention.

<div class="callout failure-lab">

**FAILURE LAB 09: Silent Run**

Create a planner loop with:

```text
process alive = yes
heartbeats = yes
new durable progress = no
```

A passing implementation surfaces:

```text
alive = true
making_progress = false
suspected_loop = true
```

The operator should discover this from the dashboard/events without reading source code.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why are logs and audit events different?
2. What does a trace show that a metric does not?
3. Why is a heartbeat not proof of progress?
4. What belongs in an operator view?
5. How can a run be unhealthy while every process is healthy?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] run_events is append-only, and every node writes started plus finished or failed
- [ ] Every LLM decision event records the model's stated reason
- [ ] The dashboard answers the operator questions live, with a working Cancel
- [ ] The three alerts exist as queries, tested against seeded events
- [ ] A colleague explained a run from the database in under a minute, timed

</div>
