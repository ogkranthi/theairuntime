---
id: "02"
slug: "agent-loop-and-control-boundaries"
title: "The Agent Loop and Its Control Boundaries"
track: "Foundations"
duration_minutes: 120
difficulty: "Core"
build_milestone: "Implement a bounded tool-calling loop with typed state and stop conditions."
objectives:
  - "Design an application-owned agent loop with structured decisions"
  - "Enforce state preconditions, policy, and budgets outside the model"
  - "Define stop, repair, no-progress, and escalation behavior"
prerequisites:
  - "should-this-be-an-agent"
---

# The Agent Loop and Its Control Boundaries

## What you will design

You will implement a bounded tool-calling loop with explicit state, typed decisions, budgets, and terminal conditions.

## The smallest useful agent runtime

A tool-using agent repeatedly:

1. assembles context;
2. asks a model for the next decision;
3. validates the decision;
4. executes an allowed tool or returns an answer;
5. records the result;
6. decides whether to continue.

A minimal conceptual loop:

```python
while not state.terminal:
    context = context_builder.build(state)
    decision = model.decide(context, output_schema=NextAction)
    validated = policy.validate(decision, state)
    result = tool_gateway.execute(validated.tool_call)
    state = reducer.apply(state, decision, result)
    budgets.check(state)
```

The production work is hidden in the nouns: state, context builder, output schema, policy, tool gateway, reducer, budgets, and terminal conditions.

## Deterministic shell, probabilistic core

The model is good at interpreting ambiguous evidence and proposing a next action. It should not own:

- authentication;
- authorization;
- schema enforcement;
- idempotency;
- clock time;
- rate limits;
- financial arithmetic;
- hard policy rules;
- persistence;
- audit logging;
- retry semantics;
- final authority for consequential actions.

The application can let the model choose from a bounded action set while retaining deterministic control over whether and how the action happens.

## Explicit state

Do not treat the prompt transcript as the only state.

A useful Atlas run state might contain:

```python
class AtlasState(BaseModel):
    case_id: str
    tenant_id: str
    status: Literal[
        "researching",
        "waiting_for_input",
        "awaiting_review",
        "completed",
        "failed",
        "cancelled",
    ]
    entity_candidates: list[EntityCandidate]
    selected_entity: Entity | None
    evidence: list[EvidenceItem]
    conflicts: list[Conflict]
    unresolved_questions: list[str]
    completed_steps: set[str]
    pending_action: ProposedAction | None
    iteration_count: int
    model_token_count: int
    tool_cost_usd: Decimal
    deadline_at: datetime
    versions: VersionBundle
```

The model sees a projection of this state, not necessarily the full internal object.

## Typed decisions

Use a discriminated schema for next actions:

```python
class CallTool(BaseModel):
    kind: Literal["call_tool"]
    tool_name: Literal[
        "resolve_entity",
        "screen_sanctions",
        "search_adverse_media",
        "extract_uploaded_document",
    ]
    arguments: dict
    rationale_summary: str

class AskHuman(BaseModel):
    kind: Literal["ask_human"]
    question: str
    blocking: bool

class Finish(BaseModel):
    kind: Literal["finish"]
    packet: DueDiligencePacket

NextAction = Annotated[
    CallTool | AskHuman | Finish,
    Field(discriminator="kind"),
]
```

Structured output reduces parsing ambiguity. It does not prove that the decision is correct, authorized, or safe. Validate semantics after schema validation.

## Control points

### Before the model call

- choose the model;
- select trusted instructions;
- retrieve authorized context;
- set a time and token budget;
- exclude secrets and irrelevant history;
- attach tool schemas appropriate to the current state.

### After the model call

- validate the schema;
- reject unknown tools;
- validate arguments;
- enforce policy;
- detect a repeated or no-progress action;
- require approval where needed;
- record model, prompt, schema, and policy versions.

### Before tool execution

- resolve identity and scopes;
- attach an idempotency key;
- apply timeout and retry class;
- enforce rate and concurrency limits;
- sanitize or normalize arguments;
- record an action intent.

### After tool execution

- validate the result;
- classify errors;
- record the effect status;
- redact sensitive content before model context;
- update state with a deterministic reducer;
- decide whether progress occurred.

## Stop conditions

Every loop needs multiple independent stops:

- success condition;
- explicit human wait;
- maximum iterations;
- token budget;
- cost budget;
- wall-clock deadline;
- repeated-action detector;
- no-progress detector;
- cancellation;
- policy denial;
- unrecoverable tool failure.

“Run until done” is not a production stop condition.

## Progress and loop health

Track a compact progress signature, for example:

```text
selected entity + evidence classes present + conflicts resolved + pending requirements
```

If the signature does not change across multiple iterations, the loop may be stuck even if the text changes.

Useful loop metrics:

- iterations per successful case;
- repeated tool-call rate;
- no-progress termination rate;
- average tool diversity;
- human escalation rate;
- token and cost per resolved evidence gap;
- finish-attempt rejection rate.

## Model and tool errors are different

Treat these separately:

| Failure | Example | Typical handling |
|---|---|---|
| Model transport | timeout, 429 | retry with backoff or fallback |
| Model contract | invalid schema | limited repair/retry |
| Model behavior | poor tool choice | eval failure, policy, or escalation |
| Tool transport | network timeout | retry if safe |
| Tool domain | entity not found | return typed result to agent |
| Tool authorization | forbidden | terminal or human escalation |
| Tool effect uncertainty | timeout after write | reconcile by idempotency/effect lookup |
| Policy denial | prohibited action | do not retry unchanged |

A generic “try again” loop can amplify failure.

## Failure injection: endless research

Atlas finds two conflicting directors. It repeatedly searches different phrasings, retrieves the same articles, and never reaches confidence.

Controls:

1. evidence fingerprints detect duplicate results;
2. the progress signature stays unchanged;
3. the loop reaches a research budget;
4. the system produces an unresolved conflict;
5. the workflow transitions to human review.

The correct outcome is not always autonomous completion. A controlled escalation is success.

## SHIP: build the bounded loop

Implement:

- explicit `AtlasState`;
- typed `NextAction`;
- model adapter;
- policy validator;
- tool registry;
- deterministic reducer;
- iteration, token, cost, and time budgets;
- no-progress detection;
- terminal outcomes.

Use stub tools. Persist every transition as a trace event.

## RUN: break the loop

Test:

1. model returns invalid JSON;
2. model calls an unavailable tool;
3. model repeats the same tool and arguments;
4. tool returns an oversized result;
5. policy denies a proposed action;
6. cost budget is exhausted;
7. user cancels during a tool call.

For each, define the final state and user-visible status.

## DESIGN: interview drill

**Prompt:** Design a research agent that can browse sources and produce a cited market report.

Explain:

- the loop state;
- action schema;
- tool boundary;
- progress measurement;
- stop conditions;
- how conflicting evidence becomes an explicit output rather than an endless loop.

## Check your understanding

1. Why is schema-valid model output still untrusted?
2. Name four stop conditions other than success.
3. What is a progress signature?
4. Why should a deterministic reducer update state?
5. Distinguish a tool domain error from uncertain side-effect status.

## Primary references

- [OpenAI: Structured Model Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI: Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [Anthropic: Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)
