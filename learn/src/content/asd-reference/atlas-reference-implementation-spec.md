# Atlas Reference Implementation Specification

This is the implementation contract for an optional companion repository. It is intentionally provider- and framework-neutral.

## Goals

The reference app must make production properties visible and testable:

- explicit state and authority;
- typed model decisions and tools;
- evidence provenance;
- durable waits and recovery;
- human approval;
- tenant isolation;
- eval and trace data;
- cost and release versions;
- safe failure.

It is not a full bank compliance product and must use synthetic data and fake external sources.

## Services

### Web

Pages:

- case list and create;
- case timeline/state;
- evidence and conflict viewer;
- draft packet with citations;
- approval queue and diff;
- run trace and cost;
- eval report;
- operator controls for failure injection.

### Case API

Suggested endpoints:

```text
POST   /v1/cases
GET    /v1/cases/{case_id}
POST   /v1/cases/{case_id}/documents
POST   /v1/cases/{case_id}/signals/document-received
POST   /v1/cases/{case_id}/cancel
GET    /v1/cases/{case_id}/artifacts
GET    /v1/runs/{run_id}/trace
POST   /v1/approvals/{approval_id}/decision
POST   /v1/admin/failures/{failure_type}
GET    /health/live
GET    /health/ready
```

Every endpoint resolves an authenticated principal and tenant. Local development may use signed fixture identities, but the interface must match real identity propagation.

### Durable workflow

Owns:

- state transitions;
- parallel source work and join policy;
- retries/timeouts/timers;
- document and approval waits;
- cancellation;
- workflow/release versions;
- activity result recording;
- child task coordination.

Suggested states:

```text
CREATED
VALIDATING
RESOLVING_ENTITY
COLLECTING_MANDATORY_EVIDENCE
WAITING_FOR_DOCUMENT
ANALYZING_CONFLICTS
RESEARCHING_GAPS
DRAFTING
VALIDATING_PACKET
WAITING_FOR_APPROVAL
PUBLISHING
PUBLISHED
REJECTED
CANCELLED
FAILED
```

### Agent runtime

Input:

- current typed state summary;
- allowed actions;
- evidence gaps;
- selected evidence;
- budgets;
- policy reason codes.

Output:

```json
{
  "action": "CALL_TOOL",
  "tool_name": "search_adverse_media",
  "arguments": {"entity_id": "entity_123", "query": "..."},
  "reason_code": "MISSING_ADVERSE_MEDIA",
  "evidence_gap_ids": ["gap_8"],
  "expected_information_gain": "HIGH"
}
```

The application parses, validates, authorizes, and records the decision. Tests can replace the model with a deterministic scripted policy.

### Model gateway

Contract:

```python
class ModelRequest(BaseModel):
    task_type: str
    risk_tier: int
    messages_or_input: object
    output_schema: dict
    max_output_tokens: int
    deadline_ms: int
    run_budget: RunBudget
    data_classification: str
    tenant_region: str
    trace_context: dict

class ModelResponse(BaseModel):
    parsed: object
    provider: str
    model: str
    model_snapshot: str | None
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cost_usd: Decimal
    latency_ms: int
    request_id: str
```

Responsibilities:

- approved aliases and task/risk routing;
- provider credentials;
- structured output;
- timeout/rate limit;
- budget reservation/settlement;
- fallback policy;
- trace metadata;
- emergency disable.

### Tool gateway

Pipeline:

```text
proposal
→ schema validation
→ state precondition
→ identity and tenant scope
→ risk/approval policy
→ budget/rate limit
→ execution
→ effect reconciliation when uncertain
→ normalized observation
→ audit and trace
```

All fake tools should support deterministic failure injection.

### Context service

Inputs:

- tenant/user/case identity;
- task;
- evidence gaps;
- source and freshness policy;
- token budget.

Outputs:

- trusted instructions;
- compact state;
- authorized evidence items;
- source authority/freshness;
- exact locators;
- conflict groups;
- omitted evidence summary;
- context version/hash.

### Policy engine

Examples:

```text
allow search_adverse_media when case in research state
require sanctions source freshness <= 24 hours
prohibit final approve/reject action from agent
require approval for publish_case_packet
require approver role and artifact-version match
require tenant and region match for every tool
```

Policy returns allow/deny/require-approval plus reason codes and policy version.

### Stores

- operational state: relational database;
- workflow history/checkpoints: runtime store;
- artifacts: object storage;
- retrieval index: derived authorized evidence index;
- long-term memory: separate governed namespace;
- audit: append-only/tamper-evident store or interface;
- telemetry: trace/metric/log backend;
- eval datasets/results: versioned repository/store.

## Core events

```text
CaseCreated
CaseValidated
EntityResolutionStarted/Completed
EvidenceTaskScheduled/Completed/Failed
EvidenceConflictDetected
DocumentRequested/Received
AgentDecisionRecorded
ToolProposed/Authorized/Denied
ToolExecutionStarted/Succeeded/Failed/Uncertain
EffectReconciled
DraftCreated
PacketValidationFailed/Passed
ApprovalRequested/Decided/Expired
PublicationStarted/Succeeded/Uncertain
CaseCancelled
WorkflowVersionApplied
CaseCompleted
```

## Local fake sources

Create deterministic fixtures for:

- company registry;
- sanctions list;
- ownership graph;
- adverse-media search;
- internal relationship database;
- policy store;
- document extraction;
- email/task/publication systems.

Each fake supports configurable latency, error, rate limit, stale data, malformed output, duplicate callback, and uncertain write.

## Required failure controls

Expose only in local/test environments:

```text
FAIL_MODEL_MALFORMED_OUTPUT
FAIL_MODEL_RATE_LIMIT
FAIL_TOOL_TIMEOUT_BEFORE_EFFECT
FAIL_TOOL_TIMEOUT_AFTER_EFFECT
FAIL_DUPLICATE_EVENT
FAIL_WORKER_AFTER_STEP
FAIL_STALE_SANCTIONS
FAIL_CROSS_TENANT_ARGUMENT
FAIL_DOCUMENT_INJECTION
FAIL_APPROVAL_AFTER_DEPLOY
FAIL_COST_BUDGET
FAIL_NO_PROGRESS_LOOP
```

## Testing layers

```text
unit:
  schemas, reducers, policy, budgets, citations, idempotency
contract:
  model/tool/context/policy/store interfaces
integration:
  API → workflow → activity → state/artifact
workflow replay:
  historical event histories against current code
security:
  injection, tenant isolation, secret redaction, approval bypass
fault:
  crash, duplicate, timeout, uncertain effect, cancellation
load:
  burst, skew, dependency failure, waiting workflows
evals:
  component, tool, trajectory, outcome, safety, cost
end-to-end:
  standard case and complete failure-first demo
```

## One-command developer experience

Provide equivalents of:

```bash
make dev
make seed
make test
make eval
make fault-test
make load-test
make demo
```

`make demo` should launch the synthetic scenario used in the capstone demo script.

## Definition of done

- no model API is required for deterministic tests;
- one real provider adapter can be configured optionally;
- all external effects go through the tool gateway;
- every material claim has a valid evidence reference;
- crash/retry tests do not duplicate publication or requests;
- cross-tenant tests fail closed;
- approval is authenticated and version-bound;
- one trace connects the entire run;
- release version is visible on every artifact;
- eval report and failure artifacts are reproducible;
- the README explains architecture, limitations, and exact commands.
