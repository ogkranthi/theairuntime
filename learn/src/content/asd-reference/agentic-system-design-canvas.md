---
title: Agentic System-Design Canvas
description: A one-page worksheet for lessons, design reviews, and interviews.
---

# Agentic System-Design Canvas

Copy this template for every design.

## 1. Outcome

**User:**  
**Job to be done:**  
**Business outcome:**  
**Success metric:**  
**Non-goals:**  

## 2. Why agentic?

**Why a deterministic workflow is insufficient:**  
**Where model judgment is useful:**  
**Where deterministic code remains authoritative:**  
**Simpler alternative considered:**  

## 3. Risk and authority

**Risk tier:**  
**Worst credible failure:**  
**Read-only actions:**  
**Reversible writes:**  
**Irreversible/material actions:**  
**Human approval points:**  
**Prohibited autonomous decisions:**  

## 4. Journey and topology

**Happy path:**  
**Agent/workflow pattern:**  
**Key states:**  
**Stop condition:**  
**Escalation condition:**  
**Cancellation behavior:**  

## 5. Tools

| Tool | Input/output contract | Identity/scope | Side effect | Idempotency | Timeout/retry | Approval |
|---|---|---|---|---|---|---|
| | | | | | | |

## 6. Context and data

**Trusted instructions:**  
**User inputs:**  
**Retrieved sources:**  
**Authority/freshness ranking:**  
**ACL strategy:**  
**Citation/provenance:**  
**Context budget/compression:**  
**Untrusted-content boundary:**  

## 7. State, memory, and durability

**Request state:**  
**Run state:**  
**Thread/session state:**  
**Workflow history:**  
**Long-term memory:**  
**System of record:**  
**What survives a crash:**  
**What must never repeat:**  
**Resume/version strategy:**  

## 8. Security and governance

**Trust boundaries:**  
**Tenant isolation:**  
**Secrets and service identity:**  
**Prompt-injection controls:**  
**Data-exfiltration controls:**  
**Sandbox/egress controls:**  
**Retention/deletion:**  
**Audit events:**  

## 9. Evals

**Golden cases:**  
**Adversarial cases:**  
**Component metrics:**  
**Trajectory metrics:**  
**Outcome metrics:**  
**Safety/policy metrics:**  
**Human calibration:**  
**Release gate:**  

## 10. Operations

**Latency SLO:**  
**Availability/durability SLO:**  
**Cost budget:**  
**Throughput/peak load:**  
**Rate-limit/backpressure strategy:**  
**Critical alerts:**  
**Runbook owner:**  

## 11. Rollout

**Offline test:**  
**Shadow:**  
**Canary:**  
**Rollback trigger:**  
**Versions recorded:**  
**Production sampling:**  

## 12. Open tradeoffs

1.  
2.  
3.  

---

# Interview shorthand

Under time pressure, cover these in order:

1. outcome and risk;
2. authority boundaries;
3. topology;
4. tools and context;
5. state and durable execution;
6. security and human review;
7. evals and SLOs;
8. scale, cost, and rollout.
