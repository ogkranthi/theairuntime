---
module: 7
title: "Human-in-the-Loop and Durable Waiting"
duration: "50-60 min"
goal: "Show how a workflow can stop for hours without keeping a worker occupied, and resume with full state."
question: "How can a workflow wait for a human for hours without holding a worker for hours?"
hook: "The approver is at lunch. For three hours."
scenario: "A refund above threshold waits for a human. The service redeploys twice while they decide. The approval still has to work, exactly once, from their phone."
caseStudy: customer-account-agent
skills: [HITL, Durable waits, Approvals]
technologies: [Python, LangGraph, FastAPI]
repoPath: "06_approval.py"
labNumber: 7
invariant: "I8: waiting for a person does not require a live worker."
lab: "Three-Hour Approval"
deliverable: "06_approval.py + /runs/{id}/review endpoints"
status: published
---

## Naive waiting

Bad:

```python
while not approved():
    time.sleep(30)
```

Problems:

- a worker remains occupied;
- the process can restart;
- a deploy destroys the sleeping call stack;
- horizontal workers complicate ownership;
- waiting for days becomes absurd.

## Model the wait as state

At the approval boundary, persist something like:

```json
{
  "run_id": "run_123",
  "status": "awaiting_review",
  "review_round": 1,
  "draft_report_id": "draft_19",
  "review_requested_at": "...",
  "review_version": 4
}
```

Then stop executing that run.

No function has to remain asleep.

## What LangGraph interrupt means

Conceptually:

```python
def await_review(state):
    decision = interrupt({
        "vendor": state["vendor_name"],
        "draft": state["draft_report"],
        "unknowns": state["unknowns"],
    })

    return {"review_decision": decision}
```

Execution timeline:

```text
worker enters await_review
  ↓
interrupt produced
  ↓
workflow state/checkpoint persists
  ↓
worker returns to other work
  ↓
three hours pass
  ↓
reviewer submits HTTP request
  ↓
same durable run/thread is resumed
  ↓
a worker continues execution
```

Now the learner has earned the concise rule:

> Waiting is state, not compute.

## Review payload

Do not ask only:

```text
Approve? Yes / No
```

Provide enough information to make a responsible decision:

```text
vendor
coverage
unknowns
contradictions
high-risk claims
evidence links
cost so far
what action follows approval
```

Human review without evidence is theater.

## Structured decision

```python
class ReviewDecision(TypedDict):
    action: Literal[
        "approve",
        "reject",
        "request_more_research",
    ]
    reviewer_id: str
    note: str | None
    requirements: list[str]
    review_version: int
```

## Stale approval

Important production scenario:

```text
draft version 4 sent for review
  ↓
more research occurs
  ↓
draft version 5 exists
  ↓
reviewer clicks old approval for v4
```

An approval of version 4 must not silently authorize version 5.

Bind review decisions to a version or immutable artifact hash.

```text
approval.review_version == current_review_version
```

Otherwise reject the stale decision and request a new review.

## Authentication versus authorization

Authentication:

```text
Who is this person?
```

Authorization:

```text
May this person approve this action for this run?
```

Do not equate possession of a review URL with authorization.

Possible roles:

```text
viewer
reviewer
admin
```

Publish may require all of:

```text
user role permits approval
run belongs to user's tenant
run state == awaiting_review
review version matches
decision == approve
```

## Timeouts and escalation

Long human waits need explicit policy:

```text
review_due_at
remind_at
escalate_at
expire_at
```

Possible behavior:

```text
send reminder
route to backup reviewer
cancel action
continue only under pre-authorized policy
```

Do not ask the model to invent governance policy.

## Durable steering

Human control can include:

```text
cancel
pause
add a constraint
change priority
request specific evidence
reduce budget
```

Represent these as durable control events, not ephemeral chat instructions.

<div class="callout failure-lab">

**FAILURE LAB 07: Three-Hour Approval**

1. Run until `awaiting_review`.
2. Restart the service twice.
3. Resume from a new process.
4. Verify no worker was occupied during the wait.
5. Verify the review payload is unchanged.
6. Approve and confirm one publish.
7. Try unauthorized approval.
8. Try approval of an old review version.

Invalid approvals must not advance state.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why is `sleep()` not durable waiting?
2. What is persisted when a workflow pauses for review?
3. Why should approval bind to a specific draft/review version?
4. What is authentication versus authorization?
5. What happens to the worker while the human is away?

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

## Primary sources

- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts): the exact semantics of `interrupt()` and `Command(resume=...)`, including what is replayed on resume. Worth reading before the lab, because the replay behavior is the part that surprises people.
- [Temporal's human-in-the-loop example](https://docs.temporal.io/ai-cookbook/human-in-the-loop-python): the same durable-wait pattern in a workflow engine, useful to see that "waiting is state" is an industry invariant and not a LangGraph quirk.
