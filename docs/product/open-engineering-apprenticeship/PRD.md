# Product Requirements Document — The AI Runtime Open Engineering Apprenticeship

**Status:** Draft for product review; implementation not yet approved for production  
**Version:** 0.1 · 2026-11-15  
**Owner:** The AI Runtime  
**Implementation base:** `ogkranthi/theairuntime`, consolidated release candidate PR #157 (`f2f27309e41693ec45e8ad98b5ef20398c433dd5`)  
**Product surface:** `learn.theairuntime.com`; FDE Coach remains the first chat-first interface. No new application, domain, framework, or LMS.

## 1. Vision, position, north star

**Promise:** *Your first 100 engineering decisions, before your first engineering job.*

Make realistic software engineering experience accessible before employment, and help people develop and demonstrate the judgment needed to build, verify, ship and operate software alongside AI. This is not a résumé scoring tool, certificate mill, job placement guarantee, or an AI service that completes exercises on the learner's behalf.

**Wedge:** A 10–20-minute fictional engineering mission in the existing FDE Coach chat. A learner makes a decision, defends it, confronts a new constraint, and proves how to test it. Then they attempt a related but unseen task without AI hints.

**Original method (working title):** **Decide → Defend → Break → Prove**. Treat the four-step protocol as a research hypothesis, *not* as a proven or uniquely invented pedagogical innovation. Validate benefits through independent human review, unassisted transfer tasks, and independent organizational adoption.

**Success:** A person can articulate a better engineering decision and validate it independently. Ultimately other educators, practitioners, and teams adopt the portable protocol/rubrics without needing the product.

## 2. User problems and jobs to be done

1. **Student / early-career engineer:** “I can build demos, but I have never experienced production decision-making.” Wants safe, realistic, supported practice and evidence of learning.
2. **Software engineer using AI coding tools:** “I can generate code quickly; can I review and own it?” Wants agent oversight, debugging, verification and system judgment.
3. **AI engineer / agent builder:** “How do I design and operate a trustworthy AI application?” Wants context, evaluation, observability, state, security, latency and cost tradeoffs.
4. **Aspiring or practicing FDE:** “Can I navigate an ambiguous customer request and deliver responsibly?” Wants discovery, customer constraints, architecture and communication.
5. **Mentor / educator / engineering team (later):** “Can I reuse credible work-sample challenges and assess reasoning consistently?” Wants independently reusable mission kits, instructions and rubrics.

**Initial pilot:** Adults 18+; no accounts required. Career lenses describe overlapping skills and are not forecasts of future titles or employment outcomes.

## 3. Product principles

- **One chat, one clear job:** help learners make better real-world engineering decisions. Courses, missions, role guidance and proof records are contextual capabilities, not tabs of a new LMS.
- **Thinking before AI:** learner must commit an initial decision before receiving the coach's suggestion or the simulated AI teammate's proposed fix.
- **Authentic complexity, safe simulation:** fictional customers, incidents and AI outputs are transparently labeled. No live code execution, real customer materials or hidden production effects.
- **An answer is not evidence of learning:** distinguish initial answer, assisted revision, *unassisted transfer*, and optional human review.
- **Portable and open:** versioned synthetic mission spec and rubric are reusable independently; learner-owned local export is available without an account.
- **Privacy by default:** no server-side long-term raw conversation collection, no real-user training data by default, no default public publication.
- **Candid evaluation:** no fabricated job-ready %, confidence claims or claims of proven educational improvement without study evidence.
- **Low-cost, incrementally shippable:** reuse Astro/React, Cloudflare Worker/Workers AI/KV/SQLite DO security; no D1 until separate approval.

## 4. Capability framework: durable skills, not speculative job titles

| Code | Capability | Example proof |
| --- | --- | --- |
| C1 | Problem framing and customer discovery | Clarifies outcome, stakeholder, constraint, acceptance criteria |
| C2 | Architecture and tradeoff reasoning | Explicitly compares alternatives and failure boundaries |
| C3 | AI delegation and oversight | Reviews an AI-generated proposal, sets boundaries, requests evidence |
| C4 | Code review, testing and verification | Designs an adversarial test or observable invariant |
| C5 | Security, privacy and responsible operation | Spots authority, tenant, secrets, data exposure or misuse risks |
| C6 | Reliability and incident response | Handles retries, state, recovery, SLOs and uncertain outcomes |
| C7 | Evaluation, telemetry and evidence | Defines before/after measures, checks and regressions |
| C8 | Communication and delivery | Explains decisions, escalation, rollout and stakeholder impact |

