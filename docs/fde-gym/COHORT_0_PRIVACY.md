# Cohort 0 privacy and consent

The security boundary additionally retains hashed capabilities, request
fingerprints, revisions, quota counts, and reservation/result-pointer metadata
in one SQLite Durable Object. It receives no raw conversations or email
addresses. Consented Gym state and immutable replay responses remain in the
existing KV namespace until the original absolute retention expiry; mutations
do not extend retention. Bearer capabilities are private session authority.
See [the security runbook](../security/COACH_GYM_HARDENING.md) for cache contents,
cleanup, platform-backup limits, and at-most-once report delivery.


## Research framing

Cohort 0 is a small product-validation group, not a public assessment service.

All participants receive the same benchmark without being told that fact before
the interview. After completion, tell them the common benchmark was used to
calibrate realism and scoring.

## Required consent copy

Before starting:

> This is an early FDE Gym research cohort. Your interview conversation,
> architecture, scores, and feedback may be reviewed to improve the simulator.
> Do not include confidential employer, customer, personal, regulated, or
> proprietary information.

Require two unchecked boxes:

- I consent to temporary retention and review of this session for Cohort 0.
- I will not include confidential or proprietary information.

Do not preselect either box.

## Retained fields

- consent version and timestamp
- session configuration
- transcript
- final graph
- meaningful graph revisions
- neutral evidence timeline
- interviewer coverage tags
- evaluation
- feedback
- optional report email after the participant submits it

## Retention

The starter uses a configurable KV TTL with a 30-day default.

Before public launch, choose and document the final beta retention window.

Do not copy sessions to logs, analytics, error monitoring, or webhook payloads
unless separately reviewed and disclosed.

## Public version

The public version should move toward privacy-minimal operation:

- browser-carried session state
- no default server retention
- no persistent learner profile
- detailed report sent only after explicit email submission
- separate optional consent for product research

## Human review

AIR may human-score a representative subset.

Escalate sessions for a blind second opinion when:

- automated and AIR verdicts materially disagree
- the result is borderline
- the architecture is unusual but plausibly defensible

Never use participant excerpts publicly without separate permission.
