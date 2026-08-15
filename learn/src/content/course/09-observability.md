---
module: 9
title: "Observability & Run UX"
duration: "45-60 min"
goal: "Make every run explainable to a human in under a minute, from the dashboard, from the trace, and from the database."
question: "Can an operator explain a run in under a minute?"
hook: "The run looks dead. Is it?"
scenario: "A fetch has hung for 41 seconds. The dashboard, the trace and the event log each answer a different question about it, and an operator needs all three."
caseStudy: incident-response-agent
skills: [Tracing, Event logs, Run UX]
technologies: [Python, HTMX, LangSmith]
repoPath: "dashboard.html"
labNumber: 9
invariant: "I8: every run can explain itself from the database in under a minute."
lab: "The Silent Run"
deliverable: "dashboard.html + tracing config + runs/events tables"
status: published
---

## Lesson 09.1: Three audiences, three surfaces

```text
OPERATOR    "Is it stuck? What is it doing? Can I stop it?"     → run dashboard
ENGINEER    "Why did it choose that page? What did the model see?" → traces
AUDITOR     "What happened, in order, with evidence?"             → event log
```

One data model feeds all three. Do not build three.

## Lesson 09.2: Event log (append-only)

```sql
CREATE TABLE run_events (
  id        BIGSERIAL PRIMARY KEY,
  run_id    TEXT NOT NULL,
  ts        TIMESTAMPTZ DEFAULT now(),
  node      TEXT NOT NULL,          -- fetch_page, extract_finding, ...
  kind      TEXT NOT NULL,          -- started | finished | failed | decision | budget
  payload   JSONB NOT NULL
);
CREATE INDEX ON run_events (run_id, id);
```

Every node writes `started` and `finished`/`failed`. Every LLM decision writes `decision` with the *reason* the model gave. Budgets write `budget` on every change. This table is the audit trail and the raw material for evals.

## Lesson 09.3: Traces

Wire LangSmith (free tier) **or** self-hosted Langfuse. Both give you: per-node spans, prompts as sent, tokens, latency, cost. Tag every trace with `run_id`, `vendor`, `code_version`, `fixture_profile`.

Non-negotiable: you must be able to open a trace and see the *exact* prompt the model saw for any decision. If your context builder (Module 08) is doing its job, that prompt should be small and readable.

## Lesson 09.4: Run dashboard

Plain HTML + HTMX, polling `GET /runs/{id}` every 2s. Shows the operational questions from Module 02, live:

```text
RUN f72c…  ·  Acme  ·  researching  ·  4m12s  ·  $0.31

✓ product              verified   evidence: 2
✓ customer             verified   evidence: 1
→ pricing              researching (attempt 2, 503 retry)
○ security
○ developer_experience
○ unknowns

Pages: 7/25   Errors: 1   Last event: fetch_page finished 3s ago

[Cancel run]
```

Cancel sets `status=cancelled` in your `runs` table; every node checks it at entry. That is your kill switch, and it must work while a model call is in flight (check after, not before).

## Lesson 09.5: Alerts that matter

Only three, and each is a query on `run_events`:

```text
STUCK      no event for > 5 min while status ∈ {researching, verifying}
LOOPING    same node+payload hash > 3 times in a run
BUDGET     any budget field at ≥ 80%
```

<div class="callout failure-lab">

**FAILURE LAB 09: The Silent Run**

Fixture profile `hang`: one page responds after 45s. Start a run and walk away.

Without the dashboard, the run looks dead. With it, you see `→ pricing · fetch_page started 41s ago`, the STUCK alert at 5 min, and a working Cancel.

Then open the trace for the last `select_next_task` decision and answer, from the prompt alone: *why did it choose that page?* If you can't, your context builder is hiding something.

</div>

<div class="callout deliverable">

**Deliverable:** `dashboard.html`, tracing config, `runs` and `run_events` migrations, and the three alert queries.

</div>

<div class="callout takeaway">

**Production takeaway:** if a run cannot explain itself from the database, it is not observable: it is merely logged.

</div>

## Diagnose

<div class="block-diagnose">

The silent run hung for 45 seconds and your instruments caught it. Audit them:

1. Which surface told you the run was stuck, and how long did detection take versus the 5-minute alert bound?
2. Open the trace for the last select_next_task decision. Can you answer, from the prompt alone, why it chose that page?
3. An auditor asks for the run's history with evidence. Which single table answers, and what would be missing without decision events?
4. You cancelled mid-model-call. Where exactly did the run stop, and why is the check after the call rather than before?

</div>

## Prove it

<div class="block-prove">

```bash
make lab LAB=09
```

Passing means, checked automatically, not eyeballed:

- fixture profile `hang`: the dashboard shows the in-flight fetch with its age; the STUCK alert query fires within 5 minutes
- Cancel works while a model call is in flight and the run ends cancelled at the next boundary
- the trace for any decision shows the exact rendered prompt, small enough to read
- the LOOPING and BUDGET alert queries return correct rows against seeded event data

The timed test is social: hand a colleague a run_id and a complaint, and they explain the run inside a minute.

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] run_events is append-only, and every node writes started plus finished or failed
- [ ] Every LLM decision event records the model's stated reason
- [ ] The dashboard answers the operator questions live, with a working Cancel
- [ ] The three alerts exist as queries, tested against seeded events
- [ ] A colleague explained a run from the database in under a minute, timed

</div>

## Checkpoint

Three questions before you move on. Answer first, then open.

<details class="checkpoint">
<summary>Who are the three audiences, and what does each need?</summary>

Operator (is it stuck, can I stop it: dashboard), engineer (why did it choose that, what did the model see: traces), auditor (what happened, in order, with evidence: event log). One data model feeds all three.

</details>

<details class="checkpoint">
<summary>Why record the reason on every decision event?</summary>

Because 'what happened' without 'why' cannot be debugged or audited. The reason string turns a trajectory into an explanation and is the raw material for the Module 11 judge.

</details>

<details class="checkpoint">
<summary>Green dashboards, wrong report. What does that tell you?</summary>

That observability proves the machinery ran, not that the answer was right. Semantic failure is invisible to metrics; the module's job is making it investigable in minutes, and evaluation's job is catching it.

</details>

