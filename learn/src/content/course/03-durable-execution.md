---
module: 3
title: "Durable Execution, Checkpoints, and Replay"
duration: "60-75 min"
goal: "Make the agent survive application failure using LangGraph with a PostgreSQL checkpointer."
question: "After a crash, what code runs again?"
hook: "Your worker disappeared. Did the job?"
scenario: "A production investigation has been running for 37 minutes. Four of six investigation tasks are complete. The worker dies during task five. What happens next?"
caseStudy: incident-response-agent
skills: [Persistence, Checkpoints, Recovery]
technologies: [Python, LangGraph, PostgreSQL]
repoPath: "03_graph.py"
labNumber: 3
invariant: "I2 + I3: committed progress survives a crash, and replaying a step cannot corrupt durable state."
lab: "Pull the Plug"
deliverable: "03_graph.py + checkpoint schema migration"
status: published
---

This module must build the durable-execution mental model before showing framework APIs.

## Persistence is not yet durable execution

At the end of Module 02 we can:

```text
run step
save state
run next step
save state
```

If the process dies, we can manually reload state.

But we still need to know:

```text
which step comes next?
what if the process died halfway through the step?
what if a tool succeeded but the step never committed its result?
what can execute twice?
how does another process continue the logical run?
```

## What is a checkpoint?

A **checkpoint** is a durable record of workflow state at a runtime-defined execution boundary.

Conceptually:

```json
{
  "run_id": "run_123",
  "workflow_position": "extract_pricing",
  "state": {"...": "..."},
  "checkpoint_id": "cp_19",
  "created_at": "..."
}
```

The real framework stores additional metadata. The important mental model is:

```text
CHECKPOINT
  = durable state
  + durable execution position/metadata
```

It is **not** a frozen Python process.

The runtime cannot generally stop in the middle of arbitrary Python instructions, serialize the call stack, and later continue at the exact CPU instruction.

## The critical execution boundary

Suppose checkpoint `C10` exists before one node.

```text
C10 committed
  ↓
node starts
  ↓
fetch succeeds
  ↓
model succeeds
  ↓
PROCESS DIES
  ↓
node never completes
  ↓
no C11 exists
```

When another process resumes, durable history says only:

```text
C10 is known good.
```

The unfinished node may execute again.

## Replay

**Replay/re-execution** means workflow logic is executed again from a durable point so the logical run can continue.

For the learner, the key rule is:

> Code between durable boundaries may run more than once after interruption.

That is why replay safety matters.

## Why this matters for model calls

If a model request succeeded but the process died before its result became part of a durable checkpoint, the resumed run may call the model again.

That can change:

```text
cost
latency
output
```

This does not automatically corrupt the run if the state transition is designed correctly, but it is real behavior that must be understood.

## Build the graph

Only now introduce LangGraph:

```text
START
  ↓
VALIDATE
  ↓
DISCOVER
  ↓
SELECT_REQUIREMENT
  ↓
SELECT_PAGE
  ↓
FETCH
  ↓
EXTRACT
  ↓
VERIFY
  ↓
SAVE_PROGRESS
  ├── remaining → SELECT_REQUIREMENT
  ↓
DRAFT
  ↓
END
```

Each node should represent a meaningful state transition or operation with a coherent failure/retry boundary.

## Node size tradeoff

Large node:

```text
fetch 10 pages
10 model calls
verify everything
save once
```

A late crash repeats a lot of work.

Very tiny nodes create more orchestration and checkpoint overhead.

Useful durable boundaries often occur when:

- expensive work becomes worth preserving;
- retry policy changes;
- a side effect is near;
- human control may enter;
- the next step can execute on another worker.

## Thread identity

Explain two identities:

```text
business run ID
    identifies the customer's vendor-review job

runtime thread ID
    identifies the checkpoint history used by the orchestration runtime
```

For this course, they can map one-to-one, but they are conceptually different.

## In-memory checkpointer

Use it briefly to prove:

```text
checkpoint abstraction ≠ durable storage
```

If the checkpointer lives only in process memory, killing the process still loses it.

## PostgreSQL-backed checkpointing

Architecture:

```text
Worker A
   │ checkpoint
   ▼
PostgreSQL
   │
   X Worker A dies
   │
Worker B
   │ load checkpoint
   ▼
continue logical run
```

<div class="callout failure-lab">

**FAILURE LAB 03: Pull the Plug**

Kill at four places:

1. after FETCH has durably completed;
2. during EXTRACT;
3. after VERIFY but before the next durable boundary;
4. during a slow model request.

For each, record:

```text
last durable checkpoint
first operation after resume
operations repeated
extra model cost
state duplicated?
external side effect duplicated?
```

The objective is not merely “it resumed.” The learner must understand **what replayed**.

</div>


## What checkpointing solves

- committed graph state can survive process loss;
- another process can load the logical run;
- runtime execution can continue from durable state;
- durable interrupts become possible.

## What checkpointing does not solve

It does not automatically guarantee:

- exactly-once external writes;
- only one worker executes the run;
- correct retry policy;
- safe permissions;
- good context;
- semantic correctness.

Those are the next modules.

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. What is conceptually stored in a checkpoint?
2. Why is it not a suspended Python process?
3. Why can a node execute again after a crash?
4. Why does node size affect recovery cost?
5. What does durable checkpointing solve, and what remains unsolved?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] PostgresSaver wired; the run id is the thread id and lives in your own runs table too
- [ ] kill -9 at any step resumes from the last committed checkpoint
- [ ] The 20-kill chaos test passes with invariants equal to the control run
- [ ] You can point at each checkpoint boundary in the graph and say what re-executes

</div>

## Primary sources

- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence): the authoritative answer to what one checkpoint contains and which tables the Postgres saver writes. Read it next to your own checkpointer so the comparison is concrete.
- [LangGraph graph API on re-execution](https://docs.langchain.com/oss/python/langgraph/graph-api): why the docs themselves tell you to keep node logic idempotent, which is the bridge into Module 04.
