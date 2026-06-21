# Daily Field Brief Scouting Prompt

Run this once per day (or whenever new AI production incidents surface) to find
`failure-derived` Field Brief candidates. The output is one or more draft JSON
files dropped into `src/content/problems/` with `draft: true`.

---

## Goal

Find real AI production failures that an engineer can learn from by building a
harness, eval, or observability tool. One good failure story is worth more than
ten curated how-to briefs because it grounds the build in a problem that already
happened.

---

## Step 1: Source scan

Search for AI incidents published in the last 7 days. Priority sources:

- AI Incident Database (incidentdatabase.ai)
- Reuters, Bloomberg, FT, WSJ tech coverage
- The Verge, 404 Media, Wired AI coverage
- Hacker News "Show HN" and "Ask HN" threads about AI failures
- Twitter/X threads from practitioners sharing postmortems
- GitHub issues on major AI framework repos
- SEC filings or company statements about AI system terminations

Search terms to rotate through:

```
"AI" AND ("terminated" OR "shut down" OR "pulled" OR "failed") site:reuters.com OR site:bloomberg.com
AI agent incident 2026
LLM production failure postmortem
AI hallucination consequence
autonomous AI error lawsuit OR fine OR recall
```

---

## Step 2: Triage filter

For each finding, check all four gates. Drop it if any gate fails.

| Gate | Pass condition |
|------|----------------|
| **Engineering lesson** | A builder can produce a concrete artifact (harness, eval, guard, router) that would have caught or reduced the failure. |
| **Primary source** | At least one verifiable public source: news article, court filing, company statement, or incident database entry. No secondhand-only reports. |
| **Scope fit** | One solo builder can produce a meaningful artifact in 20 to 30 focused hours. Drop incidents that require access to production systems or proprietary data. |
| **Novel** | Not already covered by an existing brief in `src/content/problems/`. Check by scanning titles and `failure_family` values. |

---

## Step 3: Brief construction

For each incident that passes triage, construct a Field Brief JSON following
**Field Brief Standard v1.0** (`FIELD_BRIEFS.md`). Use these heuristics:

- `provenance`: always `"failure-derived"` for incidents found in this workflow
- `failure_family`: pick the closest match from the allowed enum:
  `destructive auto-shipping`, `reward hacking`, `delegated identity`,
  `prompt injection`, `cost runaway`, `eval-production gap`, `supply chain`
- `difficulty`: judge by the effort to build the artifact, not the complexity
  of the failure. A shadow-mode eval harness is Intermediate. A full agent
  framework with circuit breakers is Advanced.
- `run_level`: target R2 or R3 for new briefs unless the incident specifically
  points at a higher reliability requirement.
- `data_plan`: always `"synthetic"` or `"public"` for failure-derived briefs.
  Never production data.
- `draft`: always `true`. A human reviewer flips this after the editorial
  checklist in `FIELD_BRIEFS.md`.

Brand rules (enforced before saving):

- No em dashes anywhere in the JSON values.
- No en dashes (use hyphens for ranges and compound modifiers only).
- No filler words: delve, leverage (verb), utilize, foster, seamless,
  cutting-edge, holistic, synergy, world-class, showcase, underscore, robust.
- No first person in brief copy.
- `example_input` and `example_output` must be concrete and specific, not
  placeholders.
- `definition_of_done` must be falsifiable from the build's behavior and name
  the hard case.

---

## Step 4: File placement

Save each brief as:

```
src/content/problems/<id>.json
```

The `id` must be kebab-case, unique, and match the filename without `.json`.

---

## Step 5: Build check

Run `npm run build` and confirm it exits 0 before committing.

---

## Step 6: Commit

```bash
git add src/content/problems/<id>.json
git commit -m "Add Field Brief: <title> (failure-derived draft)"
```

Keep `draft: true` in the file. The commit message documents provenance;
the editorial flip to `draft: false` and `status: Open` happens in a separate
review pass.
