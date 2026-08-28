---
id: "16"
slug: "capstone-atlas"
title: "Capstone: Atlas in Production"
track: "Capstone"
duration_minutes: 480
difficulty: "Capstone"
build_milestone: "Build, demo, evaluate, and defend the complete production system."
objectives:
  - "Build the complete Atlas system across control, trust, runtime, quality, and operations"
  - "Demonstrate safe behavior through fault injection and release evidence"
  - "Defend the architecture, tradeoffs, limitations, and scale plan"
prerequisites:
  - "system-design-interview"
---

# Capstone: Atlas in Production

## What you will design

You will build, operate, and defend the complete Atlas system. The capstone integrates every production property from the course and requires evidence from both the happy path and controlled failure.

## The challenge

Build and defend **Atlas**, a production-oriented counterparty due-diligence agent for a fictional bank.

Atlas receives a company or person, the case policy, jurisdiction, and supporting documents. It gathers evidence, resolves identity, checks required sources, detects conflicting facts, requests missing information, and produces a cited packet for a human analyst.

Atlas must not make the final onboarding decision.

The detailed product and architecture brief is in [`content/reference/capstone-atlas.md`](../reference/capstone-atlas.md).

## What the capstone proves

The finished project should show that you can build more than a chat demo. It should demonstrate:

- justified autonomy;
- explicit control flow;
- typed tools;
- evidence provenance;
- governed state and memory;
- durable waits and recovery;
- human approval;
- security and tenant isolation;
- layered evaluation;
- observability and incident handling;
- latency, cost, and capacity controls;
- safe deployment and rollback;
- clear system-design communication.

## Required user journey

```text
1. Analyst creates a case.
2. Atlas validates scope and resolves the entity.
3. Mandatory source checks run.
4. Uploaded documents are extracted as untrusted evidence.
5. Atlas finds conflicts, gaps, and unresolved questions.
6. A bounded research loop may request additional allowed work.
7. Atlas produces a structured, claim-level cited draft.
8. Deterministic validators and policy checks run.
9. The case pauses for authenticated human review.
10. Analyst approves, edits, rejects, or requests more evidence.
11. Approved packet is published as an immutable version.
12. Every decision and effect is traceable and replay-safe.
```

## Mandatory constraints

Use these fictional course constraints unless you document an alternative:

- 20,000 new cases per day;
- 500 concurrently executing cases;
- 50,000 cases may be waiting;
- standard P95 draft under 10 minutes;
- high-risk P95 draft under 30 minutes;
- median variable cost under $0.80 for a standard case;
- hard autonomous budget of $4.00 per case;
- cases may wait 30 days for documents or approval;
- multiple tenants and at least two data-residency regions;
- final publication requires authenticated human approval;
- zero tolerated cross-tenant access;
- every material claim needs source and locator;
- external effects require idempotency and audit.

## Technology choice

The course is architecture-first. A suggested implementation is:

```text
Frontend: Next.js or equivalent
API: FastAPI / TypeScript service / equivalent
Schemas: Pydantic, Zod, JSON Schema, or equivalent
Agent runtime: explicit loop or graph; SDK optional
Durable workflow: Temporal or a well-specified durable state-machine substitute
State: PostgreSQL or equivalent
Artifacts: object storage or local S3-compatible service
Retrieval: PostgreSQL/vector extension or equivalent
Queue/cache: Redis or equivalent when justified
Telemetry: OpenTelemetry-compatible traces and metrics
Tests: unit + integration + eval harness + failure injection
Containers: Docker Compose for local execution
```

You may use other technologies. The README must explain how each maps to the required production property.

## Repository contract

