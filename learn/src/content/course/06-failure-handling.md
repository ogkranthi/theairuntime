---
module: 6
title: "Failure Handling, Retries, Timeouts, and Degradation"
duration: "60 min"
goal: "Stop treating every exception as retry(3). Build a failure taxonomy and route each class differently."
question: "When something fails, what should happen next?"
hook: "The log store is down. Should the investigation die?"
scenario: "One of six evidence sources times out. A blind retry hammers the degraded system; giving up throws away five good results. Neither is the answer."
caseStudy: incident-response-agent
skills: [Failure taxonomy, Retries, Degradation]
technologies: [Python]
repoPath: "failure_policy.py"
labNumber: 6
invariant: "I7: retry behavior is error-class specific and finite."
lab: "Failure Matrix"
deliverable: "failure_policy.py"
status: published
---

“Retry three times” is not a failure strategy.

## Step 1: classify the failure

The first production decision is not “how many retries?”

It is:

> What kind of failure is this?

## Transient infrastructure failure

Examples:

```text
503
429
connection reset
temporary DNS problem
```

Often retryable.

## Permanent failure

Examples:

```text
resource does not exist
credential permanently lacks access
operation unsupported
```

Repeating the same call unchanged will not fix it.

## User/configuration failure

Examples:

```text
missing credential
invalid root URL
required authorization absent
```

The system may need human/configuration input.

## Model-recoverable failure

Examples:

```text
invalid structured output
bad tool argument
poor query
```

The correct path may be to expose the structured error to the planner and let it choose a corrected action.

That is different from infrastructure retry.

## Ambiguous external write

Example:

```text
publish timed out after remote commit may have happened
```

This routes to reconciliation, not blind retry.

## Unexpected software failure

Examples:

```text
KeyError
state invariant violation
corrupt artifact
```

A deterministic software bug usually fails again if retried unchanged.

Fail fast, capture evidence, and alert rather than hiding it behind repeated attempts.

## Retry policy

A real retry policy includes:

```python
RetryPolicy(
    max_attempts=4,
    initial_backoff_s=1,
    max_backoff_s=20,
    timeout_s=15,
    jitter=True,
    retryable_errors={
        RateLimitError,
        ServiceUnavailable,
        ConnectionResetError,
    },
)
```

## Exponential backoff

Instead of:

```text
retry now
retry now
retry now
```

use something like:

```text
1 second
2 seconds
4 seconds
8 seconds
```

up to a configured cap.

## Jitter

**Jitter** adds randomness to retry timing.

Why?

If 500 workers see the same outage at the same time and all retry at exactly 2, 4, and 8 seconds, they create synchronized traffic spikes.

Jitter spreads those attempts out.

## Timeouts are layered

Explain separately:

```text
connection timeout
    how long to establish a connection

read timeout
    how long to wait for response data

operation timeout
    maximum duration of one logical tool operation

run deadline
    maximum duration/age of the business run
```

A hung tool call should not consume the entire workflow's time budget by accident.

## Retry budget

Per-call retry policies can multiply across a run.

If 20 tool calls each retry five times, the total failure amplification is huge.

Track a run-level budget:

```python
state["retry_budget_remaining"] = 12
```

Every retry consumes from it.

## Model correction loop

Example invalid tool call:

```json
{
  "tool": "fetch_page",
  "url": null
}
```

Possible route:

```text
schema validation error
  ↓
structured observation returned to planner
  ↓
planner chooses corrected tool argument
```

Bound this loop too.

```text
max model correction steps = 5
```

## Partial completion

A run that cannot verify every requirement should not invent completeness.

Useful terminal result:

```json
{
  "status": "completed_with_unknowns",
  "terminal_reason": "budget_exhausted",
  "verified": [
    "product",
    "customers",
    "security"
  ],
  "unknown": [
    "pricing"
  ]
}
```

Partial but honest can be the correct result.

## Circuit breaker

Introduce as a system-level concept.

If a shared model provider is failing for every run, per-run retries can worsen the outage.

A circuit breaker moves through states like:

```text
CLOSED
calls allowed
  ↓ repeated failures
OPEN
calls temporarily blocked
  ↓ cooldown
HALF-OPEN
small probe traffic
  ↓ recovery
CLOSED
```

The core lab need not build a production circuit breaker, but the concept should be clear.

<div class="callout failure-lab">

**FAILURE LAB 06: Failure Matrix**

Inject:

```text
503 twice then 200
404
401
malformed model output
30-second hang
connection reset
ambiguous publish timeout
unexpected Python exception
```

Expected routes:

```text
503                  retry with backoff
404                  mark unavailable / choose alternative
401                  configuration/human action
malformed model      bounded model correction
hang                 timeout then classify
ambiguous publish    reconcile
invariant violation  fail fast + alert
```

The event log should prove which route happened.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why classify before retrying?
2. What is the difference between model correction and infrastructure retry?
3. Why does jitter matter?
4. What problem does a run-level retry budget prevent?
5. Why can partial completion be more correct than “success”?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] The failure taxonomy exists as one module mapping classes to actions, with a why per row
- [ ] Transient retries are jittered, capped, budgeted, and respect Retry-After
- [ ] A 200 with garbage content raises Poisoned and is never blindly retried
- [ ] A run that cannot verify an item degrades to an honest unknown and continues

</div>
