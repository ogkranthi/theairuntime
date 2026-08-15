---
title: Customer Account Agent
category: SaaS
summary: An operations agent that acts on customer accounts through real APIs, where every action is a side effect someone has to approve, dedupe, or reverse.
concepts: [tool permissions, side effects, idempotency, approval, policy]
customerAsk: "Let the agent actually fix the customer's account, not just draft a reply about it."
realRequirement: Side-effecting tools with per-action policy, idempotent external writes, human approval on irreversible operations, and an audit trail that survives disputes.
courses: [course-001]
modules: [4, 7]
---

## The customer problem

A SaaS support team resolves account issues: refunds, plan changes, seat adjustments,
credential resets. The agent that only drafts replies saves nothing; the value is in the
action. But every action touches billing or access, and a duplicated refund is a real loss
with a real customer attached.

## Architecture shape

The agent gets a narrow tool grant per ticket category. Reversible actions execute with
idempotency keys derived from the ticket id; irreversible ones (refund above threshold,
plan downgrade) pause the run for approval with an evidence-rich payload. Every external
write lands in an effects table before and after the call.

## The decisions that matter

- **Policy is data, not prompt.** Which actions need approval is a table the customer's
  ops lead can read, not a paragraph the model might reinterpret.
- **The retry after a timeout must not refund twice.** Exactly-once effect, built from
  at-least-once delivery plus a key the crash cannot erase.
- **Approval is a durable pause**, because the approver is in a meeting and the run must
  cost nothing while it waits.

## Where Course 001 uses this case

Side effects and idempotency (Module 04) and human control (Module 07) run their scenarios
against this shape.
