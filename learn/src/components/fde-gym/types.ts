export type FdeMode = "practice" | "mock";
export type FdeLevel = "foundations" | "fde" | "senior";
export type FdeDuration = 15 | 30;
export type ComponentKind =
  | "user"
  | "application"
  | "agent"
  | "llm"
  | "orchestrator"
  | "workflow"
  | "tool"
  | "api"
  | "retriever"
  | "vector-store"
  | "database"
  | "object-store"
  | "queue"
  | "cache"
  | "human"
  | "policy"
  | "identity"
  | "evaluator"
  | "observability"
  | "custom";

export interface ArchitectureNode {
  id: string;
  kind: ComponentKind;
  label: string;
  technology?: string;
  position: { x: number; y: number };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  revision: number;
}

export interface TranscriptTurn {
  id: string;
  role: "candidate" | "interviewer";
  content: string;
  atSeconds: number;
  testedCompetencies?: string[];
  hint?: boolean;
}

export interface InterviewSession {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  mode: FdeMode;
  durationMinutes: FdeDuration;
  level: FdeLevel;
  drillId: string | null;
  status: "active" | "completed";
  startedAt: string;
  elapsedSeconds: number;
  phase: string;
  transcript: TranscriptTurn[];
  graph: ArchitectureGraph;
  revisions: Array<{
    id: string;
    atSeconds: number;
    summary: string;
    nodeRefs: string[];
    edgeRefs: string[];
  }>;
  revealedFactIds: string[];
  coverage: Record<string, unknown>;
  researchConsent: {
    accepted: boolean;
    confidentialityAcknowledged: boolean;
    version: string;
    acceptedAt: string;
  };
  hintCount: number;
  evaluation?: EvaluationResult;
}

export interface ResultSummary {
  verdict:
    | "PASS"
    | "BORDERLINE PASS"
    | "FAIL"
    | "INCOMPLETE ASSESSMENT";
  score: number;
  targetLevel: FdeLevel;
  strongest: {
    id: string;
    label: string;
    reason: string;
    evidenceRefs: string[];
  };
  biggestGap: {
    id: string;
    label: string;
    reason: string;
    evidenceRefs: string[];
  };
  interviewerNote: string;
  barRelative: {
    foundations: string;
    fde: string;
    senior: string;
  };
  criticalCoverage: {
    sufficient: boolean;
    coveredGroups: string[];
    missingGroups: string[];
  };
  degraded: boolean;
}

export interface EvaluationResult extends ResultSummary {
  competencies: Array<{
    id: string;
    label: string;
    score: number;
    status: string;
    summary: string;
    evidenceRefs: string[];
  }>;
}

export interface StartOptions {
  mode: FdeMode;
  durationMinutes: FdeDuration;
  level: FdeLevel;
  researchConsent: boolean;
  confidentialityAcknowledged: boolean;
}

export interface ApiErrorShape {
  error?: string;
}
