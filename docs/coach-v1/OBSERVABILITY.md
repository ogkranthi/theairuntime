# Operational observability

PR B stacks on accounts PR #161. This is operational measurement independent of research consent. No dashboard, analytics SaaS or conversation reader is introduced. Production configuration is unchanged.

Enable only after applying 0002_observability.sql and approving the COACH_METRICS Workers Analytics Engine binding and FDE_COACH_METRICS_ENABLED=true setting. Missing/failing analytics sinks do not authorize model calls and do not change coaching responses. Quotas always come from the existing SQLite DO. Worker exception messages and provider bodies are never passed to the event writer.

## Measurements

The fixed event schema carries no account ID, participant reference, email, IP, prompt, answer, conversation ID, session credential or free-form user field. Activity deduplication occurs in private D1 before emitting identifier-free counters. Every authenticated route records activity, even when the learner declines research.

| Event | Meaning |
| --- | --- |
| active_day / active_month | One per verified learner per UTC day/calendar month, deduplicated in D1 |
| new_user / returning_learner | First activity in the account creation UTC day, or later UTC days |
| conversation_start | A newly committed non-model intake |
| interaction | A committed coaching reply; outcome distinguishes AI from authored fallback |
| model_attempt | One attempted primary/fallback path; physical execution counters distinguish denied admission |
| retry | An exact existing operation was requested again; no repeat inference |
| limit / error | Coarse admission/auth/input/conflict/storage-security categories |
| feedback | Explicit helpful, unhelpful or incorrect feedback, no comment text |
| step_completed | Learner explicitly reports completing a suggested next step; not independently verified |

Unchanged feedback submissions do not emit another point. The canonical private feedback record holds the latest choice. Operational feedback is ordinary account data and is not automatically research data.

Analytics index1 is always fde-coach-v1. Blob positions: event, current prompt version, retrieval/curriculum version, model or unknown, coarse error category, rating or none, outcome. Double positions: count, latency milliseconds, known total tokens (-1 unknown), estimated USD (-1 unknown), physically invoked attempts, invoked primary attempts, invoked fallback attempts, successful allowance used, remaining allowance, usage-complete flag. Schema positions are one-based in Analytics SQL.

Each model attempt records bounded model name, slot, physical-execution flag, latency, validated usage counts and coarse error. Timeouts, provider failures, denied admissions and invalid final outputs are separate categories. Repeated categories are aggregated; no learner questions are needed. Model execution remains in the Worker, never inside the DO.

Interaction/attempt events are best effort, not an exactly-once ledger. A Worker failure between saving, settlement and emission can drop an event; retries can be observed multiple times. Sampling and ingestion loss affect estimates. The private D1 interaction metadata and SQLite quota ledger are authoritative for reconciliation. Metrics are not suitable for charging users or scientific claims.

## Queries, access and retention

Use an owner-scoped Analytics read credential outside the browser. Do not expose the Cloudflare SQL API or credentials through a public Worker route. Ordinary operators should use the content-free Analytics dataset; private D1 access is restricted to designated data administrators. No new user-facing metrics endpoint exists.

Examples for private D1, selecting only aggregate fields:

```sql
SELECT day, COUNT(*) AS daily_active FROM coach_activity GROUP BY day;
SELECT month, COUNT(*) AS monthly_active FROM coach_monthly_activity GROUP BY month;
SELECT COUNT(DISTINCT owner) AS rolling_30_day_active
FROM coach_activity WHERE day >= date('now','-29 days');
SELECT json_extract(metadata,'$.model') AS model,
       json_extract(metadata,'$.promptVersion') AS prompt,
       json_extract(metadata,'$.retrievalVersion') AS retrieval,
       json_extract(metadata,'$.errorCategory') AS category, COUNT(*) AS interactions,
       AVG(json_extract(metadata,'$.latencyMs')) AS mean_ms
FROM coach_messages WHERE revision > 0 GROUP BY model,prompt,retrieval,category;
SELECT rating, COUNT(*) FROM coach_feedback GROUP BY rating;
SELECT COUNT(*) FROM coach_feedback WHERE completed=1;
```

Use COUNT(*) only on deduplicated canonical tables. For sampled Analytics Engine counters, sum _sample_interval; latency means need weighted sums. For example:

```sql
SELECT blob1 AS event, blob5 AS category,
       SUM(_sample_interval * double1) AS estimated_events
FROM fde_coach_metrics
WHERE timestamp >= NOW() - INTERVAL '1' DAY
GROUP BY event, category;
```

The scheduled account maintenance handler deletes daily activity older than 35 days and monthly buckets older than the month containing the 62-day cutoff (up to three calendar months). These keyed rows are pseudonymous account metadata, not anonymous. Account deletion removes them. Feedback expires/deletes with its conversation. The hourly maintenance trigger remains an approval/deployment prerequisite from PR A.

Cloudflare currently documents [three-month Analytics Engine retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/). Those points contain no learner identifiers or content. Aggregate events remain after account deletion; D1 account activity and feedback are removed. Restrict Worker log/trace access and disable automatic request header/body capture in any operator-configured log pipeline. This code does not log bodies or tokens. Platform HTTP/access logs have their own Cloudflare retention and access policy.

## Tokens, estimates and costs

Set COACH_MODEL_PRICES_JSON to an owner-maintained JSON mapping of model ID to inputPerMillion and outputPerMillion USD. There is no default price assumption. Matched input/output usage is priced separately. When only total tokens are available, use the larger configured rate as a conservative estimate. Missing model prices, incomplete usage or failed/timed-out unreported work produce unknown, never zero-cost claims. Estimates exclude non-token platform charges and cannot replace Cloudflare invoices. Review current model rates before release.

With the existing 500 physical-attempt cap, normal coaching produces only a few thousand points/day plus activity/error events. Account and malicious request traffic can still increase operational writes. Cloudflare's [published Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/) currently lists Free allowances of 100,000 points/day and 10,000 reads/day, and Paid allowances with published overage rates; its page also says billing is not yet active. Recheck account availability and pricing before enabling. D1 activity adds at most one row per active learner/day and calendar month, plus indexed deduplication checks. Feedback is small structured data. No paid plan upgrade is performed here.

## Tests and release limitations

Tests cover schema allowlists, missing/invalid prices, partial usage, primary/fallback accounting, analytics failure, concurrent active-user deduplication, feedback ownership and deletion. The browser suite includes explicit feedback and next-step reporting on mobile/desktop. Existing races, quota boundaries, retries and cross-user tests remain in every run. Synthetic results do not establish real provider quality or real Analytics ingestion. Cloud account setup, the outstanding #157 build issue and live smoke tests remain release prerequisites.
