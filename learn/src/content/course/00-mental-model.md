---
module: 0
title: "What Is a Long-Running Agent?"
duration: "30-40 min"
goal: "Understand what makes long-running agent execution fundamentally different from an ordinary LLM request."
question: "When does a problem actually need long-running-agent infrastructure?"
hook: "When is an agent worth this much engineering?"
scenario: "A team asks for an agent. Half their use cases are one reliable model call wearing a costume. Telling them which half is the first thing an FDE does."
skills: [AI suitability, Architecture]
technologies: [Python]
deliverable: "exercise_00_classification.md"
status: published
---

Before learning durability, learn when not to build it.

## Start with an ordinary model call

```python
def summarize(text: str) -> str:
    return model.invoke(f"Summarize:\n\n{text}")
```

One request enters. One response leaves.

If the process crashes, the caller can usually retry the whole operation. There is little valuable intermediate progress to preserve.

Now compare it with:

```python
def review_vendor(vendor_url):
    pages = discover_pages(vendor_url)
    findings = []

    while not enough_evidence(findings):
        page = choose_next_page(pages, findings)
        content = fetch_page(page)
        finding = analyze(content)
        findings.append(finding)

    return write_report(findings)
```

This looks like one function, but operationally it is a sequence:

```text
discover
fetch
analyze
record
choose
fetch
analyze
record
...
report
```

If the process dies after step 18, restarting from the beginning can throw away expensive useful work.

That is the first long-running concern.

## Workflow versus agent

A **workflow** has mostly predetermined control flow.

```text
validate invoice
→ extract amount
→ check policy
→ route to reviewer
→ send result
```

An **agent** delegates some next-step decisions to a model.

```text
goal
  ↓
model chooses action
  ↓
tool returns observation
  ↓
model chooses next action
  ↓
...
```

The next step is partly discovered while the task runs.

That flexibility creates more possible trajectories, which makes testing and recovery harder.

## Four things people confuse

### Long input

One very large document.

### Long conversation

Many user/model turns.

### Long workflow

Many known steps.

### Long-running agent

Useful work spans many steps, at least some future steps are chosen dynamically, and execution may need to survive request/process/context/human boundaries.

These are different problems.

## A spectrum

```text
more predetermined                            more dynamic

function → deterministic workflow → agentic workflow → autonomous agent
```

Moving right gives more flexibility, but also:

- more trajectories;
- harder debugging;
- less predictable cost;
- more opportunities for loops;
- a larger security surface.

Use the least-agentic design that solves the problem.

## Five pressures as runs get longer

### Failure pressure

More external operations create more opportunities for one to fail.

### Context pressure

The system can collect more information than is useful to keep active in every model call.

### Error pressure

A bad assumption from an early step can influence later decisions.

### Side-effect pressure

The system becomes more likely to change real external state.

### Operational pressure

Someone must answer:

```text
Is it alive?
Is it making progress?
Who owns it?
Can I cancel it?
Will it recover?
What has it spent?
```

## Decision test

A task is a stronger candidate for long-running-agent infrastructure when several are true:

- partial progress is valuable;
- work may outlive one request/process;
- a human may respond later;
- external side effects are possible;
- the model dynamically chooses future actions;
- intermediate evidence must survive;
- active context may need rebuilding;
- “done” can be checked independently.

## Examples

Usually not long-running agents:

```text
Classify this ticket.
Translate this document.
Extract these fields.
Summarize this transcript.
```

Strong candidates:

```text
Migrate a large repository.
Investigate an incident.
Reconcile thousands of transactions.
Research a vendor and build an evidenced assessment.
Onboard an employee over several days.
```

## Six surfaces used throughout the course

```text
STATE
What facts survive?

EXECUTION
How does unfinished work continue?

CONTEXT
What should the model see for this decision?

CONTROL
Who can pause, approve, cancel, or constrain?

OBSERVABILITY
How do humans understand the run?

EVALUATION
How do we prove the system is good?
```

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why is duration alone a poor definition of long-running?
2. What is the difference between a workflow and an agent?
3. Why is more autonomy not automatically better?
4. Name one task where partial progress is worth preserving.
5. Name one task you would deliberately keep as one model call.

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] All twelve scenarios classified, each with one sentence of justification
- [ ] You can state the execution-continuity definition without looking
- [ ] You can name the four things people confuse with a long-running agent
- [ ] The six-surfaces diagram drawn from memory, and each surface mapped to the module that builds it

</div>
