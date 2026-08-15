---
module: 8
title: "Context Engineering Across Long Runs"
duration: "60-75 min"
goal: "Treat execution state and model context as separate engineering surfaces; keep the model's working set small, evidenced, and reconstructible."
question: "How does the model see the right information once the system knows more than one prompt should carry?"
hook: "The agent read forty pages and got dumber."
scenario: "The data agent's context fills with raw pages. By decision thirty it repeats itself, ships a contradiction, and declares victory early. Nothing errored."
caseStudy: enterprise-data-agent
skills: [Context engineering, Compaction, Artifacts]
technologies: [Python]
repoPath: "07_context.py"
labNumber: 8
invariant: "I9: active model context can be rebuilt from durable artifacts and state."
lab: "Context Rot"
deliverable: "07_context.py + compaction A/B log"
status: published
---

## State and context are different

This distinction should be explicit before discussing compaction.

### Durable state

Information the application needs to preserve correct execution.

### Model context

Information selected for one particular model decision.

A system can have megabytes or gigabytes of durable artifacts while giving the model a small working context for one step.

That is often the correct architecture.

## Naive strategy: append everything

```python
messages.append(homepage)
messages.append(docs_page)
messages.append(tool_error)
messages.append(pricing_page)
messages.append(previous_summary)
messages.append(security_page)
...
```

After many steps the context becomes a mixture of:

```text
important facts
stale facts
duplicate text
navigation boilerplate
retry errors
old plans
old reasoning
contradictory facts
irrelevant pages
```

Even when everything still fits within the model's token limit, important information may be harder to use consistently.

The problem is not merely “too many tokens.”

The problem is poor information selection.

## Three layers

Teach this model:

```text
RAW ARTIFACTS
original fetched material
        ↓
DURABLE KNOWLEDGE
structured evidence/findings/contradictions
        ↓
ACTIVE CONTEXT
small working set for this model call
```

### Raw artifacts

Examples:

```text
pricing.html
security.html
API docs
```

### Durable knowledge

Examples:

```text
pricing finding → ev_31
security finding → ev_44
contradiction → con_9
```

### Active context

For “choose the next requirement,” the model might receive:

```text
goal
which requirements are verified
which remain unresolved
candidate pages
contradictions
budget remaining
```

It does not need every raw page.

## Artifact store

Store raw material separately and addressably.

```sql
CREATE TABLE pages (
    content_hash TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    body TEXT NOT NULL
);
```

Why `content_hash`?

A URL is not an immutable piece of evidence. The page at a URL can change.

A claim should be able to point to the exact content version the agent saw.

## Evidence record

```json
{
  "evidence_id": "ev_31",
  "requirement": "pricing",
  "claim": "No public list price is shown.",
  "source_url": "https://vendor.example/pricing",
  "content_hash": "sha256:...",
  "quote": "Contact sales for pricing.",
  "retrieved_at": "..."
}
```

Now the active context can carry the compact record while raw material remains independently resolvable.

## Context builder

Make context construction explicit and testable.

```python
def build_planning_context(state):
    return {
        "goal": state["goal"],
        "verified": verified_summary(state),
        "unresolved": unresolved_requirements(state),
        "candidate_urls": remaining_urls(state),
        "contradictions": state["contradictions"],
        "budget_remaining": state["budget_remaining"],
    }
```

For evidence extraction, build a different context:

```python
def build_extraction_context(requirement, page):
    return {
        "requirement": requirement,
        "page_text": page.normalized_text,
        "expected_schema": "EvidenceCandidate",
    }
```

The extraction call does not need the entire trajectory.

## Context as a projection

A useful way to explain this technically:

> Active context is a projection of durable state and artifacts for a specific decision.

That means it should be possible to rebuild it.

If the only copy of an important fact lives in an old model message, the architecture is fragile.

## Compaction

**Compaction** reduces older context into a smaller representation.

Example:

```text
20 observations
   ↓
structured progress summary
```

Compaction is lossy.

Therefore do not let the compact summary become the only copy of important evidence.

Preserve source artifacts and evidence pointers.

## Why recursive summaries can drift

If you repeatedly do:

```text
raw data → summary A
summary A → summary B
summary B → summary C
```

small omissions can compound.

Prefer structured durable facts backed by source pointers and regenerate a working summary when needed.

## Handoffs

A fresh model session or subagent should not receive a giant transcript by default.

Create a handoff object:

```json
{
  "goal": "Review Acme",
  "completed": ["product", "customers"],
  "open_questions": ["pricing", "security"],
  "constraints": ["public sources only"],
  "evidence_ids": ["ev_1", "ev_8"],
  "contradictions": ["con_2"],
  "budget_remaining": 0.22
}
```

This is smaller, structured, and inspectable.

## Context quarantine with subagents

Suppose security research requires twelve noisy pages.

Instead of polluting the main planner's active context:

```text
main planner
    ↓ delegates security
security researcher
    ↓ gets only security task + relevant pages
    ↓
returns structured findings + evidence IDs
    ↓
main planner receives compact result
```

The useful property is isolation, not simply “multiple agents.”

## Freshness and conflicting evidence

Store `retrieved_at` and `content_hash`.

If the same URL changes later, preserve both versions.

A contradiction can be explicit:

```json
{
  "claim_a": "Free tier supports SSO",
  "evidence_a": "ev_10",
  "claim_b": "SSO available on Enterprise only",
  "evidence_b": "ev_19"
}
```

Do not silently let the newest sentence overwrite the old one without recording the conflict.

<div class="callout failure-lab">

**FAILURE LAB 08: Context Rot**

Fixture site contains:

```text
40 pages
near duplicates
old pricing
new pricing
one contradiction
irrelevant blog pages
navigation boilerplate
```

Version A:

```text
append everything to messages
```

Version B:

```text
artifact store
structured evidence
context builder
```

Compare:

```text
tokens per decision
repeat-page rate
contradiction miss rate
false completion rate
latency
cost
```

The point is to measure context design, not praise it abstractly.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. What is the difference between durable state and active context?
2. Why should raw artifacts survive compaction?
3. What does a context builder do?
4. Why can a subagent improve context even when it uses the same model?
5. Why is a content hash useful for evidence?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] Raw pages are stored once, addressable by URL and hash, and never enter the prompt twice
- [ ] The progress artifact is current after every step and readable by a human
- [ ] Active context is built per decision from state, and messages reset at node boundaries
- [ ] The A/B log records all four measurements for both runs
- [ ] The compaction contract is written down, including what may never be dropped

</div>

## Primary sources

- [Anthropic, effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): the published basis for this module's claim that compaction alone is not sufficient and structured notes change behavior.
- [Deep Agents context engineering](https://docs.langchain.com/oss/python/deepagents/context-engineering): the same three techniques as framework features; you will meet them as primitives in Module 12.
