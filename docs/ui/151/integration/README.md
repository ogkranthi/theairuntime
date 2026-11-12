# Coach UI and security integration

Branch: `feat/integrate-coach-security`.

Combined review inputs:

- Security PR #150: `6adbadc1c635efc1947be74f2058c6581af3a8ec`.
- Approved UI PR #152: `3323d354602ae8579d7a62ef1a5e3a5db7cee13a`.
- Implementation specification: [SECURITY_INTEGRATION.md](../SECURITY_INTEGRATION.md).

The branch starts from #150 and incorporates #152's approved UI. Neither original draft branch was changed. This is a combined draft for review, not a merge or deployment authorization.

## Implementation

Each chat owns a separate `createCoachClient()` instance. One unresolved operation holds its exact serialized body, cryptographically random idempotency key, and private start scope in memory. The client does not evict pending operations, submit a changed payload, or automatically retry. Different conversations have independent scopes. A double submission is blocked in both the React component and transport.

Successful HTTP status alone does not retire request identity. The transport validates the signed-token envelope, stage, parts, flags, and completion summary. The component applies the validated reply only to its current generation, then acknowledges it. Malformed success, lost responses, pending 409, missing-result 503, timeout, and abort retain the original identity for deliberate retry. A recovered response is applied once without adding another learner bubble.

The 20-second deadline now covers response headers, body reading, and validation. Cancellation is raced explicitly, so a stalled body or a fetch implementation that ignores AbortSignal cannot leave the UI waiting indefinitely. Aborting the browser does not cancel server work, refund attempts, renew the 120-second reservation, or authorize a replacement operation.

Explicit New chat aborts the current browser request, abandons that client, fences old continuations, and creates a fresh conversation client. If a lesson request is unresolved, its existing native confirmation explains that server work may finish and reserved usage remains spent. Declining confirmation keeps the pending operation. A reset during health preflight cannot start an abandoned session.

403, 400, 413, and 429 errors retain course/restart controls but disable answer submission and the generic Retry action. A 409 keeps only exact-request recovery available because the current backend has coarse text rather than stable machine error codes. The server can still require explicit restart; a new key is never used to bypass stale revisions, expired reservations, or uncertain outcomes. No automatic restart or quota evasion is implemented.

Health is requested only on explicit lesson selection. Token, KV, and security binding configuration must all be present before the start call. Binding flags are hints, not a substitute for authoritative admission. Missing enforcement fails closed; curated guidance and written courses remain available. General questions and the three starter journeys remain local authored guidance.

## Preserved boundaries

- Approved styling, illustration, branding, page routes, learning data/content, and original Commons homepage match #152. The only product changes are request/recovery wiring and the specified reset/error controls. Original screenshots remain the approved review artifacts.
- Coach/Gym server code, the SQLite coordinator/boundary, shared Worker behavior, quotas, report delivery logic, and Wrangler configuration match #150. The existing `client-retry.test.ts` fixtures now contain complete valid Coach replies so stricter response validation can be exercised without weakening its assertions.
- Existing server limits remain: shared 500 AI attempts/day, Coach 14 attempts/session, Gym 82, two physical model slots/operation, Coach 12 turns, Gym 40 turns, shared starts 200/day and 12/IP/hour, and a 120-second nonrenewable reservation. Fallback calls remain charged separately by the server.
- No additional infrastructure, database, service, framework, binding, migration, login, production secret, or model endpoint was introduced. The inherited #150 SQLite binding/migration still needs separately approved deployment. It has not been applied to Cloudflare.
- Gym report behavior remains at-most-once application initiation. Provider acceptance is not inbox delivery; uncertainty does not display success.

## Final validation

