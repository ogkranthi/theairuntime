export const PRACTICE_REFERENCE = [
  {
    title: "Agent versus deterministic control",
    body:
      "Use AI for ambiguity, synthesis, and adaptive investigation. Keep authorization, policy, retries, lifecycle, and consequential state transitions deterministic.",
  },
  {
    title: "State versus context",
    body:
      "Persist workflow state, domain state, and evidence outside the model. Assemble only the task-specific working context needed for the next reasoning step.",
  },
  {
    title: "Retries and side effects",
    body:
      "A timeout does not tell you whether an external side effect happened. Use idempotency, reconciliation, or a safe action boundary rather than blind retry.",
  },
  {
    title: "Evaluation",
    body:
      "Separate retrieval quality, reasoning quality, tool correctness, task success, and full-system validation. Include long-tail failures and release gates.",
  },
  {
    title: "Authority",
    body:
      "The model may select an intent, but policy and downstream systems decide whether the action is authorized. Prompts are not permission boundaries.",
  },
  {
    title: "Operational visibility",
    body:
      "Be able to reconstruct state transitions, retrieved evidence, model and prompt versions, tool actions, human overrides, latency, and cost.",
  },
] as const;
