---
module: 11
title: "Evaluating Long-Running Agents"
duration: "75-90 min"
goal: "Make evals the development loop: error analysis on real traces, binary criteria, a validated judge, and a regression gate that proves version B beats version A."
question: "How do we prove version B is better than version A?"
hook: "Version B feels better. Feels."
scenario: "Two prompt versions, two plausible answer sets, one executive about to quote the wrong number. Deciding which version ships is an engineering problem."
caseStudy: enterprise-data-agent
skills: [Error analysis, Judges, Regression gates]
technologies: [Python]
repoPath: "evals/"
labNumber: 11
invariant: "I12: version B is not called better without evaluation evidence."
lab: "The Judge That Agreed With Everyone"
deliverable: "evals/ (labeled traces, rubric, deterministic evaluator, judge, agreement report)"
status: published
---

Do not begin by writing an LLM-judge prompt.

Begin by looking at failures.

## What are we evaluating?

For a one-shot model response, an evaluator may ask whether the answer is correct.

For a long-running agent, evaluate several layers:

```text
OUTCOME
Did the run finish with the required useful result?

EVIDENCE
Are verified claims actually supported?

TRAJECTORY
Did the agent take sensible actions or loop/waste work?

RECOVERY
Did it preserve correct progress through injected failures?

CONTROL
Were approvals, cancellation, and permissions respected?

EFFICIENCY
What did it cost in time, calls, and money?
```

The artifact and the trajectory both matter.

## Step 1: Collect representative traces

Run across:

```text
fixture vendors
failure profiles
small set of stable public sites if useful
```

Collect enough traces to see repeated behavior, perhaps 30-50 for a first meaningful pass, not because the number is magical but because one or two demos are not error analysis.

## Step 2: Human error analysis

For each trace write:

```text
What went wrong?
Where did it first go wrong?
What was the impact?
Could this be detected automatically?
```

Possible clusters:

```text
false completion
repeated page selection
missed contradiction
unnecessary escalation
budget spent on irrelevant pages
unsafe retry
stale approval
```

Let observed errors shape the eval criteria.

Do not start with a generic rubric detached from your failure data.

## Step 3: Deterministic evaluators first

Many important properties do not require another model.

```python
def no_false_completion(run) -> bool:
    ...

def all_evidence_resolves(run) -> bool:
    ...

def publish_count_is_one(run) -> bool:
    ...

def approval_precedes_publish(run) -> bool:
    ...

def no_forbidden_fetch(run) -> bool:
    ...

def orphan_recovered(run) -> bool:
    ...
```

If SQL or code can prove the property exactly, use it.

## Step 4: Semantic evaluators

Some criteria require language understanding.

Example:

> Does this evidence actually support the claim?

Judge input:

```json
{
  "claim": "The vendor supports SAML SSO.",
  "evidence": "Enterprise accounts can configure SAML-based single sign-on."
}
```

Keep the criterion narrow:

```text
PASS if the supplied evidence directly supports the claim.
FAIL if support is absent, indirect, contradictory, or requires facts outside the supplied evidence.
```

One evaluator should not simultaneously grade writing style, truthfulness, completeness, and security.

## Step 5: Validate a model judge against humans

Create human labels first.

Run the judge on the same examples.

Report:

```text
true positives
false positives
true negatives
false negatives
```

A pass-happy judge can have deceptively high accuracy on a dataset where most examples pass.

The confusion matrix reveals the error mode.

For a safety/correctness criterion, false PASS may be much worse than false FAIL.

Choose release thresholds based on consequence, not an arbitrary universal percentage.

## Step 6: Regression suite

Run the same golden set against A and B.

Report:

```text
                      Version A   Version B   Delta
Evidence pass rate
False completion
Recovery pass rate
Security pass rate
Median cost
p95 duration
Human escalations
```

A system change can improve quality while increasing cost. Show both.

## Step 7: Slice results

Aggregate averages hide regressions.

Slice by:

```text
vendor type
failure profile
requirement
model
code version
budget tier
```

Example:

```text
Overall score: improved
Security-evidence slice: regressed
```

That slice may block release even when the mean is better.

## Trajectory evaluators

Examples:

```text
same content hash fetched >2 times?
8 decisions without durable progress?
publish attempted before approval?
>50% of model cost produced no evidence?
run successfully recovered after kill?
```

These often tell you more about an agent system than a generic final-answer judge.

## Production sampling

You cannot manually read every live trace.

Sample strategically:

```text
all failed runs
all security denials
all high-cost runs
all human escalations
random successful runs
```

Continue error analysis after deployment.

<div class="callout failure-lab">

**FAILURE LAB 11: The Judge That Agreed With Everyone**

Create a labeled set with both supported and unsupported claims.

Use an intentionally vague judge prompt first.

Observe pass bias.

Improve the criterion and examples.

The lab output must contain:

```text
label distribution
judge/model version
confusion matrix
known failure modes
chosen release threshold and why
```

</div>


## Eval card

Document each important semantic evaluator:

```text
purpose
input
criterion
human label process
judge model/version
validation data
confusion matrix
known blind spots
release threshold
```

## Check your understanding

<div class="block-diagnose">

Answer before moving on. If one is fuzzy, the relevant section is a scroll away.

1. Why does error analysis come before rubric design?
2. Which properties should not use an LLM judge?
3. Why can judge accuracy alone be misleading?
4. What is a trajectory evaluator?
5. Why should evaluation results be sliced?

</div>

## Exit criteria

<div class="block-exit">

Observable conditions, not "I understand it". Check them off; progress is saved in your browser.

- [ ] 50 real traces labeled by hand, with failure modes clustered and counted
- [ ] At least five binary criteria written with pass, fail, and edge definitions
- [ ] Deterministic evaluators cover every criterion that needs no model
- [ ] The judge is validated against human labels with TPR and TNR reported separately
- [ ] The golden set and regression gate run on every change

</div>

## Primary sources

- [Hamel Husain, LLM-as-a-judge](https://hamel.dev/blog/posts/llm-judge/): the methodology this module follows, including judge validation against human labels. If you read one thing this course links, read this.
- [Hamel Husain and Shreya Shankar, evals FAQ](https://hamel.dev/blog/posts/evals-faq/): short answers to the exact objections your team will raise when you propose error analysis before metrics.
