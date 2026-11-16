# Optional selected coaching research

PR C stacks on accounts #161 and observability #162, ultimately unmerged release #157. No #159/#160 changes are included. This code is off by default and has collected no real learner records. Public fixtures and screenshots are synthetic only.

## Consent and learner controls

Signing in authorizes ordinary account functionality: profile, goals, saved conversations and next steps. It does not enable research. The research checkbox starts unchecked, and enabling it alone copies nothing. After opting in, the learner separately previews and contributes an exchange. The preview shows the question, original response with privacy redactions, goal and necessary recent context. It explains included versions, sources, timestamps, feedback and explicit outcomes.

Research participation does not change free usage, shared physical model budgets, newsletter subscriptions, Gym research, publication permission or training permission. Publication and training are not implemented. The API rejects extra fields claiming those permissions and always reports them false. No learner conversation is automatically published or used to train a model.

Research consent has a versioned record and a fresh epoch/participant reference after withdrawal and re-enrollment. A current consent version is required to opt in. Withdrawal works even with an old policy version or while new capture is paused. Research records are pseudonymous, not anonymous. Neither redaction nor removing email addresses guarantees anonymity.

Every learner endpoint verifies Clerk identity again and scopes reads/writes to the derived account owner. No client user ID selects data. Consent epoch and account-generation checks are repeated inside the atomic D1 contribution batch. Withdrawal racing collection cannot leave a copy behind. Conflicting idempotency keys roll back the batch; repeated selection does not create duplicate examples or orphan rows.

Withdraw deletes owned examples, reviews and dataset memberships in a D1 trigger transaction. Account deletion performs the same cascade independently of the capture flag. Ordinary account history remains after research-only withdrawal. Export includes owned account and research records. Another user's IDs cannot retrieve a preview, contribute an exchange or expose records in export. There is no learner-accessible review or promotion API.

## Private data model and retention

All tables are in the one approved private COACH_DB database, not a public content collection. Cloudflare D1 does not provide application row-level security: the authenticated Worker enforces owner scope, and Cloudflare account permissions restrict direct database access. Never provide D1 credentials to learners. Keep reviewer access to minimized private exports; do not grant broad D1 access casually. Only designated data administrators may operate snapshot/review SQL.

Learner exports stream bounded D1 pages rather than materializing all records in Worker memory. The browser downloads the native response blob without parsing/re-encoding the archive. The chat resumes its most recent 40 retained replies; the export still includes all retained history. Research settings return contribution summaries rather than full research text. Exports are canceled on sign-out or identity change, and new authenticated actions are bound to the initiating Clerk session. Data export/deletion and research withdrawal remain available during a quota-service outage; AI still fails closed. Exports are live reads, not a transactional point-in-time snapshot, and abort if the account is deleted during paging. Very large archives remain subject to Cloudflare query/CPU limits, browser storage and a 60-second client timeout; validate the intended account plan and provide operator-assisted export for archives exceeding those limits. Scientific comparisons use the separate short-lived consent-filtered snapshot workflow.

- coach_research_consent stores the choice, policy version, random participant reference and consent epoch.
- coach_research_links is the restricted account-to-example mapping. Research payloads contain no Clerk subject, email, account ID, conversation ID, operation ID or session credential.
- coach_research_examples stores the selected question/context, goal/category, original response, model/prompt/retrieval versions, curriculum source IDs, explicit feedback/outcome, timestamps, known usage/latency and redaction version.
- coach_research_reviews keeps human corrections and reference answers separately from the original response, expected assertions, teaching criteria, error categories, technical/coaching ratings and reviewer/version references.
- coach_research_dataset_versions records private version membership and review digest. Withdrawal/deletion cascades through it.

Pending copies expire after 30 days. Human-approved review extends expiry to at most 180 days from original contribution. Reads and snapshots exclude expired rows immediately. The existing prepared hourly maintenance handler removes expired rows in bounded batches; its trigger must be configured before release. Ordinary account conversations have their separate 90-day inactivity window. Research context captures earlier questions that were shown in the selected preview. Later questions or outcomes enter research only through another explicit selection; there is no ongoing automatic capture.

