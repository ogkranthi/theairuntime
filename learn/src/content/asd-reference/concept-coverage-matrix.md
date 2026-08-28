# Agentic Production Concept Coverage Matrix

This matrix answers a practical curriculum question: **where is each production concept taught, built, broken, and assessed?**

| Concept | Primary module | Atlas evidence |
|---|---:|---|
| Agent versus deterministic workflow | 01 | Decision memo and autonomy boundary |
| Bounded autonomy | 01, 02 | Allowed actions, step/time/cost limits |
| Structured decisions | 02 | `NextAction` schema and parser |
| Agent loop | 02 | Application-owned decision loop |
| Stop conditions | 02 | Success, no-progress, budget, escalation |
| Model gateway | 02, 13, 14 | Task/risk routing, versions, fallback |
| Prompt/version management | 02, 11, 14 | Release bundle and trace attributes |
| Tool schemas | 03 | Typed contracts and validation |
| Tool risk classes | 03, 10 | Read/reversible/material/prohibited |
| User/service/delegated identity | 03, 10, 14 | Tool and data authorization |
| Least privilege | 03, 10 | Scoped credentials and capabilities |
| Side effects | 03 | Publication/request tasks |
| Idempotency | 03, 07 | Stable keys and deduplication tests |
| Acknowledgment gap | 03, 07 | Crash after effect before record |
| Effect reconciliation | 03, 07, 12 | Query system of record before retry |
| Compensation/supersession | 03, 07 | Correct or reverse completed effects |
| Timeout taxonomy | 03, 07 | Attempt, total, heartbeat, deadline |
| Retry classification | 03, 07, 13 | Retryable/nonretryable/reconcile/human |
| Retrieval | 04 | Task-aware authorized evidence search |
| Context assembly | 04 | Instructions/state/evidence/tool package |
| Context/token budgets | 04, 13 | Per-step limits and compaction |
| Reranking | 04 | Evidence relevance before context |
| ACL-aware retrieval | 04, 10 | Tenant/user filters before model |
| Source authority | 04 | Registry/policy/source hierarchy |
| Freshness | 04, 13 | Source-specific policy and invalidation |
| Provenance | 04 | Evidence IDs and exact locators |
| Claim-level citations | 04, 11 | Deterministic claim validator |
| Conflict preservation | 04 | Evidence conflict ledger |
| Instruction/data separation | 04, 10 | Untrusted source content |
| Request-local state | 05 | One decision invocation |
| Run/checkpoint state | 05, 07 | Progress, pending work, budgets |
| Session/thread state | 05 | Multi-turn case interaction |
| Long-term memory | 05 | Governed preferences/facts across cases |
| Memory provenance | 05 | Actor/source/scope/time |
| Memory poisoning | 05, 10 | Adversarial retained fact |
| Memory deletion/expiry | 05, 10, 14 | Lifecycle and derived-store deletion |
| Artifact store | 05 | Documents, prompts, packets, test results |
| State machine | 06 | Explicit Atlas case states/transitions |
| Prompt chaining | 06 | Fixed bounded transformations |
| Routing | 06, 13 | Task/risk and workload routes |
| Parallel fan-out/fan-in | 06, 13 | Mandatory source checks |
| Join policy | 06 | Mandatory/optional/timeout/escalate |
| Orchestrator-worker | 06 | Bounded research workers |
| Evaluator-optimizer | 06, 11 | Draft/validation revision loop |
| Partial results | 06 | Incomplete packet and escalation |
| Durable execution | 07 | Multi-day case workflow |
| Event history | 07 | Persisted workflow events |
| Deterministic replay | 07 | Restore without redoing model/effects |
| Activities/tasks | 07 | Model/API/document external work |
| Timers/signals/callbacks | 07, 08 | Document arrival and approval |
| Heartbeats/checkpoints | 07 | Long document extraction |
| Cancellation | 07 | Stop new work and reconcile effects |
| Workflow versioning | 07, 14 | Historical replay tests and safe deploy |
| Human approval | 08 | Durable approve/edit/reject/request-more |
| Separation of duties | 08, 10 | Authorized approver distinct from requester |
| Approval expiry | 08 | Stale proposal cannot execute |
| Artifact-version binding | 08 | Exact draft approved/published |
| Agents as tools | 09 | Bounded specialist result |
| Handoffs | 09 | Responsibility transfer |
| Supervisor/specialists | 09 | Justification by boundary |
| MCP host/client/server | 09 | Read-only capability adapter |
| MCP security/consent | 09, 10 | Capability is not automatic authority |
| A2A task boundary | 09 | Independent review-agent decision record |
| Prompt injection | 10 | Direct and indirect attacks |
| Excessive agency | 10 | Policy and authority matrix |
| Cross-tenant isolation | 10, 14 | API/data/cache/tool/memory/trace tests |
| Secrets management | 10, 14 | No secrets in prompts or model-visible state |
| Sandbox/code execution | 10 | Process/filesystem/network/resource isolation |
| Output handling | 10 | Parameterized/validated downstream use |
| Audit trail | 10, 12, 14 | Actor, version, policy, effect, artifact |
| Data classification | 10, 14 | Capture/access/retention policy |
| Data residency | 10, 14 | Regional tenant data plane |
| Retention/deletion/legal hold | 10, 14 | Data inventory and deletion workflow |
| Threat modeling | 10 | Assets, boundaries, abuse cases, residual risk |
| Deterministic unit tests | 11 | Schemas, policies, reducers, idempotency |
| Component model evals | 11 | Entity/relevance/extraction/synthesis |
| Tool-selection evals | 11 | Required/prohibited tool and arguments |
| Trajectory/trace evals | 11 | Order, loops, policy, budget, recovery |
| Outcome evals | 11 | Evidence-backed analyst packet |
| Safety/adversarial evals | 11 | Injection, isolation, memory, effects |
| Golden/edge/incident/holdout sets | 11 | 30-case versioned corpus |
| Model-judge calibration | 11 | Human-labeled agreement set |
| Release gates | 11, 14 | Quality/safety/latency/cost criteria |
| Run/trace/span/event | 12 | End-to-end causal telemetry |
| GenAI telemetry attributes | 12 | Model/prompt/tokens/cache/version |
| Tool proposal vs execution trace | 12 | Proposed/authorized/executed/observed |
| Metrics/logs/traces/artifacts | 12 | Correct signal by question |
| SLI/SLO/error budget | 12 | Valid completion and latency objectives |
| Zero-tolerance safety gate | 12 | Isolation/approval violations |
| No-progress detector | 02, 12 | Repeated signature with no evidence delta |
| Runaway-cost detector | 12, 13 | Soft/hard budget thresholds |
| Stuck-workflow detector | 12 | State-duration and queue-age alert |
| Incident response | 12 | Detect, contain, reconcile, recover, learn |
| Incident-to-regression loop | 11, 12 | Permanent fixture from production failure |
| Workload model | 13 | Cases, peaks, concurrency, tokens, waits |
| Critical-path latency | 13 | Stage budget and parallel source checks |
| Model routing | 13 | Task/risk/capability/eval matrix |
| Prompt caching | 13 | Stable prefix as optimization |
| Deterministic/result/semantic cache | 13 | Scope, freshness, authorization, version |
| Queue isolation | 13 | Interactive/research/extraction/bulk |
| Admission control | 13 | Quotas and safe rejection/defer |
| Backpressure/load shedding | 13 | Protect dependencies and valid work |
| Retry storm | 13 | Backoff, jitter, budgets, breaker |
| Bulkhead | 13 | Per-tool/tenant/workload resource pools |
| Circuit breaker | 13 | Stop failing dependency and probe recovery |
| Capacity planning | 13 | Request and token throughput with headroom |
| Unit economics | 13 | Model/tool/compute/storage/human cost |
| Graceful degradation | 13 | Remove optional work, never weaken invariants |
| Load/chaos testing | 13 | Burst, skew, failures, resumed workflows |
| Release bundle | 14 | Code/workflow/prompt/model/tool/policy/schema |
| Environment isolation | 14 | Dev/test/stage/prod identities and data |
| Shadow execution | 14 | No production effects |
| Canary/progressive rollout | 14 | Risk-stratified live traffic |
| Feature/authority flags | 14 | Trusted capability control and kill switch |
| Rollback | 14 | Code/config/tool/data and in-flight policy |
| Provider fallback | 13, 14 | Task-specific validated matrix |
| SSO/RBAC/ABAC/workload identity | 10, 14 | Enterprise access model |
| Multi-tenancy/noisy neighbor | 13, 14 | Isolation, quotas, fairness |
| Backup/RPO/RTO/disaster recovery | 14 | Restore/failover/reconciliation test |
| Operational ownership/runbooks | 12, 14 | Team, on-call, SLO, escalation |
| 45-minute interview structure | 15 | Timed RUNTIME answer |
| Requirement-to-architecture reasoning | 00, 15 | Causal design statements |
| Tradeoff communication | 15 | Choice, cost, mitigation, switch trigger |
| Failure-first demo | 16 | Crash, injection, approval, trace, rollback |
| Portfolio evidence | 16 | Architecture, eval, threat, incident, cost |
