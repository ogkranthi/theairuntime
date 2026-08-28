---
id: "12"
slug: "observability-slos-and-incidents"
title: "Observability, SLOs, and Incident Response"
track: "Operations"
duration_minutes: 120
difficulty: "Core"
build_milestone: "Instrument Atlas traces, metrics, logs, dashboards, and an incident replay workflow."
objectives:
  - "Instrument linked runs, traces, spans, events, metrics, logs, and artifacts"
  - "Define valid-completion SLIs, SLOs, safety gates, and agent-specific detectors"
  - "Conduct incident containment, effect reconciliation, recovery, and regression capture"
prerequisites:
  - "agent-evaluation-and-testing"
  - "durable-long-running-agents"
---

# Observability, SLOs, and Incident Response

## What you will design

You will make Atlas explain what happened during a run, detect when the service is unhealthy, protect sensitive trace data, and turn incidents into permanent regression tests.

## Why ordinary application monitoring is not enough

A traditional API often has a predictable path: validate a request, call a service, write a record, return a response. An agent may choose different tools, branch, retry, wait for a person, revise its plan, or stop early.

A useful production question is not only:

> Did the request return 200?

It is also:

- Which model and prompt version made each decision?
- Which context was available at that decision?
- Which tools were proposed, authorized, attempted, and completed?
- Which evidence supports each final claim?
- Where did time and cost accumulate?
- Did the run make progress or loop?
- Did a human edit or reject the output?
- Can an operator resume, cancel, or repair the case safely?

Agent observability must connect **execution**, **quality**, **safety**, and **business outcome**.

## The observability model

Use four related layers.

### 1. Run

A run is one business execution, such as one Atlas case attempt. It may span multiple processes and days.

Recommended fields:

```text
run_id
case_id
tenant_id
workflow_id
workflow_version
model_policy_version
risk_tier
start_time
end_time
status
final_outcome
approval_status
cost_usd
```

### 2. Trace

A trace represents the causal path across services and workflow steps. Preserve one trace identity or explicit links across asynchronous boundaries.

### 3. Span

Create spans for meaningful work:

- workflow transition;
- model invocation;
- retrieval;
- tool authorization;
- tool execution;
- policy check;
- handoff;
- approval wait and decision;
- artifact generation;
- memory read or write.

A span should record status, duration, version metadata, and safe attributes. Large prompts and documents should be referenced as governed artifacts rather than copied into every span.

### 4. Event

Events capture important facts inside a span:

- retry scheduled;
- budget threshold crossed;
- no-progress detector fired;
- guardrail blocked content;
- approval requested;
- source freshness failed;
- tool result reconciled;
- fallback selected.

## Logs, metrics, traces, and artifacts

These signals answer different questions.

| Signal | Best for | Agent example |
|---|---|---|
| Metrics | Aggregate health and alerting | P95 case latency, prohibited-tool rate |
| Logs | Discrete operational detail | Tool gateway rejected missing tenant scope |
| Traces | One run’s causal path | Why case `C-4821` waited 40 minutes |
| Artifacts | Large governed evidence | Prompt snapshot, source document, final packet |
| Eval results | Quality and policy scoring | Citation correctness by workflow version |

Do not force every prompt and document into logs. Store sensitive or large content in controlled artifact storage and link it using an opaque identifier.

## Trace schema for a model decision

A model span might include:

```json
{
  "operation": "agent.decision",
  "run_id": "run_01J...",
  "step_id": "step_14",
  "model_provider": "provider-a",
  "model_name": "model-family-x",
  "model_policy_version": "mpv_2026_08_03",
  "prompt_template_version": "research_router_v12",
  "input_token_count": 7342,
  "output_token_count": 221,
  "cache_read_tokens": 6120,
  "latency_ms": 1840,
  "decision_schema": "NextAction.v4",
  "decision": "search_adverse_media",
  "confidence_bucket": "medium",
  "budget_remaining_usd": 0.87,
  "data_classification": "confidential",
  "content_capture": "artifact-reference-only"
}
```

Avoid treating a self-reported model confidence value as calibrated probability. Use it as one feature, not as truth.

## Trace schema for a tool call

Separate proposal, authorization, execution, and observation.

```text
ToolProposed
  → ToolAuthorized | ToolDenied
  → ToolExecutionStarted
  → ToolExecutionSucceeded | ToolExecutionFailed | ToolExecutionUncertain
  → ToolObservationCommitted
```

This separation lets an operator answer whether the model selected an unsafe tool, the policy blocked it, the external effect happened, and the workflow recorded the result.

Useful attributes:

- tool name and version;
- arguments hash and redacted summary;
- authenticated principal;
- tenant and case scope;
- risk class;
- idempotency key;
- timeout and retry number;
- external request ID;
- result classification;
- bytes and records returned;
- policy decision ID.

