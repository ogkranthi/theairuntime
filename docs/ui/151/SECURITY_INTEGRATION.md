# Coach client integration with draft PR #150

Reviewed against PR #150 head `6adbadc1c635efc1947be74f2058c6581af3a8ec`. This is an integration specification, not an implementation or a deployment approval. The UI transport and security backend remain on their separate branches.

## Current compatibility gap

PR #152's `learn/src/components/coach/api.ts` sends only `content-type` for POSTs. `FdeCoach.tsx` retains failed answer bodies and tokens for manual retry, but neither the transport nor the component supplies a request key or private start scope. Its 20-second timer covers `fetch()` until response headers, not the subsequent JSON body read. Its generation fence prevents an abandoned response from changing a new conversation, but cannot cancel server execution.

PR #150's Coach transport supplies stable `Idempotency-Key` and `X-Session-Client` headers using in-memory state, but does not provide #152's AbortSignal/timeout support. Both PRs change the same API file. Neither file should win a merge conflict wholesale. The new UI is not compatible with the hardened POST contract unchanged; it would receive validation failures. No claim is made that manual retry on main has server-side idempotency.

General-question guidance stays entirely local and should remain independent of either API. Do not add a model endpoint, remove server admission, substitute unsigned state, or relax header validation to make the UI work.

## Required request contract

| Operation | Payload and authority | Required client changes |
| --- | --- | --- |
| `GET /api/coach/health` | Existing coarse configuration status. No credentials in query strings. | Check `tokenConfigured`, `countersConfigured`, and `securityConfigured` when the learner explicitly starts the hardened lesson; do not add requests to local starter actions. These are configuration hints, not proof that admission will succeed. Keep courses available when health or admission is unavailable. |
| `POST /api/coach/start` | Existing `{}` default lesson, or validated `lessonId`. | Supply a cryptographically random `Idempotency-Key` (16-128 letters, digits, `_`, `-`) and independent private `X-Session-Client` (32-128 of the same characters). PR #150 uses one UUID for the key and two concatenated UUIDs for the scope. Retain both and the exact payload for retry. |
| `POST /api/coach/message` | Signed token with server session ID/revision, answer, and original `stageTurns`. Treat token as opaque bearer authority. | Supply a fresh key for a new logical answer. Retain the key, token, and exact serialized body until a valid response is applied or the learner explicitly abandons the session. A retry uses the same values, including JSON property order. |

Start replay identity includes the application, private client scope, and request key. Different clients using the same key must receive different credentials; a retry from the same client may change IP address. An IP address, a shared static key, or a user-visible session ID is not a client scope. The private scope and key together are a bearer start receipt, not authentication.

Keep scope, keys, signed tokens, and pending bodies in page memory. Do not put them in URLs, logs, analytics, shared browser storage, or visible error messages. No new login, cookie, secret, service, or infrastructure is needed.

## Pending operation lifecycle

1. Capture one immutable pending operation before sending it: action, serialized payload, key, private start scope where applicable, and UI generation. Generate the identity once, outside any per-attempt fetch helper.
2. Disable concurrent answer submission and input editing while that operation is unresolved. Keep the existing learner bubble on manual retry rather than appending another one.
3. Preserve identity through connection failures, client aborts, timeouts, unreadable responses, and recoverable 409/503 responses. Do not generate a replacement key to get past a pending operation or stale revision. The server fingerprints parsed JSON with property order preserved.
4. Validate a successful response before retiring its pending identity. Apply its next token and stage once to the matching UI generation. A 2xx response with missing/unreadable token or lesson data is not proof that the operation failed or that a fresh key is safe. PR #150's API helper currently discards keys on HTTP success before component validation; reconcile this behavior during integration.
5. A successful new answer gets a new key. An exact retry gets the old key. A canceled browser request can still finish on the server and spend its reserved usage.
6. Explicit New chat/restart must abandon the old UI generation and use a fresh start operation. Clear or replace the abandoned pending start identity and private scope deliberately. Simply copying #150's module-level pending map can otherwise replay an old unresolved `{}` start after #152 resets the transcript. Do not silently convert an uncertain request into a new start. Explain that an abandoned session's work/quota may remain spent.
7. Losing in-memory credentials through reload can prevent replay recovery. Do not invent cross-tab history, recover sessions from public IDs, or adopt legacy tokens.