**Role lenses (not separate courses):** AI-native Software Engineer, AI Engineer, Forward Deployed Engineer, Platform/Reliability Engineer. A learner can switch lenses; missions remain tagged by capabilities, not locked to a role.

## 5. Complete feature inventory and phased priorities

**P0 = the narrow playable first slice. P1 = beta product. P2 = independent adoption. P3 = future option.**

| ID | Feature | Stage | Requirement / outcome |
| --- | --- | --- | --- |
| F01 | Career lens and goal | P0 | Select one of four role lenses; no percentage match or readiness claims |
| F02 | 60-second intake | P0 | Ask one relevant question about experience and intended learning goal |
| F03 | “Challenge me” in Coach | P0 | Contextual quick prompt launches a mission without adding a fourth homepage card or a portal |
| F04 | Versioned mission catalog | P0 | Public mission metadata + protected hidden injects/rubric; explicit provenance and content version |
| F05 | Decide → Defend → Break → Prove | P0 | Server-authoritative state machine; one decision/phase; explicit phase markers in chat |
| F06 | Initial decision lock | P0 | Capture a learner decision and rationale before hints/solution reveal |
| F07 | Fictional AI teammate | P0 | Show an authored plausible but potentially flawed suggestion, clearly labeled simulation |
| F08 | Constraint injection | P0 | Introduce one or two authored new constraints; learner must revise or defend decision |
| F09 | Evidence request | P0 | Require a concrete test, invariant or rollout/check plan, not just “looks good” |
| F10 | Unassisted transfer check | P0 | Related unseen case with hints/coaching suppressed until submission; version and difficulty recorded |
| F11 | Feedback rubric | P0 | Transparent capability-level feedback with citations to answer evidence; no unearned precision or hiring score |
| F12 | Decision Record export | P0 | Portable Markdown and JSON with problem, learner's words, decisions, injects, feedback, transfer outcome and limitations |
| F13 | Privacy / accessibility / cost gates | P0 | Mobile/keyboard/IME, honest retention language, no D1/capture, safe fail-closed AI behavior |
| F14 | Ten authored missions | P1 | Reviewed challenges spanning software, AI, customer and operations; at least 2 parallel transfer variants each |
| F15 | Guided hint ladder | P1 | Ask → nudge → example → explain, with one question at a time and visible assisted-vs-unassisted provenance |
| F16 | Contextual curriculum links | P1 | Reference only approved existing source IDs/URLs; teach from observed gap |
| F17 | Local progress and resume | P1 | Opt-in same-browser state with inspect/export/delete; no account and no cross-device promises |
| F18 | Evidence-based next mission | P1 | Suggest next challenge from demonstrated capabilities; no invented career ranking |
| F19 | User feedback / error reporting | P1 | Nonidentifying feedback by default; no raw content retained without separate explicit agreement |
| F20 | Expert scenario review | P1 | At least three independent reviewers check rubrics and failure modes before public teaching claims |
| F21 | Accessible language and pacing | P2 | Beginner explanations, concise mode and reading support; translations only after review |
| F22 | Open authoring kit | P2 | Mission JSON schema, examples, rubric template, license, contribution guidelines and content validation |
| F23 | Educator / meetup kit | P2 | Facilitator guide, cohort exercises, rubric and offline replay; no new instructor dashboard |
| F24 | Learner-owned Proof Passport | P2 | Local library of decision records, self-described provenance, share only on learner action |
| F25 | Research opt-in and evaluation | P2 | Separate consent, human-blinded rubric review, transfer study, aggregate reporting; D1 only after privacy approval |
| F26 | Independent adoption evidence | P2 | Track actual forks, teaching use, references, replication and feedback, with consent and verification |
| F27 | Human reviewer attestation | P3 | Optional qualified reviewer signs specific records; distinguish self-report from verified evidence |
| F28 | GitHub/code artifact link | P3 | Optional learner-initiated public repo evidence; no private repo ingestion by default |
| F29 | Community mission nights | P3 | Open weekly challenge kits with contributors and speakers; no live leaderboards |
| F30 | Career opportunities guidance | P3 | Verified role expectations and portfolios; never promise placement or candidate ranking |
| F31 | Partner API / embedded missions | P3 | Allow independent schools/employers to run protocol with privacy and licensing controls |
| F32 | Longer-term follow-up | P3 | Optional user-controlled 7/30-day re-test and longitudinal learning study with independent consent |

