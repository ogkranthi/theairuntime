# Scenario authoring guide

Cohort 0 uses one fixed scenario. Do not create generated variants yet.

## Authoring doctrine

Every scenario must combine:

1. a production anchor
2. an interview signal
3. an FDE tension

Example:

- Production anchor: a multi-day investigation can pause for human approval.
- Interview signal: candidate distinguishes execution state from model context.
- FDE tension: the customer says human review destroys the expected ROI.

## Structured where consistency matters

Use machine-readable fields for:

- candidate-visible openings
- customer facts and knowledge boundaries
- hidden requirements
- competencies
- reveal triggers
- strong and weak signals
- difficulty-tagged probes
- reference architectures
- remediation mapping
- evaluation thresholds

## Prose where expert judgment matters

Use author notes for:

- when not to reveal a requirement
- how long to let the candidate drive
- what makes a follow-up feel realistic
- which unusual architectures remain defensible
- where a devil's-advocate challenge is appropriate

## Customer knowledge boundaries

Each fact is one of:

- `known`: the Staff FDE may answer when the candidate asks
- `unknown`: the customer has not established the answer
- `stakeholder`: another stakeholder owns the answer
- `constraint`: may be injected later if the interview needs the signal

The interviewer must not invent a missing requirement.

## Reveal discipline

A hidden fact should be revealed only when:

- the candidate asks a materially relevant discovery question
- the interview reaches a curated late constraint
- the candidate's architecture creates a natural reason for the interviewer to
  introduce the constraint

In Mock mode, do not reveal a fact merely because it would help the candidate.

## Competency evidence

Track:

- independent
- responsive
- hinted
- unresolved
- insufficient evidence

Do not score a final graph as if every correct component was independently
recognized.

## Reference architectures

Provide two or three defensible approaches. Never publish one "correct" diagram.

Each approach needs:

- conditions where it fits
- properties it optimizes
- complexity it accepts
- likely failure modes
- what information would change the decision

## Constrained generation later

After Cohort 0 calibration, a scenario family may define:

- invariant competencies
- invariant scoring anchors
- allowed fact ranges
- allowed industry variants
- allowed traps
- disallowed changes

AI may vary the surface only. It may not redefine the interview bar.
