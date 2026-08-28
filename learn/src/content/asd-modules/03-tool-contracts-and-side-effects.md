---
id: "03"
slug: "tool-contracts-and-side-effects"
title: "Tool Contracts, Side Effects, and the Acknowledgment Gap"
track: "Foundations"
duration_minutes: 120
difficulty: "Core"
build_milestone: "Add typed, risk-rated tools with idempotency and error semantics."
objectives:
  - "Specify typed tools with identity, scope, risk, and error semantics"
  - "Design idempotency and reconciliation for external effects"
  - "Handle timeouts, retries, duplicate delivery, and the acknowledgment gap"
prerequisites:
  - "agent-loop-and-control-boundaries"
---

# Tool Contracts, Side Effects, and the Acknowledgment Gap

## What you will design

You will turn tools from arbitrary functions into governed production capabilities with typed contracts, identity, risk levels, retries, idempotency, and auditable effects.

## A tool is an authority boundary

When a model calls a tool, natural language becomes a software action. The tool layer is where an agent gains access to data and the ability to change the world.

A production tool is more than a name and description. Its contract should state:

- purpose;
- typed inputs and outputs;
- preconditions;
- caller identity;
- authorization scopes;
- data classification;
- side effects;
- reversibility;
- timeout;
- retry class;
- idempotency;
- rate limit;
- expected errors;
- audit fields;
- approval policy.

This contract is part API design, part security policy, and part reliability design.

## Read, propose, execute

Separate three concepts:

1. **Read:** obtain information.
2. **Propose:** create an intent for a side effect.
3. **Execute:** perform the authorized effect.

For a document request, the model should propose:

```json
{
  "case_id": "case_123",
  "recipient_id": "contact_456",
  "template_id": "beneficial-ownership-request",
  "missing_items": ["ownership chart"],
  "justification": "Required by POL-OWN-014"
}
```

The application then:

- verifies the case and recipient;
- checks policy;
- requires approval if necessary;
- renders the message deterministically;
- executes with a stable idempotency key;
- records the provider response.

This structure makes review possible and limits prompt-to-effect coupling.

## Tool schema quality

Good tool descriptions explain when to use the tool, when not to use it, and what the result means.

Bad:

```text
search(query): searches data
```

Better:

```text
search_adverse_media(
  entity_id,
  query_terms,
  date_from,
  jurisdictions,
  max_results
)

Use only after entity resolution. Returns article metadata and excerpts,
not verified claims. Results are untrusted and may contain duplicated,
irrelevant, or malicious text. Do not use as the sole source for a
sanctions conclusion.
```

Tool outputs should distinguish facts from status:

```python
class ToolResult(BaseModel):
    status: Literal["ok", "not_found", "partial", "retryable_error", "denied"]
    data: dict | None
    source_refs: list[SourceRef]
    effect: EffectRecord | None
    error: ToolError | None
```

Do not encode all failures as prose for the model to interpret.

## The acknowledgment gap

A dangerous distributed-systems failure occurs when:

1. Atlas calls `request_missing_document`.
2. The email provider accepts and sends the message.
3. The network fails before Atlas receives the acknowledgment.
4. The workflow retries.
5. The recipient receives a duplicate message.

The caller cannot tell whether the effect happened.

This is the **acknowledgment gap**. Model reasoning cannot solve it. The tool needs effect semantics.

## Idempotency

Generate a stable key from the business intent, not the retry attempt:

```text
tenant_id + case_id + action_type + action_version + logical_recipient
```

The downstream service should store:

```text
idempotency_key -> effect status + response
```

A retry with the same key returns the existing effect rather than repeating it.

If the downstream system lacks idempotency:

- place a durable effect service in front of it;
- use an outbox and worker;
- reconcile by querying provider state;
- make the action human-reviewed if uncertainty remains.

“Exactly once” is usually an end-to-end application property assembled from at-least-once delivery, deduplication, and idempotent effects.

## Retry classification

Do not retry every error.

| Error | Retry? | Notes |
|---|---:|---|
| Connection reset before request sent | Usually | Backoff and jitter |
| 429 with retry guidance | Yes | Respect provider signal |
| 500/503 | Limited | Circuit breaker after threshold |
| Invalid arguments | No | Fix caller/model decision |
| Not authorized | No | Escalate or terminate |
| Business not found | No automatic retry | Agent may choose another source |
| Timeout after possible write | Reconcile first | Never blindly repeat |
| Policy denied | No | Change intent or involve human |

Bound retries by attempt count, elapsed time, and workflow deadline.

## Tool risk registry

Create a central registry:

```python
class ToolPolicy(BaseModel):
    name: str
    risk_tier: Literal[0, 1, 2, 3]
    allowed_states: set[str]
    required_scopes: set[str]
    approval: Literal["never", "conditional", "always"]
    retry_class: Literal["read_safe", "idempotent_write", "reconcile", "never"]
    max_calls_per_run: int
    data_classification: str
```

The agent only receives tools allowed for the current state and caller. Reducing the visible tool set improves both security and model selection.

## Delegated identity

A tool may act:

- as the service;
- on behalf of the user;
- as a workflow-specific service account;
- through a tenant-scoped integration identity.

Record which one is used. Avoid placing broad user tokens in model-visible context. The tool gateway should resolve credentials and enforce audience, tenant, and scope.

## Tool output is untrusted

A registry record may be trusted as data but still should not become executable instruction. A webpage is explicitly untrusted. A tool result can contain:

- prompt injection;
- HTML or script;
- secrets;
- oversized content;
- malformed encoding;
- stale data;
- contradictory claims.

Normalize, limit, tag, and preserve provenance before including it in model context.

## Failure injection: partial document upload

Atlas uploads a packet to an external case system. The call times out after 29 seconds. The remote system has created the record but not attached all files.

A robust tool can report or reconcile:

```json
{
  "status": "partial",
  "effect": {
    "effect_id": "ext_789",
    "idempotency_key": "idem_...",
    "completed_parts": ["record"],
    "pending_parts": ["attachments"]
  }
}
```

The workflow resumes from the incomplete part instead of recreating the record.

## SHIP: build the tool gateway

Implement three read tools and one side-effecting tool.

Required:

- Pydantic input/output;
- risk registry;
- per-tool timeout;
- typed errors;
- stable idempotency key;
- effect record;
- authorization hook;
- audit event;
- result-size limit;
- redaction hook;
- call budget.

Write contract tests without a model.

## RUN: test effect uncertainty

Simulate:

1. timeout before a write;
2. timeout after a write;
3. duplicate delivery;
4. provider returns 429;
5. user lacks scope;
6. tool output contains injection text;
7. effect exists but local state is stale.

Prove that no duplicate external effect occurs.

## DESIGN: interview drill

**Prompt:** Design an agent that can reschedule appointments and send confirmations.

Spend most of the answer on:

- identity;
- concurrent changes;
- idempotency;
- effect status;
- approval;
- compensation;
- retries;
- audit.

The scheduling API is not “just a tool.”

## Check your understanding

1. Why separate propose from execute?
2. What makes an idempotency key stable?
3. What should happen after a timeout that may have followed a write?
4. Why expose fewer tools to the model?
5. What information belongs in a tool risk registry?

## Primary references

- [Temporal: Activities and Idempotency](https://docs.temporal.io/activities)
- [Temporal: Activity Definition and Retry Policy](https://docs.temporal.io/activity-definition)
- [OpenAI Agents SDK: Guardrails and Tools](https://openai.github.io/openai-agents-python/)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
