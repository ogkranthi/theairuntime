# Accounts and free coaching

PR A stacks directly on consolidated release #157, commit f2f2730. It does not include #159 or #160. Production remains unchanged. Account APIs and UI are independently off by default.

## Authentication compatibility

This site builds static Astro pages and React islands, served by an existing Worker. ClerkJS 6.43.1 (see the lockfile for the exact installed version) runs in the existing island; the pinned Clerk backend SDK runs in the Worker with nodejs_compat. No Astro SSR adapter, new application or login server is introduced.

The official [Clerk backend verification API](https://clerk.com/docs/reference/backend/verify-token) supports networkless signature and time validation using its PEM JWT key. The implementation additionally requires an exact configured issuer, authorized party, human user subject and session ID, and accepts bearer tokens only. Mutations require an exact matching Origin. No request body, cookie or user-ID header selects identity. The pinned SDK's authenticateRequest required a secret key in the local compatibility test, so this implementation uses its supported verifyToken API with explicit issuer/party/session checks instead. No Clerk secret key is needed by the Worker. OAuth is not reimplemented.

Google and GitHub are configured as the only sign-in methods in the owner-operated Clerk application. Its prebuilt modal performs sign-in. Real provider redirects and instance keys still require isolated staging verification; local screenshots use an explicitly synthetic SDK fixture, not a claim of completed Google/GitHub OAuth.

Clerk retains identity information under its own policies. Coach stores a keyed HMAC reference, never the Clerk subject, email or provider credential. Keep COACH_IDENTITY_KEY stable; rotation requires an account-linkage migration, not a routine secret rotation. The JWT verification key is public verification material. Production secret values must stay outside Codex.

## Configuration and release gates

Build variables:

- PUBLIC_FDE_COACH_CHAT_ENABLED=true
- PUBLIC_FDE_COACH_ACCOUNTS_ENABLED=true
- PUBLIC_CLERK_PUBLISHABLE_KEY from the approved Clerk instance

Worker configuration:

- FDE_COACH_CHAT_ENABLED=true and FDE_COACH_ACCOUNTS_ENABLED=true
- COACH_DB: the approved private D1 database
- CLERK_PUBLISHABLE_KEY, CLERK_JWT_KEY (PEM), CLERK_ISSUER
- COACH_ALLOWED_ORIGIN: one exact origin, normally https://learn.theairuntime.com
- COACH_IDENTITY_KEY: a new random secret of at least 32 characters, owner-managed
- COACH_DAILY_RESPONSES: default 10, integer 0-100; COACH_DAILY_REQUESTS: default 30, integer 0-200. Invalid configuration fails closed. Changing either setting needs no code change. Zero pauses that category of new admission.

Before any production provisioning/deployment, inventory the existing Worker variables, secrets, routes, AI/KV bindings, migration history and scheduled triggers. Preserve them. The production wrangler.toml is unchanged. Do not replace dashboard variables with a partial vars table. Use an approved complete configuration or a verified preservation mechanism in the existing pipeline. Resolve the outstanding #157 Workers Builds failure first.

After separate resource approval, the owner can execute these steps outside this task. Replace identifiers with the reviewed configuration, not the local placeholder config:

```sh
# Owner only, after explicit provisioning approval:
npx wrangler@4.160.1 d1 create fde-coach-accounts
# Add COACH_DB and migrations_dir = "migrations/coach" to the reviewed existing Worker config.
npx wrangler@4.160.1 d1 migrations apply COACH_DB --remote --config /private/reviewed-production.toml
# Set new account verification/configuration values through the approved secret/variable process.
# Add an hourly maintenance trigger, preserving any existing triggers:
# crons = ["17 * * * *"]
# Run the existing production pipeline only after all stacked changes are approved.
```

wrangler.coach-v1.local.toml is for local tests and dry runs only. Its IDs are zero placeholders, flags are false and it must never be deployed. The existing SQLite class, DO namespace name and v1-ai-security migration tag are retained. New DO metadata tables are created additively, without changing existing sessions/counters or resetting state. No D1 production binding, resource or secret is created by this PR.

## Quota and recovery contract

The existing single SQLite DO reserves both a conversation revision and a user success slot before a message runs. Only a validated mode=ai result charges the successful-response allowance. Intake, provider errors, invalid output and authored fallbacks do not charge it. Every physical primary/fallback model call still durably consumes the shared 500/day counter before execution. Model execution remains outside the object.

The default 30 admitted messages/user/day limits failed or fallback work. Existing 12 starts/actor/hour, 200 shared starts/day, 10 turns and 20 physical attempts per active one-hour account session remain enforced. Returning after an hour opens a new bounded segment in the saved conversation. Anonymous lesson/Gym controls remain unchanged. Ask the Library and FDE Path remain outside this cumulative quota boundary.

Client operations carry an immutable random Idempotency-Key and exact payload. The server scopes keys to verified account, generation and action. Starts from two accounts using the same key cannot share credentials or conversations. The account1 token in the UI is a conversation ID/revision hint, not an authorization credential. Every API request is authenticated again. The server retrieves context itself; client history and profile claims cannot select another user's state.

D1 saves an immutable reply before DO settlement. Retries reconcile it without inference or a second charge. No saved result means no replay execution: after 120 seconds the operation stays uncertain, its success slot remains reserved for that UTC day, and that conversation requires a new chat. Successful settlement crossing midnight checks and charges the completion day's allowance; if full, the saved result remains withheld until an exact retry can settle. Already completed exact retries never charge again, including on a later day. Deleting data does not clear quota metadata.

Quota reduction applies immediately to new admissions; previously reserved work may still finish under its prior grant. Usage display is a snapshot and includes reserved slots. DO or D1 failure fails closed. There is no cross-service transaction: an uncertain result can conservatively consume a slot without a delivered response. There is no claim that KV counters are atomic quotas.

## Data controls and retention

The existing chat UI adds subordinate account controls, experience/goal fields, recent conversations, remaining allowance, export and deletion. No dashboard is added. Content is rendered as text. The existing written lesson, curriculum, Commons and Gym URLs are preserved.

Private D1 stores the profile, learning goal, conversation state, messages, model metadata and latest practical next step for ordinary account functionality, independent of research. Every query scopes by verified owner. D1 has no row-level access policy; application queries, tests and restricted account access enforce separation. Do not issue D1 credentials to browsers or learners.

Inactive conversations expire 90 days after their last turn. Reads exclude expired data immediately. Bounded request-time cleanup and the prepared scheduled handler remove expired conversations/messages. The owner must configure the hourly trigger before release and monitor the backlog. Profiles remain until deletion. A minimal hashed account tombstone prevents in-flight resurrection and automatic recreation after deletion. Delete removes all conversation rows and scrubs the profile; it does not delete the identity-provider account. Export is an authenticated client-side JSON download. Backups/Time Travel and Clerk have separate provider retention; operator deletion procedures must cover restored backups before they are made accessible.

Research, newsletter, Gym research, publication and training consent are not enabled by sign-in. No conversation data is logged for operations. Synthetic UI fixtures never ship in production bundles. Do not commit any real learner export or private review artifact.

## Costs and validation

One D1 database is the only new persistence resource. It adds indexed profile/conversation reads and a small atomic write batch per interaction. The existing DO now stores account quota metadata for up to 90 days. There is no billing or payment collection. Configure Clerk social providers and evaluate its current [pricing](https://clerk.com/pricing), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), SQLite DO pricing and Workers AI model rates against the intended pilot. Free tiers are not an unlimited production guarantee. Account read traffic and other AI endpoints need ordinary edge abuse monitoring.

Local validation uses real RS256 signatures with generated synthetic keys, actual Miniflare D1/SQLite and stubbed model inference. Run npm test, npm run check:worker, npm run check --prefix learn, the enabled build, both Wrangler dry runs and scripts/test-coach-account-ui.mjs. Real Clerk OAuth, Workers AI quality/latency and Cloudflare resource permissions remain release prerequisites. No production deployment is claimed.
