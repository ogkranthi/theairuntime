---
module: 7
title: "Human-in-the-Loop & Long Waits"
duration: "50-60 min"
goal: "Show how a workflow can stop for hours without keeping a worker occupied, and resume with full state."
question: "How do runs wait for people without holding compute?"
labNumber: 7
invariant: "I6: a waiting run holds no compute and survives restarts."
lab: "The Three-Hour Approval"
deliverable: "06_approval.py + /runs/{id}/review endpoints"
status: published
---

## Lesson 07.1: Our approval point

Before publishing:

```text
Research
   ↓
Verification
   ↓
Draft report
   ↓
─── PAUSE ───
   ↓
Human reviews
   ↓
Approve / Reject / Request more research
   ↓
Continue
```

## Lesson 07.2: Interrupt execution

LangGraph's `interrupt()` persists graph state and stops execution until an external `Command(resume=...)` continues the run, on the same thread ID, from any process, at any later time.

```python
from langgraph.types import interrupt, Command

def await_review(state):
    decision = interrupt({
        "vendor": state["vendor_name"],
        "coverage": coverage_summary(state),
        "draft": state["draft_report"],
    })
    return {"approval_status": decision["action"], "review_note": decision.get("note")}
```

The key insight:

> **Waiting is state, not compute.**

The server does not need a Python function sleeping for three hours. Nothing is running. A row exists that says "awaiting approval." When the human acts, a fresh process resumes it.

## Lesson 07.3: Human decisions

Support three:

```text
APPROVE                → publish
REJECT                 → status = rejected, end
REQUEST MORE RESEARCH  → back to research with the reviewer's note as new tasks
```

More research loops back:

```text
review → needs_more_information → research → verify → review
```

Bound the loop (`MAX_REVIEW_ROUNDS = 3`). Humans can be indecisive too.

## Lesson 07.4: Approval payload

Don't show:

```text
Approve? [Yes]
```

Show:

```text
Vendor: Acme

Requirements covered: 5/6
Unknown: Enterprise pricing

Evidence: 12 pages examined
Risks: 2
Estimated completeness: 83%

[Approve]   [Research missing items]   [Reject]
```

Human review needs evidence, not a yes/no. If the reviewer cannot see *why* the agent believes an item is verified, the review is theatre.

## Lesson 07.5: API shape

```text
POST /runs                       → start, returns run_id
GET  /runs/{id}                  → state summary (from Module 02's operational questions)
GET  /runs/{id}/review           → approval payload (only when awaiting_approval)
POST /runs/{id}/review           → {action, note} → resumes graph
```

<div class="callout failure-lab">

**FAILURE LAB 07: The Three-Hour Approval**

Run reaches approval. Stop the application. Restart it. Go get lunch.

Come back. `POST /runs/{id}/review` with `approve`.

The workflow must continue from persisted state (publish, once) rather than repeating research. Confirm with the `published_reports` table and the trace.

Then: request more research, kill during the second research pass, resume, approve.

</div>

<div class="callout deliverable">

**Deliverable:** `06_approval.py` and the two review endpoints, with the evidence-rich payload.

</div>

<div class="callout takeaway">

**Production takeaway:** long-running agent ≠ long-running process. A long-running business execution can consist of many short-lived compute sessions connected by durable state.

</div>

## Primary sources

- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts): the exact semantics of `interrupt()` and `Command(resume=...)`, including what is replayed on resume. Worth reading before the lab, because the replay behavior is the part that surprises people.
- [Temporal's human-in-the-loop example](https://docs.temporal.io/ai-cookbook/human-in-the-loop-python): the same durable-wait pattern in a workflow engine, useful to see that "waiting is state" is an industry invariant and not a LangGraph quirk.
