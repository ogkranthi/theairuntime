# PR C test evidence

The final stack contains 341 passing tests across 25 files. This includes the original 296 tests, account/quota isolation and retry coverage, paginated complete export versus bounded recent chat history, fixed-schema operational telemetry, seven private research API cases, two redaction tests and eight private pipeline cases.

Research tests cover default-off consent, current-policy opt-in, old-policy withdrawal, no copy merely from enabling, independent free allowance, selected exchange fields, real D1 concurrent idempotency/key conflicts, no orphan copies, cross-user preview/contribution/export denial, contribution/withdrawal races, expiry, account deletion and derivative cascades. Learner APIs cannot approve or promote examples.

Pipeline tests execute review, privacy revision and dataset-membership SQL against local D1, retain original responses separately from technical corrections, invalidate old approvals after privacy edits, require fresh consent/review state, compare model/prompt fixtures provisionally, refuse Git output paths and check mode 0600, overwrite protection and portable artifact expiry cleanup. The private CLI also runs end to end on synthetic files with zero model/provider calls. All temporary private test files are removed.

Worker types and Learn Astro checks pass (zero errors/warnings, four existing hints). Full root/Learn builds pass with chat/accounts/research UI enabled and a synthetic public Clerk key. Production and local D1/Analytics Wrangler 4.160.1 dry runs pass without uploading or provisioning.

Twenty-one desktop/mobile account/research browser checks pass using actual local account handlers, D1 and SQLite, with synthetic Clerk UI/model fixtures. This includes an interrupted export that cannot download after sign-out, session-bound authenticated actions, quota-outage-safe data controls, and resumed progress. Screenshots under screenshots/research show consent and exchange previews as local tests. Existing feature-off UI checks (33), rendered report status (nine) and the original 40 synthetic evaluation fixtures also pass. The existing synthetic corpus is unchanged and still has pending human-gold status.

No real OAuth, Workers AI quality, Analytics ingestion, private dataset collection, production resource creation, merge or deployment is claimed. See RELEASE.md for prerequisites and RESEARCH.md for retention/backup/portable export limits. Automated grading is provisional; synthetic structural matches are not scientific model validation.
