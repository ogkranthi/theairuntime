---
title: Web-Grounded Claim Verification Rubric
artifact_type: rubric
related_lab: 1
use_case: Any agent that makes claims from web data, before you act on its output.
problem_solved: Plausible-looking records that are stale, unsupported, conflicting, or extracted wrong.
status: available
date: 2026-06-20
---

## When to use it

Any time an agent returns records built from web data and a human or a
downstream system is about to act on them: a prospect list, a research
summary, a competitive brief, an enrichment pipeline. The rubric grades one
claim at a time, so it works for any field in any record, from any source.

## What problem it solves

Web-grounded agents rarely fail by returning nothing. They fail by returning
records that look done. A third of the emails bounce, two of the companies
shut down last year, a field came from the wrong entity entirely. This rubric
is the check between "the list looks done" and "the list is safe to act on."

## The rubric

Grade every claim (one field plus its evidence) against the four breaks.
A claim passes only if it clears all four.

**1. Stale.** Was this true once but maybe not anymore? Check the
`fetched_at` timestamp on the evidence and whether the source is cached.
A funding announcement from 2023 does not support "recently raised" today.
Fail closed: old evidence for a time-sensitive claim is a reject or review,
not an accept.

**2. Unsupported.** Does the evidence actually back the claim? The source
must be reachable, not walled, and the cited snippet must state the claim,
not merely be near it. A field with no evidence is a missing field, not a
value. Plausible is not verified.

**3. Conflicting.** Do two sources disagree on a field that matters? A
LinkedIn headcount of 40 and a careers page claiming 200 is not a rounding
error. Conflicts route to review with both sources attached, never to a
silent pick of the friendlier number.

**4. Extraction drift.** Did the agent grab the wrong field, or the wrong
company? Same-name companies, subsidiary confusion, a title pulled from the
wrong person. Check that the entity in the evidence is the entity in the
record.

## Verdicts

Each claim gets exactly one verdict, with a reason:

- **Accept.** Fresh, supported, consistent, right entity.
- **Review.** Real signal, but stale, conflicting, or weakly supported. A
  human decides.
- **Reject.** Unsupported or wrong entity. Never ships.

Every rejection carries a reason. Every accepted record carries a trace:
where each field came from, what was checked, what was rejected and why.

## How to score a whole system

Grade two numbers, not one. Bad-record recall (the share of planted bad
records the guard caught) and clean-record precision (the share of accepted
records that are actually clean). A guard that rejects everything scores
perfectly on the first and fails the second, so it fails. Field Lab 01 sets
the bar at 85 percent recall, 80 percent precision, 100 percent evidence
coverage on accepted records, and zero unsupported accepted claims.

## Related investigation

This rubric is the core of [Field Lab 01: A Reliability Layer for
Web-Grounded Agents](/01), where it is implemented as a source-agnostic
trust function and scored against the Dirty Thirty, a frozen set of thirty
records with twenty planted breaks.
