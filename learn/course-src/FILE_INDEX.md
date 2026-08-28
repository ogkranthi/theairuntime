# Course Pack File Index

## Start here

| File | Use |
|---|---|
| `README.md` | Course thesis, audience, structure, and launch sequence |
| `COURSE_MASTER.md` | Full curriculum, learning paths, assessment, publishing plan |
| `COURSE_CONTENT_SINGLE_FILE.md` | Complete prose pack in one copyable Markdown file |
| `course-manifest.json` | Machine-readable module order and metadata |
| `AGENTS.md` | Repository instructions for Codex and other coding agents |
| `CLAUDE.md` | Claude Code entry instruction |

## Build the learning site

| File | Use |
|---|---|
| `site/BUILD_WITH_CLAUDE_CODE_OR_CODEX.md` | Ready-to-paste one-shot build prompt |
| `site/SITE_BUILD_SPEC.md` | Product requirements, IA, components, tests, accessibility, SEO, definition of done |
| `site/CONTENT_MODEL.md` | TypeScript-shaped content contracts and rendering behavior |
| `scripts/validate_content.py` | Content/manifest/frontmatter/link/quiz/scenario validator |
| `scripts/build_single_file.py` | Rebuilds the consolidated Markdown document |

## Course lessons

`content/modules/` contains 17 publish-ready lessons:

```text
00  How to Design an Agentic System
01  Should This Be an Agent?
02  The Agent Loop and Its Control Boundaries
03  Tool Contracts, Side Effects, and the Acknowledgment Gap
04  Context Engineering, Retrieval, and Grounding
05  State, Sessions, and Memory
06  Orchestration Patterns and State Machines
07  Durable and Long-Running Agents
08  Human-in-the-Loop and Bounded Authority
09  Multi-Agent Design, MCP, and A2A
10  Security, Identity, Isolation, and Governance
11  Agent Evaluation and Testing
12  Observability, SLOs, and Incident Response
13  Latency, Cost, Throughput, and Scale
14  Deployment, Change Management, and Enterprise Readiness
15  The 45-Minute Agentic System-Design Interview
16  Capstone: Atlas in Production
```

Every lesson includes objectives, prerequisites, a production failure, Atlas build milestone, run exercise, interview drill, knowledge check, and primary references.

## Practice and assessments

| Path | Use |
|---|---|
| `content/practice/README.md` | Practice protocol |
| `content/practice/01-*.md` through `12-*.md` | Twelve staged 45-minute system-design scenarios |
| `content/practice/scenario-manifest.json` | Machine-readable scenario navigation |
| `content/assessments/quiz-bank.json` | 51 single/multi-select questions with explanations |
| `content/assessments/answer-key.md` | Human-readable answer key |
| `content/assessments/course-rubric.md` | Module, canvas, interview, and capstone scoring |
| `content/assessments/interview-scorecard.md` | Printable/mock-interview scorecard |

## Reference library

| File | Use |
|---|---|
| `runtime-design-method.md` | The RUNTIME system-design method |
| `agentic-system-design-canvas.md` | One-page reusable design canvas |
| `capstone-atlas.md` | Canonical product and architecture brief |
| `atlas-reference-implementation-spec.md` | Optional companion app service/API/test contract |
| `concept-coverage-matrix.md` | Maps every production concept to modules and evidence |
| `glossary.md` | Production-oriented terminology |
| `primary-source-map.md` | Official documentation and standards by module |
| `failure-taxonomy.md` | Incident/eval labels for agent failures |
| `tool-contract-template.md` | Typed, risk-aware tool specification |
| `threat-model-template.md` | Agent-specific threat model |
| `eval-plan-template.md` | Layered evaluation plan |
| `slo-incident-runbook-template.md` | SLI/SLO and incident template |
| `architecture-decision-record-template.md` | Requirement-driven ADR |
| `lesson-authoring-template.md` | Standard for future AIR course lessons |
