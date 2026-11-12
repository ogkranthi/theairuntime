# FDE Coach evaluation corpus v1

PR B is stacked on PR A, `feat/fde-coach-conversation` at `3f8e6671ffcb894b2346523b3f20546a40678907`. It adds evaluation tooling and a held capture proposal, not a new application or active collection service. Application code, approved UI, security coordinator, runtime bindings, and learning content are unchanged from PR A.

## Implemented

- 40 authored synthetic cases in `eval/coach/cases.v1.json`: six each for Git/CI, APIs/data, AI agents/evals, security/reliability, and design/tradeoffs; five each for customer discovery and interviews.
- Each case has bounded background/context, a question, relevant canonical resource IDs, expected assertions/concept groups, prohibited claims, rubric version, a reference explanation, one follow-up question, and one practical task with definition of done. Every reference is pending human signoff. No real learner source is imported.
- Deterministic CI smoke uses the actual prompt/retrieval/output validators with reference fixtures and no provider. Negative tests cover unsupported claims, unknown URLs, misleading word coverage, approval/version/budget guards, privacy, and source provenance.
- A manually invoked provider runner uses only the approved preview chat API and its actual idempotent client. It cannot call a provider directly or bypass DO admission. It sends one scoped start, one background message and one scored question per case, reserves a conservative local upper budget of four attempts/case, makes no automatic retries, and stops on uncertainty or authored fallback.
- Matching dataset digest, prompt/retrieval versions, owner approval, private access, and resource isolation are required before execution. Batches are limited to at most ten cases and forty possible attempts, with a default of three/twelve. The server still enforces its shared 500-attempt pool and 12 starts/IP/hour; wait for an allowed window rather than bypassing them.
- Private provider artifacts are created exclusively under the temporary workspace with mode 0600 and no overwrite. They contain synthetic examples but no receipt tokens/keys. Redirects are refused. Metadata projection strips cached bodies, credentials, profile and session identifiers. Unknown model/usage/cost stays unknown until an owner projection is supplied.
- Explicit human reference review records are separate from fixtures and must match the exact digest/rubric. The checked-in review file is empty. Helpful feedback and LLM scores cannot supply signoff. Repository ownership/review establishes reviewer authority; validating a declared `source:human` record is not authentication or proof that review occurred.

## Current results

[Deterministic results](deterministic-results.json) are reproducible with:

```sh
npm run eval:coach:smoke
```

| Evidence | Result |
| --- | --- |
| Synthetic cases / categories | 40 / 7 |
| Structural/reference/prompt checks | 40 pass |
| Provider calls in smoke | 0 |
| Provider inference cost in smoke | 0; local compute is not measured |
| Reference keyword diagnostic | 1.0 mean; not a correctness score |
| Human reference approvals | 0 |
| Real provider quality/latency/usage/cost | NOT RUN / NOT MEASURED |
| Release qualification | false |

The reference keyword result only shows that authored reference text includes its expected terms. A regression explicitly proves that word stuffing can score 1.0 while correctness and release status remain unapproved. Pedagogy, safe uncertainty, FDE correctness, user value, and next-step quality all require human judgment. There is no learner score, certification, readiness percentage, or automatic promotion to gold.

## Validation

- `npm test`: 296 tests across 19 files, including the inherited actual SQLite security tests and five local D1 schema-mechanics tests.
- `npm run check:worker` and `npm run check --prefix learn` pass; Learn has zero errors/warnings and four existing hints.
- Focused evaluation/test TypeScript check passes. It temporarily extends `tsconfig.worker.json` with Node/Workers types and `include:["eval/coach/**/*.ts"]`; the temporary file is not committed.
- `npm run build` passes (root, Pagefind, Learn). Root and isolated-preview Wrangler dry runs pass without deployment.
- Relevant beta, legacy, and report browser regressions pass; no real providers or external requests are used. See [browser evidence](browser-evidence/browser-checks.json) and [legacy evidence](legacy-browser/browser-checks.json). Approved screenshots are inherited unchanged from [PR A](../coach-chat/EXAMPLES.md).
- `git diff --check` passes. Existing build notices and broad-root Astro limitations are unchanged; scoped checks pass.

[Provider runbook](RUNBOOK.md) documents exact guarded commands, owner-only metadata projection, and cost/signoff requirements. [Capture hold](CAPTURE_HOLD.md) documents the consent/privacy design and smallest proposed resource. No model result is invented to satisfy an unavailable preview gate.
