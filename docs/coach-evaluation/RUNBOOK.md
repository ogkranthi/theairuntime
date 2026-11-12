# Synthetic evaluation and release commands

## Offline default

```sh
npm ci
npm ci --prefix learn
npm run eval:coach:smoke
npm test
npm run check:worker
npm run check --prefix learn
npm run build
npx --yes wrangler@4.160.1 deploy --dry-run --outdir /tmp/air-evaluation-worker
```

The smoke suite and tests never call a paid/real model. Local D1 schema tests need loopback/Miniflare only, not a Cloudflare account. No D1 resource or binding is created remotely. The public deterministic artifact is synthetic-only and explicitly not model quality. For the additional test type check, temporarily extend the Worker tsconfig with Node/Workers types and `include:["eval/coach/**/*.ts"]`; remove the temporary config afterward.

## Human reference judgments

Read each case's background, expected assertions, prohibited claims, grounding, reference explanation and task. Check FDE-specific correctness, pedagogy, safe uncertainty, user value and next-step quality. Review all critical failures. To record a genuine owner/reviewer decision, add a version-bound entry to `eval/coach/reference-reviews.v1.json` containing caseId, source `human`, decision `approved` or `rejected`, reviewer, reviewedAt ISO time, and notes. The file's datasetDigest/rubric must match current fixtures. Submit those records for owner review; do not have a model or thumbs-up flow fill them automatically.

A structurally valid record is not proof of reviewer identity; repository access and owner PR review provide authority. Reference signoff also does not approve a new provider answer. Provider outputs need their own human review. No command automatically qualifies a release.

## Real inference is a separate owner gate

First complete [PR A's isolated preview plan](../coach-chat/RELEASE.md), including Workers Builds diagnosis, account permissions, separate KV/DO namespaces, private test access, external integration denial, model/cost review, and explicit preview deployment/inference approval. Do not use production hosts, bindings, secrets, or learner data. No such actions were performed in these drafts.

`eval/coach/approval.example.json` is deliberately false/invalid. Copy it to an owner-private temporary path and edit only after the owner approves the exact origin, cases digest, prompt/retrieval versions, expected model, isolation/private gate, expiry and budget. The URL/name check is not proof of account ownership; the owner must verify actual binding IDs and account isolation. Keep private Access headers in a separate mode-0600 file outside the repository, never in Codex/chat/GitHub.

After that approval, in the owner's terminal:

```sh
umask 077
cp eval/coach/approval.example.json /tmp/coach-approved-run.json
# Owner fills reviewed values, true approvals and an actual short-lived expiry.
# /tmp/coach-access.json contains only cf-access-client-id and cf-access-client-secret.
node scripts/evaluate-coach.mjs provider --allow-provider --approval /tmp/coach-approved-run.json --access-headers /tmp/coach-access.json --start 0 --count 3 --attempt-budget 12 --out /tmp/coach-run-001.json
```

The runner checks matching health/versions, AI/enforcement enabled, and capture disabled before sending one scoped start and two messages per case. It reuses the actual immutable client and HTTP API, so every physical call still needs DO admission. It refuses redirects, public output paths and overwriting existing artifacts. On unknown outcome or authored fallback it stops, without an automatic retry, replacement key or new case. Lost in-memory receipts may prevent process-level recovery; preserve spent usage and investigate rather than rerunning blindly.

Default three-case batches reserve an upper bound of twelve attempts. A batch is never more than ten cases/forty possible attempts and cannot exceed owner approval. The real 12-start/IP/hour and 500-attempt shared daily limits still apply. Forty cases need separate allowed batches/windows; do not change IP/scope, reset counters, raise limits, or create namespaces to evade them. Other Coach/Gym activity shares the budget. Actual neuron/token/dollar costs can differ and other account AI consumers remain outside that pool.

Provider artifacts remain private under the temporary directory with mode 0600. The report records expected model, prompt/retrieval versions, case IDs, client wall latency, response heuristics and unknown fields. Actual model, attempts, tokens and cost initially remain null; a configured model name is not evidence of which primary/fallback actually ran. No tokens/keys or receipt credentials are written to the report.

## Owner-only metadata projection

The app deliberately does not expose server telemetry publicly. Read only the isolated synthetic preview's replay namespace using owner permissions, within its one-hour retention window. Never run this procedure against production or consented private examples.

The following proposed read commands were syntax-checked through local Wrangler help, not executed against an account:

```sh
umask 077
node scripts/check-coach-preview.mjs preview/coach-chat.wrangler.toml
npx --yes wrangler@4.160.1 kv key list --config preview/coach-chat.wrangler.toml --binding FDE_GYM_SESSIONS --prefix security:result: --remote > /tmp/coach-preview-keys.json
```

Verify the JSON array and approved namespace. For each returned key, read its value with `wrangler kv key get KEY --text --remote --config preview/coach-chat.wrangler.toml --binding FDE_GYM_SESSIONS`. Build a private JSON array of `{key, value}` records in `/tmp/coach-preview-cache.json` with mode 0600. Use argument arrays/owner tooling rather than interpolating keys into shell commands. Do not print/cache bodies to a shared terminal, logs or repository. This intermediate export can contain synthetic state and credentials and must be deleted after projection.

```sh
node scripts/evaluate-coach.mjs projection --run /tmp/coach-run-001.json --kv-export /tmp/coach-preview-cache.json --out /tmp/coach-metadata-001.json
node scripts/evaluate-coach.mjs report --run /tmp/coach-run-001.json --telemetry /tmp/coach-metadata-001.json --out /tmp/coach-reviewed-report-001.json
```

Projection matches a private hash of the synthetic session, uses the context/scored turn metadata, and emits only an allowlisted projection. Cached bodies, profile, tokens, keys and session IDs are excluded. Missing/ambiguous records stay unknown; they must not trigger regeneration of a completed model answer. Exact version/digest checks refuse arbitrary/private run imports. Eventual KV visibility or expiry can leave a run incomplete.

Actual primary/fallback IDs and known token counts come from the owner projection. Token/usage completeness is explicit. Cost stays null unless the owner supplies a nonnegative `costUsd`, `costSource:"owner-reviewed-billing-or-priced-usage"`, and complete usage for the two turns. The result calls this an **owner-provided estimate**, not verified account billing. Review current model-specific pricing/neuron conversion and account charges, including unreported/failed calls and non-inference costs; never infer a precise cost from missing usage. Do not set zero merely because fields are missing.

These results are diagnostics, not model approval. All five human dimensions and release qualification remain pending/false. Publish only owner-reviewed synthetic outputs, if explicitly approved. A real learner's consent to private improvement does not authorize public GitHub examples or training.

## Current release status

- Forty synthetic structural cases pass; provider calls are zero in checked-in evidence.
- No measured model quality, latency, token use or cost is claimed. Candidate primary/fallback availability and known failures need real private preview review.
- Physical Android/iOS/Safari/screen-reader tests remain outstanding where hardware is available.
- D1/capture is held under [the privacy/resource proposal](CAPTURE_HOLD.md). Local schema tests are not a working signed-consent or deletion API.
- No production merge, deployment, resource provisioning, feature enablement, private-data collection, or public beta announcement is authorized by these commands. Keep both drafts stacked for owner review and preserve coordinator migration history and spent reservations on any later rollback.
