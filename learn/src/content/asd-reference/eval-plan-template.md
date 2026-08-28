# Agent Evaluation Plan Template

## 1. Task and release decision

- System/task:
- User outcome:
- Change being evaluated:
- Baseline release:
- Candidate release:
- Decision: ship / shadow / canary / reject / collect more evidence
- Highest-risk regression:

## 2. Evaluation layers

| Layer | Unit under test | Example metric | Grader |
|---|---|---|---|
| Deterministic | Schema/policy/state/tool adapter | pass rate | Exact test |
| Component | One bounded model task | entity resolution accuracy | Reference/structured |
| Tool selection | Proposed action and arguments | required-tool recall | Trace rule |
| Trajectory | Full decision/action path | prohibited action, loop rate | Rule + calibrated judge |
| Outcome | Final user artifact | claim support, usefulness | Structured + human/model |
| Safety | Attack and policy behavior | isolation failures | Deterministic/adversarial |
| Operations | Runtime behavior | P95 latency/cost/recovery | Telemetry |

## 3. Dataset composition

| Set | Purpose | Count | Refresh |
|---|---|---:|---|
| Golden | Representative regression | | |
| Edge | Ambiguous and tail cases | | |
| Adversarial | Security/abuse | | |
| Incident | Past failures | | Continuous |
| Fresh holdout | Generalization check | | Per major release |
| Production sample | Drift/human review | | Ongoing |

For every case store:

- case ID and tags;
- fixture version;
- expected required and prohibited behavior;
- reference claims/outcome;
- risk tier;
- cost/latency budgets;
- grader versions;
- reviewer provenance.

## 4. Metrics

### Quality

- task accuracy;
- evidence coverage;
- citation correctness;
- conflict recall;
- unsupported-claim rate;
- human correction;
- escalation correctness.

### Behavior

- correct next action;
- required-tool recall;
- prohibited-tool rate;
- redundant/repeated call rate;
- no-progress loops;
- finish-too-early;
- budget compliance.

### Safety

- prompt-injection success;
- cross-tenant access;
- unauthorized effect;
- secret leakage;
- memory poisoning;
- sandbox escape;
- audit failure.

### Operations

- valid completion;
- P50/P95/P99 latency;
- cost distribution;
- retry count;
- recovery after failure;
- queue time;
- fallback rate.

Segment by risk, tenant, source, language, input size, model/prompt/workflow version, and failure category.

## 5. Grader design

For each metric record:

- deterministic versus model/human grader;
- rubric;
- evidence available to grader;
- calibration dataset;
- agreement/error analysis;
- threshold;
- known blind spots.

Prefer exact and structured checks before model judges.

## 6. Release gates

```text
Safety-critical:
- prohibited autonomous actions = 0
- cross-tenant failures = 0
- approval bypass = 0

Quality:
- no material regression in required high-risk metrics
- citation correctness meets target
- holdout performance within confidence bounds

Operations:
- P95 latency within SLO
- P95 cost within approved budget
- crash recovery and duplicate-effect suite pass
```

Define sample-size and uncertainty rules. Do not make a release decision from a tiny noisy set.

## 7. Online plan

- shadow percentage and duration;
- canary population;
- risk-stratified sampling;
- human-review sample;
- telemetry and trace completeness;
- rollback triggers;
- incident-to-regression process;
- data-retention/privacy controls.

## 8. Result report

Include:

1. decision and confidence;
2. baseline versus candidate table;
3. segmented regressions;
4. representative passing and failing traces;
5. cost/latency movement;
6. safety results;
7. grader limitations;
8. recommended rollout and monitoring;
9. new permanent eval cases.
