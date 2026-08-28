# Agentic System Design Glossary

Definitions are intentionally production-oriented. Frameworks may use the same word differently; state the local meaning in a design.

## A

**A2A (Agent2Agent Protocol)**: A protocol for agents or agent services to discover capabilities, exchange tasks, communicate progress, and return artifacts across system or organizational boundaries. It does not replace local authorization or policy.

**Acknowledgment gap**: The interval after an external effect may have occurred but before the caller durably records success. Retrying blindly during this gap can duplicate the effect.

**Action**: A model-proposed or workflow-selected next step. An action is not executed until the application validates and authorizes it.

**Activity**: In a durable workflow system, a unit of nondeterministic or external work such as a model call, API request, file operation, or database effect. Activities may execute more than once and therefore need effect-safe semantics.

**Agent**: A software system in which a model dynamically selects among allowed actions based on observations and state to pursue a goal. The surrounding application owns authority, persistence, and enforcement.

**Agent loop**: The bounded sequence of assemble context → request decision → validate → authorize → execute → observe → update state → stop or repeat.

**Agentic workflow**: A workflow that includes one or more model-controlled decisions but retains explicit application-owned control flow.

**Artifact**: A versioned, persistent output or large input such as a due-diligence packet, document, prompt snapshot, code patch, or report.

**Authority boundary**: The line between what the model may propose and what the application, policy engine, or human may authorize.

## B

**Backoff**: Increasing delay between retries, usually with jitter, to avoid amplifying a dependency failure.

**Backpressure**: A mechanism that tells upstream producers to slow down, defer, or reject work when downstream capacity is saturated.

**Bounded autonomy**: Agent behavior constrained by allowed actions, scope, state preconditions, budgets, stop rules, and approval policy.

**Bulkhead**: Resource isolation that prevents one tenant, workload, dependency, or tool from exhausting the entire system.

## C

**Cache key**: The complete identity of reusable data. In an agent system it may need tenant, authorization, source version, freshness, model, prompt, parser, and policy dimensions.

**Canary release**: A production rollout to a small, representative subset of live traffic before broader deployment.

**Capability**: A tool, resource, prompt, or agent service that can perform a bounded function. Discovery of a capability does not grant permission to use it.

**Checkpoint**: Persisted execution state from which a run or graph can resume. A checkpoint is not necessarily the same as a durable workflow event history.

**Circuit breaker**: A dependency-protection pattern that temporarily stops calls after failures exceed a threshold, then probes recovery.

**Claim-level provenance**: A mapping from each material generated claim to one or more source identifiers and exact locators.

**Compensation**: A business action that reverses or mitigates a completed external effect. It is not the same as rolling back an in-process database transaction.

**Context assembly**: Selecting, filtering, ranking, formatting, and budgeting the instructions, state, evidence, history, and tool information provided for one model decision.

**Context engineering**: Designing what information and capabilities are available to a model at each step, including selection, compaction, provenance, trust, and token budgets.

**Control plane**: The deterministic software layer that validates, authorizes, schedules, persists, observes, and recovers agent behavior.

**Critical path**: The longest dependency chain that determines minimum end-to-end latency.

## D

**Dead letter**: Work that cannot complete after defined handling and is moved to an explicit queue or state for investigation rather than retried forever.

**Decision schema**: A typed structure that limits model output to allowed fields and actions.

**Deterministic replay**: Reconstructing workflow state by re-running control-flow code against recorded events while producing the same decisions for the same history.

**Durable execution**: Persisting enough execution history or state for work to resume after crashes, deploys, or long waits without restarting unsafe effects.

## E

**Effect**: A change visible outside the local decision process, such as sending a message, charging a card, publishing an artifact, or modifying a system of record.

**Effect reconciliation**: Querying the authoritative external system to determine whether an uncertain effect occurred before deciding to retry, compensate, or escalate.

**Error budget**: The amount of unreliability permitted by an SLO over a window. Some security requirements remain zero-tolerance and are not ordinary error budgets.

**Eval case**: A versioned input fixture, expected properties, rubric, and metadata used to measure system behavior.

**Evaluator-optimizer**: A pattern in which one step generates work and another evaluates it against explicit criteria, repeating within a bound.