```text
atlas/
├── apps/
│   ├── web/                    # case, trace, and approval UI
│   ├── api/                    # authenticated case API
│   └── worker/                 # activities and background work
├── packages/
│   ├── schemas/                # versioned contracts
│   ├── agent/                  # bounded decision loop
│   ├── workflows/              # durable business state
│   ├── tools/                  # tool definitions and adapters
│   ├── context/                # retrieval, provenance, compaction
│   ├── policy/                 # authority and risk rules
│   ├── evals/                  # datasets, graders, reports
│   ├── observability/          # telemetry conventions
│   └── testkit/                # fakes and failure injection
├── fixtures/
│   ├── cases/
│   ├── documents/
│   ├── sources/
│   └── adversarial/
├── docs/
│   ├── architecture.md
│   ├── threat-model.md
│   ├── runbooks.md
│   ├── evaluation-report.md
│   ├── capacity-and-cost.md
│   └── interview-walkthrough.md
├── infra/
│   ├── compose.yaml
│   └── telemetry/
├── scripts/
├── .env.example
├── Makefile
└── README.md
```

Do not put all logic in one agent file. The repository structure should reveal the responsibility boundaries.

## Core domain model

At minimum, define:

```python
class CaseStatus(str, Enum):
    CREATED = "CREATED"
    RESOLVING = "RESOLVING"
    RESEARCHING = "RESEARCHING"
    WAITING_FOR_DOCUMENT = "WAITING_FOR_DOCUMENT"
    DRAFTING = "DRAFTING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PUBLISHED = "PUBLISHED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

class EvidenceItem(BaseModel):
    evidence_id: str
    tenant_id: str
    source_type: str
    source_uri: str
    retrieved_at: datetime
    source_published_at: datetime | None
    content_hash: str
    locator: str
    excerpt: str
    trust_class: str
    access_policy_id: str

class Claim(BaseModel):
    claim_id: str
    statement: str
    evidence_ids: list[str]
    confidence_bucket: str
    conflict_ids: list[str]
    status: Literal["SUPPORTED", "CONFLICTED", "UNSUPPORTED"]

class ApprovalDecision(BaseModel):
    decision_id: str
    actor_id: str
    actor_roles: set[str]
    action: Literal["APPROVE", "EDIT", "REJECT", "REQUEST_MORE"]
    artifact_version: str
    reason: str | None
    decided_at: datetime
```

Use immutable artifact versions. Never overwrite the exact draft that a human approved.

## Bounded agent contract

The model may return only an allowed decision schema:

```python
class NextAction(BaseModel):
    action: Literal[
        "CALL_TOOL",
        "REQUEST_DOCUMENT",
        "SYNTHESIZE",
        "ESCALATE",
        "FINISH"
    ]
    tool_name: str | None = None
    arguments: dict[str, Any] | None = None
    reason_code: str
    evidence_gap_ids: list[str] = []
    expected_information_gain: Literal["LOW", "MEDIUM", "HIGH"]
```

The application must:

1. parse and validate;
2. authorize;
3. enforce state preconditions;
4. enforce budget and step limits;
5. execute through the tool gateway;
6. record the observation;
7. stop or escalate on no progress.

The model must never invoke raw network, database, shell, or production credentials directly.

## Required tools

Implement fakes or sandboxed adapters for:

- `resolve_entity`;
- `lookup_registry`;
- `search_sanctions`;
- `lookup_ownership`;
- `search_adverse_media`;
- `extract_document`;
- `request_document`;
- `create_review_task`;
- `publish_packet`.

Every tool contract needs:

- typed input/output;
- purpose;
- side-effect class;
- required principal and tenant scope;
- preconditions;
- timeout;
- retry class;
- idempotency or reconciliation behavior;
- provenance fields;
- redaction rules;
- version.

## Milestone plan

### M0: Design baseline

Deliver:

- RUNTIME canvas;
- user journey;
- risk and authority matrix;
- high-level diagram;
- success metrics;
- architecture decision record for agent versus workflow.

Exit criteria:

- final authority is explicit;
- worst credible failures are named;
- scale and latency assumptions are measurable.

### M1: Deterministic vertical slice

Build intake → source fakes → cited packet without an autonomous loop.

Exit criteria:

- typed schemas;
- deterministic state machine;
- claim-level provenance;
- unit tests;
- one command starts the local system.

### M2: Bounded agent loop

