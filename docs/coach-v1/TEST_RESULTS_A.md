# PR A test evidence

The exact source base is PR #157 at f2f2730. No #159/#160 code is included. No production resource or real learner data was used.

- Complete Vitest suite: 316 tests across 22 files, including the legacy personalized-chat quota bypass gate and existing 296 regressions and new account/DO tests.
- TypeScript Worker check: passed.
- Learn Astro check: zero errors, zero warnings, four pre-existing hints.
- Full root and Learn builds with accounts/chat enabled and a synthetic public Clerk key: passed, 148 Learn pages.
- Wrangler 4.160.1 dry runs: production config and local D1 config passed, no uploads.
- Account browser flow: ten checks on desktop/mobile, actual local account handlers/D1/DO, synthetic Clerk UI and AI. Includes onboarding, allowance, lost-response exact retry, resume, export, sign-out isolation and overflow/live-log semantics.
- Pinned backend SDK signature verification also executes inside a local Workers-compatible runtime. Tests use generated RS256 keys, reject forged/expired/wrong-party/wrong-issuer tokens, cross-origin mutation and client-selected identity.
- Concurrent last-slot requests, duplicate starts/keys across users, fallbacks, failed-request caps, daily boundaries, missing bindings, lost settlement and deletion during inference are covered.

Screenshots under screenshots/accounts are labeled local tests. They are not evidence of real provider OAuth or model quality. All failures found during implementation were corrected and the suite rerun. Earlier standalone UI harness issues involved React duplication, CSS sizing and a sign-out render boundary; the final checks pass.

Real Clerk Google/GitHub redirects, cloud D1 permissions, the existing failed Workers Builds check and bounded Workers AI smoke tests remain release gates. See ACCOUNTS.md. No merge, deployment or provisioning is authorized by these local checks.
