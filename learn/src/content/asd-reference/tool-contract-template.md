# Production Tool Contract Template

Use this template for every capability the agent can request. A tool description alone is not a production contract.

## Identity

```yaml
name: publish_case_packet
version: 3
owner: Risk Platform
purpose: Publish one approved, immutable Atlas packet version
risk_class: material_external_effect
```

## Input schema

```yaml
input:
  case_id: string
  tenant_id: string
  artifact_version: string
  approval_decision_id: string
  idempotency_key: string
```

Record:

- required and optional fields;
- length/range constraints;
- enum values;
- normalization;
- forbidden fields;
- schema version;
- whether model-generated free text is allowed.

## Output schema

```yaml
output:
  effect_status: SUCCEEDED | ALREADY_APPLIED | REJECTED | UNCERTAIN
  publication_id: string | null
  published_artifact_version: string | null
  external_request_id: string | null
  error:
    code: string | null
    retry_class: RETRYABLE | NON_RETRYABLE | RECONCILE | HUMAN
    safe_message: string | null
```

## Authority

- Calling principal:
- Required user/service roles:
- Required tenant and case scope:
- Delegated versus service identity:
- Separation-of-duties rule:
- Approval required:
- Policy decision input:
- Prohibited callers:

## Preconditions

Examples:

- case state is `WAITING_FOR_APPROVAL`;
- approval applies to the same artifact version;
- approval has not expired;
- all mandatory evidence checks passed or have an approved waiver;
- publication is allowed in the tenant’s region.

## Side-effect semantics

- Read-only / reversible write / material effect / irreversible decision:
- System of record:
- Idempotency key scope:
- Deduplication window:
- Whether the downstream system supports native idempotency:
- How to query effect status:
- Reconciliation algorithm:
- Compensation or supersession action:

## Timeout and retry

| Property | Value |
|---|---|
| Connection timeout | |
| Attempt timeout | |
| Total deadline | |
| Maximum attempts | |
| Backoff | |
| Jitter | |
| Retryable errors | |
| Non-retryable errors | |
| Uncertain errors | |
| Circuit-breaker pool | |

## Data and trust

- Input classification:
- Output classification:
- Untrusted-content fields:
- Redaction rules:
- Residency:
- Retention:
- Secret handling:
- Sandbox/network controls:

## Provenance and audit

Record:

- run, workflow, case, and tenant IDs;
- actor and effective roles;
- tool and contract version;
- arguments hash and safe summary;
- policy decision ID;
- idempotency key;
- attempt and external request IDs;
- effect status;
- artifact before/after version;
- timestamp;
- trace/span ID.

## Observability

Metrics:

- request and success count;
- latency distribution;
- retry count;
- denied calls;
- uncertain effects;
- reconciliation result;
- idempotency deduplication;
- cost where applicable.

Alerts:

- error-rate threshold;
- uncertain-effect backlog;
- latency/SLO burn;
- repeated authorization denial;
- downstream credential failure.

## Tests

- valid request;
- schema rejection;
- unauthorized principal;
- wrong tenant;
- stale or mismatched approval;
- duplicate idempotency key;
- timeout before effect;
- timeout after effect;
- downstream rate limit;
- downstream partial failure;
- reconciliation;
- compensation/supersession;
- redaction and audit completeness;
- contract backward compatibility.
