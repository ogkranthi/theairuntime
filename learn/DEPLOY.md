# Deploying learn.theairuntime.com

The code is on `main`. Nothing serves the domain until a Cloudflare Pages
project exists for it. This is a one-time setup, then every push to `main`
deploys on its own.

**Do not bind `learn.theairuntime.com` to the existing `theairuntime` Pages
project.** That project is the events site, and its Worker does host routing for
`lab.theairuntime.com`. Adding a third host there means writing routing code
instead of getting an independent deploy. The course site is its own project,
the same way the Lab could be.

## Option A: dashboard, git integration (recommended)

This is how the events site already deploys: Cloudflare watches the repo and
rebuilds on every push. No secrets, no CI, no extra deploy path to maintain.

### 1. Create the Pages project

Cloudflare dashboard, **Workers & Pages** → **Create** → **Pages** → **Connect to
Git** → pick `ogkranthi/theairuntime`.

Then set exactly these, and nothing else:

| Field | Value |
|---|---|
| Project name | `learn-theairuntime` |
| Production branch | `main` |
| Framework preset | None (or Astro; it only prefills the two fields below) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| **Root directory** | **`learn`** |

The root directory is the field that matters and the one that is easy to miss.
It is under **Build settings**, sometimes collapsed behind "Advanced". Leave it
empty and Cloudflare builds the events site at the repo root instead, which
either fails or silently deploys the wrong site to this domain.

Save and deploy. The first build takes about a minute and ends with a
`learn-theairuntime.pages.dev` URL. Open it and confirm the course home page
renders before touching DNS.

### 2. Bind the custom domain

In the new project: **Custom domains** → **Set up a custom domain** →
`learn.theairuntime.com` → **Activate domain**.

The zone is already on this Cloudflare account, so the CNAME is created for you.
Status goes Pending, then Active, usually within a couple of minutes.

Nothing about `theairuntime.com` (Substack), `events.theairuntime.com`, or
`lab.theairuntime.com` changes. This is a new subdomain on the same zone.

### 3. Turn on Web Analytics (optional)

**Web Analytics** → **Add a site** → `learn.theairuntime.com`. Cloudflare Web
Analytics is the only analytics this site expects, and it sets no cookies. If
you want the beacon inlined rather than injected, add the token as
`PUBLIC_CF_BEACON_TOKEN` and wire it in `learn/src/layouts/Base.astro`; the
automatic injection needs no code change at all.

## Option B: CLI direct upload

Use this only if you do not want Cloudflare reading the repo. It is a real
tradeoff, not just a different button:

> A Pages project is **either** git-connected **or** direct-upload, permanently.
> A project created by `wrangler pages deploy` cannot later be connected to git.
> You would then need to run the deploy yourself, or add a CI workflow, on every
> change.

```bash
cd learn
npm install
npm run build

npx wrangler login                       # or export CLOUDFLARE_API_TOKEN=...
npx wrangler pages project create learn-theairuntime --production-branch main
npx wrangler pages deploy dist --project-name learn-theairuntime
```

Then bind the domain, either in the dashboard as in step 2 above, or:

```bash
npx wrangler pages domain add learn.theairuntime.com --project-name learn-theairuntime
```

If you use an API token instead of `wrangler login`, it needs **Account →
Cloudflare Pages → Edit**, plus **Zone → DNS → Edit** on `theairuntime.com` for
the domain binding to create the record.

## Verifying

```bash
curl -sI https://learn.theairuntime.com/ | head -1                 # 200
curl -s https://learn.theairuntime.com/course/04-idempotency/ | grep -o "<title>.*</title>"
curl -sI https://learn.theairuntime.com/og/04-idempotency.png | grep -i content-type   # image/png
curl -s https://learn.theairuntime.com/rss.xml | head -c 120
```

All four should work. The OG image check is the useful one: it proves the build
ran the satori route rather than serving a stale or wrong `dist/`.

## When a build fails

| Symptom | Cause |
|---|---|
| Build runs but deploys the events site | Root directory is empty. Set it to `learn`. |
| `Cannot find module 'astro'` | Root directory is wrong, so `npm install` ran against the wrong `package.json`. |
| Build succeeds, `/` is a 404 | Output directory is not `dist`, or is set to `learn/dist` when the root is already `learn`. It is relative to the root directory. |
| Domain stuck on Pending | The CNAME was created outside Cloudflare, or the zone is not on this account. Check DNS for `learn`. |
| OG images missing | `@resvg/resvg-js` is a native module. It builds on Cloudflare's default image; if it ever fails, pin the build image to the latest version in project settings. |

The build must stay green with `npm run build` and `npx astro check` reporting
zero errors. Both run clean as of the initial commit.