## 6. Key learner experience

**Entry:** Existing FDE Coach homepage; keep three approved starter actions. Add **Challenge me** as a quick prompt/contextual CTA and enable only behind a dedicated feature flag.

**Intake:** “Which engineering decision would you like to practice?” Career lens is optional; choose an appropriate mission. If no experience, start with a novice-friendly scenario.

**Mission loop (single page, in chat):**
1. **Brief:** Fictional customer, outcome, system context, available artifacts and constraints. No secret rubric shown.
2. **Decide:** User types first decision, why and what evidence would change their mind. Commit and lock before suggestions.
3. **Defend:** Coach asks one targeted tradeoff question; learner defends/revises. Any hints are logged as assisted.
4. **Break:** An authored new fact or an AI teammate's plausible flawed patch appears. Learner identifies risks and changes approach.
5. **Prove:** Learner proposes a test, invariant, recovery check, telemetry or release gate. Coach gives calibrated rubric-based feedback.
6. **Transfer:** Unseen analogous challenge. No coach hints, answer reveal, rubric or model consultation during the assessment. Submit independently.
7. **Record:** Export an honest, learner-owned Decision Record and get one concrete next learning task.

**Example flagship mission:** An AI support assistant exposes one tenant's ticket to another. An AI teammate proposes adding a client-side tenant filter and claims 24 passing unit tests. Learner must identify server-side authorization boundary, ask for cross-tenant tests, make a release decision, and handle an injection such as “marketing launch tomorrow”. Transfer variant uses a different organization/resource type so word-matching cannot masquerade as understanding.

**Product promise after 15 minutes:** “I understand one production failure mode, I can explain a safer decision, and I can state how I would verify it.” No claim that one mission makes someone job-ready.

## 7. Authored mission contract (draft)

Each mission has `id`, `version`, `title`, `roleLenses[]`, `capabilities[]`, `difficulty`, `estimatedMinutes`, `learningObjective`, `publicBrief`, `initialPrompt`, `artifacts[]`, `aiTeammateProposal`, `injects[]`, `expectedAssertions[]`, `criticalErrors[]`, `feedbackGuide`, `transferVariantIds[]`, `sourceIds[]`, `fictional=true`, `reviewStatus`. The server controls release of the hidden fields and inject sequence. Public metadata can be indexed; hidden expert assertions cannot be delivered to the browser before the learner commits.

A mission's difficulty and variants are fixed at authoring; model text cannot rewrite ground truth, invent customer facts, add tasks or mark correctness. Use the model to converse, explain and provide provisional feedback, not to be the source of scenario truth.

**Decision Record** includes a case/version hash, user-provided answers, assist level, revision history, feedback with supporting evidence, transfer answer, verification plan, explicit `self-reported` provenance, optional reviewer signature later, and an export timestamp. No “certified”, “verified”, or employer-ready badge without independent review.

## 8. Assessment, evidence and research design

The present 40-case corpus in PR #156 measures **AI coach output**. It is not a learner-skills benchmark or proof of human improvement. Keep it separate from the new mission/transfer dataset.

**Assessment dimensions:** (a) problem framing, (b) safety/authority boundaries, (c) tradeoff reasoning, (d) verification quality, (e) adaptation to a changed constraint, (f) communication. Use a 0–2 analytic rubric per dimension with anchors: 0 = missing/unsafe, 1 = partial, 2 = justified and testable. A critical unsafe recommendation is flagged separately. Display qualitative evidence and uncertainty first; withhold a total/percent readiness score.

**Baseline and transfer:** record an initial unassisted answer before coaching; after coaching, give a *matched but unseen* independent task. Optional delayed transfer (7–30 days) only with separate consent and suitable design. Blinded human review of samples establishes label agreement. Never use an LLM evaluator as sole ground truth.

