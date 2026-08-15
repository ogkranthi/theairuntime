---
module: 4
title: "Idempotency, Side Effects, and Reconciliation"
duration: "50-60 min"
goal: "Learn the concept most agent tutorials skip: a checkpoint does not guarantee an external operation happened exactly once."
question: "What if an external action happened, but the agent never received the success response?"
hook: "The customer got two refunds. The agent swears it sent one."
scenario: "The account agent issues a refund, the API times out after the money moves, and the retry issues it again. Nobody notices until finance does."
caseStudy: customer-account-agent
skills: [Idempotency, Side effects]
technologies: [Python, PostgreSQL]
repoPath: "04_publish.py"
labNumber: 4
invariant: "I4: one logical publish produces at most one external report."
lab: "Duplicate Report"
deliverable: "04_publish.py + published_reports migration"
status: published
---

This is one of the most important concepts in the course because checkpointing does not solve it.

## First define a side effect

A **side effect** is an operation that changes something outside the workflow's internal state.

Examples:

```text
send email
issue refund
publish report
create Jira ticket
write CRM record
deploy code
change permissions
```

Fetching a page is usually a read.

Publishing the final report is a side effect.

## The ambiguous-failure timeline

```text
Agent                     Report API
  │                           │
  │ POST /reports             │
  ├──────────────────────────►│
  │                           │ create report #1001
  │                           │ commit
  │                           │
  │             response      │
  │◄────────────── X ─────────┤
  │
  │ timeout
```

The agent knows:

```text
I did not receive a success response.
```

It does **not** know:

```text
The report was not created.
```

That distinction is the core problem.

## Possible external reality after an error

A write may be:

```text
not performed
performed completely
performed partially
```

The client may not know which one is true.

## Why generic retries are dangerous

Naive code:

```python
for attempt in range(3):
    try:
        return publish_report(report)
    except TimeoutError:
        continue
```

If the first attempt committed and only its response was lost:

```text
attempt 1 → report #1001
attempt 2 → report #1002
```

The retry turned uncertainty into duplication.

## Idempotency

An operation is **idempotent** when repeating the same logical operation does not produce an additional unintended business effect.

Logical operation:

```text
Publish the final report for run_123.
```

Stable operation identity:

```python
idempotency_key = "run_123:publish_final"
```

The same key must be reused across retries.

Bad:

```python
f"run_123:attempt_{attempt}"
```

That creates a new operation identity on every attempt.

## Enforce identity where you own the target

```sql
CREATE TABLE published_reports (
    report_id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE,
    body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Now the database itself prevents two final reports for the same run.

## Request hash

A deeper production detail: the same idempotency key should not silently accept a different request.

Store:

```text
effect_key
request_hash
external_id
status
```

Behavior:

```text
same key + same request
    → return previous result

same key + different request
    → conflict; investigate
```

This prevents accidental reuse of one key for two meanings.

## Side-effect journal

Create an application-owned record before/around an important external action:

```sql
CREATE TABLE side_effects (
    effect_key TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    effect_type TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    external_id TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Status might be:

```text
planned
in_flight
succeeded
needs_reconciliation
failed
```

This gives the system something durable to inspect after a crash.

## Reconciliation

**Reconciliation** means querying external reality after an ambiguous result before deciding whether another write is safe.

```text
publish timed out
  ↓
status = needs_reconciliation
  ↓
query report service by stable key/reference
  ↓
report exists?
  ├─ yes → record external ID, mark succeeded
  └─ no  → retry same logical operation if safe
```

If an external service provides neither idempotency nor a way to query by a stable business reference, autonomous writes to it are much harder to make reliable.

That is an architectural constraint, not a prompt problem.

## Exactly-once language

Do not casually claim “exactly once” across arbitrary distributed systems.

A practical design is often:

```text
at-least-once attempts
+ stable operation identity
+ deduplication/idempotent target
+ reconciliation
= one intended business effect
```

Be explicit about the mechanism.

## Transaction boundary

A database transaction can make changes atomic **inside that database**.

It does not magically include a remote SaaS API.

If you must update local state and later notify another system, introduce the outbox pattern as an advanced production extension:

```text
local DB transaction
  ├─ update business state
  └─ insert outbox event
commit

outbox dispatcher
  ↓
external API
```

The dispatcher may still deliver more than once, so the external effect still needs stable identity.

<div class="callout failure-lab">

**FAILURE LAB 04: Duplicate Report**

Fixture behavior:

```text
attempt 1:
  create report
  drop response

attempt 2:
  return normally
```

The naive version should duplicate the report.

The repaired version must prove:

```sql
SELECT COUNT(*)
FROM published_reports
WHERE run_id = 'run_123';
```

returns `1`.

</div>


## Side-effect risk classes

Teach this classification:

```text
READ
search, fetch, inspect

REVERSIBLE WRITE
create a draft, create temporary branch

EXTERNAL / IRREVERSIBLE WRITE
send, publish, charge, refund

PRIVILEGED WRITE
delete, change access, production deploy
```

The stronger the effect, the stronger the identity, authorization, review, and audit requirements.

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why does a timeout not imply that the remote operation failed?
2. What makes an idempotency key stable?
3. Why can the same key plus a different payload be dangerous?
4. What is reconciliation?
5. Why is generic retry unsafe for side effects?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] Publish converges under retry, replay, and kill-inside-the-node: one row, always
- [ ] The idempotency key derives from run position and survives process death
- [ ] For a third-party API without idempotency keys, check-before-act is implemented and the external id is recorded the moment it returns
- [ ] You said the takeaway sentence out loud in a design review, or at least rehearsed it

</div>
