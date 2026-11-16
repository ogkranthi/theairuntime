# FDE Coach V1 release prerequisites

This is a review stack, not a deployed release. Foundation #157 is still unmerged. Accounts #161 stacks on it, observability #162 stacks on accounts, and research stacks on observability. Do not include apprenticeship PRs #159/#160. No production D1, secrets, bindings, migrations, triggers, merge or deployment were changed during implementation.

The public GitHub Workers Builds checks on the final account and observability heads also report failure. Local tests/builds/dry runs pass; CI is not claimed green. Account build log: https://dash.cloudflare.com/86740634df6f6d9a48a4e20a0e335d75/workers/services/view/theairuntime/production/builds/a0fd725b-e147-4b6b-ab26-1f81e07ec83f . Observability build log: https://dash.cloudflare.com/86740634df6f6d9a48a4e20a0e335d75/workers/services/view/theairuntime/production/builds/2b5851f5-8052-4da6-9a4f-3dac09ad573e . Private account logs and configuration are needed to identify the cause; this stack does not guess or force a deployment.

## Before any activation

1. Approve the stack and review its privacy copy, quota semantics, costs and deletion limitations. Diagnose the existing Cloudflare Workers Builds failure on #157 with authenticated owner access. Local passing builds are not a repair of that account failure. Do not merge #157 speculatively.
2. Inventory the existing production Worker: all variables, secrets, KV/AI/asset bindings, routes/domains, DO namespaces/migration tags and scheduled triggers. Preserve them through the existing pipeline. No partial vars table or replacement preview configuration may overwrite shared AIR settings. The production wrangler.toml is unchanged in this stack.
3. Approve Clerk instance setup and Google/GitHub social provider configuration. Test actual redirects, sign-out, revoked/expired session behavior and mobile browsers in an isolated environment. Use separate test identities and nonproduction data. The Worker uses networkless verification, so an already issued token can remain valid until its short expiry; configure the normal short Clerk session-token lifetime and document incident key/session revocation.
4. Only after explicit resource approval, create one private D1 database, add COACH_DB with migrations_dir=migrations/coach to the reviewed existing Worker configuration, and apply migrations 0001, 0002, 0003 in order. No resource was provisioned here. Grant D1 deployment/operation permissions only to designated operators; never to clients. Back up and validate migration behavior locally/staging first.
5. Preserve AI_SECURITY/AiSecurityCoordinator, the v1-ai-security SQLite migration and coach-gym-v1 object identity. The new account metadata tables are additive. Preserve existing DO state, quotas and Gym/Coach reservations. Do not rename, recreate or reset a production object as a deployment workaround. Preserve FDE_GYM_SESSIONS and AI bindings and their existing namespace/account ownership.
6. Configure the new account values listed in ACCOUNTS.md through the owner-approved variable/secret process, without copying production secret values into Codex. Verify frontend Clerk key matches runtime issuer/verification key. Keep COACH_IDENTITY_KEY stable. Confirm 10 successful responses/user/UTC day, 30 admitted message requests/user/day, and the unchanged 500 shared physical model-attempt ceiling.
7. Approve COACH_METRICS with the private Analytics Engine dataset fde_coach_metrics and FDE_COACH_METRICS_ENABLED=true if available on the account. Confirm published rates/retention and restricted read access. Set current COACH_MODEL_PRICES_JSON only when rates are verified; unknown token/cost information must remain unknown. Do not log Authorization, request bodies, responses or email addresses in any separately configured trace sink.
8. Configure the existing Worker's prepared hourly maintenance handler, preserving any existing scheduled triggers (proposed additional cron: 17 * * * *). Verify expiry/deletion sweeps and backlog monitoring. Approve backup restore reconciliation and private artifact deletion procedures before real accounts/research.
9. Build with PUBLIC_FDE_COACH_CHAT_ENABLED=true, PUBLIC_FDE_COACH_ACCOUNTS_ENABLED=true and the approved PUBLIC_CLERK_PUBLISHABLE_KEY. Activate FDE_COACH_CHAT_ENABLED/FDE_COACH_ACCOUNTS_ENABLED only when the actual D1, Clerk and DO prerequisites pass. Keep research runtime/build flags false until the separate consent/access/retention review passes; enabling accounts never enables research. When ready, set PUBLIC_FDE_COACH_RESEARCH_ENABLED and FDE_COACH_RESEARCH_ENABLED deliberately.

