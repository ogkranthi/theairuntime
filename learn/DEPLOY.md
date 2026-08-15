# Deploying learn.theairuntime.com

The course site deploys itself from CI. Push to `main` and it ships. There is no
dashboard step in the normal flow, nothing to run on a laptop, and no Cloudflare
credential outside GitHub's secret store.

The pipeline lives in
[`.github/workflows/deploy-learn.yml`](../.github/workflows/deploy-learn.yml)
and is scoped to `learn/**`, so the events site, which deploys through
Cloudflare's own git integration, is untouched by it.

## One-time setup

Two steps, both in a browser, about five minutes. After this, nobody touches a
dashboard again.

### 1. Create a scoped Cloudflare API token

**My Profile → API Tokens → Create Token → Create Custom Token**, with exactly
these permissions:

| Scope | Permission | Access |
|---|---|---|
| Account | Cloudflare Pages | Edit |
| Zone | DNS | Edit |
| Zone | Zone | Read |
| Account | Account Settings | Read |

Restrict the two Zone rows to `theairuntime.com`. Do not use the Global API Key:
it is unscoped and cannot be revoked without resetting every integration on the
account.

Grab the account id too. It is in the dashboard sidebar, and in the URL of any
page: `dash.cloudflare.com/<account_id>/...`. It is not a secret.

### 2. Store both in GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | the account id |

That is the whole setup. The token now lives in GitHub's encrypted secret store,
where it is write-only: it can be used by a workflow and replaced, but not read
back by anyone, including the workflow logs.

### 3. First run, with the domain

Trigger the workflow once with domain binding on:

- **Actions → Deploy learn.theairuntime.com → Run workflow**, tick
  **bind_domain**, run.
- Or from a terminal: `gh workflow run deploy-learn.yml -f bind_domain=true`

The run creates the Pages project, builds, deploys, attaches
`learn.theairuntime.com`, creates the proxied CNAME, and prints the verification
checks. DNS goes Active within a couple of minutes.

Leave `bind_domain` off for ordinary deploys. It is idempotent either way, it is
just an unnecessary pair of API calls once the domain is attached.

## After setup

| To do this | Do this |
|---|---|
| Ship a content or code change | Merge to `main`. It deploys. |
| Redeploy without a code change | Actions → Run workflow |
| Re-attach the domain, or repair DNS | Run workflow with `bind_domain` ticked |
| Roll back | Revert the commit and merge, or promote an older deployment in the Pages dashboard |

An agent session can trigger a deploy the same way through the GitHub API, with
no Cloudflare credential in the session at all. That is the point of putting the
token in GitHub rather than handing it to a tool: the credential stays in one
place, and the deploy is a button anyone authorised can press.

## What the pipeline does

1. `npm ci` in `learn/`
2. `npx astro check`, which fails the build on a type error
3. `npm run build`
4. `scripts/cloudflare-pages.sh ensure-project`, creates the Pages project if it
   does not exist yet
5. `wrangler pages deploy dist`, tagged with the commit sha
6. `scripts/cloudflare-pages.sh ensure-domain`, only when `bind_domain` is set
7. Verification curls against the live domain, printed in the log

[`scripts/cloudflare-pages.sh`](./scripts/cloudflare-pages.sh) is idempotent
throughout: every step checks current state before acting, which is what makes
it safe to run on every deploy. It can also be run locally with the same two
environment variables if you ever need to.

## Why not Cloudflare's git integration

It would also auto-deploy, and it needs no token. The tradeoff is that
connecting a Pages project to a repo can only be done through the dashboard
OAuth flow, and a project is permanently either git-connected or direct-upload.
This setup keeps the whole deploy in the repo, reviewable in a diff, runnable on
demand, and identical whether a human or an agent triggers it.

Consequence worth knowing: because this project is direct-upload, the Pages
dashboard will not show a "retry build from commit" button. Redeploy by running
the workflow instead.

## Verifying a live deploy

```bash
curl -sI https://learn.theairuntime.com/ | head -1                 # 200
curl -s https://learn.theairuntime.com/course/04-idempotency/ | grep -o "<title>.*</title>"
curl -sI https://learn.theairuntime.com/og/04-idempotency.png | grep -i content-type   # image/png
curl -s https://learn.theairuntime.com/rss.xml | head -c 120
```

The OG image check is the useful one. It proves the build ran the satori route
rather than a stale `dist/` being served.

## When it fails

| Symptom | Cause |
|---|---|
| `set CLOUDFLARE_API_TOKEN` | The repo secret is missing or misspelled. Names are case sensitive. |
| `could not create project` with an auth error | Token is missing **Account → Cloudflare Pages → Edit**. |
| `zone theairuntime.com not found` | Token is missing **Zone → Zone → Read**, or the zone rows were not scoped to this domain. |
| `could not create dns record` | Token is missing **Zone → DNS → Edit**. |
| Deploy succeeds, domain still 404s | DNS is still propagating, or `bind_domain` was never run. Re-run with it ticked. |
| Build fails on `astro check` | A real type error. Fix it; the gate is doing its job. |
| OG images missing | `@resvg/resvg-js` is a native module. It builds on `ubuntu-latest`; if that ever changes, pin the runner. |

## Rotating the token

Create a replacement in Cloudflare, update the `CLOUDFLARE_API_TOKEN` repo
secret, then delete the old token. No code change, and the next deploy picks it
up. Do this if the token is ever pasted somewhere it should not have been.
