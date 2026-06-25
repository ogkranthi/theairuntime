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
  name: string; // short field-report name shown under the eyebrow
  orientation: string; // plain-language standfirst, rendered above the status strip
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
  name: 'Reliable design-partner sourcing',
  orientation:
    'A two-person developer-tools startup needs fifty qualified design partners a week, pulled from public data, under a fixed budget, with no one re-checking each name by hand. A design partner here is an early customer who builds alongside the product, so a wrong name costs a wasted cold email and some trust, not just a bad row in a spreadsheet. Qualified means the company clears a written rubric: right stage, relevant stack, currently active, and a reachable contact. This field report builds the smallest system that can meet that bar, then tests one question: does verifying only the borderline candidates against a second source buy enough precision to justify its cost and the recall it gives up?',
  question:
    'Can a sourcing agent hit a hard precision bar under a fixed budget, and does selective verification pay for itself?',
  bar: 'Precision at or above the rubric threshold on a blind golden set (a hand-labeled answer key the pipeline never sees while it is being tuned), sustained weekly. 50 qualified candidates per week. Per-qualified-candidate cost under the ceiling.',
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
  // Only ships because there is a real intent to run FR-002 next.
  nextTeaser:
    'Next: FR-002, a reliability field report in a regulated banking deployment, where the cost of a false positive is a compliance incident, not a bad cold email.',
};

export const evidenceBySlug: Record<string, InvestigationData> = {
  'design-partner-sourcing': inv01,
};