Add structured next-action decisions for evidence gaps.

Exit criteria:

- maximum steps and spend;
- allowed tool list;
- no-progress detector;
- malformed-output recovery;
- trace for each decision;
- model can be replaced by a deterministic fake in tests.

### M3: Tools and effects

Add risk-rated tool gateway and external-effect safety.

Exit criteria:

- authorization outside model;
- idempotency keys;
- uncertain-effect reconciliation;
- retry taxonomy;
- tool contract tests;
- duplicate-delivery test.

### M4: Context, retrieval, and memory

Add ACL-aware evidence retrieval, compaction, and governed memory.

Exit criteria:

- tenant filters enforced at data layer;
- source freshness;
- evidence locator validation;
- context budget;
- run state separated from artifacts and long-term memory;
- memory write provenance and deletion.

### M5: Durability and HITL

Run the case as a durable workflow with document and approval waits.

Exit criteria:

- crash recovery;
- durable timers/signals;
- no worker held while waiting;
- authenticated approve/edit/reject/request-more;
- immutable approved artifact;
- workflow version/replay test.

### M6: Security and governance

Threat-model and harden the system.

Exit criteria:

- indirect prompt-injection tests;
- tenant-isolation tests;
- scoped service/tool identities;
- secret handling;
- content and code sandbox where relevant;
- audit trail;
- data lifecycle and retention controls.

### M7: Evals and operations

Add the quality and runtime control plane.

Exit criteria:

- at least 30 eval cases;
- deterministic, model, trajectory, and safety graders;
- release report by segment;
- linked traces and version metadata;
- quality and runtime dashboard;
- SLO and alert definitions;
- incident replay workflow.

### M8: Scale and release

Load-test and ship a controlled release.

Exit criteria:

- workload/capacity model;
- queues and per-tenant fairness;
- routing/caching backed by measurements;
- retry storm protection;
- cost budget enforcement;
- shadow and canary mode;
- rollback and emergency disable;
- provider-failure drill.

## Acceptance tests

The capstone must pass tests equivalent to these.

### Functional

- standard case creates a cited draft;
- missing document pauses and resumes;
- conflicting evidence is retained and surfaced;
- analyst edit produces a new artifact version;
- rejected draft cannot publish;
- approved version publishes once.

### Control and durability

- malformed model output cannot bypass validation;
- maximum step and cost budgets stop the loop;
- worker crash resumes from recorded progress;
- duplicate activity delivery does not duplicate an effect;
- uncertain publication reconciles before retry;
- cancellation stops new work and records reason;
- historical workflow replay remains deterministic.

### Security

- document prompt injection cannot alter authority;
- cross-tenant evidence request is denied at the data layer;
- model-generated arbitrary tool name is rejected;
- secret values never appear in trace capture;
- sandbox cannot reach production credentials;
- memory write and read obey tenant and purpose scope;
- approval requires an authorized authenticated actor.

### Quality

- every material claim has valid evidence references;
- unsupported claims fail validation;
- mandatory source completion is measured;
- prohibited tool/action rate is zero in the release set;
- trajectory grader detects a repeated loop;
- segment report includes risk tier, source, and workflow version.

### Operations

- one trace connects workflow, model, retrieval, tool, and approval spans;
- stuck workflow and cost-runaway alerts fire;
- tool outage degrades or escalates according to policy;
- retry storm is bounded;
- canary can be disabled without full deployment;
- one provider outage follows the tested fallback matrix.

## Failure injection: required matrix

Run at least 8 of the following; advanced submissions run all 12.

| Failure | Expected system behavior |
|---|---|
| Registry timeout | Backoff; no duplicate work; explicit source state |
| Rate limit storm | Circuit breaker, queue control, bounded retries |
| Malformed tool call | Schema rejection and bounded repair |
| Duplicate callback | Deduplicated by event/idempotency identity |
| Worker crash after effect | Reconcile; do not repeat blindly |
| Prompt injection in PDF | Treat as data; no authority change |
| Cross-tenant ID in model output | Data layer denies; security event emitted |
| Human approval after deploy | Resume compatible workflow; preserve approved version |
| Model route unavailable | Validated fallback or explicit pause |
| Cost budget exhausted | Stop optional work; surface incomplete state |
| Citation locator missing | Validation fails; packet cannot advance |
| Cancellation during fan-out | Stop new work; finish required reconciliation |