## Correlation across asynchronous work

Atlas may enqueue document extraction, wait for callbacks, pause for approval, and resume on another worker. Preserve correlation using:

- run ID;
- workflow ID;
- step or activity ID;
- parent span or span link;
- idempotency key;
- case ID;
- tenant ID;
- artifact version.

Never rely on one process-local request ID for a multi-day execution.

## Metrics by layer

### User and business outcome

- completed packets per day;
- time to analyst-ready packet;
- approval without material edit;
- analyst time saved;
- case abandonment;
- missed-risk incident count.

### Quality

- mandatory-source completion;
- claim support coverage;
- citation precision;
- conflict recall;
- unsupported-claim rate;
- escalation correctness;
- human correction rate.

### Agent behavior

- steps per run;
- repeated tool-call rate;
- no-progress loop rate;
- finish-too-early rate;
- policy denial rate;
- fallback rate;
- handoffs per run;
- budget exhaustion rate.

### Runtime

- queue depth and queue age;
- workflow completion and failure;
- activity retry rate;
- recovery after worker crash;
- timer and approval backlog;
- dead-letter count;
- state-store latency.

### Dependencies

- model latency, errors, tokens, and rate limits;
- retrieval latency and empty-result rate;
- source freshness and failure;
- tool timeout and uncertain-write rate;
- artifact-store failures.

### Economics

- cost per started and completed case;
- cost by step, model, source, and tenant;
- wasted cost from failed or abandoned runs;
- cache hit rate;
- cost-budget violation rate.

## Segment everything that can hide a failure

A healthy average can conceal a broken tenant, jurisdiction, source, risk tier, document type, or model version.

At minimum, segment critical metrics by:

- tenant;
- risk tier;
- workflow/model/prompt version;
- source and tool;
- jurisdiction and language;
- new versus resumed run;
- approval path;
- failure and fallback category.

Use bounded-cardinality identifiers in metrics. Put case IDs and run IDs in traces or logs, not metric labels.

## Define service-level indicators

A service-level indicator is a measured property of service behavior.

For Atlas, one “successful case” should require more than workflow completion:

```text
valid_success =
    completed_within_deadline
    AND mandatory_sources_satisfied_or_explicitly_waived
    AND final_artifact_schema_valid
    AND no_prohibited_action
    AND approval_policy_satisfied
```

Possible SLIs:

- **valid completion rate:** valid successes / eligible cases;
- **freshness compliance:** source checks inside required freshness window;
- **interactive responsiveness:** P95 response to analyst action;
- **durable recovery:** interrupted workflows restored without duplicated effect;
- **approval integrity:** published packets with valid authenticated approval;
- **trace completeness:** runs with all mandatory spans and version metadata.

## Example SLOs

Course values below are design assumptions, not industry standards.

| SLO | Target | Window |
|---|---:|---:|
| Valid completion | 99.5% | 30 days |
| High-risk mandatory-source completion | 99.9% | 30 days |
| Interactive API P95 | < 2 seconds | 7 days |
| Standard case P95 to draft | < 10 minutes | 7 days |
| Recovery without duplicate effect | 99.99% | 30 days |
| Approval integrity | 100% | Continuous gate |
| Cross-tenant isolation failures | 0 | Continuous gate |

Some requirements are not error-budget tradeoffs. A cross-tenant leak or unauthorized final decision is a zero-tolerance security incident, not a small acceptable percentage.

## Error budgets and burn alerts

For availability-like objectives, an error budget lets teams balance reliability and change.

Use multiple burn windows:

- fast burn: severe issue over minutes;
- medium burn: persistent issue over hours;
- slow burn: gradual degradation over days.

Alert on actionable symptoms, not every anomaly. A page should state:

- affected user outcome;
- scope;
- likely dependency or workflow version;
- runbook;
- representative traces;
- safe mitigation.

## Agent-specific detectors

### No-progress loop

Detect repeated states, semantically equivalent decisions, repeated arguments, or unchanged evidence coverage.

```python
if repeated_action_signature >= 3 and evidence_delta == 0:
    transition("ESCALATE_NO_PROGRESS")
```

### Runaway cost

Stop or downgrade before a hard budget is crossed.

```text
soft threshold → summarize/prune/switch model
hard threshold → stop autonomous loop and escalate
```

### Silent quality regression

Operational metrics can remain green while citation quality falls. Join online traces with sampled evals and human edits.

### Stuck workflow

Alert when a case exceeds the expected state duration:

- extraction running too long;
- retry timer repeatedly firing;
- approval waiting past SLA;
- callback never received;
- join waiting on a child task that terminated.

## Sensitive observability data

