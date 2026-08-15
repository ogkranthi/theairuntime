---
module: 14
title: "Deploying the Agent Publicly"
duration: "45-60 min"
goal: "Put the agent on a public URL, for free, and prove that a redeploy mid-run does not lose work."
question: "Can the public system survive restarts and redeploys?"
labNumber: 13
invariant: "I12: a redeploy mid-run loses no work and duplicates no side effect."
lab: "The Redeploy"
deliverable: "Public URL + render.yaml + .env.example + deploy_checklist.md"
status: published
---

## Lesson 14.1: Reference deployment (free)

```text
Render (free web service)   ← FastAPI + dashboard, git-deploy from main
Neon (free Postgres)        ← LangGraph checkpoints + your runs/events/published tables
LangSmith free tier         ← traces (or Langfuse self-hosted on the same Render service)
GitHub                      ← repo, CI eval gate from Module 11
```

Nothing changes from local except env vars, because you used Neon since Module 03.

`render.yaml`:

```yaml
services:
  - type: web
    name: vendor-review-agent
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: LLM_API_KEY
        sync: false
      - key: LANGSMITH_API_KEY
        sync: false
```

## Lesson 14.2: Free-tier realities you must design for

```text
Cold starts / spin-down     free web services sleep after idle → first request slow;
                            long runs must not depend on one warm process (they don't, Module 07)
Request timeouts            never run the graph inside the HTTP request; enqueue, return run_id,
                            execute in a background task, poll /runs/{id}
Ephemeral disk              anything on disk is gone on redeploy → raw pages go in Postgres/object store
Connection limits           Neon free tier caps connections → use a pool, close cleanly
No secrets in repo          .env.example only; real values in the host's env
```

Background execution on a free tier: a FastAPI `BackgroundTasks` or a tiny in-process worker loop is enough for the course. Note explicitly that it is not a real queue: Module 15 will punish that, on purpose.

## Lesson 14.3: Free hosting matrix

| Option | Best for | Watch out |
|---|---|---|
| Render free + Neon | Full app with public URL, dashboard, DB (this course) | Spin-down, hours limits |
| Hugging Face Spaces (Gradio/Streamlit) | Demo UI, permanent link, easiest | Compute limits, cold starts, not for background workers |
| Fly.io / Railway free allowance | Small always-on services | Allowance changes; check current terms |
| Oracle Cloud / GCP free tier VM | Self-managed always-on | You operate everything |
| Cloudflare Tunnel / ngrok | Show a local run publicly for an hour | Temporary; not a deployment |
| Modal free tier | Bursty background compute | Pair with a separate frontend |

Production note: free tiers are for learning and sharing. Once you have users and SLAs, move to a managed LangGraph deployment, a real durable-execution engine (Temporal or similar), or your own workers on a paid tier. Nothing you built changes; where it runs does.

## Lesson 14.4: Security minimums, even for a demo

- Rate-limit `POST /runs`; the run costs money.
- Allow-list target domains for the fetcher (SSRF is real).
- Never render fetched HTML into your dashboard unescaped.
- Treat fetched page content as untrusted input to the model: prompt injection via a vendor's website is the obvious attack on this app.

<div class="callout failure-lab">

**FAILURE LAB 13: The Redeploy**

Start a run on the public URL. While it is mid-research, push a trivial commit. Render redeploys; the process is replaced.

Expected: the dashboard shows the run paused/stale, then continues (or resumes on next poll/resume call) from the last checkpoint. `published_reports` still ends with exactly one row.

Then do it during `await_review`. Then approve from your phone.

</div>

<div class="callout deliverable">

**Deliverable:** your public URL, `render.yaml`, `.env.example`, and `deploy_checklist.md` (what you verified, including the redeploy lab).

</div>

<div class="callout takeaway">

**Production takeaway:** deployment did not add durability. Modules 03 to 07 did. Deployment just proved it.

</div>

## Primary sources

- [Render free instance limitations](https://render.com/docs/free) and [Neon free-plan limits](https://neon.com/docs/introduction/plans): the two pages that decide whether Lesson 14.2's constraints still hold. Hosting limits change without notice; verify both before relying on this module's numbers.