## Eval dataset

Create at least:

```text
10 standard cases
8 edge cases
6 adversarial cases
4 failure-recovery cases
2 approval/escalation cases
```

Tag cases by:

- risk tier;
- jurisdiction;
- language;
- document size;
- conflict type;
- required sources;
- attack class;
- failure class;
- expected authority path.

Include a fresh holdout set that is not used to tune prompts or routing.

## Release scorecard

Your report should show:

| Dimension | Metric | Gate |
|---|---|---|
| Evidence | Citation locator correctness | Defined target; stricter for high-risk |
| Coverage | Mandatory source completion | No high-risk regression |
| Safety | Prohibited autonomous actions | 0 |
| Isolation | Cross-tenant test failures | 0 |
| Behavior | No-progress loop rate | Below defined threshold |
| Human | Material correction rate | Better than baseline or justified |
| Reliability | Valid completion | Meets SLO |
| Performance | P95 draft latency | Meets workload target |
| Economics | P50/P95 cost per case | Within budget |
| Recovery | Duplicate-effect failures | 0 in fault suite |

Explain why each numeric target is appropriate. Do not copy arbitrary course numbers without a product rationale.

## Required documentation

### Architecture

- context and container diagrams;
- state machine;
- sequence for one standard case;
- sequence for crash after external effect;
- data and trust boundaries;
- deployment topology.

### Decisions

At least five architecture decision records:

1. why Atlas uses bounded autonomy;
2. workflow/durability choice;
3. memory and evidence-store separation;
4. multi-agent versus single orchestrator;
5. model routing and fallback;
6. tenant-isolation approach;
7. telemetry content policy.

### Operations

- SLOs and alerts;
- capacity/cost model;
- deployment and rollback;
- incident runbooks;
- backup/recovery plan;
- data retention and deletion.

### Trust

- threat model;
- authority matrix;
- connector permissions;
- audit schema;
- adversarial test report;
- known limitations.

## Demo script

A strong 12-minute demo:

### Minute 0-1: problem and boundary

State the user outcome and that Atlas never makes the final bank decision.

### Minute 1-3: standard case

Create a case and show parallel evidence collection, structured state, and claim-level citations.

### Minute 3-5: injected untrusted instruction

Open a malicious document. Show that it is stored as untrusted evidence and cannot authorize a tool or change policy.

### Minute 5-7: crash and resume

Crash a worker after an external tool completes. Restart and show no duplicated effect.

### Minute 7-9: human approval

Show approve/edit/reject, authenticated actor, immutable artifact version, and publication gate.

### Minute 9-10: trace and eval

Open the run trace, cost/latency, tool decisions, policy checks, and one failed regression case.

### Minute 10-11: scale and release

Show queue/cost controls, canary flag, and fallback matrix.

### Minute 11-12: tradeoff and limitation

Explain one conscious compromise and the next production improvement.

Do not spend the demo watching a model type. Show the control plane.

## Portfolio package

Create:

- public architecture README;
- 5-8 minute edited walkthrough;
- one-page system-design canvas;
- architecture and sequence diagrams;
- eval report;
- threat model excerpt;
- incident postmortem;
- cost and capacity sheet;
- interview answer outline;
- “what I would change at 10× scale” note.

Scrub secrets and customer-like personal data. Use fictional organizations and synthetic evidence.

## Grading rubric

Score each dimension 0-5 for a total of 50.

