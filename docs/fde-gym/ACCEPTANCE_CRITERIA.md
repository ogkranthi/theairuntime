# Acceptance criteria

## Build and deployment

- [ ] Root `npm run build` passes.
- [ ] Existing events, lab, and learn routing still works.
- [ ] `/fde-gym/` loads on the Learn site.
- [ ] API routes run before host routing.
- [ ] No secret is present in the browser bundle.
- [ ] The page works in deterministic degraded mode when Workers AI is absent.

## Setup

- [ ] No account or login is required.
- [ ] Practice and Mock modes are selectable.
- [ ] 15 and 30 minutes are selectable.
- [ ] Foundations, FDE, and Senior FDE are selectable.
- [ ] Cohort 0 consent is explicit and unchecked by default.
- [ ] Confidentiality warning is visible and acknowledged.
- [ ] Start is blocked until both acknowledgments are complete.

## Interview

- [ ] Candidate-visible prompt changes by level.
- [ ] Mock mode hides the rubric and exact timer.
- [ ] Practice mode shows the timer and reference notes.
- [ ] Canvas is available immediately.
- [ ] Candidate can add structured components.
- [ ] Candidate can use a custom label with an architectural type.
- [ ] Candidate can connect components and optionally label edges.
- [ ] Canvas changes do not call the interviewer by themselves.
- [ ] Sending a candidate message includes the current graph.
- [ ] The interviewer asks one focused follow-up at a time.
- [ ] Mock mode does not teach or reveal direct hints.
- [ ] Practice mode can provide a nudge and records hint dependence.
- [ ] Candidate can revise the architecture without penalty by default.
- [ ] Final defense is requested near the end of a 30-minute mock.
- [ ] Interview can finish manually without waiting for the full timer.

## Scenario truth

- [ ] Hidden facts are not in Learn static assets or browser JavaScript.
- [ ] Direct customer questions reveal curated facts.
- [ ] Unknown customer facts remain unknown.
- [ ] The interviewer does not invent precise SLAs or thresholds.
- [ ] Cohort 0 uses the same scenario version for every participant.

## Evaluation

- [ ] Interviewer and evaluator are separate calls and prompts.
- [ ] Evaluator receives the full evidence bundle after finish.
- [ ] Deterministic graph findings are visible to the evaluator.
- [ ] Every major judgment contains evidence references internally.
- [ ] The server, not the model, derives the final verdict.
- [ ] Insufficient critical coverage returns `INCOMPLETE ASSESSMENT`.
- [ ] A late responsive correction is scored differently from independent
      recognition.
- [ ] Multiple defensible architectures are used in the detailed report.
- [ ] Technology names do not earn points without property-level reasoning.

## Immediate result

- [ ] Verdict is more prominent than the numeric score.
- [ ] Target bar is visible.
- [ ] Foundations, FDE, and Senior relative statuses are visible.
- [ ] Strongest area is visible.
- [ ] Biggest gap is visible.
- [ ] A specific interviewer note proves the system understood the attempt.
- [ ] Full detailed evidence remains behind the report-email action.

## Report and subscription

- [ ] Email is requested only after the immediate result.
- [ ] The candidate explicitly chooses subscription.
- [ ] Existing Substack forwarding is reused.
- [ ] Personalized report uses data from that attempt.
- [ ] Report HTML escapes candidate-controlled text.
- [ ] Email request is idempotent per session.
- [ ] Failure to send email produces a clear retry path.
- [ ] No user is told an email was sent when it was not.

## Cohort feedback

- [ ] Ask whether the experience was more realistic than generic ChatGPT.
- [ ] Ask whether the participant would do another drill tomorrow.
- [ ] Capture optional comments.
- [ ] Do not add share cards, badges, or leaderboard incentives.

## Accessibility and responsiveness

- [ ] Keyboard users can add, select, edit, connect, and delete components.
- [ ] Chat and canvas have accessible labels.
- [ ] Focus moves predictably after sending and on errors.
- [ ] Mobile layout remains usable.
- [ ] Color is not the only status signal.
- [ ] Reduced-motion preference is respected.
