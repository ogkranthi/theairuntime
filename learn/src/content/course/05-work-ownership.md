---
module: 5
title: "Work Ownership: Claims, Leases & Orphans"
duration: "50-60 min"
goal: "Guarantee that exactly one worker executes a run at a time, and that a run whose worker dies is reclaimed automatically."
question: "Who is allowed to execute a run right now?"
labNumber: 5
invariant: "I4: a run has at most one active owner, and an orphaned run is reclaimed within one lease."
lab: "Two Workers, One Run"
deliverable: "05_scheduler.py + claim/lease migration + orphan recovery test"
status: published
---

Checkpointing (Module 03) made a run resumable. It said nothing about *who* resumes it. The moment you have more than one worker process, or a worker that restarts, resumability becomes a race.

## Lesson 05.1: The race you already have

Two workers poll for runnable work:

```text
Worker A                        Worker B
SELECT ... status='pending'     SELECT ... status='pending'
  → run f72c                      → run f72c          ← same row
UPDATE status='running'         UPDATE status='running'
execute step 1                  execute step 1        ← twice
```

Both workers believe they own the run. Every model call happens twice, every fetch happens twice, and when the publish node arrives, idempotency (Module 04) is the only thing standing between you and two reports. Idempotency is the last line of defence. Ownership is the first.

## Lesson 05.2: Claim atomically

One statement, not a select-then-update:

```sql
UPDATE runs
SET status = 'running', owner = $1, lease_until = now() + interval '2 minutes'
WHERE run_id = (
  SELECT run_id FROM runs
  WHERE status IN ('pending', 'resumable')
     OR (status = 'running' AND lease_until < now())   -- orphans
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING run_id;
```

`FOR UPDATE SKIP LOCKED` is the whole trick: two workers running this concurrently get two different rows or one gets nothing. No queue infrastructure required. This is why the course delays a message broker; you should know what one is replacing.

## Lesson 05.3: Leases, not locks

A lock held by a dead process is held forever. A **lease** expires:

```text
claim         set owner + lease_until = now() + 2 min
heartbeat     every 30s while executing: extend lease_until
crash         heartbeats stop; lease expires; run becomes claimable
reclaim       another worker claims it and resumes from the checkpoint
```

The heartbeat goes in the step loop, not in a background thread. A worker that is alive but stuck (a 45s hung fetch) should be visibly stuck, holding its lease, not silently reclaimed mid-step.

```python
def run_step(run, conn):
    extend_lease(conn, run.run_id, WORKER_ID)      # heartbeat
    output = execute_step(run)                      # may take a while
    checkpoint(conn, run, output)                   # Module 03
```

## Lesson 05.4: The fencing problem

The dangerous window: worker A's lease expires while A is mid-step, B reclaims, and now two workers are executing again. Two defences, use both:

1. **Check ownership at every commit.** The checkpoint write includes `WHERE owner = $me AND lease_until > now()`. A fenced-out worker's write affects zero rows; it discards its work and exits. Wasted compute, no corruption.
2. **Leases much longer than steps.** A 2 minute lease against a 15 second p99 step makes the window rare. It never makes it impossible; defence 1 is the invariant, defence 2 is the economics.

```sql
UPDATE runs SET step = $2, updated_at = now()
WHERE run_id = $1 AND owner = $3 AND lease_until > now();
-- 0 rows updated → you are fenced out. Stop. Do not retry.
```

## Lesson 05.5: Cancellation rides the same rails

Cancel is just a status write from anyone, honored by the owner at the next step boundary:

```text
operator      UPDATE runs SET status='cancelled' WHERE run_id=$1
owner         checks status at each step entry; sees cancelled; stops cleanly
mid-model-call  the check happens after the call returns, not before it starts
```

No signals, no process kills, no queue purges. Everything routes through the one table that already owns the truth.

<div class="callout failure-lab">

**FAILURE LAB 05: Two Workers, One Run**

Start two workers against the same database with claiming implemented as select-then-update (fixture profile `race-claim` inserts a 200ms sleep between the select and the update to make the race deterministic).

Observe: both workers claim the same run, `run_events` shows every step twice, cost doubles, and the trace interleaves two workers' spans on one run.

Fix with the atomic claim, then run the harder scenario: `kill -9` worker A mid-step and watch B reclaim the run after the lease expires, resume from the checkpoint, and finish. Finally, freeze worker A with `SIGSTOP` (alive but not heartbeating), let B reclaim, then `SIGCONT` A and confirm A's next checkpoint writes zero rows and A exits without corrupting state.

</div>

<div class="callout deliverable">

**Deliverable:** `05_scheduler.py` (claim, heartbeat, fenced checkpoint, cancellation check) plus the migration adding `owner` and `lease_until`, and a test that runs the SIGSTOP scenario and asserts single ownership throughout.

</div>

<div class="callout note">

**What this does not solve.** Leases bound the double-execution window; they do not eliminate it. External side effects still need Module 04's idempotency keys, which is why that module came first. And a Postgres claim table is a scheduler for tens of workers, not thousands; when you outgrow it, a real queue or a durable workflow engine replaces this file, and you now know exactly which guarantees the replacement must carry.

</div>

<div class="callout takeaway">

**Production takeaway:** "the run is resumable" and "someone will resume it" are different properties. The first is a checkpoint. The second is an owner, a lease, and a reclaim path, and most agent frameworks give you neither.

</div>

## Primary sources

- [Temporal's AI cookbook](https://docs.temporal.io/ai-cookbook/openai-agents-sdk-python) shows what claim, lease, heartbeat and reclaim look like when a durable workflow engine owns them; compare each concept to the table you just built.
