/**
 * The Agentic System Design Canvas, as data.
 *
 * This mirrors reference/agentic-system-design-canvas.md section for section.
 * Keeping it here rather than parsing the markdown means the form, the Markdown
 * export and the printed sheet all stay in the same order as the reference doc,
 * and a field rename is one edit.
 */

export type CanvasField = {
  key: string;
  label: string;
  hint?: string;
  /** Rows for the textarea. Long-form fields get more. */
  rows?: number;
};

export type CanvasSection = {
  n: number;
  key: string;
  title: string;
  purpose: string;
  fields: CanvasField[];
};

export const CANVAS_SECTIONS: CanvasSection[] = [
  {
    n: 1,
    key: "outcome",
    title: "Outcome",
    purpose: "Start with the job, not the model. If you cannot name the metric, you cannot design the system.",
    fields: [
      { key: "user", label: "User" },
      { key: "job", label: "Job to be done" },
      { key: "business_outcome", label: "Business outcome" },
      { key: "success_metric", label: "Success metric" },
      { key: "non_goals", label: "Non-goals", rows: 3 },
    ],
  },
  {
    n: 2,
    key: "why-agentic",
    title: "Why agentic?",
    purpose: "Agentic is a cost, not a default. Justify the judgment you are buying.",
    fields: [
      { key: "why_not_workflow", label: "Why a deterministic workflow is insufficient", rows: 3 },
      { key: "model_judgment", label: "Where model judgment is useful", rows: 2 },
      { key: "code_authoritative", label: "Where deterministic code remains authoritative", rows: 2 },
      { key: "simpler_alternative", label: "Simpler alternative considered", rows: 2 },
    ],
  },
  {
    n: 3,
    key: "risk-authority",
    title: "Risk and authority",
    purpose: "Name what the model may never decide. The risk tier shapes the architecture; it is not a paragraph added at the end.",
    fields: [
      { key: "risk_tier", label: "Risk tier", hint: "0 read-only, 1 reversible, 2 material effect, 3 regulated, 4 not automatable" },
      { key: "worst_failure", label: "Worst credible failure", rows: 2 },
      { key: "read_only", label: "Read-only actions", rows: 2 },
      { key: "reversible_writes", label: "Reversible writes", rows: 2 },
      { key: "irreversible", label: "Irreversible or material actions", rows: 2 },
      { key: "approval_points", label: "Human approval points", rows: 2 },
      { key: "prohibited", label: "Prohibited autonomous decisions", rows: 2 },
    ],
  },
  {
    n: 4,
    key: "journey-topology",
    title: "Journey and topology",
    purpose: "The simplest topology that satisfies the requirements, plus the conditions that stop it.",
    fields: [
      { key: "happy_path", label: "Happy path", rows: 3 },
      { key: "pattern", label: "Agent or workflow pattern", hint: "workflow, tool loop, router, planner-executor, supervisor, durable workflow" },
      { key: "key_states", label: "Key states", rows: 2 },
      { key: "stop_condition", label: "Stop condition" },
      { key: "escalation", label: "Escalation condition" },
      { key: "cancellation", label: "Cancellation behavior" },
    ],
  },
  {
    n: 5,
    key: "tools",
    title: "Tools",
    purpose: "Every tool is a contract: typed, scoped, rated for side effect, and idempotent where it touches the world.",
    fields: [
      {
        key: "tool_table",
        label: "Tool contracts",
        hint: "One line per tool: name | input/output | identity and scope | side effect | idempotency | timeout and retry | approval",
        rows: 8,
      },
    ],
  },
  {
    n: 6,
    key: "context-data",
    title: "Context and data",
    purpose: "Rank sources by authority and freshness, and keep untrusted content on the far side of a boundary.",
    fields: [
      { key: "trusted_instructions", label: "Trusted instructions", rows: 2 },
      { key: "user_inputs", label: "User inputs" },
      { key: "retrieved_sources", label: "Retrieved sources", rows: 2 },
      { key: "authority_ranking", label: "Authority and freshness ranking", rows: 2 },
      { key: "acl_strategy", label: "ACL strategy", rows: 2 },
      { key: "citation", label: "Citation and provenance" },
      { key: "context_budget", label: "Context budget and compression", rows: 2 },
      { key: "untrusted_boundary", label: "Untrusted-content boundary", rows: 2 },
    ],
  },
  {
    n: 7,
    key: "state-durability",
    title: "State, memory, and durability",
    purpose: "Say what survives a crash and what must never happen twice.",
    fields: [
      { key: "request_state", label: "Request state" },
      { key: "run_state", label: "Run state" },
      { key: "thread_state", label: "Thread or session state" },
      { key: "workflow_history", label: "Workflow history" },
      { key: "long_term_memory", label: "Long-term memory" },
      { key: "system_of_record", label: "System of record" },
      { key: "survives_crash", label: "What survives a crash", rows: 2 },
      { key: "never_repeat", label: "What must never repeat", rows: 2 },
      { key: "resume_strategy", label: "Resume and version strategy", rows: 2 },
    ],
  },
  {
    n: 8,
    key: "security",
    title: "Security and governance",
    purpose: "Identity has to reach the data and the tools. Injection controls are architecture, not prompt text.",
    fields: [
      { key: "trust_boundaries", label: "Trust boundaries", rows: 2 },
      { key: "tenant_isolation", label: "Tenant isolation", rows: 2 },
      { key: "secrets_identity", label: "Secrets and service identity", rows: 2 },
      { key: "injection_controls", label: "Prompt-injection controls", rows: 3 },
      { key: "exfiltration_controls", label: "Data-exfiltration controls", rows: 2 },
      { key: "sandbox_egress", label: "Sandbox and egress controls", rows: 2 },
      { key: "retention", label: "Retention and deletion" },
      { key: "audit_events", label: "Audit events", rows: 2 },
    ],
  },
  {
    n: 9,
    key: "evals",
    title: "Evals",
    purpose: "Measure the trajectory, not only the final text, and name the number that blocks a release.",
    fields: [
      { key: "golden_cases", label: "Golden cases", rows: 2 },
      { key: "adversarial_cases", label: "Adversarial cases", rows: 2 },
      { key: "component_metrics", label: "Component metrics", rows: 2 },
      { key: "trajectory_metrics", label: "Trajectory metrics", rows: 2 },
      { key: "outcome_metrics", label: "Outcome metrics", rows: 2 },
      { key: "safety_metrics", label: "Safety and policy metrics", rows: 2 },
      { key: "human_calibration", label: "Human calibration" },
      { key: "release_gate", label: "Release gate", rows: 2 },
    ],
  },
  {
    n: 10,
    key: "operations",
    title: "Operations",
    purpose: "One quantitative objective per axis, and the person who is paged when it breaks.",
    fields: [
      { key: "latency_slo", label: "Latency SLO" },
      { key: "availability_slo", label: "Availability and durability SLO" },
      { key: "cost_budget", label: "Cost budget" },
      { key: "throughput", label: "Throughput and peak load" },
      { key: "backpressure", label: "Rate-limit and backpressure strategy", rows: 2 },
      { key: "critical_alerts", label: "Critical alerts", rows: 2 },
      { key: "runbook_owner", label: "Runbook owner" },
    ],
  },
  {
    n: 11,
    key: "rollout",
    title: "Rollout",
    purpose: "How the change reaches production, and what pulls it back.",
    fields: [
      { key: "offline_test", label: "Offline test" },
      { key: "shadow", label: "Shadow" },
      { key: "canary", label: "Canary" },
      { key: "rollback_trigger", label: "Rollback trigger", rows: 2 },
      { key: "versions_recorded", label: "Versions recorded", rows: 2 },
      { key: "production_sampling", label: "Production sampling" },
    ],
  },
  {
    n: 12,
    key: "tradeoffs",
    title: "Open tradeoffs",
    purpose: "Three decisions you made knowing what they cost. A design with no tradeoffs is a design nobody stress-tested.",
    fields: [
      { key: "tradeoff_1", label: "Tradeoff 1", rows: 2 },
      { key: "tradeoff_2", label: "Tradeoff 2", rows: 2 },
      { key: "tradeoff_3", label: "Tradeoff 3", rows: 2 },
    ],
  },
];

export const CANVAS_FIELD_COUNT = CANVAS_SECTIONS.reduce((n, s) => n + s.fields.length, 0);

/** The order to cover under interview time pressure. */
export const INTERVIEW_SHORTHAND = [
  "Outcome and risk",
  "Authority boundaries",
  "Topology",
  "Tools and context",
  "State and durable execution",
  "Security and human review",
  "Evals and SLOs",
  "Scale, cost, and rollout",
];