**Research hypothesis:** mission coaching increases performance on independent transfer tasks compared with ordinary AI explanation or self-directed reading. This requires a prospective, consented comparison; pilot counts do not establish causation. Avoid claims of efficacy until analysis supports them.

**External contribution:** versioned open protocol, independently reviewed rubrics, reproducible fictional challenge pack and results/limitations. Seek adoption by educators/teams **outside** The AI Runtime; do not treat GitHub stars, synthetic fixture passes, internal usage or solicited testimonials alone as proof of field significance.

## 9. Success metrics (targets, not measured results)

**North-star metric:** number of consenting learners who complete a mission **and** submit an unassisted transfer answer with a reproducible Decision Record.

**Pilot target hypotheses:** 20–30 invited adults; 10 authored reviewed missions; 60% mission completion among starts; 70% of completers attempt transfer; fewer than 10% of mission responses fall back to static guidance (adjust after actual model measurements); zero known critical safety/privacy failures. Thresholds guide iteration, not automatic graduation/certification. Measure time-to-first-decision, assistance usage, quality of verification plans, measured transfer-rubric change and per-completed-mission AI cost.

**Impact evidence:** independent reviewer participation, third-party scenario contribution, classroom/cohort reuse, public citations and replicated teaching experiments. Record dates, versions, permissions and actual adoption; no implied immigration outcome.

## 10. Nonfunctional and privacy requirements

- **Privacy:** fictional/non-sensitive inputs encouraged. No real learner Q/A collection for research by default. Existing one-hour signed chat state/KV replay cache may contain user-reflected text; explain it candidly. Delete local export/progress on request; server-side erasure is limited by replay TTL and provider policy. Separate consent for research, public examples, newsletter and Gym.
- **Security:** reuse PR #157's admission, 500 physical model attempts/day cap across Coach/Gym/chat, session scope, idempotency/replay, timeout and failure safety. New mission flow must be included in the quota before enabling any AI requests. Fail closed if admission or bindings are absent.
- **Accessibility:** WCAG-oriented keyboard and screen-reader semantics, 360 px mobile minimum, explicit progress labels, no time-pressure penalty by default, non-color-only signals, reduced motion, good contrast. Initial pilot 18+.
- **Trust:** label fictional customers, simulated teammate proposals, hints, authored fallback and unverified model feedback. Never auto-run code, call external services, start emails, post learner records or invent a job-readiness score.
- **Cost:** cap per mission model calls and output tokens; authored phase transitions are free of AI model use; caching and deterministic injects limit cost. Measure cost after owner-approved preview rather than inventing an invoice.
- **Reliability:** preserve immutable pending identity and DO migrations; tests cover duplicate submissions, interruption, stale session, timeout and transfer integrity.
- **Content safety:** reviewed fictional scenarios only, no employer IP or customer incident material; licensing and contributions require explicit rights verification.

## 11. Technical architecture / existing work

Re-use existing `learn/` Astro/React, `src/coach-chat/`, `src/security/`, `src/fde-gym/` where appropriate, `eval/coach/`, Cloudflare Worker, KV, Workers AI and SQLite DO. Do not create an account service, vector store, new AI agent runtime or D1 binding for P0.

**Suggested modules (implementation design, subject to review):**
- `src/apprenticeship/missions/`: versioned reviewed synthetic mission records; **keep private rubrics/injects on server**, never embed them in the public client bundle.
- `src/apprenticeship/state.ts`: pure deterministic state transition, step permissions and schema validation.
- `src/apprenticeship/routes.ts`: mission start/turn/transfer/export permissions through the **existing** secured session admission path. If a new session kind is added, extend coordinator quotas and all adversarial tests before enabling it. Never call Workers AI without a granted attempt.
- `src/apprenticeship/feedback.ts`: human-authored rubric anchors and safe, provisional feedback; evidence references to the learner's own answer.
- `learn/src/components/fde-coach/`: minimally extend approved chat to render mission turns and export, without changing the homepage or creating an LMS.
- `eval/apprenticeship/`: synthetic mission tests, leakage tests, matched transfer protocols, human review worksheet and benchmark exports.

