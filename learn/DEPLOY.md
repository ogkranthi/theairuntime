# Deploying learn.theairuntime.com

The course site ships through the same pipeline as everything else in this
repo. There is no separate project, no token, and no workflow to maintain.

## How it works

Production is **one Cloudflare Worker** (`theairuntime`) serving one `dist/`
through its assets binding, with host routing in `src/worker.ts`:

```text
events.theairuntime.com  -> the community site (dist/ root)
lab.theairuntime.com     -> Field Lab pages (path-mapped inside dist/)
learn.theairuntime.com   -> the course site (dist/learn-site/, path rewrite)
```

The root build (`npm run build` at the repo root) builds the events site, runs
pagefind, then builds `learn/` and copies its output to `dist/learn-site/`. The
Worker rewrites every request on the learn host into that prefix, so course
URLs stay clean and the site's own absolute asset links resolve. Requests to
`/learn-site/*` on any host 301 to the canonical learn URL, and a missing path
on the learn host serves the course's own 404.

Deploying is therefore just: merge to `main`. Whatever deploys the Worker today
deploys the course site with it.

## One-time setup: attach the domain

The only step outside the repo, on the panel you already know:

**Workers & Pages → theairuntime → Domains** (the "Custom Domains and Routes"
list that already shows `events.theairuntime.com` and `lab.theairuntime.com`) →
**Add** → **Custom domain** → `learn.theairuntime.com`.

Cloudflare creates the DNS record itself since the zone is on the account.
Active within a couple of minutes. A custom domain is the right choice here,
not a route: routes need a manually managed DNS record, custom domains manage
their own.

Until the domain is attached, the course site is still reachable for a sanity
check at `https://theairuntime.ogkranthi22.workers.dev/learn-site/` (the
workers.dev host is passthrough, so the prefix serves as-is there).

## Verifying

```bash
curl -sI https://learn.theairuntime.com/ | head -1                 # 200
curl -s https://learn.theairuntime.com/course/04-idempotency/ | grep -o "<title>.*</title>"
curl -sI https://learn.theairuntime.com/og/04-idempotency.png | grep -i content-type   # image/png
curl -s https://learn.theairuntime.com/rss.xml | head -c 120
curl -sI https://events.theairuntime.com/learn-site/ | grep -iE "^(HTTP|location)"     # 301 to learn
```

The OG image check is the useful one: it proves the learn build ran inside the
deploy rather than a stale `dist/` being served.

## When it fails

| Symptom | Cause |
|---|---|
| learn host 404s everything | `dist/learn-site/` missing from the deploy: the root build ran without `build:learn`, or the deploy uploaded a stale `dist/`. Re-run the root `npm run build` and redeploy. |
| Domain not resolving | The custom domain was never added on the Worker's Domains panel, or is still activating. |
| Course pages show the events 404 page | The Worker deployed without the learn host block in `src/worker.ts`; assets and worker are out of sync. Redeploy. |
| Events search returns course pages | `build:learn` ran before pagefind. The root build script keeps pagefind first; restore that order. |
| OG images 404 on learn | The learn build failed partway. Check the build log for the satori step; `@resvg/resvg-js` is a native module and needs a normal Linux build environment. |

## Local check

```bash
npm run build          # repo root: builds events + learn, assembles dist/
npx wrangler dev       # http://localhost:8787/learn-site/ serves the course
```

On localhost the host routing is passthrough by design, so the course is
reached at its prefix rather than by hostname.