| Check | Result |
| --- | --- |
| `npm test` | PASS: 210 tests in 13 files |
| `npm run check:worker` | PASS |
| `npm run check --prefix learn` | PASS: 0 errors, 0 warnings, 4 existing hints |
| Focused TypeScript check for new client/integration tests | PASS |
| `npm run build` | PASS: root Astro, Pagefind, Learn; 42 root and 148 Learn pages |
| `npx --yes wrangler@4.160.1 deploy --dry-run --outdir /tmp/air-int-worker` | PASS: bundle and inherited binding/migration configuration only |
| Hardened rendered Coach regression | PASS: 33 checks, including a real 20-second body timeout |
| `npm run test:report-status` | PASS: 9 rendered report scenarios |
| `git diff --check` | PASS |

No final required check failed. Existing dependency/build notices remain. The broader repository Astro check is not a clean gate: prior UI review documents cross-project collection/type diagnostics on main. Scoped Learn, Worker, and the additional client/test TypeScript checks pass on this combined branch.

### Evidence and reproduction

Run `npm ci` and `npm ci --prefix learn`, then the commands above. Existing dependencies only. Local SQLite/workerd and Chromium tests need loopback permission in a restricted sandbox. They do not require Cloudflare credentials.

The [machine-readable rendered results](browser-checks.json) come from:

```sh
AIR_COACH_ARTIFACT_DIR=docs/ui/151/integration AIR_COACH_SKIP_SCREENSHOTS=1 node scripts/test-fde-coach-ui.mjs
```

The browser serves built Astro/React pages and the actual hardened Coach handler. A real local Miniflare SQLite Durable Object performs admission and replay; consent-free authored lesson output is used with no AI binding. KV is an in-memory test adapter. Explicit fixtures interrupt HTTP delivery, stall a response body, inject malformed success, or return terminal 403/429. Reset confirmation choices are simulated at the browser's `window.confirm` boundary; the production native confirmation is unchanged. No learner/model/provider data, production resources, or external requests are used. Mobile dimensions use a 0.01px floating-point tolerance for 44px control bounds. Physical iOS/Android, Safari, native modal rendering, and screen-reader devices remain unverified.

`src/security/coach-client.integration.test.ts` connects the actual client to the hardened handler and real local SQLite coordinator. It proves committed start recovery across IP changes; cross-client key collision isolation; message recovery after lost/malformed response with one AI attempt; duplicate-request fencing; saved-result KV unavailability and recovery; lease/session expiry; and unavailable enforcement. Model calls are spies. The inherited coordinator/boundary tests also cover provider fallback accounting, durable runtime restart, final concurrent quota/turn admission, invalid starts, and uncertain report delivery.

`learn/src/components/coach/api.test.ts` adds header/body identity, validation-before-acknowledgement, malformed completion, changed pending payload, terminal status, simultaneous submission, pre-abort, external abort, stalled headers/body, late abandoned replies, client scope reset, and coarse health coverage. Fake timers cover the deadline independently of the real browser timeout test.

To reproduce the focused test type check, temporarily write `tsconfig.coach-integration-check.json` at the repository root:

```json
{"extends":"./tsconfig.worker.json","compilerOptions":{"types":["@cloudflare/workers-types","node"]},"include":["src/security/coach-client.integration.test.ts","learn/src/components/coach/api.test.ts"]}
```

Run `npx tsc --noEmit -p tsconfig.coach-integration-check.json`, then remove that temporary file. No committed check configuration was broadened.

## Remaining limits and release boundary

This branch provides no account identity, persistent history, cross-tab recovery, or open-ended personalized AI. Losing in-memory receipts can require restart. Repeated exact requests can still incur Worker/DO read cost. Quotas count attempts, not dollar/neuron/token cost, and cover Coach/Gym only; FDE Path, Ask the Library, other Workers, and other account consumers remain outside that boundary. KV visibility, runtime availability, and provider-internal duplication have the same limitations described in [the inherited security runbook](../../../security/COACH_GYM_HARDENING.md).

No merge, deployment, provisioning, production API request, live binding change, or secret change occurred. Before any separately approved release, follow #150's isolated preview and deployment requirements. Preserve its class export, binding/object identity, migration history, and spent reservations during rollback. Reverting to pre-hardening code or resetting coordinator state restores risks and is not a safe rollback.
