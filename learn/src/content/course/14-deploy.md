---
module: 14
title: "Deploying and Operating the Agent"
duration: "45-60 min"
goal: "Put the agent on a public URL, for free, and prove that a redeploy mid-run does not lose work."
question: "If a release replaces a worker, what wakes unfinished work and how does it safely continue?"
hook: "Push to main, mid-run."
scenario: "The incident agent is 20 minutes into an investigation when a deploy replaces the process. On the free tier. It has to shrug."
caseStudy: incident-response-agent
skills: [Deployment, Migrations, Rollback]
technologies: [Render, Neon, FastAPI]
repoPath: "render.yaml"
labNumber: 13
invariant: "A redeploy mid-run loses no work and duplicates no side effect."
lab: "The Redeploy"
deliverable: "Public URL + render.yaml + .env.example + deploy_checklist.md"
status: published
---

## Separate request handling from execution

Avoid this architecture:

```text
POST /run
  ↓
keep HTTP request open
  ↓
execute for 40 minutes
  ↓
return final response
```

Use:

```text
POST /runs
  ↓
validate input
  ↓
create durable run
  ↓
return 202 Accepted + run_id
```

The API has accepted work. It has not promised the work is complete.

## Execution happens asynchronously

```text
Browser
  ↓
FastAPI
  ↓ creates run row
PostgreSQL
  ↓
Scheduler/worker claims runnable run
  ↓
LangGraph executes
  ↓
checkpoints + events + artifacts persist
```

For a small free deployment, API and worker loops may share one service/container. Keep their responsibilities conceptually separate.

## Run lifecycle

Example non-terminal states:

```text
pending
running
retry_wait
awaiting_review
publishing
```

Terminal states:

```text
completed
completed_with_unknowns
rejected
cancelled
failed
```

Explicit terminal reasons matter for operations and evals.

## Startup reconciliation

This section must be much clearer than typical tutorials.

When a worker starts:

```text
1. connect to durable stores
2. verify database/schema compatibility
3. establish worker identity
4. begin claim loop
5. discover pending runs
6. discover expired leases/orphans
7. reclaim eligible work
8. resume from durable runtime state
```

This is the bridge between:

```text
“My checkpoint is still in PostgreSQL.”
```

and:

```text
“My product actually continued the job.”
```

A checkpoint does not schedule itself.

## Health versus readiness

### Health

Answers:

```text
Is this process alive?
```

### Readiness

Answers:

```text
Can this process safely accept or execute work?
```

Readiness may require:

```text
database reachable
required migrations applied
secrets/config present
scheduler started
dependency initialization complete
```

A process can be healthy but not ready.

## Deployment compatibility

A long-running job may outlive a software release.

Every run should record at least:

```text
code_version
state_schema_version
```

When code changes, classify:

### Compatible

New code can safely resume old state.

### Migratable

Old state must be transformed before resume.

### Breaking

Drain/pin/terminate old runs explicitly rather than hoping they work.

## Redeploy timeline

```text
Worker A owns run_123
  ↓
deploy begins
  ↓
Worker A terminated
  ↓
lease remains temporarily
  ↓
Worker B starts new version
  ↓
startup claim loop runs
  ↓
A's lease expires
  ↓
B claims run with new lease generation
  ↓
loads durable checkpoint
  ↓
continues
```

Now every concept from Modules 03 and 05 connects to deployment.

## Public/free hosting

A free web host and serverless Postgres can be used for the learning deployment.

Be explicit in the copy:

> Free hosting is a reproducible learning/portfolio environment, not a production SLA.

Process spin-down and restarts are useful failure injectors because the architecture should treat local memory as disposable.

Do not claim an in-process FastAPI background task is a durable queue.

If the course uses a small DB-backed worker loop for simplicity, say so and explain what would change in a larger production deployment.

## Abuse and cost controls

A public agent endpoint can spend real money.

At minimum discuss:

```text
authentication or abuse-resistant access
per-user/tenant concurrency
maximum pages per run
maximum model steps
maximum cost
request-size limit
allowed URL/domain policy
```

## Runbook

Require the learner to answer:

```text
How do I find a stuck run?
How do I cancel it?
How do I inspect ownership?
How do I see the last useful progress?
How do I investigate an ambiguous side effect?
How do I find its trace?
How do I disable new run creation?
How do I roll back a bad deploy?
```

A service is not fully built if nobody can operate it.

<div class="callout failure-lab">

**FAILURE LAB 13: The Redeploy**

Restart/redeploy while the run is:

1. in an ordinary research step;
2. waiting for review;
3. owned by a worker;
4. near/inside an ambiguous publish.

Verify:

```text
committed state survives
runnable work is discovered automatically
expired ownership is reclaimed
human wait survives
publish does not duplicate
code/schema version is visible
```

Normal recovery should require no manual database editing.

</div>


## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why should API request handling be decoupled from long execution?
2. What is startup reconciliation?
3. Why does a checkpoint not automatically resume itself?
4. What is health versus readiness?
5. Why should a run record code and schema versions?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] Public URL live on the free tier, deployed from main
- [ ] The redeploy lab passed, both mid-research and mid-review
- [ ] Migrations are additive and run before the new code starts
- [ ] Security minimums applied: rate limit, allow-list, escaped rendering, untrusted-content fences
- [ ] deploy_checklist.md records what you verified, including the redeploy lab

</div>

## Primary sources

- [Render free instance limitations](https://render.com/docs/free) and [Neon free-plan limits](https://neon.com/docs/introduction/plans): the two pages that decide whether Lesson 14.2's constraints still hold. Hosting limits change without notice; verify both before relying on this module's numbers.