**Event history**: An ordered durable record of workflow events used to restore and audit execution.

**Excessive agency**: Granting an agent more capability, permission, scope, or autonomy than required for the user outcome.

## F

**Fallback**: A validated alternate model, provider, tool, source, or workflow path used when the primary path is unavailable or unsuitable.

**Fan-out/fan-in**: Running independent branches in parallel and joining them according to a defined completion policy.

**Feature flag**: A trusted runtime control that enables, disables, or changes a capability without requiring the model to decide its own configuration.

**Freshness policy**: Rules defining how recent evidence or cached results must be for a task or risk tier.

## G

**Golden set**: A stable, reviewed collection of representative eval cases used for regression testing.

**Guardrail**: A check that can block, modify, or route input, output, or tool behavior. A guardrail is one layer, not a replacement for authorization or isolation.

## H

**Handoff**: A control transfer in which another agent becomes responsible for continuing the interaction or task. It differs from calling another agent as a bounded tool and receiving a result.

**Heartbeat**: A progress signal from a long-running activity that lets the runtime detect failure and optionally retain a progress checkpoint.

**HITL (Human-in-the-Loop)**: A designed workflow state in which an authenticated human reviews, edits, approves, rejects, or redirects work before a controlled transition.

**Human-on-the-loop**: Human oversight of an operating system without reviewing every action, often through monitoring, exception handling, and policy.

## I

**Idempotency**: The property that repeating an operation with the same logical request identity produces no additional unintended effect.

**Idempotency key**: A stable identifier used by the caller and ideally the external system to deduplicate a logical effect.

**Indirect prompt injection**: Malicious or conflicting instructions embedded in retrieved webpages, documents, emails, tool output, or other content rather than directly entered by the user.

**Information gain**: The expected reduction in uncertainty from an action. It can help prioritize research under step, time, and cost budgets.

**Instruction/data separation**: Treating system/developer policy as instructions and retrieved/user content as untrusted data that cannot redefine authority.

## J

**Join policy**: Rules for when parallel branches may proceed: mandatory results, optional results, timeouts, degraded states, and escalation.

**Jitter**: Random variation added to retry delays so many clients do not retry simultaneously.

## L

**Least privilege**: Granting each user, service, tool, and workflow only the permissions needed for the current task and scope.

**Long-term memory**: Governed information retained across threads or tasks, such as a durable user preference or organization fact. It is not ordinary run state.

## M

**MCP (Model Context Protocol)**: A protocol for a host to connect to servers that expose resources, prompts, and tools through negotiated capabilities. The host remains responsible for trust, authorization, consent, and data handling.

**Memory poisoning**: Introducing false, malicious, or inappropriate information into retained memory so later behavior is influenced.

**Model gateway**: A centralized layer for model access, approved aliases, routing, credentials, quotas, structured output, telemetry, and fallback.

**Model judge**: A model used to grade another model or agent output. It requires a clear rubric and calibration against human labels.

**Multi-agent system**: A system with multiple independent or semi-independent model-driven components. Separate agents should be justified by trust, lifecycle, ownership, specialization, or scaling boundaries, not character names.

## N

**No-progress loop**: Repeated decisions or actions that do not materially change evidence, state, or outcome.

**Non-deterministic work**: Work whose result can vary or depends on the external world, such as time, network calls, model output, or random values. Durable runtimes record it outside replayable control code.

## O

**Observation**: A normalized, persisted result made available to the workflow or agent after tool execution, policy, or user input.

**Orchestrator**: The component that coordinates steps, state, tools, and agents. It may be deterministic, model-assisted, or mixed.

**Outcome eval**: Evaluation of the final user or business result rather than only an intermediate model output.

## P

**Policy engine**: A trusted component that evaluates identity, state, risk, resource, and action rules outside natural-language model instructions.

**Prompt cache**: Reuse of a stable prompt prefix or provider-side computation. It is an optimization, not a state or correctness mechanism.

**Prompt injection**: Input that attempts to change or override intended instructions, reveal data, or induce unauthorized behavior.

**Provenance**: Metadata showing where information came from, when it was retrieved, which version was used, and how it supports an output.

