# Owner-reviewed release plan

These are proposed commands, not executed release actions. Both drafts must stay unmerged until owner review. D1/private capture is held separately. Never use production KV, a shared production DO namespace, production email/webhook credentials, or real learner data for preview.

## Local verification, no provider or account access

```sh
npm ci
npm ci --prefix learn
npm test
npm run check:worker
npm run check --prefix learn
npm run build
npx --yes wrangler@4.160.1 deploy --dry-run --outdir /tmp/air-coach-worker
AIR_COACH_ARTIFACT_DIR=/tmp/air-coach-legacy AIR_COACH_SKIP_SCREENSHOTS=1 node scripts/test-fde-coach-ui.mjs
npm run test:report-status
PUBLIC_FDE_COACH_CHAT_ENABLED=true npm run build --prefix learn -- --outDir /tmp/air-coach-beta
AIR_COACH_BETA=1 AIR_COACH_SITE=/tmp/air-coach-beta AIR_COACH_ARTIFACT_DIR=/tmp/air-coach-beta-evidence node scripts/test-fde-coach-ui.mjs
```

Browser/SQLite tests require Node 22+, Chromium, and local loopback. All provider responses are synthetic fixtures; no API key or Cloudflare login is needed for these checks. A focused TypeScript check can extend `tsconfig.worker.json` temporarily with `types:["@cloudflare/workers-types","node"]` and `include:["src/coach-chat/**/*.ts","preview/**/*.ts"]`; remove that temporary config afterward.

## Required owner account decisions before any preview

1. Review both stacked diffs, privacy language, model policy, known failure cases, and the synthetic evaluation rubric. Accept that default capture is off and no real learner data may be used at this stage.
2. Diagnose the existing Workers Builds failure in the owner account. Inspect the connected repository/branch, install/build/deploy commands, Wrangler version, build root, resource permissions, and redacted failure logs. No account logs were available here, and no repair is claimed. Do not change the production build integration as a side effect of preview testing.
3. Select the intended Cloudflare account and verify account-wide usage/spend limits. Use an owner-operated scoped credential with Workers Scripts edit/deployment, KV namespace create/read/write, and Workers AI inference permissions; DO migration authorization is part of the Worker deployment. Confirm current permission labels in Cloudflare. No production-zone route permission is needed for this Workers.dev-only template.
4. Approve one separately named preview Worker, one new nonproduction KV namespace, the same SQLite class under that preview Worker's own namespace, and a fresh preview-only signing secret. No D1 resource, remote service binding, production secret copy, or external integration is needed.
5. Supply and verify an approved private test-access gate before publishing a preview. Account-side Access/preview protection is not implemented by this application. If it is unavailable, stop; do not publish an open AI endpoint. Do not create a new app/login system to work around it.

## Preview configuration and commands, only after that approval

`preview/coach-chat.wrangler.toml` is an independent, off-by-default template. It serves the existing Learn build at a separate Workers.dev host through `preview/coach-entry.ts`. The wrapper permits only the new chat API and static assets; it rejects production/custom hosts and blocks all unrelated APIs, including newsletter, email, Gym/report, intake, Ask the Library, and FDE Path. No production route or plain-text variable set is inherited.

The KV ID is deliberately all zeros. The static guard rejects that placeholder and the known production ID. It also requires the isolated Worker name, safe entry, empty routes, and no remote-service/D1/external binding additions. The owner must independently verify the new namespace belongs to the preview account and contains no production data; a static ID check cannot prove account ownership. Do not override the Worker name or config at deploy time.

After explicit resource and preview approval, outside Codex's secret context:

```sh
npx --yes wrangler@4.160.1 whoami
npx --yes wrangler@4.160.1 kv namespace create FDE_GYM_SESSIONS --config preview/coach-chat.wrangler.toml
# Put the returned nonproduction ID into the template, review the diff, and verify it in the dashboard.
node scripts/check-coach-preview.mjs preview/coach-chat.wrangler.toml
# Generate a fresh preview-only value in the owner's terminal. Never reuse or paste the production secret.
openssl rand -base64 48 | npx --yes wrangler@4.160.1 secret put COACH_TOKEN_SECRET --config preview/coach-chat.wrangler.toml
PUBLIC_FDE_COACH_CHAT_ENABLED=true npm run build
npx --yes wrangler@4.160.1 deploy --dry-run --config preview/coach-chat.wrangler.toml --outdir /tmp/air-coach-preview
# Deployment itself requires the separately approved access gate and deployment action.
npx --yes wrangler@4.160.1 deploy --config preview/coach-chat.wrangler.toml
```

