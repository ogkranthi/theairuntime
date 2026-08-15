---
module: 6
title: "Failure Handling, Retries & Recovery"
duration: "60 min"
goal: "Stop treating every exception as retry(3). Build a failure taxonomy and route each class differently."
question: "Which failures retry, reroute, pause, or stop?"
labNumber: 6
invariant: "I5: every failure class gets its designed response, never a blind retry."
lab: "The Failure Matrix"
deliverable: "failure_policy.py"
status: published
---

## Lesson 06.1: Failure taxonomy

Five categories. Memorise them.

```text
TRANSIENT           503 · connection reset · rate limit
LLM-RECOVERABLE     invalid query · poor search · bad tool arguments
USER-FIXABLE        invalid URL · missing credential · approval required
PERMANENT           resource does not exist · access forbidden
UNEXPECTED          bug · corruption · unknown exception
```

LangGraph's own guidance distinguishes transient, model-recoverable, user-fixable, and unexpected failures with different handling strategies. Read it, then build yours.

## Lesson 06.2: Retry transient failures

```python
from langgraph.types import RetryPolicy

builder.add_node(
    "fetch_page",
    fetch_page,
    retry_policy=RetryPolicy(max_attempts=3, initial_interval=1.0, backoff_factor=2.0),
)
```

Apply to: page fetches, model requests, temporary DB/network operations. Nowhere else.

## Lesson 06.3: Don't retry everything

```text
HTTP 401
```

Retrying 50 times will not produce credentials. Route instead:

```text
401
 ↓
status = requires_user_action
 ↓
interrupt (Module 07)
```

Same for 404 on a page: mark it `unavailable`, record it in `errors`, and let the planner choose a different page. The run continues; the item may end as `unknown`, which is a *valid, honest* outcome for the vendor brief.

## Lesson 06.4: Semantic failure

The most important distinction:

```text
HTTP 200  does not mean  correct result
```

A page might load and contain nothing about pricing. That is not a fetch failure. It is a **finding failure**, and it requires verification or replanning, not an HTTP retry.

Route model-recoverable failures back to the model *with the failure as context*:

```text
extract_finding → "no pricing information on this page"
                ↓
select_next_task (with visited_urls + reason)
```

## Lesson 06.5: Budgets and circuit breakers

Every run gets:

```python
MAX_PAGES     = 25
MAX_ATTEMPTS  = 40
MAX_COST_USD  = 1.50
MAX_WALLCLOCK = timedelta(minutes=30)
```

Exceeding any → `status = budget_exceeded`, run stops cleanly with a partial report and the reason. Runaway agents are a failure class, not an accident.

<div class="callout failure-lab">

**FAILURE LAB 06: The Failure Matrix**

Fixture profile `matrix`:

```text
Page A → 503, 503, 200
Page B → timeout
Page C → 404
Page D → malformed response
Page E → 200 with irrelevant content
Page F → 401
```

Students create the behaviour matrix and prove each row with a trace:

```text
503          retry with backoff
timeout      retry
404          mark unavailable, replan
malformed    recover / extract differently
irrelevant   replan (semantic failure)
401          stop / user action
```

Then run with `MAX_PAGES=3` and confirm the run stops cleanly with a partial report.

</div>

<div class="callout deliverable">

**Deliverable:** `failure_policy.py`, a single module mapping exception/response classes to actions, plus a paragraph per row explaining *why* that failure gets that response.

</div>

<div class="callout takeaway">

**Production takeaway:** retries are for the network. Everything else needs a decision.

</div>

## Diagnose

<div class="block-diagnose">

The failure matrix ran five fault profiles through your policy. For each, defend the routing:

1. Which fixture failures were retried, and what made them retryable while the 404 was not?
2. Where did Retry-After actually change your delay, and what would ignoring it have done to the degraded dependency?
3. Which failure class must never be retried, and what exactly happens (and costs) when you retry it anyway?
4. The vendor brief shipped with an item marked unknown. Where did that gap surface, and why is it a pass rather than a failure?

</div>

## Prove it

<div class="block-prove">

```bash
make lab LAB=06
```

Passing means, checked automatically, not eyeballed:

- each profile (flaky-503, slow-loris, poisoned-200, rate-limited, partial-json) routes to its designed action, asserted from run_events
- retries carry full jitter and draw from a per-run budget; the budget is never exceeded
- the poisoned 200 is detected by validation and marked unavailable, and the planner chooses a different page
- the run completes with honest unknowns instead of dying or fabricating

The policy is data (a table in code), so the test enumerates it.

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] The failure taxonomy exists as one module mapping classes to actions, with a why per row
- [ ] Transient retries are jittered, capped, budgeted, and respect Retry-After
- [ ] A 200 with garbage content raises Poisoned and is never blindly retried
- [ ] A run that cannot verify an item degrades to an honest unknown and continues

</div>

## Checkpoint

Three questions before you move on. Answer first, then open.

<details class="checkpoint">
<summary>Why is retry(3) on everything worse than no retries at all?</summary>

It turns a degraded dependency into a self-inflicted load test, retries failures that retrying cannot fix (poisoned, semantic), and converts a five-second blip into a forty-minute run with a doubled bill.

</details>

<details class="checkpoint">
<summary>A page loads fine but contains nothing about pricing. What kind of failure is that?</summary>

A finding failure, not a fetch failure. It needs verification or replanning, never an HTTP retry, because the request succeeded and repeating it reproduces the same emptiness.

</details>

<details class="checkpoint">
<summary>Why is 'unknown' a valid outcome for the brief?</summary>

Because the alternative is fabrication. An honest gap in section-level coverage is information the reviewer can act on; an invented claim is an incident waiting for a customer to find it.

</details>

