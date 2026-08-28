# Counterparty Due Diligence benchmark

## Candidate-visible premise

### Foundations

A global bank performs about 5,000 counterparty reviews per month. Analysts use
internal documents, external sources, and structured risk databases. Reviews
can take several hours. Design an AI-assisted system that reduces analyst
workload while preserving human oversight.

### FDE

A global bank wants to use AI to improve counterparty due diligence. Design the
system.

### Senior FDE

The head of compliance says, "We need an AI agent to automate counterparty due
diligence. Our target is 80 percent automation." You are the FDE leading the
technical engagement. What do you do?

## Production anchors

The case is designed around real production concerns:

- ambiguous ownership and success criteria
- multi-source evidence gathering
- permission-aware retrieval
- multi-day execution
- human pause and resume
- unreliable or stale external sources
- consequential decisions
- retry and side-effect ambiguity
- auditability and reproducibility
- long-tail false-negative risk
- staged rollout and autonomy
- cost and latency tradeoffs
- model and workflow version changes

## Hidden facts

The machine-readable version is in:

`overlay/src/fde-gym/scenarios/counterparty-due-diligence.json`

Important facts include:

- about 5,000 reviews per month
- most reviews finish within four hours
- about 15 percent can remain open for one to three days
- internal KYC documents, CRM records, policy documents, sanctions and risk
  systems, and external research are involved
- document access is user, case, and jurisdiction dependent
- the business requested 80 percent automation, but compliance has not approved
  that target
- an analyst recommends a result, with senior approval for high-risk cases
- false-negative tolerance has not been formally set
- external APIs and sources can fail, time out, change, or become stale
- an auditor must later reconstruct evidence, versions, actions, and overrides
- the customer wants an initial production path in six weeks

## Architecture signals

Strong candidates usually discover or reason toward:

- a controlled workflow rather than one unconstrained autonomous agent
- bounded reasoning steps inside deterministic lifecycle control
- persisted execution and domain state
- permission-aware evidence retrieval
- authoritative data separated from indexes and model context
- narrow tool boundaries
- explicit action authority
- risk-based human participation
- evidence provenance and versioning
- offline and online evaluation
- failure injection and release gates
- operational traces and reconstructability
- staged rollout before increased autonomy
- cost and performance estimates only where architecture-relevant

Weak candidates often:

- start drawing before understanding decision authority
- treat the vector store as the system of record
- keep state only in chat history
- use retries without idempotency or reconciliation
- give the model direct access to broad internal APIs
- add several agents without independent lifecycle, context, or authority
- use one aggregate accuracy number as the launch gate
- add a generic Human Approval box after every step
- describe observability as a box without explaining reconstructability
- assume every unknown requirement instead of identifying what must be learned

## Multiple defensible architectures

### Workflow-centric

A durable workflow owns lifecycle, policy checkpoints, retries, and human
waiting. Bounded AI steps gather and synthesize evidence.

Best when control, auditability, and recovery dominate.

### Agent-centric with strict guardrails

An orchestrator agent chooses bounded research steps. Durable state, narrow
read-only tools, policy enforcement, and explicit completion criteria remain
outside model discretion.

Best when investigation paths are highly variable.

### Hybrid

A deterministic workflow owns the investigation lifecycle. One reasoning
component can adapt the research plan inside defined stages. Tools, evidence,
authority, and human escalation remain explicit.

This is likely the most broadly defensible baseline, but it is not the only
passing architecture.
