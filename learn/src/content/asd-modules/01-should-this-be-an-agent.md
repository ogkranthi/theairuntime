---
id: "01"
slug: "should-this-be-an-agent"
title: "Should This Be an Agent?"
track: "Foundations"
duration_minutes: 90
difficulty: "Core"
build_milestone: "Write an agent-versus-workflow decision memo for Atlas."
objectives:
  - "Compare deterministic software, workflows, copilots, and bounded agents"
  - "Identify when adaptive action selection creates measurable value"
  - "Choose the minimum safe autonomy for Atlas"
prerequisites:
  - "orientation-runtime-method"
---

# Should This Be an Agent?

## What you will design

You will decide which parts of Atlas require model-driven agency, which belong in deterministic workflows, and which should not be automated.

## The most important agent decision

The first architecture question is not “Which agent framework?” It is:

> Does this task benefit from a model choosing the next action at runtime?

Many systems called agents are better implemented as ordinary software with one or two model calls. A workflow is easier to test, cheaper to run, easier to secure, and more predictable. Agency is useful when the path cannot be fully enumerated in advance and the model can use feedback to decide what to do next.

A strong design uses the **minimum necessary agency**.

## Four system shapes

### 1. Deterministic software

Use ordinary code when rules are known and correctness can be expressed directly.

Atlas examples:

- validate a registration number format;
- enforce that a sanctions result is less than 24 hours old;
- check whether mandatory evidence classes are present;
- calculate a deterministic risk score from approved rules;
- enforce user and tenant authorization.

### 2. Model-enhanced workflow

The path is fixed, but one step uses a model.

Atlas examples:

- extract officers from a PDF into a schema;
- classify an article as relevant or irrelevant;
- summarize evidence already selected by deterministic retrieval;
- draft a document request.

### 3. Agentic workflow

The application defines states and allowed actions; the model selects among them based on intermediate results.

Atlas examples:

- decide which source to query next when entity resolution is ambiguous;
- identify a conflict and gather targeted evidence;
- stop researching when evidence sufficiency criteria are met;
- ask the analyst a focused clarification.

### 4. Open-ended agent

The model has broad freedom to plan and act across a large tool space. This may be justified for research or coding in an isolated environment, but it is rarely the default for a regulated operational workflow.

Atlas should not begin here.

## The agent suitability test

A task is a stronger agent candidate when all of these are true:

1. **The path is genuinely dynamic.** Inputs and intermediate observations change what should happen next.
2. **The model has a comparative advantage.** The work requires interpretation, synthesis, or ambiguous search, not just rule execution.
3. **Progress is observable.** The system can inspect intermediate state and tool results.
4. **Success is verifiable.** There is an outcome, rubric, test, or human review.
5. **The action space can be bounded.** Tools, budgets, and authority can be constrained.
6. **Failure is recoverable or governable.** The architecture can retry, undo, escalate, or require approval.
7. **The value exceeds the added complexity.** Agency improves completion, quality, or time enough to justify cost and operational risk.

If success cannot be evaluated and authority cannot be bounded, adding autonomy increases uncertainty without creating control.

## Decision table for Atlas

| Capability | Deterministic | Model step | Agentic | Human-owned |
|---|---:|---:|---:|---:|
| Authenticate analyst | Yes | | | |
| Resolve ambiguous entity | | Yes | Yes | Escalation |
| Check source freshness | Yes | | | |
| Extract a complex ownership table | | Yes | | Review if low confidence |
| Choose next research source | | | Yes | |
| Apply a hard policy prohibition | Yes | | | |
| Explain conflicting evidence | | Yes | | |
| Request missing document | | Draft | Propose | Approve for sensitive cases |
| Publish official packet | | | Propose | Yes |
| Approve/reject counterparty | | | | Yes |

The table is more valuable than the label “multi-agent.”

## A practical complexity ladder

Increase complexity only when the simpler level fails a measured requirement:

```text
deterministic code
    ↓
single model call
    ↓
fixed model workflow
    ↓
bounded tool loop
    ↓
explicit graph
    ↓
durable workflow
    ↓
multiple specialized agents
    ↓
cross-system agent interoperability
```

Each step adds state, failure modes, testing burden, cost, latency, and security surface. The burden of proof belongs to the more complex design.

## Common false reasons to use an agent

### “The process has many steps”

Many steps do not imply dynamic reasoning. A fixed workflow can have hundreds of steps.

### “We want it to feel autonomous”

Autonomy is not a user outcome.

### “The model has a huge context window”

Context capacity does not create state durability, access control, or effect correctness.

### “A framework makes it easy”

A convenient API does not remove operational complexity.

### “We may add more tools later”

A larger tool catalog usually strengthens the need for routing, policy, and isolation, not unrestricted agency.

## Failure injection: the agent tax

Suppose Atlas always executes the same path:

1. registry;
2. sanctions;
3. document extraction;
4. news search;
5. synthesis;
6. human review.

A team wraps this in a free-running agent loop. The model now spends tokens deciding the same sequence, sometimes skips a step, occasionally repeats a search, and makes traces harder to compare.

The agent adds no useful adaptivity. It creates an **agent tax**: more variance, cost, latency, and debugging for no improvement.

The better design is a deterministic workflow with model calls inside specific steps. Add a bounded adaptive branch only for ambiguous cases.

## SHIP: write an agent decision memo

Create a one-page memo with:

- the user outcome;
- the fixed path for standard cases;
- the conditions that require dynamic research;
- the exact actions the model may choose;
- the deterministic controls;
- the human-owned decisions;
- the metric that would justify more agency.

Example trigger:

> Use an adaptive research loop only when entity-resolution confidence is below 0.90, evidence conflicts, or a required source is unavailable.

## RUN: remove agency

Build two paper architectures:

- Version A: fixed workflow.
- Version B: bounded agent loop.

Compare:

- expected quality;
- testability;
- latency;
- cost;
- operational complexity;
- failure recovery;
- security.

The answer may be a hybrid. That is often the production design.

## DESIGN: interview drill

**Prompt:** Design an agent that resolves customer-support tickets.

Ask questions that determine whether this should be:

- retrieval plus draft;
- a deterministic workflow;
- a bounded action agent;
- or a human-assist system.

High-signal questions include:

- Can it issue refunds?
- What is the maximum refund?
- Can actions be undone?
- Is policy deterministic?
- What evidence is authoritative?
- What percentage of tickets follow known paths?
- How is success measured?
- What happens when the customer disputes the action?

## Check your understanding

1. What property distinguishes an agent from a model-enhanced fixed workflow?
2. Why is a dynamic path insufficient by itself to justify an agent?
3. Name two deterministic Atlas responsibilities.
4. What metric could justify moving from a fixed workflow to a bounded agent?
5. Why is multi-agent design near the top of the complexity ladder?

## Primary references

- [Anthropic: Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [LangGraph: Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [OpenAI: Applied AI Engineer role competencies](https://openai.com/careers/applied-ai-engineer-enterprise-san-francisco/)
