# Agent SLO and Incident Runbook Template

## Service and user outcome

- Service:
- User:
- Critical outcome:
- Eligible traffic:
- Excluded conditions:
- Owner/on-call:

## Valid completion definition

```text
valid completion =
  workflow finished within the business deadline
  AND mandatory evidence/policy requirements satisfied or explicitly waived
  AND artifact schema and citations valid
  AND required approval present
  AND no prohibited action or tenant violation
```

Customize this definition. A technical `COMPLETED` state is not enough.

## SLI/SLO table

| SLI | Measurement | Objective | Window | Segments | Page/ticket |
|---|---|---:|---:|---|---|
| Valid completion | valid / eligible | | | | |
| Interactive latency | P95 | | | | |
| Draft latency | P95 | | | | |
| Durable recovery | safe recoveries / interruptions | | | | |
| Trace completeness | complete traces / runs | | | | |
| Cost compliance | cases within budget | | | | |

## Zero-tolerance gates

- cross-tenant access;
- unauthorized material effect;
- approval bypass;
- secret exposure;
- audit tampering;
- other domain-specific invariant.

Any occurrence triggers the security/critical incident path rather than ordinary error-budget handling.

## Dashboard

Required views:

- business outcome;
- quality and human edits;
- agent behavior/loops;
- workflow state and queue age;
- model/tool dependencies;
- cost and budgets;
- tenant/risk/source/version segments;
- representative trace links.

## Alert

- Name:
- User impact:
- Condition and windows:
- Severity:
- Required segmentation:
- Runbook link:
- Safe automated action:
- Escalation:

## Incident response

### Detect and scope

- first signal;
- affected user outcome;
- tenants/regions/risk tiers;
- model/prompt/workflow/tool/policy versions;
- representative runs;
- suspected external effects.

### Contain

Choose pre-authorized controls:

- disable tool/capability;
- reduce authority;
- force human review;
- route to validated fallback;
- pause queue or new intake;
- isolate tenant/region;
- revoke credential;
- cancel/suspend affected workflows.

### Reconcile

For every uncertain effect:

- system of record;
- lookup key;
- observed state;
- retry/compensate/escalate decision;
- audit record.

### Recover

- rollback or corrected release;
- in-flight workflow policy;
- artifact correction/supersession;
- user communication trigger;
- evidence that SLO and quality recovered.

### Learn

- root cause and contributing factors;
- missing control;
- new eval fixture;
- new failure injection;
- telemetry/runbook improvement;
- owner and due date.

## Game-day scenarios

Test at least:

- provider outage;
- tool rate limits;
- expired credentials;
- model/schema regression;
- stuck workflow;
- cost runaway;
- duplicate effect;
- prompt injection;
- cross-tenant suspicion;
- regional failure.