The off-by-default preview may verify asset/routing/privacy behavior without inference. Applying `v1-ai-security` to the separate preview Worker creates its own SQLite namespace, not production state. Verify the deployed Worker name and actual binding namespace IDs before any request. Then, only after bounded synthetic inference approval, set `FDE_COACH_CHAT_ENABLED="true"` in this preview config, re-review and re-run the guard/dry-run, and separately approve redeploying it. No production config change is needed for preview.

## Preview smoke and model evaluation gates

- Verify the flag-off experience, assets, privacy, explicit starter behavior, and independent consent boundaries. Check 360/390/768/1440 widths and a real Android device where available; record untested platforms.
- Test real Cloudflare admission, duplicate start keys in two private client scopes, concurrent messages, lost responses, 20-second client timeout, 120-second lease fencing, one-hour expiry, 10-turn/20-attempt limits, and the shared 500-attempt pool. Do not reset spent DO state to make a test pass. Use a dedicated test namespace and controlled fixtures for quota-edge tests; do not exhaust production allowances.
- Verify one-use attempt reservation before every primary/fallback call, deterministic fallback when AI/admission is unavailable, no model/provider error leakage, and blocked external endpoints. Beta health must show `captureEnabled:false`.
- Use PR B's manually invoked runner only after explicit inference approval and private gate review. Start with three synthetic cases and an upper reservation budget of 12 attempts (two turns and two potential calls per turn), then expand after reviewing latency, cost, and failures. Exact retries must keep their original identity; never repeat uncertain work under a fresh key.
- Capture actual server-only model/prompt/retrieval/attempt/usage metadata using owner read access to the isolated KV results. Only export the metadata projection, not cached bodies, tokens, or profile state. Match it privately to the runner's synthetic case results. Provider-reported token counts may be absent; do not fabricate usage or cost. Pricing/neuron limits are account/model-specific and must be reviewed against current Cloudflare pricing.
- Human review of correctness, pedagogy, safe uncertainty, next-step quality, and all critical failures is required. CI fixture success, user helpfulness feedback, or an LLM score is not model signoff. No public announcement before the functional beta and quality gates pass.

## Cost and production enablement, separate approvals

The 500-attempt pool counts physical application invocations, not dollars, tokens, or neurons. Other AI endpoints and account consumers remain outside that boundary. Ten to twenty invited adults sending 5-10 messages/day imply roughly 50-200 normal calls, up to 100-400 with a fallback each, plus existing Coach/Gym use. A ten-turn cap is per chat, not authenticated per-person daily enforcement. Pilot invitations/daily-message policy require operator control; no account identity is invented here.

At 20 starts and 200 chat turns/day, ordinary traffic is about 640 DO RPCs and 220 replay KV writes before retries; a fallback on every turn adds about 200 DO attempt RPCs. Actual Worker/SQL/KV/AI costs and account-wide Free allowances were not measured. Missing quotas or platform limits fail closed; deterministic/error traffic still costs requests/storage. Review official Cloudflare Workers, Durable Objects SQLite, KV, and Workers AI pricing before resource approval. There is no permanent transcript/D1 storage cost in PR A.

Production requires owner approval of #153's security migration/binding, both stacked changes, private preview evidence, real model evaluation, cost/retention terms, access/pilot plan, backups and rollback, and merge/deployment. The main-branch pipeline can deploy on merge; do not merge to trigger it speculatively. Preserve all existing dashboard variables/secrets. This PR does not add a production `[vars]` block or change live bindings. The new runtime switch is `FDE_COACH_CHAT_ENABLED`, default false; the UI build switch is `PUBLIC_FDE_COACH_CHAT_ENABLED`, default false. Any model override is server-only `FDE_COACH_CHAT_MODEL` and requires re-evaluation.

Disable the runtime beta switch to stop new chat work without reverting atomic security. In-flight work can still complete and spend reserved attempts. Keep class export, namespace identity, migration history, revisions, and spent/report reservations. Never restore old DO snapshots, reset counters, or revert to pre-security code to recover availability. Written learning routes and other AIR properties remain available. No change in this work authorizes any of these release actions.
