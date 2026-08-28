# Technical architecture

## Deployment decision

Build inside the existing Learn site and existing Cloudflare Worker.

Do not create a new application or backend.

```text
Browser
  |
  +-- Astro page at /fde-gym/
  +-- React island
  |     +-- setup
  |     +-- chat
  |     +-- React Flow canvas
  |     +-- timer and session state
  |     +-- result and report gate
  |
  +-- POST /api/fde-gym/start
  +-- POST /api/fde-gym/message
  +-- POST /api/fde-gym/finish
  +-- POST /api/fde-gym/report
  +-- POST /api/fde-gym/feedback
             |
             +-- existing Cloudflare Worker
             +-- scenario truth
             +-- interviewer model call
             +-- evaluator model call
             +-- deterministic graph rules
             +-- Cohort 0 KV session record with TTL
             +-- Substack subscription
             +-- optional Resend email
```

## Why a React island

The Learn site remains Astro and MDX. Only the highly interactive FDE Gym
workspace needs React.

React Flow provides a machine-readable graph with nodes, edges, positions,
labels, and custom types. The rest of Learn should not be converted to React.

## Session model

The browser carries a sanitized session object for rendering and sends it with
each API call. For Cohort 0, the `FDE_GYM_SESSIONS` KV record is canonical and
is stored only after explicit research consent. It expires through a configured
TTL.

The Worker reloads that canonical record before every interview, finish,
report, and feedback operation. A missing or expired record is not silently
reconstructed from browser data.

An explicit `FDE_GYM_ALLOW_STATELESS_DEV=true` escape hatch supports isolated
local UI and API development. It must remain disabled in Cohort 0 production.
Detailed email reports are unavailable in stateless mode because the full
evaluation never returns to the browser.

The server validates and clamps all client-carried data. Never trust a
client-provided score, coverage state, fact reveal, or evaluation.

## Scenario truth

The full scenario remains under root Worker source and is never included in the
browser bundle.

The client receives only:

- candidate-visible opening
- broad charter
- current interviewer messages
- its own session data
- final summary after evaluation

Hidden facts, rubric anchors, strong and weak signals, and reference
architectures stay server-side.

## Interviewer and evaluator separation

### Interviewer

Inputs:

- scenario
- target level and mode
- elapsed time and phase
- candidate's latest message
- recent transcript
- current architecture graph
- relevant customer facts that may now be revealed
- neutral coverage state
- deterministic structural signals

Outputs:

- one interviewer message
- fact IDs revealed in that message
- competencies probed by the question
- current phase
- whether a final defense or end is appropriate

The interviewer does not assign a score or verdict.

### Evaluator

Runs only after finish.

Inputs:

- entire transcript
- final architecture graph
- meaningful architecture revisions
- facts revealed and when
- neutral evidence timeline
- scenario truth and rubric
- deterministic findings
- target level and duration

Outputs:

- evidence-backed competency judgments
- overall score
- strongest area
- biggest gap
- interviewer note
- personalized remediation
- recommended next drill
- comparison with multiple defensible architectures

The server derives the final verdict and bar-relative status from the evidence,
coverage requirements, target bar, and score.

## Hybrid evaluation

### Layer 1: graph rules

Detect structural concerns such as:

- many agents with no clear independent boundaries
- vector store used without an authoritative data store
- multi-day work with no durable workflow or persisted state
- consequential action path with no policy or human boundary
- no visible evaluation, identity, or operational-visibility component
- direct model access to a broad privileged system

These are findings, not automatic final judgments. Candidate explanations in
the transcript may resolve or outweigh a visual concern.

### Layer 2: scenario requirement coverage

Track whether critical requirements were:

- discovered independently
- revealed after a good question
- tested by the interviewer
- available but omitted
- never adequately tested

### Layer 3: LLM judgment

Judge reasoning, discovery quality, tradeoffs, communication, and the fit
between requirements and architecture.

### Layer 4: server-side verdict

Do not allow the model to decide whether enough evidence exists.

For a 30-minute full mock, require evidence across grouped critical areas:

1. problem framing and architecture
2. agentic versus deterministic control
3. reliability and action safety
4. AI quality and system validation
5. data access and action authority
6. operational visibility

When coverage is inadequate, return `INCOMPLETE ASSESSMENT` instead of a
fabricated pass or fail.

For a 15-minute drill, require sufficient evidence only for the drill focus.

## Evidence model

Every transcript turn, graph node, edge, and semantic graph revision receives
a stable ID.

Evaluator statements must cite those IDs internally.

The user-facing report should translate IDs into understandable evidence, for
example:

> You introduced durable execution after the crash scenario was presented.
> That meets the FDE bar, but a Senior FDE would usually surface the side-effect
> recovery risk earlier.

## Meaningful architecture revisions

Store semantic changes only:

- component added or removed
- connection added or removed
- component label or type changed
- major graph section replaced

Ignore cosmetic movement and zoom.

The evaluator should distinguish:

- independent recognition
- responsive correction after a realistic constraint
- hinted correction
- unresolved gap

## Model provider

V1 uses the existing Cloudflare Workers AI binding.

Environment variables select separate model names for:

- interviewer
- evaluator

The code includes deterministic degraded behavior when the binding is absent.
That mode is useful for UI development, but it is not sufficient for realism
validation.

## Email report

The report route:

1. validates email and explicit subscription choice
2. subscribes through the existing Substack origin
3. sends the personalized report through Resend when configured
4. optionally mirrors the event through the existing lead webhook
5. uses an idempotency key derived from the session ID

No client-side email provider key is allowed.

## Security and privacy

- same-origin API calls only
- strict request-size and graph-size validation
- no transcript logging
- hidden scenario facts remain server-side
- HTML escape all candidate-controlled report text
- explicit Cohort 0 consent
- warning against confidential information
- TTL on retained sessions
- no account or persistent readiness profile
