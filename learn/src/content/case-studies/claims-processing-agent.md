---
title: Claims Processing Agent
category: Healthcare
summary: A document-heavy claims workflow where policy rules, human review, and a complete audit trail are the product, and the model is the smallest part.
concepts: [documents, policy, human review, durable execution, auditability]
customerAsk: "Cut our claims backlog without a single decision we cannot defend in an audit."
realRequirement: Deterministic policy gates around model extraction, evidence-linked decisions, durable waits for human review, and an event log an auditor can replay.
courses: [course-001]
modules: [2, 7, 15]
---

## The customer problem

A claims team processes documents: eligibility, coverage rules, adjudication, appeal. The
backlog is real, but the constraint is defensibility. Every automated decision must trace
to the document span and the policy clause that produced it, and anything ambiguous must
reach a human with the evidence assembled.

## Architecture shape

Extraction produces claims with document-anchored evidence. Policy-as-code gates decide
what auto-adjudicates and what routes to review. Reviews are durable pauses with
evidence-rich payloads. An append-only event log records every step, model decision and
human action, keyed for replay.

## The decisions that matter

- **The model extracts; policy decides.** Regulated decisions cannot ride on sampled text.
- **Evidence is the schema**, not an afterthought: a decision without a document anchor is
  not representable in the system.
- **The audit trail is a product requirement**, so the event log is designed first, not
  logged incidentally.

## Where Course 001 uses this case

Evidence-backed state (Module 02), human control (Module 07), and the production gauntlet's
auditability checks (Module 15) run their scenarios here.
