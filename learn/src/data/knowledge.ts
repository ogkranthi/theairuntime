export type KnowledgeItem = {
  slug: string;
  title: string;
  summary: string;
  module: string;
  related: string[];
  definition?: string;
};

export const concepts: KnowledgeItem[] = [
  { slug: "checkpoint", title: "Checkpoint", summary: "A durable snapshot from which an interrupted run can continue.", module: "03 · Durable execution", related: ["replay", "durable-execution"], definition: "A checkpoint records enough durable state to continue work without starting the whole run again." },
  { slug: "replay", title: "Replay", summary: "Reconstruct execution from recorded state and decisions.", module: "03 · Durable execution", related: ["checkpoint", "idempotency"], definition: "Replay re-runs execution from durable history so a system can recover, inspect, or reproduce what happened." },
  { slug: "durable-execution", title: "Durable execution", summary: "Progress that survives process and infrastructure failure.", module: "03 · Durable execution", related: ["checkpoint", "replay"] },
  { slug: "idempotency", title: "Idempotency", summary: "Repeating an operation has the same intended effect as doing it once.", module: "04 · Side effects", related: ["reconciliation", "replay"] },
  { slug: "reconciliation", title: "Reconciliation", summary: "Compare desired and observed state before deciding what to do next.", module: "04 · Side effects", related: ["idempotency", "checkpoint"] },
  { slug: "lease", title: "Lease", summary: "Time-limited ownership that must be renewed while an owner is healthy.", module: "05 · Work ownership", related: ["heartbeat", "fencing-token"], definition: "A lease is time-limited ownership. If its owner stops renewing it, another worker may safely claim the work." },
  { slug: "heartbeat", title: "Heartbeat", summary: "A periodic signal that proves a worker is still healthy.", module: "05 · Work ownership", related: ["lease", "orphaned-run"] },
  { slug: "fencing-token", title: "Fencing token", summary: "A monotonic token that prevents stale owners from writing.", module: "05 · Work ownership", related: ["lease", "heartbeat"] },
  { slug: "orphaned-run", title: "Orphaned run", summary: "Work whose recorded owner is no longer able to make progress.", module: "06 · Failure handling", related: ["lease", "heartbeat"] },
  { slug: "human-interrupt", title: "Human interrupt", summary: "A durable pause that hands a decision to a person.", module: "07 · Human control", related: ["checkpoint", "artifact"] },
  { slug: "context-compaction", title: "Context compaction", summary: "Reduce working context while retaining decision-relevant evidence.", module: "08 · Context", related: ["artifact", "trajectory-evaluation"] },
  { slug: "artifact", title: "Artifact", summary: "A durable, inspectable output passed between steps or people.", module: "08 · Context", related: ["context-compaction", "human-interrupt"] },
  { slug: "trajectory-evaluation", title: "Trajectory evaluation", summary: "Judge the path an agent took, not only its final answer.", module: "11 · Evaluation", related: ["eval-judge", "artifact"] },
  { slug: "eval-judge", title: "Evaluation judge", summary: "A rubric-driven evaluator for behavior that cannot be checked exactly.", module: "11 · Evaluation", related: ["trajectory-evaluation", "artifact"] },
  { slug: "agent-harness", title: "Agent harness", summary: "The control layer around a model: tools, state, policy, budgets, and verification.", module: "12 · Deep agents", related: ["checkpoint", "trajectory-evaluation"] },
];

export const patterns: KnowledgeItem[] = [
  { slug: "reconcile-before-retry", title: "Reconcile Before Retry", summary: "Observe the external system before repeating an ambiguous side effect.", module: "04 · Side effects", related: ["idempotency", "reconciliation"] },
  { slug: "evidence-carrying-claim", title: "Evidence-Carrying Claim", summary: "Attach inspectable evidence to every material agent assertion.", module: "11 · Evaluation", related: ["artifact", "trajectory-evaluation"] },
  { slug: "bounded-agent-loop", title: "Bounded Agent Loop", summary: "Give every loop explicit step, time, and cost limits.", module: "12 · Deep agents", related: ["agent-harness", "trajectory-evaluation"] },
  { slug: "durable-human-wait", title: "Durable Human Wait", summary: "Persist state before pausing for an asynchronous human decision.", module: "07 · Human control", related: ["human-interrupt", "checkpoint"] },
  { slug: "context-quarantine", title: "Context Quarantine", summary: "Keep untrusted context isolated until it is inspected and promoted.", module: "08 · Context", related: ["artifact", "context-compaction"] },
  { slug: "artifact-handoff", title: "Artifact Handoff", summary: "Pass durable artifacts—not hidden conversational state—between actors.", module: "08 · Context", related: ["artifact", "human-interrupt"] },
  { slug: "verify-then-act", title: "Verify Then Act", summary: "Check authority, preconditions, and evidence before an irreversible action.", module: "10 · Security", related: ["artifact", "agent-harness"] },
  { slug: "state-outside-the-model", title: "State Outside the Model", summary: "Keep authoritative workflow state in a durable system of record.", module: "02 · State", related: ["checkpoint", "agent-harness"] },
  { slug: "budget-envelope", title: "Budget Envelope", summary: "Bound cost, time, tokens, and tool calls for every run.", module: "12 · Deep agents", related: ["agent-harness", "trajectory-evaluation"] },
  { slug: "lease-and-recover", title: "Lease and Recover", summary: "Use expiring claims and fencing to safely reclaim abandoned work.", module: "05 · Work ownership", related: ["lease", "heartbeat", "fencing-token"] },
];

export const conceptBySlug = (slug: string) => concepts.find((item) => item.slug === slug);
