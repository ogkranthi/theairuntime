---
module: 1
title: "Build the Naive Agent"
duration: "45-60 min"
goal: "Build something that works, in plain Python, before introducing any framework."
question: "What is the smallest useful agent before we add infrastructure?"
hook: "Forty lines that work. Every line is a promise you cannot keep."
scenario: "The first vendor review runs end to end on your laptop in ninety seconds. The customer asks what happens when they close the tab."
skills: [Agent loops, Tool design]
technologies: [Python]
repoPath: "01_naive_agent.py"
labNumber: 1
lab: "Kill the Agent"
deliverable: "01_naive_agent.py + resume_answer.md"
status: published
---

We intentionally build a fragile system first.

## Define the contract

```python
vendor = {
    "name": "Acme",
    "url": "http://localhost:8001/acme/",
}

CHECKLIST = [
    "product",
    "customers",
    "pricing",
    "security",
    "developer_experience",
]
```

## Define three tools

```python
def discover_pages(root_url: str) -> list[str]:
    ...

def fetch_page(url: str) -> str:
    ...

def extract_finding(page_text: str, requirement: str) -> dict:
    ...
```

Only `extract_finding` fundamentally needs model reasoning.

The course should repeatedly reinforce:

> Use deterministic software where the rule is known. Use the model where semantic judgment is genuinely useful.

## First state object

```python
state = {
    "run_id": "run_123",
    "vendor": vendor,
    "remaining": list(CHECKLIST),
    "findings": [],
    "visited_urls": [],
    "pages_fetched": 0,
}
```

At this point, **state** means simply:

> Information the program needs to know in order to decide what to do next.

It lives only in process memory.

## The loop

```python
while state["remaining"]:
    requirement = choose_requirement(state)
    url = choose_page(requirement, state)

    page = fetch_page(url)
    finding = extract_finding(page, requirement)

    state["visited_urls"].append(url)
    state["pages_fetched"] += 1

    if finding["supported"]:
        state["findings"].append(finding)
        state["remaining"].remove(requirement)

report = create_report(state)
```

Operationally:

```text
process memory
    │
    ├─ choose
    ├─ fetch
    ├─ model
    ├─ mutate state
    └─ repeat
```

## Hidden assumptions

This small loop assumes:

```text
process remains alive
memory remains available
network calls return
model calls return
repeating a tool is harmless
context remains useful
only one worker executes this run
the completion rule is trustworthy
```

The rest of the course removes these assumptions one at a time.

## Deterministic fixtures

Do not make reliability labs depend on the live internet.

Use fixture vendors and a failure profile:

```yaml
routes:
  /flaky/pricing:
    responses:
      - status: 503
      - status: 503
      - status: 200
        fixture: pricing.html
```

This ensures every learner can reproduce the same fault.

<div class="callout failure-lab">

**FAILURE LAB 01: Kill the Agent**

Run until:

```text
Product                 complete
Customers               complete
Pricing                 in progress
Security                pending
Developer experience    pending
```

Stop Python.

Restart it.

What does the program know?

Nothing about the previous run.

It lost:

```text
run identity
vendor input
discovered pages
visited pages
findings
current progress
remaining work
cost already spent
```

</div>


## Measure the failure

Run again and record:

```text
pages repeated
model calls repeated
time repeated
estimated cost repeated
```

Reliability has a cost dimension.

## The question that leads to Module 02

Do not ask:

> Which database should I use?

Ask:

> Which facts must survive for another process to continue correctly?

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. What does “state” mean in this module?
2. Which parts of the system actually need model reasoning?
3. What assumptions does an in-memory loop make?
4. Why use fixture websites?
5. Which exact information disappeared after the kill?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] The naive loop runs end to end against the fixture server
- [ ] Step profile recorded: latency and call counts per tool across a full run
- [ ] You killed the process and documented, in resume_answer.md, exactly what was lost and what it cost to repeat
- [ ] You can recite the loop's assumption list (memory, one process, calls return, tools re-runnable, context fits) without the page open

</div>

## Primary sources

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview): read only the first section now. The point is to see that the framework you meet in Module 03 is built around exactly the deterministic-control-plus-LLM-decisions mix you just wrote by hand.