No D1, cross-device history, user accounts, third-party API, uncontrolled “AI agent teammate” or live customer data in P0. The earlier #157 production release is still draft; **build apprenticeship work on a new branch stacked on #157 and do not merge/deploy it as a side effect of feature work.**

## 12. Rollout, dependencies, gates

**R0: one complete playable mission** (1–2 reviewable PRs): author one tenant-isolation case + one transfer variant; implement secure server-authoritative phases, one chat entry, provisional feedback and local Markdown/JSON export. Browser and adversarial tests; local synthetic model fixtures only. No production enablement.

**R1: private beta** (after #157 foundation deployed safely): 10 reviewed missions covering C1–C8, 4 career lenses, hint ladder and optional local progress. Validate model latency and failure rate on synthetic inputs in isolated Cloudflare preview. Enroll 10–20 adults; gather voluntary feedback with separate permissions. Do not claim learning efficacy yet.

**R2: open protocol**: mission author kit, independent expert-reviewed rubrics, reproducible transfer study design, educator/meetup kit, independent organizations using it. Publish aggregate methods/results only after consent and human review. Any D1-based private dataset requires separately approved design, resource, deletion, retention and access.

**R3: scaled ecosystem**: proof passport with optional human attestations, partnerships, cohort portability, optional GitHub work-sample links, accessibility/localization, later longitudinal research.

**Release blockers:** PR #157 is still draft/unmerged; Cloudflare Workers Builds failure unresolved; production `AI_SECURITY` migration and build/runtime flags unverified; live AI accuracy/cost unmeasured; no private capture consent/deletion implementation. No merged/deployed apprenticeship code before those boundaries have been resolved.

## 13. P0 acceptance criteria — nonnegotiable

1. At `learn.theairuntime.com`'s approved Coach UI, **Challenge me** can begin an explicitly fictional mission without a new landing page.
2. User sees a coherent brief and makes a decision *before* AI feedback or answer reveal.
3. Server alone controls phase, inject order, rubric and transfer variant; client editing/replay cannot skip gates.
4. AI teammate's imperfect proposal is labeled *simulated*, and learner must examine it instead of accepting it as truth.
5. Learner produces a concrete verification artifact or test plan and gets feedback tied to their submitted reasoning.
6. A matched unseen transfer case is genuinely **unassisted** and is not leaked in prompt, API response or static asset.
7. Exported Decision Record is correct, readable, locally generated, honest about AI assistance and not a certification.
8. Original FDE Coach/Commons/Gym/lessons and existing routes continue to work.
9. 360/390/768/1440 layouts, keyboard, IME, screen-reader labels and mobile composer are covered.
10. Missing AI/security feature flags, quota and DO failures fail closed with a useful authored alternative.
11. No D1 database, production data capture, real-user uploads, secret exposure or public learner records.
12. Tests include adversarial injection, client-supplied phase, replay, cross-session swap, stale token and premature rubric/transfer visibility.
13. Changes are on a draft stacked PR with reproducible tests. **No merge, live deployment, or feature flag enablement without explicit approval.**

## 14. Product decisions to validate during review

- The umbrella brand is **The AI Runtime Open Engineering Apprenticeship**; FDE Coach remains the current interface and first specialized career lens. No domain rename for P0.
- First mission is **Cross-Tenant AI Support Incident** with an AI teammate proposing a frontend-only filter; first transfer uses a different resource/organization boundary.
- First pilot targets **adults**. Young learners require a later safety/accessibility/consent review.
- “Proof Passport” means learner-owned evidence, *not* a certified credential or hiring prediction.
- Research, dataset collection, and D1 remain opt-in proposals and are not required to ship a valuable educational product.
- User review of this PRD and first mission precedes any broad production or feature execution.

## 15. Background references (not claims of demonstrated effectiveness)

- Anthropic (Jan 2026), *How AI assistance impacts the formation of coding skills*: https://www.anthropic.com/research/AI-assistance-coding-skills
- DORA (2025), State of AI-assisted Software Development: https://dora.dev/research/2025/dora-report/
- CoderPad (2026), State of Tech Hiring: https://coderpad.io/survey-reports/coderpad-state-of-tech-hiring-2026/
- USCIS Policy Manual (EB-1A contribution criterion): https://www.uscis.gov/policy-manual/volume-6-part-f-chapter-2