Redaction removes common email/contact patterns, credentials, JWTs, URLs and IP addresses. It cannot reliably identify names, companies, customer details or contextual identifiers. Human privacy approval is mandatory before promotion. Original response means the response before technical correction, with privacy redactions explicitly retained. The ordinary private account copy may retain the original text until its own expiry/deletion.

Cloudflare backups/Time Travel have separate provider retention and cannot be represented as instantaneous physical erasure. Before making a restored database accessible, reconcile withdrawals/deletions and expired data. The owner must approve a restricted deletion-audit and restore procedure. Private exports are copies: D1 withdrawal cannot erase a downloaded file automatically. Keep them in an encrypted, access-controlled temporary directory, register membership, reconcile withdrawals before every evaluation, and purge files. Never put learner exports, SQL review files, model runs or private datasets in any Git checkout or public artifact store.

## Working operator pipeline

scripts/coach-research.mjs is an executable private workflow, not a public review dashboard. It performs no model training, publishing, provisioning or automatic production writes. Remote snapshot access requires an explicit --remote --confirm-private-access pair and the operator's existing scoped Cloudflare authorization. Remote commands below are instructions for a separately approved operator session, not actions performed in this PR.

The output guard refuses Git worktrees, symlink parents/final files and overwrites; generated files use mode 0600. Prepare a private encrypted directory outside all repositories, with directory mode 0700. Example commands use /private/coach-review as a placeholder:

```sh
umask 077
# Owner-operated, after resource/access approval:
node scripts/coach-research.mjs snapshot --config /private/approved-worker.toml --remote --confirm-private-access --out /private/coach-review/pending.json
# A snapshot is consent-filtered, limited to 200 examples and valid for 15 minutes.
# Use --after <last-example-id> for another bounded page.

# If human privacy review finds identifiers missed by automatic redaction:
node scripts/coach-research.mjs redact --input /private/coach-review/pending.json --id <example-id> --redaction /private/coach-review/redaction.json --out /private/coach-review/redaction.sql
npx wrangler@4.160.1 d1 execute COACH_DB --remote --config /private/approved-worker.toml --file /private/coach-review/redaction.sql
# Fetch a fresh snapshot after applying privacy changes, before technical review.

# Human writes a private review JSON after examining de-identification and correctness.
node scripts/coach-research.mjs review --input /private/coach-review/pending.json --id <example-id> --review /private/coach-review/review.json --out /private/coach-review/review.sql
# Review SQL is one consent/expiry-guarded statement. D1 triggers atomically update review state/retention.
npx wrangler@4.160.1 d1 execute COACH_DB --remote --config /private/approved-worker.toml --file /private/coach-review/review.sql

# Fetch current approved state after review; a stale or withdrawn snapshot cannot be promoted.
node scripts/coach-research.mjs snapshot --config /private/approved-worker.toml --remote --confirm-private-access --out /private/coach-review/reviewed.json
node scripts/coach-research.mjs promote --input /private/coach-review/reviewed.json --version coach-private-v1 --membership-sql /private/coach-review/membership.sql --out /private/coach-review/dataset.json
npx wrangler@4.160.1 d1 execute COACH_DB --remote --config /private/approved-worker.toml --file /private/coach-review/membership.sql
# Verify membership count equals the exported case count before using the dataset.

# Acquire a fresh snapshot again before comparing runs; withdrawn or changed reviews invalidate comparisons.
node scripts/coach-research.mjs compare --dataset /private/coach-review/dataset.json --consent-snapshot /private/coach-review/fresh.json --run /private/coach-review/model-a.json --run /private/coach-review/model-b.json --out /private/coach-review/comparison.json
node scripts/coach-research.mjs purge-files --dir /private/coach-review
```

The operator must choose only reviewed cases for promotion; the tool rejects a batch containing pending cases. Use a bounded private snapshot selection retaining its timestamp/schema. A human review JSON contains:

