# Deployment

FDE Gym deploys through the existing AIR Worker and Learn build.

## 1. Apply the bundle

From repository root:

```bash
node fde-gym-deploy-bundle/scripts/apply-to-repo.mjs .
npm install --prefix learn
npm run build
```

Review all changes before committing.

## 2. Create the Cohort 0 KV namespace

```bash
npx wrangler kv namespace create FDE_GYM_SESSIONS
```

Add the returned ID to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FDE_GYM_SESSIONS"
id = "replace-with-real-id"
```

The starter stores consented sessions with `expirationTtl`. The default is 30
days and can be changed with `FDE_GYM_SESSION_TTL_SECONDS`.

## 3. Enable Workers AI

Use the existing binding pattern:

```toml
[ai]
binding = "AI"
```

Set model variables in the Cloudflare dashboard:

```text
FDE_GYM_INTERVIEW_MODEL
FDE_GYM_EVALUATOR_MODEL
```

The code has conservative fallback model names, but Cohort 0 should explicitly
set and test both models.

## 4. Configure personalized report email

Set secrets and variables:

```bash
npx wrangler secret put RESEND_API_KEY
```

Dashboard variables:

```text
FDE_GYM_FROM_EMAIL=FDE Gym <reports@your-verified-domain>
FDE_GYM_REPLY_TO=info@theairuntime.com
```

Optional:

```text
FDE_GYM_REPORT_WEBHOOK_URL
```

The Worker uses direct HTTPS requests, so no Resend SDK dependency is required.

## 5. Existing newsletter integration

The report route reuses:

```text
SUBSTACK_ORIGIN
LEAD_WEBHOOK_URL
```

Verify `SUBSTACK_ORIGIN` points to the current publication origin.

## 6. Local development

Build the combined site:

```bash
npm run build
npx wrangler dev
```

The existing workers.dev passthrough exposes the Learn build under its internal
prefix. Use the same local routing convention documented in `learn/DEPLOY.md`.

Check:

```text
/fde-gym/
/api/fde-gym/health
```

## 7. Production deploy

Merge to the branch that deploys the existing Worker. No new Cloudflare project
or custom domain is required.

## 8. Smoke test

1. Open FDE Gym in an incognito window.
2. Start a 15-minute Practice session.
3. Confirm reference notes and visible timer.
4. Start a 30-minute Mock session.
5. Confirm exact timer and rubric are hidden.
6. Ask about workflow duration and verify the curated answer.
7. Ask for an undefined false-negative target and verify the interviewer does
   not invent one.
8. Build an architecture and complete the interview.
9. Confirm the immediate result is specific.
10. Send a report to a controlled address.
11. Confirm subscription, email, and KV record.
12. Confirm the KV record has a TTL.
13. Confirm no transcript appears in Worker logs.

## Stateless local-development mode

For isolated local UI or API work without KV, set:

```text
FDE_GYM_ALLOW_STATELESS_DEV=true
```

Never enable this variable in Cohort 0 production. Cohort 0 requires the KV
record for explicit research retention, canonical session integrity, and
detailed report delivery.
