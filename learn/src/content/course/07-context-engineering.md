---
module: 7
title: "Context Engineering Across Long Runs"
duration: "60-75 min"
goal: "Treat execution state and model context as separate engineering surfaces; keep the model's working set small, evidenced, and reconstructible."
lab: "Context Rot"
deliverable: "07_context.py + compaction A/B log"
status: published
---

Anthropic's published work on long-running agents found that compaction alone was not sufficient for complex extended work; structured progress artifacts and clean handoffs materially changed agent behaviour. Their context-engineering guidance names compaction, structured note-taking, and multi-agent context separation as the working techniques. This module makes you build all three, small.

## Lesson 07.1: The naive approach

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

## Lesson 07.2: Separate three things

```text
RAW MATERIAL        Fetched pages          → object store / DB, addressable by URL + hash
DURABLE KNOWLEDGE   Evidence + findings    → state (small, structured)
ACTIVE CONTEXT      What the model needs   → built per decision, discarded after
```

## Lesson 07.3: Evidence store

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

## Lesson 07.4: Progress artifact

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

## Lesson 07.5: Build active context per decision

For `select_next_task`, the prompt is assembled from:

```text
1. task instructions (static)
2. progress artifact (small)
3. evidence summaries for remaining items (small)
4. candidate URLs not yet visited (list)
```

Not: the whole message history. `messages[]` becomes a per-node scratchpad, reset at node boundaries. The durable memory is the state, not the transcript.

## Lesson 07.6: Compaction and sub-agents

When a node genuinely needs many pages (e.g. a security deep-dive across five docs), spawn a **sub-agent with a clean context** that returns only a finding + evidence pointers. The parent never sees the raw pages.

When a single conversation must be long (the review loop with a human), **compact**: summarise messages older than N turns into the progress artifact and drop them. Compact proactively at a threshold, not reactively at overflow.

<div class="callout failure-lab">

**FAILURE LAB 07: Context Rot**

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
