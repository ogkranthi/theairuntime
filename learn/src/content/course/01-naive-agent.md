---
module: 1
title: "Build the Naive Agent"
duration: "45-60 min"
goal: "Build something that works, in plain Python, before introducing any framework."
question: "What does the simplest useful loop look like?"
labNumber: 1
lab: "Kill the Agent"
deliverable: "01_naive_agent.py + resume_answer.md"
status: published
---

This module deliberately uses ordinary Python. No LangGraph yet. You need to feel the loop before you are handed a runtime for it.

## Lesson 01.1: Our vendor agent

Input:

```python
vendor = {
    "name": "Acme",
    "url": "http://localhost:8001/vendor/acme",
}
```

Checklist:

```python
CHECKLIST = [
    "product",
    "customer",
    "pricing",
    "security",
    "developer_experience",
    "unknowns",
]
```

Tools (keep these extremely simple):

```python
def discover_pages(url: str) -> list[str]:
    """Return candidate URLs from the site's nav/sitemap."""

def fetch_page(url: str) -> str:
    """Return raw HTML/text for a URL."""

def extract_finding(page: str, question: str) -> dict:
    """LLM call: answer `question` from `page`, with a quoted evidence span or None."""
```

## Lesson 01.2: Build the loop

Conceptually:

```python
state = create_initial_state(vendor)

while not complete(state):
    next_task = choose_next_task(state)          # LLM or heuristic
    page = fetch_page(next_task.url)
    finding = extract_finding(page, next_task.question)
    state["findings"].append(finding)

report = create_report(state)
```

The model makes only useful semantic decisions: *which page next* and *what does this page say about X*. The outer loop stays understandable, testable, and yours.

This introduces an AIR principle you will see repeatedly:

> Use deterministic control where requirements are known. Use agentic reasoning where decisions are genuinely ambiguous.

LangGraph (Module 03) is built around exactly this mix (deterministic graph logic with LLM-driven nodes) rather than delegating everything to a free-running agent.

## Lesson 01.3: Deterministic fixture websites

Do not make early labs dependent on the public internet. Every student must be able to reproduce the exact same failure on the exact same page.

Provide:

```text
fixtures/
  acme/
    index.html
    pricing.html
    security.html
    docs.html
  beta/
    index.html
    security.html
  flaky/
    index.html
    pricing.html
```

Serve them locally (`make fixtures` → `http://localhost:8001`). The fixture server can intentionally produce, per URL and per attempt:

```text
200
404
500
503
10-second delay
malformed HTML
connection reset
```

Behaviour is configured in a `profile.yaml`, so "pricing returns 503 twice then 200" is one line, not a code change. Later modules add profiles; the server does not change.

This one decision does more for course quality than anything else: failures become reproducible, comparable, and gradeable.

<div class="callout failure-lab">

**FAILURE LAB 01: Kill the Agent**

Start the run:

```text
✓ Product
✓ Customer
→ Pricing
○ Security
○ Developer experience
```

Terminate Python. `Ctrl-C`, `kill -9`, close the laptop. Pick one.

Restart it.

Ask: *"Where should execution continue?"*

The answer is: **we don't know.** The in-memory Python variables disappeared. The agent has no idea it ever ran.

</div>

<div class="callout deliverable">

**Deliverable:** `01_naive_agent.py`, plus a short written answer in `resume_answer.md`:

*"What information would need to survive for this agent to resume correctly?"*

Expected concepts: run ID · input · checklist · completed items · findings · evidence · current status · errors.

</div>

Do **not** teach checkpoints yet. Let students discover why checkpoints are needed. Module 02 names it.

<div class="callout takeaway">

**Production takeaway:** an agent that works is not an agent that survives. Working is the starting line.

</div>

## Primary sources

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview): read only the first section now. The point is to see that the framework you meet in Module 03 is built around exactly the deterministic-control-plus-LLM-decisions mix you just wrote by hand.
