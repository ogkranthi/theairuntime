# Field Brief Standard v1.0

The authoritative format for Field Lab problems. Briefs live as JSON data files
in `src/content/problems/<id>.json` and are validated against the zod schema in
`src/content/config.ts` at build time. Adding a conformant file adds a card and a
detail page with zero code change.

House style for all copy: no em dashes or en dashes, no first person in brief
copy, and avoid filler (delve, leverage, utilize, foster, seamless, cutting-edge,
holistic, synergy, world-class, showcase, underscore, robust).

## Fields

Required unless noted. See `src/content/config.ts` for the exact zod rules.

| Field | Type | Required | Rule |
|---|---|---|---|
| `id` | string (kebab-case) | yes | Unique, stable, lowercase, no spaces. Matches the filename and the URL slug. |
| `title` | string | yes | Hook plus keyword. |
| `one_line` | string | yes | Build X that does Y under constraint Z. |
| `vertical` | string | yes | Industry or domain. |
| `difficulty` | enum | yes | Starter, Intermediate, Advanced. Build difficulty, not reliability. |
| `build_type` | string | yes | Harness, Eval, Observability, Agentic Workflow, RAG Copilot, Vertical Agent, Optimization Middleware, Workflow Automation. |
| `status` | enum | yes | Open, Claimed, Shipped, Featured. |
| `run_level` | enum | yes | R0 to R4. The reliability target. |
| `reliability_focus` | string[] (min 2) | yes | Two to four short phrases naming the reliability axes. |
| `provenance` | enum | yes | curated, operator-sourced, failure-derived, company-submitted, partner-contributed. |
| `failure_family` | enum | conditional | Required when provenance is failure-derived. |
| `why_it_matters` | string | yes | Why the build is worth it, in reliability terms. |
| `persona` | string | yes | Who has this problem. |
| `current_workflow` | string | yes | What happens today without the build. |
| `ai_workflow` | string | yes | What the build does, mechanism described. |
| `inputs` | string[] (min 1) | yes | What the build consumes. |
| `outputs` | string[] (min 1) | yes | What the build produces. |
| `definition_of_done` | string | yes | Falsifiable by a third party. Describes the hard case. |
| `example_input` | string | yes | One concrete input, adversarial or hard where possible. |
| `example_output` | string | yes | Expected output for that input. |
| `data_plan` | enum | yes | synthetic, public, sanitized. Never production. |
| `non_goals` | string[] | yes | Explicit out-of-scope items. |
| `evaluation_ideas` | string[] (min 1) | yes | Third-party-runnable evaluation targets. |
| `suggested_tools` | string[] | yes | May be empty. Options only, never requirements. |
| `thesis_questions` | string[] | no | Open questions the build could answer. |
| `month` | string (YYYY-MM) | no | Drives the featured slot. Used by failure-derived briefs. |
| `failure_story` | object | conditional | `what_happened`, `root_cause_read`, `engineering_lesson`. Required when failure-derived. |
| `sources` | string[] (urls) | conditional | Required when provenance is failure-derived or operator-sourced. Discovery provenance. |
| `primary_source_note` | string | conditional | The primary source to attach before publish. Required when failure-derived. |
| `field_signals` | string[] | no | Specific reported facts from the source. |
| `draft` | boolean | no | Site extension. Defaults false. Drafts render with a marker; flip to false after review. |
| `verified_at` | string | no | Site extension. e.g. "R3" on a Shipped brief. |

`failure_family` is one of: `destructive auto-shipping`, `reward hacking`,
`delegated identity`, `prompt injection`, `cost runaway`, `eval-production gap`,
`supply chain`.

## Conformance

The schema enforces field presence, enums, the array minimums, the id pattern,
and the provenance rules (failure-derived requires `failure_story`, `sources`,
`primary_source_note`, `failure_family`; operator-sourced requires `sources`).

Two rules cannot be enforced by zod. They are editorial checks, confirmed by a
human before a brief moves from `draft: true` to `status: Open`:

- **Concrete example I/O.** `example_input` and `example_output` are real and
  specific, not placeholders or restatements of the field labels.
- **Falsifiable, hard-case definition of done.** `definition_of_done` can be
  judged from the build's behavior alone, and names the hard case (missing
  field, conflicting source, attempted bypass, ambiguity), not only clean input.

## Review checklist

Before flipping `draft: false` and setting `status: Open`:

- [ ] `example_input` and `example_output` are concrete, and the input is an
      adversarial or hard case where possible.
- [ ] `definition_of_done` is falsifiable by a third party and describes the
      hard case, not only clean input.
- [ ] `run_level` is the target the build is verified against.
- [ ] `data_plan` is never production, and the scope fits one solo builder in
      20 to 30 focused hours.
- [ ] `suggested_tools` are options, with no tool required to participate or pass.
- [ ] Copy has no em or en dashes, no first person, none of the filler words.
- [ ] Failure-derived only: the primary source named in `primary_source_note`
      is attached and the claims are verified.

## Template

Copy into `src/content/problems/<id>.json`, replace every value, and keep
`draft: true` until it passes the checklist above.

```json
{
  "id": "how-to-build-a-thing",
  "title": "Hook Line: A Keyword-Rich Title",
  "one_line": "Build X that does Y under constraint Z.",
  "vertical": "Developer Tools",
  "difficulty": "Intermediate",
  "build_type": "Eval",
  "status": "Open",
  "run_level": "R3",
  "provenance": "curated",
  "draft": true,
  "reliability_focus": ["axis one", "axis two"],
  "why_it_matters": "Why the build is worth it, in reliability terms.",
  "persona": "Who has this problem.",
  "current_workflow": "What happens today without the build.",
  "ai_workflow": "What the build does, mechanism described.",
  "inputs": ["what the build consumes"],
  "outputs": ["what the build produces"],
  "definition_of_done": "Falsifiable from behavior alone, naming the hard case.",
  "example_input": "A concrete, hard input.",
  "example_output": "The expected output for that input.",
  "data_plan": "synthetic",
  "non_goals": ["explicit out-of-scope item"],
  "evaluation_ideas": ["a third-party-runnable target"],
  "suggested_tools": [],
  "thesis_questions": []
}
```

For a `failure-derived` brief, also add `failure_family`, `month`,
`failure_story` (with `what_happened`, `root_cause_read`, `engineering_lesson`),
`sources`, and `primary_source_note`. See
`src/content/problems/count-the-milk-reality-gap-harness.json` for a complete
example.
