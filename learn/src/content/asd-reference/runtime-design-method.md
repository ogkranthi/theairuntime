---
title: The RUNTIME Agentic System-Design Method
description: A reusable method for turning an ambiguous agent use case into a production architecture.
---

# The RUNTIME Agentic System-Design Method

Use this method in every lesson, architecture review, and interview.

## R: Requirements and risk

Start with the outcome, not the model.

Capture:

- Who is the user?
- What decision or task is the system helping complete?
- What is the business value?
- What counts as success?
- What can go wrong, and how severe is the consequence?
- What are the latency, freshness, throughput, cost, privacy, and availability constraints?
- What does the system explicitly **not** do?

Classify the use case by consequence:

| Tier | Typical effect | Default control |
|---|---|---|
| 0 | Read-only explanation or draft | Automated, monitored |
| 1 | Reversible low-impact action | Confirmation or undo |
| 2 | Material external side effect | Human approval |
| 3 | Regulated, financial, legal, safety, or irreversible action | Separation of duties, policy enforcement, full audit |
| 4 | Unacceptable autonomous authority | Do not automate the decision |

The risk tier should shape the architecture. It is not a compliance paragraph added at the end.

## U: User journey and authority

Draw the actual journey:

1. How is work requested?
2. What information is available at the start?
3. What does the agent need to discover?
4. Which actions are read-only?
5. Which actions change the world?
6. Where must a human inspect, edit, approve, reject, or take over?
7. How can the user cancel, correct, or appeal?

Create an authority matrix for every tool:

| Tool | Reads data | Writes data | External effect | Reversible | Approval |
|---|---:|---:|---:|---:|---|
| Search registry | Yes | No | No | N/A | No |
| Request a document | Yes | Yes | Sends communication | Usually | Conditional |
| Publish a risk packet | Yes | Yes | Creates official record | Versioned | Yes |
| Approve counterparty | Yes | Yes | Material decision | No | Never delegated |

Do not describe an agent as “autonomous” without defining what it is authorized to do.

## N: Nodes, topology, and control flow

Choose the simplest topology that satisfies the requirements.

Common options:

- deterministic workflow with one model call;
- tool-calling loop;
- router with specialist paths;
- parallel fan-out and deterministic join;
- planner-executor;
- evaluator-optimizer;
- supervisor with subagents;
- durable workflow with waits and external events.

For every loop, define:

- state;
- transition conditions;
- maximum iterations;
- time and token budgets;
- success condition;
- retryable failure;
- terminal failure;
- escalation condition;
- cancellation behavior.

The model may choose among allowed transitions. The application owns the state machine.

## T: Tools, context, and data

For each tool, specify:

- typed input and output;
- description and intended use;
- authentication identity and scopes;
- timeout;
- retry policy;
- rate limit;
- idempotency strategy;
- side effects;
- error taxonomy;
- data classification;
- audit fields.

For context, specify:

- trusted instructions;
- user input;
- retrieved evidence;
- memory;
- tool results;
- policy and schema versions;
- provenance;
- access controls;
- freshness;
- context budget.

Treat retrieved text and tool output as data, not instructions.

## I: Integrity, identity, isolation, and governance

Draw trust boundaries.

Cover:

- end-user identity;
- service identity;
- delegated authorization;
- tenant isolation;
- secrets;
- least privilege;
- policy enforcement outside the model;
- prompt injection;
- data exfiltration;
- memory poisoning;
- unsafe output handling;
- code or browser sandboxing;
- network egress;
- logging and redaction;
- retention and deletion;
- incident response.

A model-based guardrail can provide a useful signal. It is not the only security boundary for a consequential action.

## M: Memory and durable execution

Separate:

- request-scoped data;
- run state;
- thread/session state;
- workflow event history;
- long-term user or organization memory;
- enterprise knowledge;
- audit history.

Ask:

- What must survive a process crash?
- What must survive a deploy?
- What can be recomputed?
- What must never be repeated?
- How is duplicate delivery handled?
- How are pending human approvals stored?
- How does the system resume after days or weeks?
- How are old memories corrected or deleted?

Durability is not the same as memory. Memory helps future decisions; durability preserves the progress and correctness of current work.

## E: Evals, economics, observability, and evolution

Define quality before launch.

Measure:

- task success;
- evidence coverage;
- citation correctness;
- tool selection and arguments;
- policy adherence;
- unsafe or unauthorized actions;
- human correction rate;
- latency;
- cost;
- retries;
- loop length;
- failure recovery;
- user outcome.

Instrument the full trajectory, not only the final text.

Plan the change process:

- prompt, model, policy, schema, tool, and workflow versions;
- offline regression;
- shadow testing;
- canary release;
- rollback;
- production sampling;
- incident-driven test additions.

## The one-page design canvas

A complete first-pass answer should fit on one page:

1. Outcome and non-goals
2. Users and journey
3. Risk and authority tier
4. Architecture and topology
5. Tools and data
6. State and memory
7. Durable execution and failure handling
8. Human checkpoints
9. Security and isolation
10. Evals and SLOs
11. Scale and cost
12. Rollout and ownership

The rest of the design deepens this page; it should not contradict it.
