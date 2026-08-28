# Quiz Answer Key

Total questions: 51

## orientation-runtime-method

### 00-q1

Which statement best defines a production agent in this course?

**Correct:** `b`

The model is one component. The application owns validation, authorization, persistence, effects, observation, and recovery.

### 00-q2

Which requirements directly imply a durable workflow?

**Correct:** `a, c`

Long waits and late external signals require persisted execution state. Structured output is important but does not by itself require a durable workflow.

### 00-q3

What should an engineer do first when given 'build an onboarding agent'?

**Correct:** `c`

Architecture follows the user outcome and consequence of failure, not a preferred framework.

## should-this-be-an-agent

### 01-q1

Which use case most strongly justifies a bounded agent rather than a fixed workflow?

**Correct:** `b`

Dynamic action selection under uncertainty is a good reason for bounded autonomy. Deterministic rules should remain deterministic code.

### 01-q2

Which factors should reduce the amount of autonomy granted?

**Correct:** `a, b, c`

High consequence, irreversible effects, and clear deterministic logic all favor stronger workflow or human control.

### 01-q3

What is the best initial Atlas design?

**Correct:** `b`

Start with the minimum autonomy that produces measurable benefit and expand only after evaluation.

## agent-loop-and-control-boundaries

### 02-q1

After a model returns a proposed tool call, what should happen next?

**Correct:** `b`

Tool availability in a prompt is not authorization. The application controls execution.

### 02-q2

Which are valid bounded-loop stop conditions?

**Correct:** `a, b, c`

A production loop has explicit success, budget, and no-progress termination or escalation.

### 02-q3

Why should a model return a reason code in addition to a free-form rationale?

**Correct:** `b`

Controlled categories are measurable and enforceable. They do not make model reasoning inherently truthful.

## tool-contracts-and-side-effects

### 03-q1

A payment API times out after the charge may have succeeded. What is the safest next step?

**Correct:** `c`

This is an uncertain effect in the acknowledgment gap. Reconciliation prevents duplicate side effects.

### 03-q2

What belongs in a production tool contract?

**Correct:** `a, b, c`

A tool is an operational contract, not merely a prompt description.

### 03-q3

Which statement about 'exactly once' is most accurate?

**Correct:** `b`

Durable runtimes coordinate observations, but external activities may execute more than once.

## context-engineering-and-grounding

### 04-q1

Where should ACL filtering occur for enterprise retrieval?

**Correct:** `b`

The model should never receive evidence the current principal is not authorized to access.

### 04-q2

Which metadata supports claim-level grounding?

**Correct:** `a, b, c`

Grounding needs traceable, versioned evidence, not a generic architecture label.

### 04-q3

A retrieved webpage instructs the agent to ignore policy. How should the system treat it?

**Correct:** `b`

Retrieved content may inform factual work but cannot become trusted system instruction.

## state-sessions-and-memory

### 05-q1

Which store should preserve a large uploaded source document?

**Correct:** `b`

Large evidence belongs in artifact storage; run state should hold stable references and status.

### 05-q2

Which properties should a long-term memory write include?

**Correct:** `a, b, c`

Memory is governed data. Model extraction does not make a fact trustworthy.

### 05-q3

How is durable workflow state different from long-term memory?

**Correct:** `b`

Durability and memory solve different problems and have different correctness/lifecycle requirements.

## orchestration-patterns

### 06-q1

When is parallel fan-out appropriate?

**Correct:** `a`

Independent safe work can run concurrently; dependencies and join requirements must remain explicit.

### 06-q2

What should a join policy define?

**Correct:** `a, b, c`

Production joins account for partial failure rather than assuming universal success.

### 06-q3

What most strongly justifies a separate specialist agent?

**Correct:** `b`

Separate agents should reflect a real system boundary, not role-play.

## durable-long-running-agents

### 07-q1

Why should a model call be recorded as an activity result in a durable workflow?

**Correct:** `b`

Replaying control flow should not silently re-invoke a nondeterministic model.

### 07-q2

Which belong outside replayable workflow code?

**Correct:** `a, b, c`

External and nondeterministic work belongs in activities or runtime-provided recorded APIs.

### 07-q3

A workflow waits two days for approval. What resource should it consume while waiting?

**Correct:** `c`

Durable waits persist state and resume on an external event without holding compute.

## human-in-the-loop-and-authority

### 08-q1

What must an approval be bound to?

