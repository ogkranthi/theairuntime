# Agentic Production Failure Taxonomy

Use this taxonomy for incident labels, eval tags, dashboards, and interview failure analysis.

| Category | Failure | Example | Primary control |
|---|---|---|---|
| Product | Wrong problem | Agent automates a rare task with no user value | Outcome metrics; agent-vs-workflow decision |
| Authority | Excessive agency | Model can publish or refund without approval | Policy engine; least privilege; HITL |
| Control | Unbounded loop | Repeated search with no evidence gain | Step/cost/time limits; no-progress detector |
| Control | Early stop | Mandatory source never checked | State preconditions; required-tool eval |
| Schema | Malformed decision | Invalid action or arguments | Structured output; parser/repair bound |
| Tool | Wrong tool | External write selected instead of read | Tool-selection eval; risk policy |
| Tool | Duplicate effect | Email or charge repeated after retry | Idempotency; reconciliation |
| Tool | Uncertain effect | Timeout after downstream may succeed | Effect-status query; do not retry blindly |
| Tool | Dependency degradation | Rate limits and timeouts | Backoff, jitter, circuit breaker, fallback |
| Context | Missing evidence | Relevant authorized source not retrieved | Retrieval eval; mandatory-source policy |
| Context | Stale evidence | Old sanctions result reused | Freshness policy; invalidation |
| Context | Context overflow | Important policy pruned | Budgeted assembly; priority and compaction |
| Context | Conflicting evidence hidden | Summary selects one source silently | Conflict ledger; preserve uncertainty |
| Grounding | Unsupported claim | Final packet invents ownership fact | Claim-level provenance; validator |
| Security | Direct injection | User asks to ignore approval | Policy outside prompt |
| Security | Indirect injection | PDF instructs tool exfiltration | Instruction/data separation; least privilege |
| Security | Cross-tenant access | Wrong tenant record retrieved | Identity and data-layer scope |
| Security | Secret leak | Credential appears in prompt/trace | Secret isolation and redaction |
| Security | Unsafe execution | Generated code reaches host/network | Sandbox and egress controls |
| Memory | Poisoning | Malicious fact retained across cases | Governed writes, provenance, review |
| Memory | Staleness | Old preference overrides current instruction | Scope, expiry, conflict resolution |
| Runtime | Lost progress | Worker crash restarts full case | Durable workflow/checkpoints |
| Runtime | Replay nondeterminism | Deploy breaks old workflow history | Versioning and replay tests |
| Runtime | Stuck wait | Callback or approval never arrives | Durable timer, SLA, escalation |
| Runtime | Bad cancellation | New work continues after user cancels | Cancellation propagation and reconciliation |
| Human | Approval mismatch | Approval applies to older artifact | Bind decision to immutable version |
| Human | Unauthorized approver | Wrong role approves action | Authenticated RBAC/ABAC and audit |
| Eval | Output-only blind spot | Good answer hides unsafe trajectory | Trace grading and policy eval |
| Eval | Overfit golden set | Prompt tuned to tiny cases | Holdout, incident, production sample |
| Eval | Bad judge | Vague model score treated as truth | Calibration and deterministic checks |
| Observability | Missing causality | Cannot link model call to tool effect | Run/trace/span/event schema |
| Observability | Aggregate masking | Small tenant is completely broken | Segmented metrics |
| Economics | Denial of wallet | Tool/model fan-out explodes spend | Budgets, admission, backpressure |
| Scale | Retry storm | Outage multiplies calls | Retry budgets, jitter, circuit breaker |
| Scale | Noisy neighbor | One tenant starves others | Quotas, weighted queues, bulkheads |
| Deployment | Silent drift | Provider alias behavior changes | Version metadata, continuous evals |
| Deployment | Unsafe rollout | New prompt reaches all traffic | Shadow, canary, progressive rollout |
| Deployment | In-flight incompatibility | Old case resumes under breaking code | Workflow versioning/safe points |
| Governance | Retention failure | Deleted case remains in vector index | Data inventory and derived-data deletion |
| Governance | Audit gap | Cannot prove who approved effect | Tamper-resistant audit trail |

## Incident label format

```text
<layer>.<failure>.<scope>.<severity>
```

Examples:

```text
context.stale-evidence.sanctions.high
runtime.uncertain-effect.publish.critical
security.cross-tenant.retrieval.critical
eval.output-only-blind-spot.release.high
scale.retry-storm.media-provider.high
```
