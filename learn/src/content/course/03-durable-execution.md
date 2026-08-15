---
module: 3
title: "Durable Execution & Checkpointing"
duration: "60-75 min"
goal: "Make the agent survive application failure using LangGraph with a PostgreSQL checkpointer."
question: "What is replay, and what actually resumes?"
labNumber: 3
invariant: "I2: a crash never loses committed progress, and replay never corrupts state."
lab: "Pull the Plug"
deliverable: "03_graph.py + checkpoint schema migration"
status: published
---

This is where LangGraph enters. Not before. Students have already encountered the problem twice.

## Lesson 03.1: Why LangGraph now?

LangGraph gives us, as first-class runtime concepts:

```text
Graph execution
State
Persistence
Checkpoints
Threads
Interrupts
Recovery
```

Its persistence system saves a checkpoint of graph state at each execution step, organised by **thread**. That is what enables fault tolerance, resumption, and human-in-the-loop. Read the official persistence docs before continuing; do not learn this from a tutorial that wraps it.

## Lesson 03.2: Convert the process into a graph

```text
START
  ↓
VALIDATE
  ↓
DISCOVER
  ↓
SELECT_NEXT_TASK ◄──────────┐
  ↓                          │
FETCH                        │
  ↓                          │
EXTRACT                      │
  ↓                          │
SAVE_PROGRESS                │
  ↓                          │
MORE WORK? ── yes ───────────┘
  │
  no
  ↓
VERIFY
  ↓
REPORT
  ↓
END
```

## Lesson 03.3: Build nodes

```python
def validate(state: VendorReviewState) -> dict: ...
def discover_pages(state: VendorReviewState) -> dict: ...
def select_next_task(state: VendorReviewState) -> dict: ...
def fetch_page(state: VendorReviewState) -> dict: ...
def extract_finding(state: VendorReviewState) -> dict: ...
def save_progress(state: VendorReviewState) -> dict: ...
def verify(state: VendorReviewState) -> dict: ...
def write_report(state: VendorReviewState) -> dict: ...

def more_work(state: VendorReviewState) -> str:
    return "continue" if remaining(state) else "verify"
```

Keep nodes small. Each node should answer one question:

> What durable state transition does this operation represent?

If a node does two transitions, split it. Checkpoints happen at node boundaries; big nodes mean big replays (Lesson 03.6).

## Lesson 03.4: First use `InMemorySaver`

```python
from langgraph.checkpoint.memory import InMemorySaver
graph = builder.compile(checkpointer=InMemorySaver())
```

Show that checkpoints exist: inspect `graph.get_state(config)` mid-run.

Then kill the process. Everything still disappears.

LangGraph's docs are explicit that the in-memory saver does not survive process restarts. Students need to see that with their own eyes:

```text
CHECKPOINTING  ≠  DURABLE STORAGE
```

## Lesson 03.5: PostgreSQL checkpointing

Move to `PostgresSaver` (package `langgraph-checkpoint-postgres`). On first use, call `.setup()` to create the checkpoint tables.

```python
from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string(DATABASE_URL) as checkpointer:
    checkpointer.setup()             # once
    graph = builder.compile(checkpointer=checkpointer)

    config = {"configurable": {"thread_id": run_id}}
    graph.invoke(initial_state, config)
```

The **run ID is the thread ID**. That is the durable identity of the work. Store it in your own `runs` table too: LangGraph's tables are its; your operational tables are yours.

Use Neon for the database from the start so nothing changes at deploy time in Module 14.

<div class="callout failure-lab">

**FAILURE LAB 03: Pull the Plug**

Run:

```text
✓ product
✓ customer
✓ pricing
→ security
```

Kill FastAPI. `kill -9`. Restart it. Reconnect with the same run ID and invoke the graph with `None` as input to resume from the last checkpoint.

Expected:

```text
✓ product
✓ customer
✓ pricing
→ security
```

Not:

```text
→ product
```

Then do it three more times at different points. Then do it during `EXTRACT` (a model call in flight).

</div>

## Lesson 03.6: Important subtlety: checkpoint boundaries

Checkpoints occur at graph execution boundaries. If the process dies inside a node, that **node executes again from its beginning** on resume.

For `fetch_page`, that is harmless: you fetch twice.
For `publish_report`, that could be a disaster.

That leads directly to Module 04.

<div class="callout deliverable">

**Deliverable:** `03_graph.py`, the Neon connection config, and a short `lab_03_log.md` recording each kill point and what resumed.

</div>

<div class="callout takeaway">

**Production takeaway:** the graph is the durable definition of the work; the process is disposable. Thread ID = run identity.

</div>

<div class="callout note">

**What this does not solve.** Checkpointing preserves state. It does not make external side effects exactly-once (Module 04), and it does not schedule abandoned work onto a new worker (Module 05). A checkpointed run whose worker died is safe, and going nowhere.

</div>

## Diagnose

<div class="block-diagnose">

You pulled the plug at step 9 and the run resumed. Now explain the machinery:

1. What exactly is inside one checkpoint, and which tables did the Postgres saver write?
2. On resume, what was replayed and what was restored? Why did replaying step 9 not corrupt state?
3. What would break if the checkpoint write and your runs-table update were two transactions instead of one?
4. Name the checkpoint boundaries in your graph. Which node re-executes after a crash at each boundary?

</div>

## Prove it

<div class="block-prove">

```bash
make lab LAB=03
```

Passing means, checked automatically, not eyeballed:

- the chaos harness kills the process at 20 random steps; after each kill the run resumes with the same `run_id` and finishes
- final state invariants (fact count, items covered, evidence resolvable) match an uninterrupted control run
- no restart begins at step 0, and no replayed step produces duplicate findings

Assert on state invariants, not byte-identical text: determinism holds here only because the fixtures are fixed and temperature is 0.

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] PostgresSaver wired; the run id is the thread id and lives in your own runs table too
- [ ] kill -9 at any step resumes from the last committed checkpoint
- [ ] The 20-kill chaos test passes with invariants equal to the control run
- [ ] You can point at each checkpoint boundary in the graph and say what re-executes

</div>

## Checkpoint

Three questions before you move on. Answer first, then open.

<details class="checkpoint">
<summary>What does replay actually mean in a checkpointed graph?</summary>

After a crash, execution restarts from the last committed checkpoint, so the work between that checkpoint and the crash runs again. Replay is safe only when replayed work is idempotent inside your process (reducers) and deduplicated outside it (Module 04).

</details>

<details class="checkpoint">
<summary>Why checkpoint after the step instead of before it?</summary>

Checkpoint-before loses the step's result on crash while recording that it ran, which is a lie. Checkpoint-after means a crash replays the step, which idempotent state absorbs. One transaction, after.

</details>

<details class="checkpoint">
<summary>What does checkpointing NOT give you?</summary>

Exactly-once side effects (a re-executed publish still publishes twice) and scheduling (a checkpointed run whose worker died is safe, and going nowhere). Those are Modules 04 and 05, on purpose.

</details>

## Primary sources

- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence): the authoritative answer to what one checkpoint contains and which tables the Postgres saver writes. Read it next to your own checkpointer so the comparison is concrete.
- [LangGraph graph API on re-execution](https://docs.langchain.com/oss/python/langgraph/graph-api): why the docs themselves tell you to keep node logic idempotent, which is the bridge into Module 04.
