# Model evaluation status

| Evidence | Status |
| --- | --- |
| Candidate model | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Checked fallback implementation | Existing shared client with `@cf/meta/llama-3.1-8b-instruct-fast` |
| Prompt | `fde-mentor-v1` |
| Retrieval | Version hash in `src/coach-chat/catalog.generated.json` |
| Real model runs | NOT RUN |
| Measured provider latency/tokens/cost | NOT AVAILABLE |
| Human correctness/pedagogy signoff | PENDING |
| Local deterministic/security/browser fixtures | PASS; not a model-quality score |
| Production enablement | BLOCKED pending owner review and isolated model evaluation |

Issue #154 permits real Cloudflare inference only in an owner-approved bounded preview. No preview has been provisioned/deployed, no inference permission for an existing isolated endpoint was provided, and no production learner data or provider was used. Calling a live model or claiming measured quality/cost here would bypass that gate.

PR B supplies 40 synthetic cases, an offline CI suite, and a manually invoked preview-only runner. Its heuristic checks are diagnostics, not proof of correctness. Record actual primary/fallback model metadata, prompt/retrieval versions, usage when reported, measured latency, known errors, and reviewed costs. Model names alone do not identify immutable weights. A thumbs-up or LLM judgment cannot replace human review.

Before release, run the synthetic cases under the shared atomic attempt budget, inspect critical failures manually, sign off reference judgments, and publish only reviewed synthetic examples. Do not promote private contributions or call a fixture's pass rate a model-quality pass rate.
