---
module: 11
title: "Evaluating Long-Running Agents"
duration: "75-90 min"
goal: "Make evals the development loop: error analysis on real traces, binary criteria, a validated judge, and a regression gate that proves version B beats version A."
question: "How do we prove B is better than A?"
labNumber: 11
invariant: "I10: a quality claim is backed by an evaluator validated against humans."
lab: "The Judge That Agreed With Everyone"
deliverable: "evals/ (labeled traces, rubric, deterministic evaluator, judge, agreement report)"
status: published
---

This is the module the whole course has been building toward. If you only internalise one module, make it this one. The process here follows Hamel Husain's published eval methodology; the adaptations are for multi-hour trajectories rather than single responses.

## Lesson 11.1: What "good" means for a long-running agent

Single-shot evals ask: *is the answer right?*
Long-running evals ask, in order:

```text
1. Did it finish honestly?         (verified items, unknowns declared, no false completion)
2. Is every claim evidenced?        (claim ↔ evidence ↔ page hash resolves)
3. Did it survive?                  (resumed after N kills without duplicate side effects)
4. Was the trajectory sane?         (no loops, no re-fetches, budget respected)
5. Was it worth it?                 (cost, wall-clock, human review rounds)
```

You are grading the **trajectory and the artifact**, not a chat turn.

## Lesson 11.2: Error analysis first (look at the data)

Before writing any rubric:

1. Run the agent across the fixture vendors and 3-5 real public sites. Collect **50 traces**.
2. Open each trace. Write one free-text note per trace: *what went wrong, if anything, and where.*
3. Cluster the notes into failure categories. Do not pre-decide the categories.
4. Count. The distribution tells you what to fix and what to measure.

Typical first pass:

```text
False completion (claimed verified, no evidence)      14
Wrong page chosen repeatedly                            9
Contradiction shipped                                   6
Over-escalation to unknown (evidence existed)           5
Budget stop with poor partial report                    4
Clean                                                  12
```

Write **binary** pass/fail criteria from these clusters. Binary labels beat 1-5 scales: humans agree on them, judges can be validated against them, and trends are readable.

## Lesson 11.3: Deterministic evaluators (free, fast, exact)

Most of your criteria need no LLM. Build these as pure functions over state + `run_events` + `published_reports`:

```python
def evidence_resolves(state) -> bool        # every verified item has ≥1 evidence with a stored page hash
def no_false_completion(state) -> bool      # verified ⊆ items with evidence
def single_publish(run_id) -> bool          # COUNT(published_reports WHERE run_id) == 1
def resumed_cleanly(events) -> bool         # after each kill marker, next node != first node
def no_refetch(events) -> bool              # no url fetched twice with same hash
def within_budget(state) -> bool
def contradiction_free(findings) -> bool    # same requirement, opposing claims → fail
```

Run them on every run. Report a scorecard per run and an aggregate per code version.

## Lesson 11.4: LLM-as-judge, validated

Some criteria are semantic: *does the finding actually answer the question? Is the unknown genuinely unknown?* For these you build a judge, and then you **validate it against humans**.

Process:

1. Human-label 50 findings for `answers_question: pass/fail`.
2. Write a judge prompt with the *same* binary criterion and 3-5 labelled examples (including negatives).
3. Run the judge. Compute agreement, **true positive rate and true negative rate** separately: accuracy alone hides a judge that says "pass" to everything.
4. Iterate the prompt until agreement is acceptable for your risk (aim ≥ 90% with balanced TPR/TNR). Re-check on 20 fresh labels.
5. Only then use it at scale.

Never let the model that produced the finding be its own judge in the eval. Separate roles.

## Lesson 11.5: Golden set and regression gate

Freeze:

```text
evals/golden/
  vendors/            fixture profiles + expected verified/unknown per item
  traces/             50 labeled traces (jsonl)
  labels.csv          human binary labels
  rubric.md           criteria, one line each, with pass/fail definitions
```

CI gate: every change runs the fixture vendors, computes the deterministic scorecard and the judge scorecard, and fails the build if any aggregate metric drops below the previous version. That is how you *prove* B is better than A, not by reading two outputs and preferring one.

## Lesson 11.6: Production monitoring

Sample real runs weekly. Re-run the deterministic evaluators (free). Run the judge on the sample. Human-review 10. Update the golden set when you find a new failure class. This is the loop; it never ends.

<div class="callout failure-lab">

**FAILURE LAB 11: The Judge That Agreed With Everyone**

Ship a deliberately weak judge prompt ("Is this finding good? Answer pass or fail."). Run it on the 50 labelled findings.

Observe: high accuracy, near-100% "pass", ~30% true negative rate. It agrees with everyone.

Fix the prompt with the explicit criterion and negative examples. Recompute TPR/TNR. Then swap in one *contradictory* finding from Lab 08 and confirm the judge now catches it.

</div>

<div class="callout deliverable">

**Deliverable:** `evals/` with the labelled traces, `rubric.md`, deterministic evaluators, the judge + agreement report (before/after), and the CI gate config.

</div>

<div class="callout takeaway">

**Production takeaway:** evals are not a plug-in library. Look at the data, write binary criteria, validate your judge, gate on the golden set. Everything else is vibes.

</div>

## Primary sources

- [Hamel Husain, LLM-as-a-judge](https://hamel.dev/blog/posts/llm-judge/): the methodology this module follows, including judge validation against human labels. If you read one thing this course links, read this.
- [Hamel Husain and Shreya Shankar, evals FAQ](https://hamel.dev/blog/posts/evals-faq/): short answers to the exact objections your team will raise when you propose error analysis before metrics.
