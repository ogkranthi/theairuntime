// Single source of truth for Investigation 01's metric-bearing sections. The
// page template renders state off this object: when a section's state is
// "pending", the template shows an honest empty state; when "done", it shows
// the measured number. Nothing here is hand-entered as a result. Update this
// file (not the template) when a run produces real numbers. The credibility of
// the investigation rests on the rubric being frozen (DR-002), so published
// numbers must be the numbers the harness actually produced.

export type RunState = 'pending' | 'done';
export type Status = 'planned' | 'running' | 'decided';
export type DecisionState = 'pending' | 'ship' | 'no-ship';

export interface Metrics {
  state: RunState;
  precision: number | null; // 0..1
  recall: number | null; // 0..1
  costPerQualified: number | null; // USD
  weeklyThroughput: number | null; // integer
}

export interface FailureRow {
  candidate: string;
  modelClaim: string;
  reality: string;
  failureClass: string;
}

export interface Build {
  buildTime: string | null; // e.g. "2 days"
  loc: number | null;
  stack: string[];
  repoUrl: string;
  harnessUrl: string;
}

export interface InvestigationData {
  status: Status;
  lastRun: string | null; // ISO date of the run that produced current numbers
  question: string;
  bar: string;
  baseline: Metrics;
  treatment: Metrics;
  decision: { state: DecisionState; reason: string | null };
  surprise: string | null;
  failures: FailureRow[];
  build: Build;
  nextTeaser: string | null;
}

export const inv01: InvestigationData = {
  status: 'planned',
  lastRun: null,
  question:
    'Can a sourcing agent hit a hard precision bar under a fixed budget, and does selective verification pay for itself?',
  bar: 'Precision at or above the rubric threshold on a blind golden set, sustained weekly. 50 qualified candidates per week. Per-qualified-candidate cost under the ceiling.',
  baseline: {
    state: 'pending',
    precision: null,
    recall: null,
    costPerQualified: null,
    weeklyThroughput: null,
  },
  treatment: {
    state: 'pending',
    precision: null,
    recall: null,
    costPerQualified: null,
    weeklyThroughput: null,
  },
  decision: {
    state: 'pending',
    reason: null,
  },
  surprise: null,
  failures: [],
  build: {
    buildTime: null,
    loc: null,
    // Stack is the real architecture under test, not a fabricated metric.
    stack: ['Tavily', 'Apify', 'verification layer', 'rubric scorer'],
    repoUrl: 'https://github.com/ogkranthi/the-ai-runtime-lab',
    harnessUrl: 'https://github.com/ogkranthi/the-ai-runtime-lab/tree/main/eval-harness',
  },
  // Only ships because there is a real intent to run Investigation 02 next.
  nextTeaser:
    'Next: Investigation 02, a reliability investigation in a regulated banking deployment, where the cost of a false positive is a compliance incident, not a bad cold email.',
};

export const evidenceBySlug: Record<string, InvestigationData> = {
  'design-partner-sourcing': inv01,
};
