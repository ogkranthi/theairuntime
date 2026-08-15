---
module: 12
title: "The Deep Agents Bridge"
duration: "60-75 min"
goal: "Rebuild the agent on a higher-level harness, verify every invariant still holds, and learn to tell framework features from guarantees."
question: "When a harness removes a lot of code, which guarantees did it provide and which are still ours?"
hook: "The framework says it handles all this."
scenario: "A harness rebuilds your agent in a fifth of the code. Somewhere in the missing four fifths were your idempotency keys and your leases."
caseStudy: repository-migration-agent
skills: [Harness evaluation, Portability]
technologies: [Python, Deep Agents, LangGraph]
repoPath: "12_deepagents.py"
labNumber: 12
invariant: "The harness can be replaced without losing a single runtime guarantee."
lab: "Replace the Harness"
deliverable: "12_deepagents.py + harness_comparison.md + green gauntlet subset on both harnesses"
status: published
---

Do not make this a framework tutorial.

The learner has already built the important runtime ideas. Now use a higher-level abstraction and interrogate it.

## First define the layers

```text
MODEL
Reasoning and generation capability.

HARNESS
The machinery that turns a model into an agent:
planning loop, tools, filesystem/workspace, subagents,
context-management conventions.

ORCHESTRATION RUNTIME
Execution state, persistence, interrupts, durable continuation,
streaming and workflow control.

APPLICATION GUARANTEES
Evidence rules, business state, idempotency, worker ownership,
authorization, budgets, completion policy and evals.
```

Frameworks can span several layers, but the distinction helps engineers ask the right questions.

## Where LangGraph fits in this course

Use LangGraph as the orchestration runtime for:

```text
explicit graph/state transitions
checkpoint persistence
durable execution semantics
interrupt/resume
streaming
```

Do not say “LangGraph makes everything durable” without naming the exact behavior being relied on.

## Where Deep Agents fits

Deep Agents is a higher-level harness on top of LangGraph. Its current design includes capabilities around:

```text
planning
filesystem-backed work/context
subagents
context management
memory/backends
```

This can replace a large amount of custom agent-loop code.

The production question is not:

> Is Deep Agents more powerful?

It is:

> Which of our invariants still pass after the port?

## Port the Vendor Review Agent

Give the agent a narrow tool set:

```text
discover_vendor_pages
fetch_vendor_page
store_evidence
query_verified_findings
request_review
```

Working artifacts might be:

```text
/plan.md
/progress.md
/open_questions.md
```

Specialized subagents:

```text
security_researcher
pricing_researcher
```

## Working files are not automatically system-of-record state

A plan file can be useful for model coherence.

It should not become the authoritative source for:

```text
who currently owns the run
whether a reviewer approved
whether an external publish succeeded
which tenant may see the run
```

Keep high-consequence business truth in structured durable state with deterministic validation.

## Subagents: why they can help

Do not teach “more agents = better.”

A subagent is useful when it creates a meaningful boundary:

```text
main supervisor
   ↓ delegate one bounded research problem
security subagent
   ↓ receives security-specific context/tools
   ↓
returns structured result
   ↓
main supervisor
```

Result schema:

```python
class ResearchResult(TypedDict):
    requirement: str
    finding: str | None
    evidence_ids: list[str]
    unknowns: list[str]
```

The main agent gets the result rather than an entire noisy internal transcript.

This is context isolation.

## Parallel/async subagents introduce runtime questions

If work can run concurrently or in the background, explicitly ask:

```text
What is the subtask identity?
Where is its partial progress stored?
Who owns it?
How is it cancelled?
What if the parent process disappears?
What if a result arrives twice?
How is its budget bounded?
How are concurrent findings merged?
```

A framework may answer some of these. Your application still needs the answers.

## Harness comparison

Run the same evaluation set against:

```text
A. explicit LangGraph Vendor Review Agent
B. Deep Agents Vendor Review Agent
```

Compare:

```text
verified outcome quality
evidence correctness
trajectory length
context size
model calls
cost
crash recovery
security invariants
duplicate work
implementation complexity
```

The purpose is not to declare one universally superior.

It is to teach an engineering method for evaluating harnesses.

## Framework portability checklist

For any future agent framework, answer:

```text
Where is durable state stored?
What identifies one logical run?
Where are checkpoints written?
What re-executes after process failure?
How are external writes made safe?
How does unfinished work become runnable?
How is concurrent ownership controlled?
How do human waits resume?
How does cancellation propagate?
How are tool permissions enforced outside the model?
How are model/tool traces inspected?
How do we run offline evals?
```

If one answer is unclear, build a failure lab instead of trusting a marketing phrase.

<div class="callout failure-lab">

**FAILURE LAB 12: Replace the Harness**

Port the agent, then run the existing invariants unchanged.

The important outcome is not “the Deep Agent completed the task.”

It is a comparison report showing exactly which guarantees remained application-level and which implementation burden moved into the framework.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. What is a harness?
2. What is the difference between harness features and application guarantees?
3. Why can a filesystem artifact be useful without becoming the source of truth?
4. What production questions appear when subagents become asynchronous?
5. How would you evaluate a new framework without relying on a demo?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] The port reuses your application tables as the source of truth
- [ ] Idempotency keys and the lease scheduler are wired at the tool boundary of the harness
- [ ] The comparison matrix is complete, with verification notes per row
- [ ] The four-lab subset is green on both implementations

</div>

## Primary sources

- [Deep Agents overview](https://docs.langchain.com/oss/python/deepagents/overview) and [context engineering](https://docs.langchain.com/oss/python/deepagents/context-engineering): read the mechanisms, then map each to the module where you built it by hand.
- [Anthropic on effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): the industry statement of the harness/runtime split this module makes you feel.
