---
module: 2
title: "State: What Must Survive?"
duration: "45-60 min"
goal: "Separate conversation, execution state, artifacts, and external reality, and make state represent evidence, not claims."
question: "What must survive process loss?"
labNumber: 2
invariant: "I1: an item is verified only if resolvable evidence exists."
lab: "False Completion"
deliverable: "02_state_machine.py"
status: published
---

This is one of the most important modules in the course. Most agent bugs in production are state-model bugs wearing a prompt-engineering costume.

## Lesson 02.1: What is state?

Ask: *"If our process disappears right now, what information must exist elsewhere to continue?"*

Build the answer as a type:

```python
from typing import TypedDict

class VendorReviewState(TypedDict):
    run_id: str

    vendor_name: str
    vendor_url: str

    checklist: list[str]
    completed_items: list[str]

    discovered_urls: list[str]
    visited_urls: list[str]

    findings: list[dict]
    evidence: list[dict]

    errors: list[dict]
    attempts: int

    status: str                 # pending | researching | verifying | awaiting_approval | published | failed
    draft_report: str | None
    approval_status: str | None
```

If a field is not here, it does not survive. If it does not survive, the agent cannot use it after a restart.

## Lesson 02.2: Four kinds of information

```text
CONVERSATION      What did the user and model say?
EXECUTION STATE   Where are we in the process?
ARTIFACTS         What useful work has been produced?
EXTERNAL STATE    What happened outside the agent?
```

Example:

```text
Model:            "I published the report."
Execution state:  publish_complete = true
Database:         Does the published report actually exist?
```

These are **not equivalent**. The most dangerous bugs are the ones where two of these disagree and nobody checks.

## Lesson 02.3: State should answer operational questions

At any time, from state alone, you should be able to answer:

```text
What is this run doing?
What has completed?
What is next?
What failed?
What evidence exists?
Is human input required?
Can we resume?
```

If the state cannot answer these, the state model is incomplete. This list becomes your dashboard in Module 09 and your eval fixture in Module 09.

## Exercise 02: Explicit state machine

Turn the naive agent into an explicit state machine that persists `VendorReviewState` to a JSON file after every step (a deliberately crude checkpoint; Postgres comes in Module 03).

Display on each iteration:

```text
Run ID: f72...
Status: researching

Checklist:
✓ product
✓ customer
→ pricing
○ security
○ developer_experience

Pages visited: 3
Errors: 0
```

Kill it. Restart it. It should now print the same block and continue.

<div class="callout failure-lab">

**FAILURE LAB 02: False Completion**

Introduce a bug where:

```python
completed_items = ["product", "customer", "pricing"]
```

but there is no actual pricing evidence in `evidence`.

The agent says: *"Research complete."*

Students must fix the invariant:

```text
completed  ≠  verified
```

Introduce a per-item status:

```text
pending → researched → verified
                    ↘ failed
```

`researched` means the model produced a finding. `verified` means the finding has evidence that a checker (not the model that wrote it) accepted.

</div>

<div class="callout deliverable">

**Deliverable:** `02_state_machine.py` with the JSON checkpoint, the per-item status field, and a `verify()` function that refuses to mark an item complete without an evidence record.

</div>

<div class="callout takeaway">

**Production takeaway:** state should represent evidence-backed progress, not merely agent claims.

</div>