Prompts, tool arguments, retrieved documents, and model outputs can contain secrets, personal data, customer content, or malicious instructions.

Apply:

- data classification before capture;
- default metadata-only tracing;
- configurable sampling;
- field-level redaction and tokenization;
- tenant-aware access control;
- encryption;
- retention and deletion policies;
- immutable access audit;
- restricted production replay;
- test fixtures instead of raw customer content whenever possible.

Do not place secrets in attributes merely because the telemetry backend is internal.

## Incident response for agents

### Detect

Identify the user impact, affected versions, tenants, sources, and action classes.

### Contain

Possible controls:

- disable a tool or capability flag;
- lower authority;
- force human approval;
- route to a known-safe model/workflow version;
- stop new runs;
- pause a queue;
- revoke a credential;
- isolate an affected tenant;
- cancel or suspend workflows.

### Reconcile

For uncertain external effects, query the system of record. Do not blindly retry.

### Recover

Resume from known state, regenerate affected artifacts, or start a new versioned run. Preserve the original audit history.

### Learn

Create:

- failure taxonomy entry;
- permanent eval case;
- runbook improvement;
- missing telemetry field;
- architecture or policy change;
- rollout guardrail.

## Replay is not the same as re-execution

Three different operations are often called replay:

1. **Workflow replay:** reconstruct state from recorded history without redoing external effects.
2. **Eval replay:** execute a new model/workflow version against captured or synthetic inputs in a sandbox.
3. **Production re-run:** perform new external work with a new run identity and explicit authorization.

Keep them distinct. Never let an eval replay send email, mutate a production record, or use a production credential.

## Incident drill: unsupported claim spike

At 10:20 AM, unsupported-claim rate increases only for Spanish-language documents. Completion and latency remain normal.

Investigation path:

1. Dashboard segments the quality metric by language and workflow version.
2. Representative traces show OCR completed, but citation locators are empty.
3. A deployment changed the document chunk-normalization function.
4. Feature flag disables the new parser for Spanish documents.
5. Affected draft packets are marked and reprocessed.
6. The incident trace becomes a regression fixture.
7. Release gates add language-segmented citation-locator checks.

The system was observable because quality, version, source, and trace data were connected.

## Failure injection: the green dashboard

Overall Atlas success is 99.7%. One small tenant has 38% failures because a tenant-specific source credential expired. Aggregate traffic hides it.

Your dashboard must reveal:

- valid completion by tenant;
- source authentication errors by tenant and connector;
- oldest pending case;
- affected workflow version;
- link to representative traces;
- credential rotation runbook.

## SHIP: instrument Atlas

Implement or specify:

1. A trace spanning intake, workflow, model calls, retrieval, tools, approval, and artifact publication.
2. Version attributes for model, prompt, workflow, policy, tools, and dataset.
3. Metadata-only defaults plus protected artifact references.
4. Metrics for quality, behavior, runtime, dependencies, and cost.
5. A dashboard with global and tenant/risk/source segments.
6. Three SLOs and two zero-tolerance safety gates.
7. No-progress, runaway-cost, and stuck-workflow detectors.
8. A run page that lets an operator understand one case without reading raw database tables.

## RUN: conduct an incident drill

Inject one failure:

- tool rate-limit storm;
- expired connector credential;
- malformed model output;
- repeated no-progress loop;
- missing approval signal;
- citation-quality regression.

Produce:

- detection timeline;
- impact statement;
- trace-based diagnosis;
- containment action;
- reconciliation plan;
- recovery evidence;
- new regression test;
- one telemetry improvement.

## DESIGN: interview drill

**Prompt:** Design observability and incident response for an agent that can read and modify customer cloud infrastructure.

Cover:

- run/trace/span model;
- tool proposal versus authorization versus execution;
- identity and tenant correlation;
- quality and safety metrics;
- SLOs and zero-tolerance gates;
- redaction and retention;
- stuck-loop and cost detectors;
- effect reconciliation;
- incident-to-eval loop.

## Check your understanding

1. Why is HTTP success insufficient for an agent run?
2. Which data belongs in a metric versus a trace?
3. Why should tool proposal and tool execution be separate events?
4. What makes an Atlas completion “valid” rather than merely “finished”?
5. Why can workflow replay safely differ from production re-execution?
6. Which observability data needs the same protection as customer data?

## Primary references

- [OpenAI Agents SDK: Tracing](https://openai.github.io/openai-agents-python/tracing/)
- [OpenAI: Trace Grading](https://developers.openai.com/api/docs/guides/trace-grading)
- [OpenTelemetry: Generative AI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [OpenTelemetry: Observing Generative AI Systems](https://opentelemetry.io/blog/2024/otel-generative-ai/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
