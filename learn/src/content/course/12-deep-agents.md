---
module: 12
title: "The Deep Agents Bridge"
duration: "60-75 min"
goal: "Rebuild the agent on a higher-level harness, verify every invariant still holds, and learn to tell framework features from guarantees."
question: "What does a production harness add above the runtime?"
labNumber: 12
invariant: "I11: the harness can be replaced without losing a single runtime guarantee."
lab: "Replace the Harness"
deliverable: "12_deepagents.py + harness_comparison.md + green gauntlet subset on both harnesses"
status: published
---

You built the runtime by hand: state, checkpoints, idempotent effects, leases, interrupts, rebuilt context, guards. Now adopt a harness that ships opinions about all of it, and find out which of your properties it carries, which it improves, and which it silently drops.

This module uses [Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview), a harness above LangGraph that adds planning, a filesystem-backed workspace, subagents, and built-in context management. The lesson is not "use Deep Agents." The lesson is the checklist you interrogate any harness with.

## Lesson 12.1: What a harness is

```text
RUNTIME    the guarantees      durable state, replay, ownership, idempotency,
                               interrupts, budgets, audit
HARNESS    the ergonomics      planning loops, workspaces, subagent spawning,
                               context management, tool scaffolding
```

A harness makes the agent easier to build. It does not automatically make it safe to operate. Confusing the two is the most expensive mistake in this field, because harness demos look identical to durable systems right up until the process dies.

## Lesson 12.2: Port the agent

Rebuild the Vendor Review Agent on Deep Agents, keeping your application tables as the source of truth:

```text
planner          the built-in planning loop replaces choose_next_task
workspace        research notes live in the harness filesystem backend
subagents        the security deep-dive becomes a subagent with a clean
                 context that returns findings + evidence pointers, which is
                 Module 08's pattern as a first-class feature
persistence      the LangGraph checkpointer you already run (Module 03)
your tables      runs, run_events, effects, published_reports stay yours,
                 written from tool implementations, exactly as before
```

The port should be dramatically less code. Write down what got shorter; that list is what the harness is actually for.

## Lesson 12.3: Interrogate it

For each invariant, find where it now lives. Three honest answers exist:

```text
CARRIED      the harness provides it and you verified the mechanism
             (persistence via the same Postgres checkpointer: read which
             tables it writes and what one checkpoint contains)
YOURS        the harness has no opinion and your code still enforces it
             (idempotency keys, leases, SSRF guards, tenant scoping)
DROPPED      your old code enforced it and the port quietly lost it
             (the fenced checkpoint write is the classic casualty)
```

Fill the matrix in `harness_comparison.md`; empty cells are the finding:

```text
INVARIANT                      BY HAND        DEEP AGENTS PORT
I1  evidence-backed progress   state.py       ?
I2  crash-safe replay          checkpointer   ?
I3  single publish             effects table  ?
I4  single owner + reclaim     scheduler      ?
I6  durable human wait         interrupts     ?
I7  rebuilt context            context.py     ?
I9  bounded permissions        guards         ?
```

## Lesson 12.4: Subagents are context engineering, formalized

The one place the harness genuinely upgrades your design: [subagent spawning with clean contexts](https://docs.langchain.com/oss/python/deepagents/subagents) is Module 08's "deep-dive with a fresh context" pattern as a primitive, with the workspace as the structured handoff. Use it for the security section and compare token spend per decision against your hand-rolled version, with the Module 09 traces as the instrument.

<div class="callout failure-lab">

**FAILURE LAB 12: Replace the Harness**

Run the gauntlet subset (Labs 03, 04, 05, 07) against the Deep Agents port, unmodified.

Prediction first, in writing: which invariants survive the port untouched, and which break?

Typical first result: replay works (same checkpointer), the duplicate report returns (publish went through a harness tool without your idempotency key), and two workers double-execute (nothing in the harness knows about your lease table). Wire your effects table and scheduler back in at the tool boundary, re-run, and get all four labs green on both implementations.

</div>

<div class="callout deliverable">

**Deliverable:** `12_deepagents.py`, the completed `harness_comparison.md` matrix with a CARRIED / YOURS / DROPPED verdict per invariant, and the four-lab gauntlet subset passing on both harnesses.

</div>

<div class="callout note">

**What this does not solve.** The comparison is against one harness at one version. The matrix, not the verdict, is the durable artifact: frameworks change fast, and re-running the interrogation on the next version, or the next framework, takes an afternoon once the labs exist.

</div>

<div class="callout takeaway">

**Production takeaway:** adopt harnesses for ergonomics, never for guarantees you have not located in their code. The question that cuts through any framework pitch is the one this course trained you to ask: what happens when the process dies, and show me the table.

</div>

## Primary sources

- [Deep Agents overview](https://docs.langchain.com/oss/python/deepagents/overview) and [context engineering](https://docs.langchain.com/oss/python/deepagents/context-engineering): read the mechanisms, then map each to the module where you built it by hand.
- [Anthropic on effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): the industry statement of the harness/runtime split this module makes you feel.