**Correct:** `b`

A later edit or changed action must not inherit approval intended for an older version.

### 08-q2

Which are expected HITL outcomes?

**Correct:** `a, b, c`

Human review needs explicit paths, timeout/expiry, escalation, and durable state.

### 08-q3

Why is a UI approve button alone insufficient?

**Correct:** `b`

HITL is an end-to-end authority and state transition, not a front-end decoration.

## multi-agent-mcp-a2a

### 09-q1

What is the safest interpretation of an MCP server advertising a tool?

**Correct:** `b`

Capability discovery does not grant authority.

### 09-q2

Which conditions may justify an A2A or independent-agent boundary?

**Correct:** `a, b, c`

Protocol boundaries add cost and failure modes and should map to real independence.

### 09-q3

How does a handoff differ from using an agent as a tool?

**Correct:** `b`

Responsibility, state, and user interaction differ between delegation styles.

## security-identity-isolation-governance

### 10-q1

What is the strongest defense against a model generating another tenant's record ID?

**Correct:** `b`

Security must hold even when model output is wrong or malicious.

### 10-q2

Which controls belong in a sandbox for generated code?

**Correct:** `a, b, c`

Isolation and least privilege constrain code even when generated content is malicious.

### 10-q3

Why is tool-output normalization important?

**Correct:** `b`

Normalization reduces instruction confusion but does not eliminate the need to validate or distrust external data.

## agent-evaluation-and-testing

### 11-q1

Why can a correct final answer still be a failed agent run?

**Correct:** `b`

Production correctness includes process, policy, safety, and operations, not only output text.

### 11-q2

Which datasets should an agent evaluation program maintain?

**Correct:** `a, b, c`

A single tuned golden set creates overfitting and misses attacks and production failures.

### 11-q3

What is the preferred grader for a schema invariant?

**Correct:** `b`

Use the least ambiguous grader available; reserve model judges for genuinely semantic qualities.

## observability-slos-and-incidents

### 12-q1

Which identifier should connect a multi-day Atlas execution across workers and callbacks?

**Correct:** `b`

Long-running causal correlation must survive process and service boundaries.

### 12-q2

Which conditions can be part of a valid-completion SLI?

**Correct:** `a, b, c`

HTTP success is insufficient when business, evidence, and authority invariants define success.

### 12-q3

Where should raw sensitive prompts usually be stored for debugging?

**Correct:** `b`

Prompts and outputs can contain customer data and require controlled access, retention, and redaction.

## latency-cost-scale

### 13-q1

What is the best first latency optimization?

**Correct:** `b`

Reduce the work before choosing lower-capability paths or weakening controls.

### 13-q2

Which controls reduce retry-storm risk?

**Correct:** `a, b, c`

Retries must be bounded and coordinated to avoid multiplying load during dependency failure.

### 13-q3

Why might a cheaper model increase total cost?

**Correct:** `b`

Optimize total system economics using measured task quality, not model price alone.

## deployment-enterprise-readiness

### 14-q1

What should identify the behavior of a production agent release?

**Correct:** `b`

Production behavior is created by the entire versioned system.

### 14-q2

What makes shadow execution safe?

**Correct:** `a, b, c`

Shadow runs compare behavior without allowing the candidate release to mutate production.

### 14-q3

A long-running workflow is active during rollback. What is the correct approach?

**Correct:** `b`

In-flight behavior must be deliberate and replay-compatible.

## system-design-interview

### 15-q1

What should the first architecture diagram accomplish?

**Correct:** `b`

Start coarse and add detail only where constraints require it.

### 15-q2

Which clarifying questions usually change an agent architecture?

**Correct:** `a, b, c`

Authority, risk, and runtime shape determine core architecture.

### 15-q3

Which is the strongest tradeoff statement?

**Correct:** `b`

A strong tradeoff ties a choice to a requirement, names the cost, and states a trigger for change.

## capstone-atlas

### 16-q1

Which Atlas action must remain outside autonomous model authority?

**Correct:** `c`

The capstone deliberately keeps the material business decision with an authorized human/system.

### 16-q2

Which demonstrations make the Atlas capstone more than a happy-path demo?

**Correct:** `a, b, c`

The capstone proves control, trust, durability, and human authority through failure.

### 16-q3

What should happen when the autonomous cost budget is exhausted before mandatory checks finish?

**Correct:** `c`

Budgets must not convert incomplete work into false certainty.

