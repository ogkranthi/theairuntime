---
module: 5
title: "Failure Handling, Retries & Recovery"
duration: "60 min"
goal: "Stop treating every exception as retry(3). Build a failure taxonomy and route each class differently."
lab: "The Failure Matrix"
deliverable: "failure_policy.py"
status: published
---

## Lesson 05.1: Failure taxonomy

Five categories. Memorise them.

```text
TRANSIENT           503 · connection reset · rate limit
LLM-RECOVERABLE     invalid query · poor search · bad tool arguments
USER-FIXABLE        invalid URL · missing credential · approval required
PERMANENT           resource does not exist · access forbidden
UNEXPECTED          bug · corruption · unknown exception
```

LangGraph's own guidance distinguishes transient, model-recoverable, user-fixable, and unexpected failures with different handling strategies. Read it, then build yours.

## Lesson 05.2: Retry transient failures

```python
from langgraph.types import RetryPolicy

builder.add_node(
    "fetch_page",
    fetch_page,
    retry_policy=RetryPolicy(max_attempts=3, initial_interval=1.0, backoff_factor=2.0),
)
```

Apply to: page fetches, model requests, temporary DB/network operations. Nowhere else.

## Lesson 05.3: Don't retry everything

```text
HTTP 401
```

Retrying 50 times will not produce credentials. Route instead:

```text
401
 ↓
status = requires_user_action
 ↓
interrupt (Module 06)
```

Same for 404 on a page: mark it `unavailable`, record it in `errors`, and let the planner choose a different page. The run continues; the item may end as `unknown`, which is a *valid, honest* outcome for the vendor brief.

## Lesson 05.4: Semantic failure

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

## Lesson 05.5: Budgets and circuit breakers

Every run gets:

```python
MAX_PAGES     = 25
MAX_ATTEMPTS  = 40
MAX_COST_USD  = 1.50
MAX_WALLCLOCK = timedelta(minutes=30)
```

Exceeding any → `status = budget_exceeded`, run stops cleanly with a partial report and the reason. Runaway agents are a failure class, not an accident.

<div class="callout failure-lab">

**FAILURE LAB 05: The Failure Matrix**

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
