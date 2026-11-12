# Private contribution capture: held for owner approval

**No D1 resource, production/preview D1 binding, capture endpoint, share control, or retention/deletion job is enabled.** `captureEnabled:false` remains hard-coded. An arbitrary client-submitted answer, even with `consent:true`, receives 404 and is not retained. The user journey never presents a nonfunctional share button.

`eval/coach/capture-proposal.sql` is a schema proposal only, tested using a local Miniflare D1 database. It has three tables: contributed_examples, reviews, evaluation_runs. This is not a migration in a deployed path and is not loaded by the Worker. No account provisioning or data collection occurred.

## Required consent and provenance before implementation

A future implementation must be separately approved and reviewed. On a completed **AI** answer, and only while configured, it could offer: **Share this exchange to help improve FDE Coach**. The preview must show the exact selected question, assistant response components, resource IDs, optional helpful/incorrect label, and proposed redactions. The learner explicitly consents per exchange. No defaults, background opt-in, whole transcript, profile/history attachment, newsletter consent, or Gym research consent may be reused.

Before writing, the server must verify a short-lived domain-separated signed receipt for the actual completed session/turn and canonical question/response hashes. The receipt must be bound to the existing response and private client authority; client-provided prose, a public session ID, a guessed key, or an arbitrary “AI answer” is not proof. Use the existing signing secret with a separate purpose, not a new model key. Keep the receipt short-lived (proposed 15 minutes), immutable, private, and out of URLs/logs. Store only exchange hashes, not reusable session credentials. Redaction/preview transformations must be explicitly matched to the verified original so an edit cannot silently substitute a fabricated answer as gold.

Capture must apply sensitive/confidential-content filtering and allow only the explicitly previewed/redacted fields. Automated filtering is not comprehensive DLP. Deny unsafe material and require review rather than claiming complete anonymization. All private quality examples need owner redaction/review before any private evaluation promotion. Helpful feedback is a label, never correctness, human signoff, publication permission, or permission to train models.

## Smallest proposed resource and permissions

One optional `COACH_EVAL` D1 database/binding in the existing Worker, after owner resource/cost/privacy approval. No new service, app, account system, dashboard, vector store, or agent framework. The current code contains no such binding and cannot write this database.

Anonymous contributions would use a cryptographically random private deletion receipt whose hash is stored. A delete request would remove that exchange and cascade its reviews, without authorizing access to other exchanges. No public list/read/review API should exist. Owner review/export access must use existing Cloudflare account permissions or an approved owner-only access gate, not learner bearer receipts. No new admin authentication is implemented here.

The proposal bounds fields and enforces explicit consent, one exchange hash, a separate deletion hash, a consent version, and a maximum seven-day active retention window. This seven-day value is a proposal, not an accepted privacy policy. A future indexed expiry sweep and deletion API must be implemented/tested before collection. Active-row deletion is not proof of erasure from Cloudflare backups/Time Travel; owner review must address platform retention, user notices and deletion rights. Loss of an anonymous deletion receipt also needs a lawful owner process; no account recovery is invented.

Only selected Q/A text belongs in contributed_examples. There are no columns for full transcript, profile, newsletter consent, reusable tokens, or model prompt cache. Reviews are owner decisions with rubric/version/notes. Evaluation runs store metadata, not raw conversation dumps. Private examples must never enter public GitHub, public analytics, logs, training datasets, or public examples without a separately explicit lawful basis/permission.

## Local tests and their limits

Local D1 tests prove schema constraints, chosen synthetic Q/A fields, deletion-hash isolation and review cascade, expiry deletion, and that helpfulness leaves review pending. Values/hashes in tests are synthetic fixtures, not production receipt generators. These tests do **not** implement or prove signed exchange verification, real redaction, owner authorization, capture admission limits, receipt delivery, backup erasure, or an operational retention/deletion service. Those remain mandatory implementation gates.

Application tests independently verify capture off, no binding, no share control, and refusal of arbitrary opt-in answer submissions. The only runtime text retention remains PR A's documented short-lived replay cache, not this proposed evaluation store.

## Resource/cost approval needed

Before provisioning anything, approve:

1. One isolated nonproduction D1 database for a later capture implementation and its eventual production counterpart, with no shared production data during tests.
2. Exact consent wording, chosen fields/redaction, seven-day retention or a revised policy, receipt expiry, deletion/backup handling, owner-only review access, publication/training prohibition, and adult pilot scope.
3. Verified completed-exchange receipts, duplicate/write admission and abuse limits, privacy-negative tests, owner review and a real isolated D1 preview test before collection.
4. Current Cloudflare D1 read/write/storage pricing and account limits. Model attempts and D1 writes are distinct costs; no KV counter or model budget is claimed as an atomic capture-write quota.

For planning only: 20 synthetic/consenting pilot exchanges per day retained for seven days imply about 140 active examples. At roughly 5-6 KB of ASCII text/metadata per example that is under 1 MB before indexes/reviews; Unicode, backups, and actual capture frequency can increase it. A high-frequency 500-answer day could imply thousands of retained rows, so do not treat the illustrative estimate as a hard storage or dollar cap. No D1 billing was measured and no fixed cost promise is made. Review official current D1 pricing before approval.

Do not run `wrangler d1 create`, add a live binding, apply this SQL remotely, expose a share button, or collect learner text as part of this draft. Resource approval alone is not approval to ship an incomplete capture pipeline. After approval, implement the verified consent/capture/deletion flow as its own reviewed change before provisioning/release.
