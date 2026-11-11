# Coach and Gym security hardening

This PR is a draft and must not merge until the atomic enforcement decision is
resolved. No production infrastructure or secrets were accessed or changed.

## Implemented

- Gym starts mint a random bearer capability separate from the session ID.
  Message, finish, report, and feedback operations authenticate against the
  canonical stored session. The capability travels in the existing session
  response; the feedback request now includes it too. It must stay private.
- Legacy Gym sessions without a capability or absolute expiry must restart.
  There is no adoption endpoint accepting just a historical session ID.
- Gym requires server storage even when the retired stateless development flag
  is present. Client transcripts, timing, evaluation, and consent cannot become
  canonical state when storage is missing.
- Retention has an absolute expiry, checked on every authenticated operation.
  Saving a session does not reset its lifetime. KV's minimum TTL can leave an
  expired record present briefly, but the application still refuses access.
- The server clock determines interview elapsed time. New messages stop after
  the configured 15 or 30 minutes, or 40 canonical candidate turns. Finishing
  remains available until retention expiry so users can retrieve their result.
- Coach tokens reject future issuance and the exact three-hour expiry boundary.
- Both request readers bound streamed UTF-8 bytes before buffering the whole
  request, including requests without Content-Length.
- Public Gym health exposes only unavailable, degraded, or unknown model status.
  This is isolate-local evidence, not a model probe or a fleet health guarantee.
  Public route catches no longer serialize arbitrary exception messages.

## Approval gate: smallest viable atomic enforcement

The current architecture has KV and Workers AI. KV does not have compare-and-swap
or atomic counters, and can return stale values. A KV read followed by a write
cannot prevent concurrent replay, duplicate AI calls, or cumulative quota bypass.
HMAC signatures prove token integrity; they do not prove a token is unused.

Proposed minimum: one SQLite-backed Durable Object class and binding for the
Coach/Gym security boundary. No D1 database, login system, UI, or agent framework
is needed. Include the class, binding, and migration in the same PR only after
approval. Applying that migration and deploying remain separately out of scope.

The object would:

1. Authoritatively store session IDs, absolute expiry, revisions, consumed turns,
   and operation reservations. Continue using KV for consented Gym retention and
   aggregate counters, never as the source of admission decisions.
2. Reserve a turn and AI attempt before external work. Reject an old revision,
   a concurrently reserved turn, and duplicate submissions. Persist reservations
   before calling the model so a process restart cannot spend the same budget
   twice. Never automatically retry uncertain external work.
3. Enforce explicit per-session, per-IP start, and shared daily Coach/Gym attempt
   limits. Count every physical model attempt, including fallbacks and failures.
   Token/output limits remain per call; an attempt quota is not a dollar quota.
4. Scope idempotency to a session and operation. Return a saved result for an
   exact retry, reject changed payloads with a reused key, and bound retention
   of idempotency records and abandoned reservations.
5. Fail closed for AI admission if atomic storage is unavailable, while retaining
   existing deterministic fallback behavior where possible.

One global object is the smallest coordinator for a shared daily budget at
current cohort scale. It adds a central availability dependency and throughput
limit; splitting session objects from a quota object can follow if needed.
The final limits and crash/retry policy must be stated in code and covered by
concurrent request and restart tests before this draft becomes ready.

## Residual risks while the gate is pending

- Coach signed state is still replayable, including concurrent replay. Its
  logical model counter does not enforce a cumulative session or daily budget.
- Gym authorized concurrent or stale submissions can still race through KV.
  Sequential completed finishes reuse evaluation, but concurrent finishes can
  duplicate AI work. Report retries can repeat delivery and subscription work.
- The Gym turn ceiling is checked against canonical state but is not atomic
  under concurrency. Start throttling and cumulative AI quotas remain incomplete.
- Anonymous capabilities grant access to whoever possesses them. They provide
  session authority, not identity, account recovery, or protection after token
  theft. No new authentication system was introduced.
- Existing Workers AI allowance and calls from unrelated AIR endpoints are not
  a quota mechanism for this security boundary.

## Validation

Regression tests cover capability checks on every Gym mutation/report path,
concurrent unauthorized requests, absolute expiry while KV retains a record,
client clock resets, forged client transcripts at the turn cap, retention not
sliding on writes, authorized degraded journeys, sequential duplicate finish,
coarse public health, future/exact-boundary Coach expiry, and streamed byte caps.
Existing token tampering and curriculum tests continue to run.

Authorized concurrent replay and duplicate AI/report work still need the atomic
implementation above and must not be reported as fixed by these tests.