```json
{
  "schema": "private-coach-human-review-v1",
  "expiresAt": 0,
  "privacyApproved": true,
  "promotionApproved": true,
  "reviewerRef": "reviewer-private-reference",
  "evaluationVersion": "coach-review-v1",
  "correction": "A human correction, separate from the original response.",
  "referenceAnswer": "A reviewed reference answer.",
  "expectedAssertions": ["An expected technical assertion"],
  "teachingCriteria": ["One focused question", "One practical next step"],
  "errorCategories": ["unsupported_claim"],
  "technicalAccuracy": 3,
  "coachingQuality": 3
}
```

Replace expiresAt=0 with a timestamp no later than snapshot.validUntil; the placeholder is deliberately rejected. Review approvals are accountable human assertions under restricted operator access, not scientific certification. Correct reference answers, assertions and teaching criteria are required. Ratings are 0-4. Reviewers must not use names/emails as reviewer references.

Privacy redaction JSON uses schema=private-coach-redaction-v1, a finite expiresAt no later than the snapshot validity, privacyOnly=true, reviewerRef, question, context, learningGoal and originalResponse. This operation is for privacy edits only. It records the reviewer/version in the research payload and invalidates prior reviews and dataset memberships atomically, forcing a fresh review. It does not put technical corrections into the original response field. Human privacy edits cannot mechanically prove unchanged technical meaning; accountable human review remains required.

The comparison input is a private-coach-run-v1 JSON object with a finite expiresAt no later than the dataset expiry, datasetDigest, model, promptVersion, retrievalVersion and one result per case. Results carry id, answer, sourceIds, latencyMs, tokens, costUsd (null when unknown), errorCategory and optional humanReview ratings for technical accuracy, teaching effectiveness and grounding accuracy. Human run reviewers use a reviewer- reference. Model/prompt variants must use the same case digest. The pipeline never silently calls a provider with private learner data. Any future model runner needs separate bounded authorization and the approved inference/privacy controls.

Automated assertion matching and source-ID overlap are provisional diagnostics. They do not establish technical accuracy, entailment, absence of hallucinations, causal learning improvement or teaching effectiveness. Human run review is recorded separately. Unknown costs remain incomplete. No real-model benchmark result is claimed by synthetic fixtures. The existing 40 synthetic cases and their pending human-gold status are unchanged and remain a separate baseline identified by digest.

Portable snapshots, reviews, SQL sidecars, datasets, runs and comparisons have expiration markers. The purge-files command removes expired generated artifacts in a chosen private directory, without recursion or deleting unrelated files. Configure an operator-side sweep and immediate deletion on withdrawal; do not rely on the command being run manually once. Export validity is at most 15 minutes, but files can outlive validity until purged. Fresh snapshots reduce stale-consent use; they cannot revoke a file already copied elsewhere. This limitation is an explicit release gate for real research data.

## Configuration, cost and verification

Apply 0003_research.sql before enabling account data controls in this release. PUBLIC_FDE_COACH_RESEARCH_ENABLED enables the subordinate UI; FDE_COACH_RESEARCH_ENABLED=true permits new opt-ins and contributions. Defaults are false. With capture paused, existing consent/export/withdraw/delete remain available. Keep account and maintenance controls running when pausing inference or research.

No additional database, model, review service, agent framework or automatic grader is provisioned. Selected research adds bounded private D1 rows and indexed link/review queries. It reuses account D1 and the existing maintenance handler. Contribution counts are bounded by retained account exchanges and deduplicated per consent epoch/exchange; HTTP/control abuse still needs ordinary edge monitoring. Review/benchmark inference costs are not incurred by this pipeline. Apply restricted access and retention before collecting anything real.

Tests execute real local D1 consent/collection races, expiry, key collisions, owner isolation, withdrawal/deletion cascades and human review/promotion SQL. CLI/file-permission/expiry guards and provisional model/prompt comparisons use synthetic examples only. Browser evidence shows unchecked consent, preview, selection, withdrawal and unchanged free usage. See TEST_RESULTS_C.md and RELEASE.md.