| Dimension | Evidence of mastery |
|---|---|
| Product boundary | Clear user, outcome, non-goals, risk, authority |
| Control flow | Explicit topology, state machine, bounded autonomy |
| Tools/context | Typed contracts, provenance, ACLs, freshness, effects |
| State/durability | Recovery, waits, idempotency, cancellation, versioning |
| Human control | Authenticated approval, edit/reject, artifact integrity |
| Security/governance | Threat model, tenant isolation, secrets, sandbox, audit |
| Evaluation | Layered datasets/graders, trajectory, safety, release gates |
| Operations | Traces, SLOs, incidents, capacity, cost, backpressure |
| Deployment | Release bundle, canary, fallback, rollback, ownership |
| Communication | Coherent docs, demo, tradeoffs, limitations |

### Performance levels

- **45-50: Production design leader**, coherent across layers; failure and evolution are first-class.
- **38-44: Interview ready**, strong architecture with a few shallow operational details.
- **30-37: Capable prototype engineer**, core build works; production controls are uneven.
- **20-29: Demo level**, model/tool flow works, but authority, durability, trust, or evals are weak.
- **Below 20: Re-scope**, return to the RUNTIME canvas and deterministic vertical slice.

## Stretch goals

Choose only after the required system is solid:

- expose a read-only capability through MCP;
- justify and implement one separate specialist boundary;
- policy-as-code with explainable decisions;
- regional tenant pinning;
- encrypted per-tenant artifact keys;
- shadow comparison UI;
- trace-to-eval case generator;
- confidence calibration by task segment;
- chaos testing for workflow workers and connectors;
- model-provider portability report;
- temporal knowledge refresh for long-lived cases;
- analyst feedback loop with memory-governance controls.

## Final design defense

Prepare a 20-minute defense with these questions:

1. Why is this an agent instead of a fixed workflow?
2. Which decisions remain deterministic?
3. What is the worst failure, and which controls prevent it?
4. How does the system survive a crash after a tool effect?
5. How do you prove a claim is supported?
6. How is tenant scope enforced if the model generates the wrong ID?
7. What happens when the model provider changes behavior?
8. Which eval metric would block a release?
9. Where does the system spend time and money?
10. What would you change at 100× traffic?
11. Which capability would you remove first if reliability fell?
12. What limitation remains unresolved?

A credible design names its limitations. “Production-ready” is not the absence of uncertainty; it is the presence of controlled boundaries, measurable behavior, and recoverable failure.

## Completion checklist

You are done when another engineer can:

- start the system from documented commands;
- understand the architecture without reading every file;
- reproduce tests and evals;
- inject failures safely;
- inspect a complete trace;
- see why an action was allowed or denied;
- recover a crashed or waiting case;
- verify an approved artifact;
- compare release versions;
- explain the major tradeoffs in an interview.

## SHIP: complete the production system

Complete Milestones M0-M8, pass the acceptance tests, and produce the required architecture, trust, eval, operations, deployment, and portfolio artifacts. The repository must be reproducible from documented commands and must support deterministic fakes when no model API is configured.

## RUN: demonstrate failure and recovery

Run at least eight failure injections, including one uncertain external effect, one worker crash, one prompt-injection attempt, one cross-tenant attempt, one approval/version change, and one cost or retry-storm event. For each, retain the trace, observed invariant, recovery evidence, and permanent regression test.

## DESIGN: defend Atlas in 20 minutes

Present the product boundary, first architecture, one normal sequence, one crash/effect sequence, the authority matrix, eval and SLO gates, capacity/cost estimate, rollout plan, and two explicit tradeoffs. Answer the questions in **Final design defense** without relying on framework names as the explanation.

## Check your understanding

1. Why is Atlas a bounded agent inside a durable workflow rather than one autonomous loop?
2. Which state belongs in the workflow history, artifact store, and long-term memory?
3. How does Atlas prevent a crash from duplicating publication?
4. Why does approval bind to an immutable artifact version?
5. Which eval result should block a release even when final-answer quality improves?
6. What should degrade first when capacity or budget is exhausted?

## Primary references

Use the source map in [`content/reference/primary-source-map.md`](../reference/primary-source-map.md) to connect each capstone control to official documentation and standards.
