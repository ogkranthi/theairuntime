# FDE Gym V1 product specification

## Product

**FDE Gym**  
Agentic System Design Interview Simulator  
by The AI Runtime

## Audience

The first user is an aspiring Forward Deployed Engineer who knows some Python
and LLM concepts and wants to pass an Agentic System Design interview.

## Primary outcome

Interview readiness.

The promise is:

> Practice being an FDE before you get the job.

The first experience is not a general course, coding sandbox, certification, or
full work simulator. It is a realistic system-design interview.

## V1 role inside The AI Runtime

FDE Gym is a free AIR learning tool and authority engine. It should connect
practice failures to targeted AIR remediation content.

The product lives inside `learn.theairuntime.com`, while retaining its own
memorable name.

## Core differentiator

Interview realism.

FDE Gym must feel meaningfully closer to a strong human FDE interviewer than a
generic chat prompt. The canvas, evaluator, scenario format, and remediation
exist to support that realism.

## V1 scope

### Included

- one curated scenario family: Counterparty Due Diligence
- one fixed 30-minute Cohort 0 benchmark
- one focused 15-minute drill
- Practice and Mock modes
- Foundations, FDE, and Senior FDE target bars
- adaptive probing inside the selected level
- Staff FDE interviewer persona
- candidate-led conversation
- structured architecture blocks with optional technology labels
- simple arrows with optional labels
- custom components that retain an architectural type
- think-aloud architecture reasoning
- separate interviewer and evaluator
- hybrid evaluation
- verdict, score, strength, gap, and specific interviewer note
- personalized email report after subscription
- Cohort 0 feedback survey
- explicit consent and temporary beta retention

### Excluded

- voice
- coding sandbox
- customer documents, logs, schemas, or fake workspaces
- account creation
- longitudinal learner profile
- leaderboards, badges, share cards
- company-specific proprietary interview claims
- generated scenario variants
- certification
- multi-user collaboration
- full FDE work simulation

## Session choices

### Duration

**15-minute drill**

A focused subsystem challenge. The first drill tests execution reliability and
action safety inside the same due-diligence world.

**30-minute mock**

A complete ambiguous Agentic System Design round.

### Mode

**Practice Mode**

- competency areas are visible
- exact timer is visible
- reference notes are available
- progressive hints are allowed
- restart and undo are allowed
- remediation follows mistakes

**Mock Mode**

- rubric is hidden
- exact clock is hidden
- Staff FDE gives natural time cues
- no hints, regeneration, or rewind
- architecture may be revised
- final result is bar-relative

### Target level

**Foundations**

The opening prompt gives more context. The bar focuses on sound primitives and
basic production awareness.

**FDE**

The opening is sparse. The candidate must independently design a credible
production system and discuss tradeoffs.

**Senior FDE**

The opening is highly ambiguous and may contain a questionable customer
premise. The bar emphasizes simplification, risk, failure modes, uncertainty,
MVP scope, and customer judgment.

The interviewer adapts within the selected bar but never silently changes the
bar used for the result.

## Interview protocol

### Opening

The candidate sees only:

- target level
- duration
- broad charter: understand the problem, design the system, reason about
  production constraints, and communicate tradeoffs
- the candidate-visible scenario prompt

The detailed rubric stays hidden in Mock mode.

### Candidate-led behavior

The candidate decides:

- which discovery question to ask next
- when enough is known to sketch a first architecture
- which part to explain or revise
- when to make an explicit assumption
- which tradeoff to defend

The interviewer responds, challenges, introduces constraints when appropriate,
and intervenes only to protect pacing or assessment quality.

### Canvas behavior

The canvas is available immediately.

Canvas changes are context, not conversation turns. The interviewer normally
reacts only after the candidate sends a message or reaches a natural pause.

The canvas contains structured blocks, not freehand drawing.

### Weak or vague answers

Probe once to distinguish imprecision from lack of understanding. Then move on.
A critical concept may be tested later through a different constraint.

### Strong answers

Sometimes apply a devil's-advocate challenge. Strong candidates should be
pushed toward the edge of their understanding.

### Technical errors

Challenge without teaching in Mock mode. Allow self-correction. Teach after the
interview or in Practice mode.

### Calibrated uncertainty

Reward a candidate who identifies what they do not know, states the property
they need, and explains how they would verify the technology-specific detail.
Do not reward bluffing.

### Final defense

The 30-minute mock ends with:

1. a two-minute final architecture defense
2. one executive or customer challenge
3. interview end without teaching

A late constraint is used only as an adaptive difficulty escalator for a strong
candidate.

## Product principles

1. Interview realism is the product.
2. Good system design has multiple defensible answers.
3. Agentic complexity must earn its place.
4. The model context is not durable state.
5. Prompts are not authorization boundaries.
6. A vector index is not a source of truth.
7. Retries do not automatically make side effects safe.
8. Evaluation is part of the architecture.
9. Failure-mode thinking and architectural restraint are senior signals.
10. Never claim assessment certainty without sufficient evidence.
11. Never tell a candidate they are weak without showing evidence.
12. Score the reasoning process, not only the final diagram.

## Success criteria

Primary validation questions:

1. Was this more realistic than practicing the same case with generic ChatGPT?
2. Would the participant do another 15-minute scenario tomorrow?

Secondary signals:

- completion rate
- email-report request rate
- sufficient-assessment coverage rate
- human and automated verdict agreement
- actual interview preparation stories

Cohort 0 should favor 15-20 relevant participants over broad traffic.
