# Implementation plan

## Phase 1: repository integration

1. Add React support to the Learn Astro build.
2. Add React Flow and React dependencies.
3. Add `/fde-gym/` page and navigation.
4. Add root Worker route import and dispatch.
5. Add server-side scenario and engine modules.
6. Add configuration examples.

Exit gate: root build passes with the page rendered and health endpoint available.

## Phase 2: deterministic vertical slice

1. Start session.
2. Render setup, workspace, canvas, chat, and result states.
3. Support add, edit, connect, label, move, and delete.
4. Send graph only with candidate messages.
5. Run deterministic fact matching and fallback interviewer.
6. Run deterministic graph analysis and fallback evaluation.
7. Show immediate result.

Exit gate: complete an entire attempt with Workers AI disabled.

## Phase 3: model-backed interview

1. Enable separate model names for interviewer and evaluator.
2. Test strict JSON extraction and fallbacks.
3. Tune candidate-led behavior.
4. Verify facts are not invented.
5. Verify one focused probe at a time.
6. Verify final-defense behavior.
7. Tune target-level differences.

Exit gate: five scripted candidate paths produce coherent and distinct interviews.

## Phase 4: Cohort 0 retention and report

1. Bind KV.
2. Verify explicit consent.
3. Store canonical session records with TTL.
4. Load canonical sessions before messages, finish, and report.
5. Configure Substack forwarding.
6. Configure Resend or the report webhook.
7. Verify HTML escaping and idempotent email delivery.
8. Add feedback collection.

Exit gate: a consented session is retained, emailed, and expires as configured.

## Phase 5: calibration

Run the fixed 30-minute benchmark against:

- a weaker aspiring candidate path
- a competent FDE path
- a strong Senior FDE path
- a candidate who knows patterns but cannot defend them
- a candidate with an unusual but defensible architecture

Compare:

- pass, borderline, fail, or incomplete
- strongest area
- biggest gap
- evidence cited
- graph findings
- human review

Do not add scenario generation until this calibration works.
