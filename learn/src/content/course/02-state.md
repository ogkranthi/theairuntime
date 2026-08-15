---
module: 2
title: "State: What Must Survive?"
duration: "45-60 min"
goal: "Separate conversation, execution state, artifacts, and external reality, and make state represent evidence, not claims."
question: "What information is authoritative enough to survive a restart?"
hook: "The agent says it finished. Prove it."
scenario: "A claims decision reaches a reviewer marked verified. The auditor asks which document span supports it. The transcript is not an answer."
caseStudy: claims-processing-agent
skills: [State modeling, Evidence]
technologies: [Python, PostgreSQL]
repoPath: "02_state_machine.py"
labNumber: 2
invariant: "I1: no item is verified unless resolvable evidence exists."
lab: "False Completion"
deliverable: "02_state_machine.py"
status: published
---

“Save state” is not enough. First decide what state means.

## Four categories

### Conversation

What users/models said.

```text
Model: I found pricing information.
```

Useful, but not automatically authoritative.

### Execution state

What the runtime believes about progress.

```text
current requirement = pricing
status = researching
pages fetched = 7
```

### Artifacts

Useful objects produced by the run.

```text
fetched page
evidence record
verification result
draft report
```

### External reality

What actually exists outside the runtime.

```text
Did the report get published?
Did the refund happen?
Did the ticket get created?
```

These can disagree.

```text
Model:            “I published it.”
Application:      published = true
External system:  no report exists
```

The external system is authoritative about that external effect.

## State is a model of reality

A field such as:

```python
state["published"] = True
```

is still only an application claim.

Good state design makes incorrect claims hard to represent.

## Structured state

```python
class Evidence(TypedDict):
    evidence_id: str
    requirement: str
    url: str
    content_hash: str
    quote: str
    retrieved_at: str

class RequirementState(TypedDict):
    status: str
    finding: str | None
    evidence_ids: list[str]

class VendorReviewState(TypedDict):
    run_id: str
    vendor_name: str
    vendor_url: str
    requirements: dict[str, RequirementState]
    discovered_urls: list[str]
    visited_urls: list[str]
    evidence: list[Evidence]
    contradictions: list[dict]
    errors: list[dict]
    status: str
    terminal_reason: str | None
    pages_fetched: int
    cost_usd: float
    schema_version: int
    code_version: str
```

## Why structure matters

Weak:

```text
“Pricing seems complete.”
```

Checkable:

```json
{
  "status": "verified",
  "finding": "No public list price is available.",
  "evidence_ids": ["ev_91"]
}
```

## Introduce invariants

An **invariant** is a property that must remain true even when expected failures occur.

Example:

```text
IF requirement.status == VERIFIED
THEN at least one evidence ID must resolve to stored evidence.
```

Code:

```python
def validate_state(state):
    for name, req in state["requirements"].items():
        if req["status"] == "verified" and not req["evidence_ids"]:
            raise StateInvariantError(
                f"{name} verified without evidence"
            )
```

This is stronger than asking the model to “remember to cite sources.”

## State transitions

Do not allow arbitrary jumps.

```text
PENDING
  ↓
RESEARCHING
  ↓
CANDIDATE_FOUND
  ↓
VERIFYING
  ├────────→ VERIFIED
  ├────────→ UNKNOWN
  └────────→ NEEDS_MORE_RESEARCH
```

A finding is not the same as a verified finding.

## First persistence

Before LangGraph, persist the state after meaningful transitions.

Conceptually:

```python
transition(state)
save_state(state)
continue_work()
```

Kill the process.

Reload the saved state.

Now the application can recover the **facts** of the run.

But questions remain:

```text
Which function should execute next?
What if a process dies halfway through a function?
Which operations can run again?
Who discovers unfinished work?
```

Those are durable-execution questions.

## Schema evolution

A run may outlive a deployment.

Persist:

```text
schema_version
code_version
```

When state changes, explicitly classify old runs as:

```text
compatible
requires migration
cannot safely resume
```

<div class="callout failure-lab">

**FAILURE LAB 02: False Completion**

Inject:

```python
state["requirements"]["pricing"] = {
    "status": "verified",
    "finding": "Pricing available",
    "evidence_ids": [],
}
```

If the UI/report accepts this, the system has a state-model bug.

Fix the invariant in:

1. the transition into `verified`;
2. an independent report/evaluation check.

</div>


## Prove it

A test must fail when verified state has no resolvable evidence.

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. What is the difference between conversation and execution state?
2. Why is external reality not identical to application state?
3. What is an invariant?
4. Why model progress as transitions?
5. Why does state schema version matter?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] VendorReviewState persists to disk after every step and a fresh process can load it
- [ ] Reducers are idempotent: the double-apply test passes
- [ ] The operational questions are answerable from state alone, with the process dead
- [ ] no_false_completion exists as code and passes on both fixture vendors

</div>