## Q

**Quality gate**: A release condition that must pass before a new model, prompt, workflow, policy, or tool version receives more traffic.

## R

**Rate limit**: A provider or application constraint on requests, tokens, concurrency, or work over time.

**Reason code**: A controlled categorical explanation used for routing, audit, or evaluation. It is easier to measure than free-form rationale.

**Release bundle**: The versioned combination of code, workflow, prompts, model policy, retrieval configuration, tools, policy, schemas, and datasets that defines production behavior.

**Replay-safe code**: Workflow control code that produces the same decisions when reconstructed from its recorded history.

**Retrieval grounding**: Supplying relevant external evidence to a model and constraining outputs to evidence-backed claims.

**Retry budget**: A cap on additional work caused by retries, protecting the system from amplification.

**Risk tier**: A classification that determines allowed autonomy, required evidence, model route, review, retention, and operational controls.

**RPO (Recovery Point Objective)**: Maximum acceptable data loss measured in time or committed work.

**RTO (Recovery Time Objective)**: Maximum acceptable time to restore a service or capability.

**Run**: One business execution of an agentic process, potentially spanning many services and long waits.

## S

**Sandbox**: An isolated execution environment with bounded filesystem, network, process, resource, and credential access.

**Semantic cache**: Reuse based on input similarity rather than exact identity. It requires careful scoping and is risky for time-sensitive or consequential outputs.

**Service-level indicator (SLI)**: A measured property of service behavior, such as valid completion rate or P95 latency.

**Service-level objective (SLO)**: A target for an SLI over a time window.

**Session state**: Conversation- or thread-scoped state used across several turns. It should have explicit ownership, retention, and compaction.

**Shadow execution**: Running a new version against mirrored or captured input without allowing production effects.

**Side effect**: See **Effect**.

**Signal**: An external event delivered durably to a waiting workflow, such as approval, cancellation, or document arrival.

**State machine**: An explicit set of states and allowed transitions with guards and effects.

**Step budget**: Maximum agent decisions or actions allowed in a run.

**Structured output**: Model output constrained or validated against a schema.

**Supervisor pattern**: One orchestrator delegates bounded work to specialists and remains responsible for global state and policy.

## T

**Tenant isolation**: Preventing one customer or business unit from accessing or affecting another across identity, storage, retrieval, caches, queues, tools, memory, telemetry, and operations.

**Thread state**: State retained for a conversation or task thread. Often synonymous with session state, but define the exact scope.

**Timer**: A durable scheduled wake-up used for retries, expiry, reminders, and escalation without holding a process thread.

**Tool**: A typed capability available to the agent through an application-controlled gateway.

**Tool gateway**: A trusted component that validates, authorizes, executes, observes, rate-limits, and audits tool calls.

**Tool-selection eval**: Evaluation of whether the correct tool, order, arguments, and error handling were chosen.

**Trace**: A causal record connecting work across services and asynchronous steps for one execution.

**Trace grading**: Evaluating the sequence of model, tool, policy, state, and approval events rather than only the final output.

**Trajectory**: The ordered series of decisions, actions, observations, and transitions taken during a run.

**Trust boundary**: A boundary across which data or authority changes trust level and therefore requires validation, authentication, authorization, or isolation.

## U

**Uncertain write**: An external write whose completion status is unknown because the response was lost or the caller crashed. It requires reconciliation.

**Untrusted content**: User, retrieved, uploaded, or tool-generated content that may be false, malicious, or instruction-bearing. It should not inherit system authority.

## V

**Valid completion**: A run that not only finishes, but also satisfies required evidence, policy, schema, authority, and safety conditions.

**Vector store**: A storage/indexing system that supports similarity search over embeddings. It is one possible retrieval component, not a memory or authorization system by itself.

## W

**Workflow**: Application-owned control flow with explicit steps and transitions. A workflow can include model decisions without giving the model full control.

**Workflow versioning**: Techniques that preserve compatibility for in-flight durable executions while code and behavior evolve.

## Z

**Zero-tolerance gate**: A release or runtime condition for which any occurrence is unacceptable, such as cross-tenant leakage or prohibited autonomous publication.
