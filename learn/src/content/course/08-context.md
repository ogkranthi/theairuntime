---
module: 8
title: "Context Engineering Across Long Runs"
duration: "60-75 min"
goal: "Treat execution state and model context as separate engineering surfaces; keep the model's working set small, evidenced, and reconstructible."
question: "How do we prevent context accumulation and drift?"
hook: "The agent read forty pages and got dumber."
scenario: "The data agent's context fills with raw pages. By decision thirty it repeats itself, ships a contradiction, and declares victory early. Nothing errored."
caseStudy: enterprise-data-agent
skills: [Context engineering, Compaction, Artifacts]
technologies: [Python]
repoPath: "07_context.py"
labNumber: 8
invariant: "I7: model context is rebuilt from durable artifacts, never accumulated."
lab: "Context Rot"
deliverable: "07_context.py + compaction A/B log"
status: published
---

Anthropic's published work on long-running agents found that compaction alone was not sufficient for complex extended work; structured progress artifacts and clean handoffs materially changed agent behaviour. Their context-engineering guidance names compaction, structured note-taking, and multi-agent context separation as the working techniques. This module makes you build all three, small.

## Lesson 08.1: The naive approach

Every fetched page goes into `messages[]`. After many pages:

```text
homepage
docs
pricing
security
blog
legal
integration docs
raw HTML
tool outputs
previous reasoning
...
```

The model sees everything. That is not context engineering. That is **accumulation**. Quality falls long before you hit a token limit: the model starts repeating pages, contradicting earlier findings, and declaring completion early.

## Lesson 08.2: Separate three things

```text
RAW MATERIAL        Fetched pages          → object store / DB, addressable by URL + hash
DURABLE KNOWLEDGE   Evidence + findings    → state (small, structured)
ACTIVE CONTEXT      What the model needs   → built per decision, discarded after
```

## Lesson 08.3: Evidence store

Instead of carrying entire pages, carry claims with pointers:

```json
{
  "requirement": "pricing",
  "claim": "No public list pricing found",
  "source_url": "https://.../pricing",
  "evidence": "Contact sales for pricing.",
  "confidence": "medium",
  "content_hash": "sha256:..."
}
```

The model can retrieve raw content again when necessary, by URL and hash, deterministically. Raw pages are stored once (`pages` table: `url, hash, fetched_at, body`), never in the prompt twice.

## Lesson 08.4: Progress artifact

Maintain a small, always-current handoff note:

```json
{
  "completed": ["product", "security"],
  "remaining": ["pricing", "developer_experience"],
  "unknowns": [],
  "next_action": "inspect pricing page",
  "pages_seen": 7,
  "budget_left": {"pages": 18, "usd": 1.10}
}
```

Progress becomes inspectable, by the model at the start of every decision, by a human in the dashboard, and by a *new* worker picking up the run after a crash. This is the "structured note" that survives when the message history does not.

## Lesson 08.5: Build active context per decision

For `select_next_task`, the prompt is assembled from:

```text
1. task instructions (static)
2. progress artifact (small)
3. evidence summaries for remaining items (small)
4. candidate URLs not yet visited (list)
```

Not: the whole message history. `messages[]` becomes a per-node scratchpad, reset at node boundaries. The durable memory is the state, not the transcript.

## Lesson 08.6: Compaction and sub-agents

When a node genuinely needs many pages (e.g. a security deep-dive across five docs), spawn a **sub-agent with a clean context** that returns only a finding + evidence pointers. The parent never sees the raw pages.

When a single conversation must be long (the review loop with a human), **compact**: summarise messages older than N turns into the progress artifact and drop them. Compact proactively at a threshold, not reactively at overflow.

<div class="callout failure-lab">

**FAILURE LAB 08: Context Rot**

Fixture profile `sprawl`: a vendor with 40 pages, several near-duplicates, and one contradiction (pricing page says "free tier", docs page says "no free tier").

Run **A**: naive accumulation. Run **B**: evidence store + progress artifact + per-decision context.

Measure, from traces:

```text
pages fetched more than once
contradictions carried into the report
tokens per decision (p50, p95)
final coverage (verified items / 6)
```

Expected: A re-fetches, ships the contradiction, and stops early. B does not. Record it.

</div>

<div class="callout deliverable">

**Deliverable:** `07_context.py` (evidence store, progress artifact, context builder) and `lab_07_ab.md` with the four measurements for both runs.

</div>

<div class="callout takeaway">

**Production takeaway:** the model's context is a *view* over your state, rebuilt per decision. If you can't reconstruct it from the database, you don't control it.

</div>

## Diagnose

<div class="block-diagnose">

Run A rotted and Run B did not. Use the traces to say why:

1. Which prompt grew with the step number in Run A, and what was the largest contributor to it?
2. Run A shipped the pricing contradiction. At which decision did the contradicting evidence fall out of the model's view?
3. After the crash, the new worker in Run B rebuilt its context. From which artifacts, exactly?
4. What did Run A re-fetch that Run B did not, and what stopped B from doing it?

</div>

## Prove it

<div class="block-prove">

```bash
make lab LAB=08
```

Passing means, checked automatically, not eyeballed:

- against fixture profile `sprawl`, the check compares the two runs on four measurements from traces:
  pages fetched more than once (B: 0), contradictions carried into the report (B: 0, surfaced instead),
  tokens per decision p50/p95 (B: flat across steps), final coverage (B >= A)
- the step-40 prompt in B is within 10 percent of the step-4 prompt's size

A cost win with no quality column next to it is not a result; the check demands both.

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] Raw pages are stored once, addressable by URL and hash, and never enter the prompt twice
- [ ] The progress artifact is current after every step and readable by a human
- [ ] Active context is built per decision from state, and messages reset at node boundaries
- [ ] The A/B log records all four measurements for both runs
- [ ] The compaction contract is written down, including what may never be dropped

</div>

## Checkpoint

Three questions before you move on. Answer first, then open.

<details class="checkpoint">
<summary>Why does quality fall long before the token limit?</summary>

Accumulation buries the relevant facts: the model starts repeating pages, contradicting earlier findings, and declaring completion early. Context rot is a quality cliff, not a size error.

</details>

<details class="checkpoint">
<summary>What are the three things this module separates?</summary>

Raw material (fetched pages, in storage), durable knowledge (evidence and findings, in state), and active context (built per decision, discarded after). The model's context is a view over state, rebuilt every decision.

</details>

<details class="checkpoint">
<summary>When do you reach for a sub-agent versus compaction?</summary>

Sub-agent when one task genuinely needs many pages: clean context in, finding plus evidence pointers out. Compaction when one conversation must be long: summarize old turns into the progress artifact, proactively, on a threshold.

</details>

## Primary sources

- [Anthropic, effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): the published basis for this module's claim that compaction alone is not sufficient and structured notes change behavior.
- [Deep Agents context engineering](https://docs.langchain.com/oss/python/deepagents/context-engineering): the same three techniques as framework features; you will meet them as primitives in Module 12.
