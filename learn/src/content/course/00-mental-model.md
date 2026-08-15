---
module: 0
title: "Long-Running Agents: The Mental Model"
duration: "30-40 min"
goal: "Understand what makes long-running agent execution fundamentally different from an ordinary LLM request."
question: "When is a long-running agent justified?"
hook: "When is an agent worth this much engineering?"
scenario: "A team asks for an agent. Half their use cases are one reliable model call wearing a costume. Telling them which half is the first thing an FDE does."
skills: [AI suitability, Architecture]
technologies: [Python]
deliverable: "exercise_00_classification.md"
status: published
---

## Lesson 00.1: Start with the simplest possible agent

```text
User
 ↓
Model
 ↓
Tool
 ↓
Model
 ↓
Answer
```

The agent loop:

```text
Observe → Decide → Act → Observe → Decide → ...
```

Nothing about this inherently makes an agent durable. It is a `while` loop with a model inside it. When the process dies, the loop dies.

## Lesson 00.2: Define long-running

Avoid defining long-running as *"anything taking longer than five minutes."*

Use:

> A long-running agent performs useful work whose lifecycle may outlive a single request, process, context window, worker, or human interaction.

The important property is not time. It is **execution continuity**.

A 90-second workflow that publishes an invoice can require durable execution. A 30-minute model call that just returns text might not.

## Lesson 00.3: Four different things people confuse

```text
LONG PROMPT          Large input.
LONG CONVERSATION    Many turns.
LONG WORKFLOW        Many predetermined operations.
LONG-RUNNING AGENT   Many operations where some next actions are dynamically chosen.
```

The spectrum:

```text
Deterministic ──────────────────────────────────── Agentic

ETL → Workflow → Agentic Workflow → Autonomous Agent
```

Autonomy is not automatically desirable. Every step to the right costs you predictability, testability, and cost control. You should be able to say why you moved right.

## Lesson 00.4: When should you use one?

Good candidates: software engineering, research, investigation, reconciliation, onboarding, compliance review, anywhere useful work accumulates over multiple decisions and partial progress is worth keeping.

Bad candidates:

```text
Summarize this paragraph.
Classify this ticket.
Extract these fields.
Translate this document.
```

Don't build agent infrastructure around work that can be one reliable model call.

## Lesson 00.5: Why it is hard (the real constraints)

- **Finite context → context rot.** Performance degrades long before the hard token limit.
- **Compounding errors.** Early mistakes cascade; a wrong fact in step 3 poisons step 40.
- **Models are poor at judging their own completeness.** "Done" from the model is a claim, not a fact.
- **Everything grows with duration:** cost, latency, security surface, and drift from the original goal.
- **Failure is ambiguous.** A timeout after a side effect leaves you not knowing whether the side effect happened.

Every module in this course maps to one of these.

## Exercise 00: Classify twelve scenarios

For each, choose `LLM CALL` · `WORKFLOW` · `AGENT` · `LONG-RUNNING AGENT`, and write one sentence of justification.

1. Translate a 3-page PDF into Spanish.
2. Nightly: pull yesterday's orders, compute totals, email finance.
3. Given a GitHub issue, implement the fix, run tests, open a PR.
4. Answer "what is our refund policy?" from a policy doc.
5. Reconcile 4,000 bank transactions against invoices, flag mismatches, wait for an accountant to resolve ambiguous ones, then post entries.
6. Classify support tickets into 8 categories.
7. Research a vendor across their website and produce an evidenced brief (our course app).
8. Monitor a Slack channel and open a Jira ticket when someone reports an outage.
9. Migrate a 200-file codebase from library A to library B over several sessions.
10. Extract line items from an invoice image.
11. Onboard a new employee: create accounts, order hardware, schedule intros, follow up on what's pending over two weeks.
12. Draft a reply to one email.

<div class="callout deliverable">

**Deliverable:** `exercise_00_classification.md`, your twelve answers. Keep it. In Module 13 you will re-classify them and see what changed.

</div>

## Core mental model

End Module 00 with the diagram you will reuse for the entire course:

```text
                LONG-RUNNING AGENT
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
      STATE        EXECUTION       CONTEXT
        │              │              │
   checkpoints       retry        compression
   progress          resume       artifacts
   evidence          timeout      handoff
        └──────────────┼──────────────┘
                       ↓
                    CONTROL
                       │
              human approval
              cancellation
              budgets
              permissions
                       ↓
                OBSERVABILITY
                       ↓
                  EVALUATION
```

State, Execution, Context, Control, Observability, Evaluation. Modules 02 to 11 take these one at a time.

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] All twelve scenarios classified, each with one sentence of justification
- [ ] You can state the execution-continuity definition without looking
- [ ] You can name the four things people confuse with a long-running agent
- [ ] The six-surfaces diagram drawn from memory, and each surface mapped to the module that builds it

</div>

## Checkpoint

Three questions before you move on. Answer first, then open.

<details class="checkpoint">
<summary>What makes an agent long-running, if not duration?</summary>

Execution continuity: the work's lifecycle may outlive a single request, process, context window, worker, deployment, or human interaction. A 90-second workflow that publishes an invoice can need durable execution; a 30-minute model call that just returns text might not.

</details>

<details class="checkpoint">
<summary>Name a task that should NOT be a long-running agent, and why.</summary>

Anything that can be one reliable model call: classify a ticket, extract fields, translate a document. Agent infrastructure around single-call work adds failure modes without adding capability.

</details>

<details class="checkpoint">
<summary>Why is 'done' from the model a claim rather than a fact?</summary>

Models are poor judges of their own completeness. 'Done' becomes a fact only when the runtime can verify it against evidence: checks passed, items covered, sources resolvable. That gap is what Modules 02 and 11 exist to close.

</details>

