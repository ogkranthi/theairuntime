---
module: 4
title: "Idempotency & External Side Effects"
duration: "50-60 min"
goal: "Learn the concept most agent tutorials skip: a checkpoint does not guarantee an external operation happened exactly once."
question: "How do we survive ambiguous external writes?"
labNumber: 4
invariant: "I3: one logical publish produces at most one external report."
lab: "The Duplicate Report"
deliverable: "04_publish.py + published_reports migration"
status: published
---

## Lesson 04.1: The ambiguous failure

Our final node calls `publish_report(report)`.

Sequence:

```text
Agent
  ↓
Publish API
  ↓
Report created           ← it worked
  ↓
Network response lost
  X
Agent sees timeout       ← agent thinks it failed
```

What happened? **The agent doesn't know.**

It retries:

```text
publish_report(report)
```

Result:

```text
Report #1001
Report #1002
```

## Lesson 04.2: This isn't an LLM problem

It is distributed systems. It predates agents by decades and it will outlive them.

```text
REQUEST FAILED  ≠  OPERATION FAILED
```

Any side effect that crosses a network boundary can be in one of three states after an error: not done, done, or partially done. Your code has to be correct in all three.

## Lesson 04.3: Idempotency

Generate a key that is stable across retries:

```python
idempotency_key = f"{run_id}:publish"
```

Table:

```sql
CREATE TABLE published_reports (
  id          BIGSERIAL PRIMARY KEY,
  run_id      TEXT UNIQUE NOT NULL,
  report      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

Publish becomes:

```sql
INSERT INTO published_reports (run_id, report)
VALUES ($1, $2)
ON CONFLICT (run_id) DO UPDATE SET report = EXCLUDED.report
RETURNING id;
```

Multiple executions converge on the same outcome. Executing it once or five times leaves the database identical.

For third-party APIs you do not control, the same idea: send an `Idempotency-Key` header if supported; if not, **check-before-act** (query for an existing record keyed by your run ID before creating one), and record the external ID in your state the moment you get it.

## Lesson 04.4: Checkpoint boundaries matter

LangGraph's docs recommend idempotent node logic precisely because work near retries or interrupts may run again. Combine the two layers:

```text
Agent-level durability
        +
External-operation idempotency
        =
Safer recovery
```

Neither alone is enough.

<div class="callout failure-lab">

**FAILURE LAB 04: The Duplicate Report**

Modify `publish_report()` (fixture profile `publish_timeout_after_write`) so it:

1. writes successfully;
2. throws a timeout;
3. causes the agent to retry.

Initial result:

```text
2 published reports
```

Student must make it:

```text
1 published report
```

even if the publish node executes three times. Then kill the process *inside* the publish node and resume. Still one report.

</div>

<div class="callout deliverable">

**Deliverable:** `04_publish.py` with the idempotent write, and the `published_reports` migration.

</div>

<div class="callout takeaway">

**Production takeaway:** *"Exactly-once execution is not something I assume simply because my agent framework checkpoints state."* Say that sentence out loud in your next design review.

</div>
