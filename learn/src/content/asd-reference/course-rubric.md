# Course Assessment and Scoring Rubric

The course is designed to evaluate production reasoning, not memorization of framework APIs.

## Completion model

A learner completes each module by producing four kinds of evidence:

1. **LEARN**: passes the knowledge check and explains the principle in their own words.
2. **SHIP**: implements or specifies the module’s Atlas milestone.
3. **RUN**: injects the required failure and captures evidence of safe behavior.
4. **DESIGN**: answers the module interview prompt and states at least one tradeoff.

A checked box without an artifact is not completion.

## Module evidence rubric

Score each dimension 0-3.

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Concept | Missing/incorrect | Repeats terminology | Explains mechanism | Explains mechanism, failure, and boundary |
| Build | Not attempted | Happy-path mock | Working bounded capability | Tested production property with clear contracts |
| Failure | No injection | Failure observed only | Recovery/denial works | Evidence, root cause, and retained regression test |
| Design | No answer | Components listed | Coherent requirement-driven answer | Tradeoffs, scale, evals, and evolution included |

**Module pass:** 9/12 with no zero in Build or Failure for Modules 02-14.

## Knowledge checks

The quiz bank contains three questions per module:

- one core distinction;
- one production mechanism;
- one multi-select boundary or failure question.

Recommended pass threshold: **80% overall** and **no less than 67% in any module**. Retakes are encouraged; rationales should remain visible after submission.

Quiz score is diagnostic. It cannot substitute for the capstone.

## RUNTIME canvas rubric

Score each letter 0-4.

### R: Requirements and risk

- **0:** Generic agent request repeated.
- **1:** User and feature named.
- **2:** Functional and nonfunctional requirements listed.
- **3:** Success metrics, constraints, non-goals, and worst failure explicit.
- **4:** Requirements prioritized and translated into architecture consequences.

### U: User journey and authority

- **0:** No journey or authority.
- **1:** Happy path only.
- **2:** Actions and human touchpoints listed.
- **3:** Read/write/material decisions classified with enforcement.
- **4:** Exceptions, cancellation, correction, expiry, and separation of duties included.

### N: Nodes and topology

- **0:** Framework name only.
- **1:** Components without flow.
- **2:** Coherent topology.
- **3:** State transitions, sync/async paths, joins, and termination explicit.
- **4:** Simpler alternatives and evolution triggers justified.

### T: Tools, context, and data

- **0:** “Give model tools/RAG.”
- **1:** Tool and source list.
- **2:** Typed interfaces and retrieval plan.
- **3:** Identity, side effects, provenance, freshness, ACLs, and budgets.
- **4:** Reconciliation, conflict handling, context compaction, and failure tests.

### I: Integrity, identity, isolation, governance

- **0:** “Use guardrails.”
- **1:** Mentions authentication.
- **2:** Trust boundaries and main threats.
- **3:** Least privilege, tenant scope, injection, secrets, sandbox, audit.
- **4:** Data lifecycle, residual risk, incident controls, and verification evidence.

### M: Memory and durable execution

- **0:** One generic memory database.
- **1:** State persistence mentioned.
- **2:** Run/session/memory or checkpoints separated.
- **3:** Durable waits, retries, idempotency, cancellation, and versioning.
- **4:** External effect reconciliation, artifact lifecycle, and memory governance.

### E: Evals, economics, observability, evolution

- **0:** “Monitor accuracy.”
- **1:** Basic logs and test examples.
- **2:** Quality, latency, and cost metrics.
- **3:** Layered evals, traces, SLOs, release gates, and canary.
- **4:** Segmented online loop, incident regression, capacity, fallback, and rollback.

**Canvas mastery:** 23/28 or higher, with no category below 3 for a high-risk system.

## 45-minute interview rubric

Score each dimension 0-4 for a maximum of 40.