## Timeout and failure handling

Keep model execution outside the client and Durable Object. The server reservation is 120 seconds, with no renewal or takeover; the client cannot extend it. A 20-second UI timeout is a responsiveness choice, not an execution deadline or quota refund. During integration, bound the whole response lifecycle, including JSON body reading/validation, and combine timeout with the existing AbortSignal and generation fence. Do not re-enable the composer for a new answer while a timed-out operation is unresolved.

Manual exact retries may recover a saved result or receive a pending response. Avoid immediate automatic retry loops; they create traffic without granting execution. A retry after the lease can require restart, even if the original provider eventually completes. Preserve pending metadata rather than evicting an unresolved operation from a generic request cache.

| Result | Client handling to implement |
| --- | --- |
| Valid committed/replayed response | Apply the saved response once. Advance only to its signed next token. |
| 400/413 validation rejection | Show the coarse validation error. Only a definite pre-admission rejection permits correcting a start payload as a new logical operation. Never mutate an uncertain retry. |
| 403 invalid/expired authority | Stop mutation, retain written learning links, and offer explicit restart. No unsigned fallback. |
| 409 pending or recoverable original request | Keep the exact original key/body/scope for deliberate retry. Do not submit a different answer or fresh key. |
| 409 stale revision, changed payload, uncertain outcome, or expired reservation | Do not infer success or bypass the block. Offer explicit restart when the server requires it. The draft exposes coarse text, not stable machine error codes; status 409 alone is insufficient to classify recovery. |
| 429 session/shared/start usage limit | Explain that the limit was reached. Do not rotate scope/key or automatically start another session to evade it. |
| 503 unavailable enforcement or saved KV result | Keep the operation identity if one was sent. Retry only the same request where appropriate. Static/curated learning remains available; the client must never invoke AI directly. |
| Timeout, abort, lost response, or malformed 2xx | Treat the server outcome as unknown. Preserve the original identity and offer safe exact retry or explicit abandonment. Never display completion solely from HTTP success. |

The server enforces revisions, deadlines, quotas, attempt accounting, and replay rules. Client controls are usability and recovery aids, not substitutes for those guarantees.

## Integration verification required before combining the PRs

- Actual hardened handler accepts the correct headers and rejects missing/invalid ones without charging a start.
- Two isolated clients with identical key/body/IP receive different credentials; each exact retry recovers only its own start, including after an IP change.
- Simultaneous clicks send one logical operation; duplicate wire requests use one identity. Same-key changed payload is rejected. A stale token cannot advance state.
- Lost start/message responses, delayed response bodies, 20-second timeouts, external aborts, malformed 2xx, pending 409, and saved-result 503 retain the original body/key/scope. UI applies a recovered result once.
- New chat during a pending start or answer cannot replay that session into the new transcript. Its late response is ignored; restart is explicit and uses fresh private metadata.
- A request crossing the 120-second lease or session expiry stops safely. New keys cannot bypass the server block. Missing enforcement preserves curated guidance and course links, without an AI call.
- Validate the combined transport against PR #150's real SQLite-backed concurrency/failure tests, not only fetch stubs or the main-branch written-lesson harness used for #152.
- Gym/report code remains unchanged by #152. Preserve #150's separate at-most-once report slot and explicit provider-acceptance status; uncertain delivery must never become a success message.

## Reviewed sources

Pinned to the reviewed security commit:

- [Coach transport](https://github.com/ogkranthi/theairuntime/blob/6adbadc1c635efc1947be74f2058c6581af3a8ec/learn/src/components/coach/api.ts)
- [Admission boundary and header validation](https://github.com/ogkranthi/theairuntime/blob/6adbadc1c635efc1947be74f2058c6581af3a8ec/src/security/boundary.ts)
- [Coordinator revisions, leases, and replay](https://github.com/ogkranthi/theairuntime/blob/6adbadc1c635efc1947be74f2058c6581af3a8ec/src/security/coordinator.ts)
- [Security runbook](https://github.com/ogkranthi/theairuntime/blob/6adbadc1c635efc1947be74f2058c6581af3a8ec/docs/security/COACH_GYM_HARDENING.md)
- [Client retry regression tests](https://github.com/ogkranthi/theairuntime/blob/6adbadc1c635efc1947be74f2058c6581af3a8ec/src/security/client-retry.test.ts)
