# Architecture Decision Record Template

## ADR-___: Decision title

**Status:** Proposed / Accepted / Superseded / Rejected  
**Date:**  
**Owners:**  
**Related requirements/risks:**

## Context

Describe the user outcome, constraints, current architecture, and failure that makes a decision necessary.

## Decision drivers

Rank the drivers:

1. safety/authority;
2. correctness/quality;
3. durability/recovery;
4. latency;
5. cost;
6. team ownership;
7. portability;
8. implementation complexity.

## Options considered

### Option A

- Design:
- Benefits:
- Costs:
- Failure modes:
- Evidence/evals:

### Option B

- Design:
- Benefits:
- Costs:
- Failure modes:
- Evidence/evals:

### Option C

- Design:
- Benefits:
- Costs:
- Failure modes:
- Evidence/evals:

## Decision

State the chosen option and tie it to the dominant constraints.

## Consequences

### Positive

- 

### Negative

- 

### Risks and mitigations

- 

## Validation

How the team will prove the decision works:

- tests;
- eval metrics;
- failure injection;
- SLO/cost measurements;
- security review;
- rollout plan.

## Revisit triggers

State measurable conditions that would justify changing the decision.

Examples:

- traffic exceeds 10× current load;
- one capability requires a separate trust boundary;
- fallback quality falls below gate;
- workflow history approaches runtime limits;
- organizational ownership changes.