| Dimension | Evidence |
|---|---|
| Requirements | Asks architecture-changing questions and states assumptions |
| Product/authority | User outcome, non-goals, risk, and model authority are clear |
| Architecture | Responsibilities, trust boundaries, and end-to-end flow are coherent |
| Tools/context | Contracts, identity, provenance, access, freshness, and effects |
| State/runtime | Explicit state, durability, waits, retries, cancellation, versioning |
| Security/governance | Injection, tenant isolation, secrets, sandbox, audit, data lifecycle |
| Evaluation | Component, trajectory, outcome, safety, and online feedback |
| Operations | Traces, SLOs, incidents, latency, cost, queues, backpressure |
| Tradeoffs/evolution | Choice-cost-mitigation-switch condition expressed clearly |
| Communication | Sequenced, concise, checks alignment, and closes with summary |

### Interview performance levels

- **34-40:** Strong hire-level system design signal.
- **30-33:** Interview ready; deepen one weak production area.
- **24-29:** Coherent but uneven; likely too prototype-oriented.
- **16-23:** Components without sufficient boundaries or failure semantics.
- **Below 16:** Rebuild from the RUNTIME canvas.

Scores are practice guidance, not predictions of a company’s hiring decision.

## Capstone rubric

Score each dimension 0-5 for a maximum of 50.

### 1. Product boundary

- User, outcome, non-goals, risk tier, authority, and measurable success.
- Autonomy is justified rather than assumed.

### 2. Control flow

- Explicit state machine/graph.
- Bounded loop, stop rules, joins, partial results, and cancellation.

### 3. Tools and context

- Typed contracts.
- Identity/scope.
- Side-effect semantics.
- Evidence provenance, freshness, conflict, and context budget.

### 4. State and durability

- Run/thread/memory/artifact/history separation.
- Crash recovery.
- Durable waits/signals/timers.
- Idempotency, reconciliation, compensation, and versioning.

### 5. Human control

- Authenticated review.
- Approve/edit/reject/request-more.
- Immutable artifact binding.
- Expiry, escalation, and separation of duties.

### 6. Security and governance

- Threat model.
- Prompt injection.
- Tenant isolation.
- Least privilege.
- Secret and sandbox controls.
- Retention/deletion and audit.

### 7. Evaluation

- At least 30 tagged cases.
- Deterministic, component, trajectory, outcome, and safety graders.
- Holdout and incident sets.
- Release gates and segmented report.

### 8. Operations and economics

- Linked traces.
- Quality/runtime/cost dashboards.
- Valid-completion SLOs.
- Incident runbooks.
- Capacity, queues, backpressure, and budgets.

### 9. Deployment

- Versioned release bundle.
- CI/eval/security/replay gates.
- Shadow/canary/rollback.
- Provider fallback.
- Tenant/regional operations and ownership.

### 10. Communication

- Architecture and sequence diagrams.
- Clear README.
- Reproducible commands.
- Failure-first demo.
- Explicit tradeoffs and known limitations.

### Capstone performance levels

- **45-50, Production design leader:** controls and failure semantics are coherent across the whole system.
- **38-44, Interview ready:** strong complete design with a few shallow operational details.
- **30-37, Capable prototype engineer:** core system works; trust or operations are uneven.
- **20-29, Demo level:** model/tool flow works, but production boundaries are weak.
- **Below 20, Re-scope:** return to deterministic vertical slice and RUNTIME canvas.

## Zero-credit failures

Regardless of aggregate score, the capstone cannot pass if it demonstrates any of these as accepted behavior:

- cross-tenant evidence exposure;
- autonomous final onboarding decision;
- publication without valid approval;
- blind retry of an uncertain material effect;
- secrets intentionally placed in prompts or public traces;
- no way to reproduce which release produced an artifact;
- no tests beyond a happy path;
- raw production credentials available to model-generated code.

## Review process

Recommended final review:

1. Learner self-scores with evidence links.
2. Peer reviews architecture, failure demo, and one trace.
3. Reviewer selects two random acceptance tests.
4. Learner completes a 20-minute design defense.
5. Reviewer records strengths, highest residual risk, and one next improvement.

## Evidence index template

```markdown
| Rubric item | Score | Evidence | Limitation |
|---|---:|---|---|
| Tool/effect safety | 4 | test_duplicate_publish.py; trace run_123 | Downstream fake supports reconciliation; real vendor not integrated |
| Tenant isolation | 5 | isolation suite; policy config | Support-access workflow still manual |
```

The evidence index prevents a polished presentation from hiding an untested property.
