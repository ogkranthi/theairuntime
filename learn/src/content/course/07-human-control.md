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

## Diagnose

<div class="block-diagnose">

The approval survived a restart and three hours of silence. Explain why:

1. While the run waited, what existed in the database, and what existed in memory?
2. You redeployed mid-wait. Why did the blocking version lose the run and the interrupt version not?
3. The reviewer double-clicked approve. What makes the review endpoint safe against that, and against a redelivered webhook?
4. The reviewer's edits changed the report. Where do those edits live, and why not in the message history?

</div>

## Prove it

<div class="block-prove">

```bash
make lab LAB=07
```

Passing means, checked automatically, not eyeballed:

- run reaches await_review; the process is stopped and restarted; POST /runs/{id}/review with approve resumes and publishes exactly once
- published_reports has one row, and the trace shows resume from the review checkpoint, not a research replay
- request-more-research loops back, is killed mid-second-pass, resumes, and approval still publishes once
- a second identical approve returns already_resolved and changes nothing

Waiting is state: the passing condition includes zero compute held during the wait.

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] A waiting run holds no worker, no thread, no connection
- [ ] Approve, reject, and request-more-research all work, and the research loop is bounded
- [ ] The review endpoint is idempotent
- [ ] The approval payload shows coverage, unknowns, and evidence counts, not a bare yes/no
- [ ] Reviewer edits are folded into state and survive context rebuilds

</div>

## Checkpoint

Three questions before you move on. Answer first, then open.

<details class="checkpoint">
<summary>Waiting is state, not compute. What does that buy you?</summary>

Free waits of arbitrary length: the run survives deploys, restarts and weekends because nothing is running. A row says awaiting_approval; a fresh process resumes on the human's action.

</details>

<details class="checkpoint">
<summary>Why must the approval payload be evidence-rich?</summary>

If the reviewer cannot see why the agent believes an item is verified, the review is theatre. Evidence-rich payloads are also what make approval latency and edit rate meaningful signals about where the gate belongs.

</details>

<details class="checkpoint">
<summary>What should happen when nobody ever clicks?</summary>

Every interrupt gets a deadline and an explicit on_timeout: fail, proceed, or escalate, chosen per gate. proceed on an irreversible gate is how unattended systems email unreviewed reports, so that choice is written in code where it can be reviewed.

</details>

## Primary sources

- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts): the exact semantics of `interrupt()` and `Command(resume=...)`, including what is replayed on resume. Worth reading before the lab, because the replay behavior is the part that surprises people.
- [Temporal's human-in-the-loop example](https://docs.temporal.io/ai-cookbook/human-in-the-loop-python): the same durable-wait pattern in a workflow engine, useful to see that "waiting is state" is an industry invariant and not a LangGraph quirk.