## Required checks

```sh
npm test
npm run check:worker
npm run check --prefix learn
PUBLIC_FDE_COACH_CHAT_ENABLED=true PUBLIC_FDE_COACH_ACCOUNTS_ENABLED=true PUBLIC_FDE_COACH_RESEARCH_ENABLED=true npm run build
npx wrangler@4.160.1 deploy --dry-run --outdir /tmp/coach-v1-worker
npx wrangler@4.160.1 deploy --dry-run --config wrangler.coach-v1.local.toml --outdir /tmp/coach-v1-local
AIR_COACH_RESEARCH=1 AIR_COACH_ARTIFACT_DIR=/tmp/coach-v1-evidence node scripts/test-coach-account-ui.mjs
npm run test:report-status
npm run eval:coach:smoke
```

The local config contains zero IDs and must never be deployed. Preview testing must use separate KV/D1/DO resources and test Clerk settings, never production namespaces, provider secrets, webhooks or email recipients. Existing preview wrappers from #157 do not expose the new account API automatically; review an isolated configuration before any separately approved preview deployment.

After approvals, use the existing production pipeline and verify the deployed commit and real bindings. Smoke-test Google and GitHub with designated non-sensitive test accounts on desktop/mobile. Confirm context personalization, saved goals and conversation resume, practical next step, feedback, export/delete, cross-user access denial, expired/forged tokens, exact retry after response loss, per-user usage and coarse model errors. Verify both primary/fallback calls are counted durably. Test ceilings in isolated state rather than exhausting production's shared quota. Test real provider latency and model quality; the 4.5-second attempt deadline remains a real-provider risk. Do not mistake reference-fixture scores for model evaluation.

For research, prove unchecked default, no automatic copy after enabling, explicit selection/preview, human approval, private output guards, withdrawal races and deletion of private derivatives/artifacts. Do not collect real learner research data until the private access, backup/deletion and artifact procedures are operational and reviewed.

Check existing Commons, courses, lesson, Gym, Events and Lab URLs and workflows. No unrelated AIR property, curriculum content, subscription or webhook handler is changed. Account mode closes the old personalized-chat API path to anonymous inference while keeping its URL and public health available; the account UI uses authenticated endpoints. Legacy lesson/Gym and other existing learning paths remain.

## Rollback and remaining limits

If inference fails, disable FDE_COACH_CHAT_ENABLED first. Account view/export/delete and maintenance should remain available. If research collection needs pausing, disable FDE_COACH_RESEARCH_ENABLED; withdrawal and account deletion still work. Do not reset DO state, remove D1 data, rotate identity linkage keys or undo migrations as a rollback. Keep the new bindings and additive schemas in a compatible rollback build. A historical Wrangler config without them can silently remove bindings, so do not deploy it blindly.

The shared model cap covers Coach/Gym/new account chat, not Ask the Library or FDE Path. Google/GitHub/Clerk availability, account farming, read/control-endpoint abuse, Cloudflare platform limits and other AI endpoints still require operational attention. Exact retries do not charge again. Uncertain operations can conservatively hold allowance until the UTC reset; changing configured quota does not revoke already admitted work. Successful settlement crossing midnight uses the completion-day allowance. Account token verification is not instantaneous revocation of already issued short-lived tokens.

Large exports/research jobs can exceed a Free plan's per-invocation query or CPU limits even though reads are paginated. Validate plan limits and approve any plan change before a long-lived pilot; no upgrade is performed here. Coach deletion is separate from Clerk/provider identity deletion. A provider-side account-deletion webhook is not installed, so use Coach's data controls before removing that identity, or the owner-operated privacy/deletion procedure afterward.

There are no payments, subscriptions, credit cards, new dashboards, missions, passports, LMS, agent framework or model training. One private D1 database and optional native Analytics binding are the only prepared additions. Costs and retention are documented in ACCOUNTS.md, OBSERVABILITY.md and RESEARCH.md. Real OAuth, model quality, Analytics ingestion and account-side deployment configuration remain unverified prerequisites, not passing local claims.
