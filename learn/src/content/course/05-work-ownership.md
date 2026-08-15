---
module: 5
title: "Work Ownership: Claims, Leases, Heartbeats, and Orphans"
duration: "50-60 min"
goal: "Guarantee that exactly one worker executes a run at a time, and that a run whose worker dies is reclaimed automatically."
question: "Who is allowed to execute this run right now?"
hook: "Two workers picked up the same investigation."
scenario: "Scale-out day: a second worker joins the incident agent. Both claim the same run, every model call happens twice, and the bill doubles before anyone sees it."
caseStudy: incident-response-agent
skills: [Leases, Ownership, Scheduling]
technologies: [Python, PostgreSQL]
repoPath: "05_scheduler.py"
labNumber: 5
invariant: "I5 + I6: at most one valid claim authorizes execution, and orphaned work becomes runnable again."
lab: "Two Workers, One Run"
deliverable: "05_scheduler.py + claim/lease migration + orphan recovery test"
status: published
---

Checkpointing made work resumable. It did not decide who should resume it.

## The race

With one worker:

```text
Worker A → run_123
```

With two workers, naive polling can do this:

```text
Worker A                           Worker B
   │                                 │
   │ SELECT pending run              │ SELECT pending run
   │ → run_123                       │ → run_123
   │                                 │
   │ execute                         │ execute
```

Both believe they own the same job.

You now pay for duplicate model calls and duplicate tool work. Module 04's idempotency may protect the final write, but ownership should stop the duplicate work earlier.

## What a scheduler actually needs to answer

Before introducing queue products, teach the underlying questions:

```text
Which runs are ready?
Which worker owns each run?
When does that ownership expire?
How does an abandoned run become available again?
```

## Claim

A **claim** is an atomic state change that grants a worker authorization to execute a run.

Conceptually:

```text
worker-7 owns run_123
```

The selection and claim cannot be separate raceable operations.

## Why SELECT then UPDATE is unsafe

Bad:

```python
run = select_pending_run()
claim(run)
```

Two processes can select the same row before either updates it.

This is a **race condition**: correctness depends on timing between concurrent operations.

## Atomic PostgreSQL claim

Use a transaction/row lock pattern such as:

```sql
WITH candidate AS (
    SELECT run_id
    FROM runs
    WHERE
        status = 'pending'
        OR (
            status = 'running'
            AND lease_expires_at < now()
        )
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE runs
SET
    status = 'running',
    lease_owner = $1,
    lease_expires_at = now() + interval '60 seconds'
WHERE run_id IN (SELECT run_id FROM candidate)
RETURNING *;
```

Explain the SQL rather than presenting it as magic.

`FOR UPDATE` locks the selected row inside the transaction.

`SKIP LOCKED` tells another worker to skip rows already claimed by a concurrent transaction rather than waiting and then taking the same work.

## Lease

A permanent lock would strand work when a worker dies.

A **lease** is temporary ownership.

```text
worker-7 owns run_123 until 16:05:00
```

The worker must renew it before expiry.

If it disappears, the lease eventually expires and another worker can reclaim the run.

## Heartbeat

A **heartbeat** is periodic evidence that a worker is alive.

```sql
UPDATE runs
SET
    heartbeat_at = now(),
    lease_expires_at = now() + interval '60 seconds'
WHERE
    run_id = $1
    AND lease_owner = $2;
```

Important distinction:

```text
heartbeat = worker appears alive
progress  = useful business state changed
```

A worker can heartbeat while stuck forever. Module 09 will detect that.

## Orphan

An **orphaned run** is unfinished work whose previous ownership is no longer valid.

Example:

```text
status = running
owner = worker-7
lease_expires_at = 15:00
now = 15:07
```

The run is eligible for recovery.

## Fencing tokens: deeper production correctness

A lease timestamp alone has a subtle race.

Timeline:

```text
Worker A owns run
  ↓
A pauses for 90 seconds
  ↓
lease expires
  ↓
Worker B claims run
  ↓
A wakes up and continues
```

If A can still commit authoritative writes, you have split ownership.

Use an ownership generation/fencing token:

```text
A owns generation 18
B reclaims and receives generation 19
```

Every authoritative worker mutation requires the current generation:

```sql
UPDATE runs
SET ...
WHERE run_id = $1
AND lease_generation = $2;
```

A stale worker with generation 18 can no longer commit after generation 19 exists.

This is a valuable advanced detail because it explains what a robust lease is protecting against.

## Cancellation

Cancellation should be durable too.

```sql
UPDATE runs
SET cancel_requested = true
WHERE run_id = $1;
```

The worker checks at safe boundaries:

```python
if run.cancel_requested:
    transition_to_cancelled()
    return
```

Do not make “cancel” depend only on killing one process; another worker could otherwise resume it.

## Backpressure

Long-running work can be created faster than workers can process it.

Add limits such as:

```text
max active runs
max active runs per tenant
max concurrent model calls
max run cost
```

Scheduling is partly a cost-control problem.

<div class="callout failure-lab">

**FAILURE LAB 05: Two Workers, One Run**

1. Start two workers with broken select-then-update claiming.
2. Observe duplicate execution.
3. Replace it with atomic claim.
4. Prove at most one current owner.
5. Kill that worker.
6. Wait for lease expiry.
7. Verify a second worker reclaims and resumes.
8. Advanced: let the stale first worker wake up and prove its old fencing token cannot commit.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why does checkpointing not solve ownership?
2. What is a race condition?
3. Why must a claim be atomic?
4. Why does a lease expire?
5. Why can a fencing token be stronger than only checking time?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] Claiming is one atomic statement with FOR UPDATE SKIP LOCKED
- [ ] Heartbeat extends the lease inside the step loop, not in a background thread
- [ ] Every commit is fenced with owner and lease predicates, and a zero-row write aborts the worker
- [ ] An orphaned run is reclaimed within one lease interval, automatically
- [ ] Cancellation is honored at the next step boundary via the status column

</div>

## Primary sources

- [Temporal's AI cookbook](https://docs.temporal.io/ai-cookbook/openai-agents-sdk-python) shows what claim, lease, heartbeat and reclaim look like when a durable workflow engine owns them; compare each concept to the table you just built.
