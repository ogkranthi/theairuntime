---
title: Enterprise Data Agent
category: Financial Services
summary: A question-answering agent over enterprise data where the hard problems are permissions, business definitions, and proving the answers are right.
concepts: [context engineering, data permissions, SQL, business definitions, evaluation]
customerAsk: "Our analysts should be able to ask revenue questions in plain English."
realRequirement: Per-user data permissions enforced below the model, business definitions that beat the model's guesses, and an evaluation loop that catches confidently wrong SQL before an executive quotes it.
courses: [course-001]
modules: [8, 10, 11]
---

## The customer problem

A financial services firm wants natural-language access to revenue data. The demo takes a
day. The gap between demo and production is everything else: row-level permissions that
must hold no matter what the model generates, "revenue" meaning three different things in
three departments, and answers that look plausible while being subtly, expensively wrong.

## Architecture shape

Queries compile against a governed semantic layer, not raw tables. Permissions filter at
the data layer, below the model. Business definitions live in a versioned store injected
into context per question. Every answer ships with the query that produced it, and a
sampled evaluation loop judges answer-question fit against analyst labels.

## The decisions that matter

- **The model never sees data the user cannot.** Enforcement in the runtime, not the prompt.
- **Definitions are context engineering.** The difference between right and wrong is
  usually a business rule the model was never told, injected deterministically.
- **Evaluation is the release gate.** A judge validated against analyst labels decides
  whether version B answers better than version A.

## Where Course 001 uses this case

Context engineering (Module 08), security and permissions (Module 10), and evaluation
(Module 11) ground their scenarios here.
