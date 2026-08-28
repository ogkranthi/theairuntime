export type FdeMode = "practice" | "mock";
export type FdeLevel = "foundations" | "fde" | "senior";
export type FdeDuration = 15 | 30;
export type SessionStatus = "active" | "completed";
export type Verdict = "PASS" | "BORDERLINE PASS" | "FAIL" | "INCOMPLETE ASSESSMENT";
export type BarStatus = "PASS" | "BORDERLINE PASS" | "NOT YET" | "INSUFFICIENT EVIDENCE";

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

export type CompetencyId =
  | "problem_discovery"
  | "architecture_decomposition"
  | "context_engineering"
  | "state_data_architecture"
  | "planning_orchestration"
  | "reasoning_contracts"
  | "human_system_interaction"
  | "execution_reliability"
  | "action_safety"
  | "ai_quality_evaluation"
  | "system_operational_validation"
  | "data_identity_security"
  | "agent_authority_safety"
  | "tool_boundaries"
  | "operational_visibility"
  | "trust_explainability"
  | "performance_architecture"
  | "ai_economics"
  | "model_inference_architecture"
  | "fde_judgment";

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

export interface SemanticRevision {
  id: string;
  atSeconds: number;
  summary: string;
  nodeRefs: string[];
  edgeRefs: string[];
}

export interface TranscriptTurn {
  id: string;
  role: "candidate" | "interviewer";
  content: string;
  atSeconds: number;
  testedCompetencies?: CompetencyId[];
  hint?: boolean;
}

export type CoverageStatus =
  | "untested"
  | "demonstrated"
  | "partial"
  | "missed"
  | "insufficient";

export interface CoverageEntry {
  status: CoverageStatus;
  evidenceTurnIds: string[];
  testedByInterviewer: boolean;
}

export interface ResearchConsent {
  accepted: boolean;
  confidentialityAcknowledged: boolean;
  version: string;
  acceptedAt: string;
}

export interface InterviewSession {
  id: string;
  version: 1;
  scenarioId: string;
  scenarioVersion: number;
  mode: FdeMode;
  durationMinutes: FdeDuration;
  level: FdeLevel;
  drillId: string | null;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  phase: InterviewPhase;
  transcript: TranscriptTurn[];
  graph: ArchitectureGraph;
  revisions: SemanticRevision[];
  revealedFactIds: string[];
  coverage: Partial<Record<CompetencyId, CoverageEntry>>;
  researchConsent: ResearchConsent;
  hintCount: number;
  evaluation?: EvaluationResult;
  feedback?: CohortFeedback;
  reportEmail?: string;
}

export type InterviewPhase =
  | "opening"
  | "discovery"
  | "architecture"
  | "deep-dive"
  | "final-defense"
  | "close";

export interface RuleFinding {
  id: string;
  severity: "info" | "warning" | "critical";
  competencies: CompetencyId[];
  message: string;
  nodeRefs: string[];
  edgeRefs: string[];
}

export interface CompetencyEvaluation {
  id: CompetencyId;
  label: string;
  score: number;
  status: CoverageStatus;
  summary: string;
  evidenceRefs: string[];
}

export interface BarRelative {
  foundations: BarStatus;
  fde: BarStatus;
  senior: BarStatus;
}

export interface ReferenceArchitecture {
  id: string;
  title: string;
  summary: string;
  fitsWhen: string;
  tradeoff: string;
}

export interface EvaluationResult {
  verdict: Verdict;
  score: number;
  targetLevel: FdeLevel;
  barRelative: BarRelative;
  strongest: {
    id: CompetencyId;
    label: string;
    reason: string;
    evidenceRefs: string[];
  };
  biggestGap: {
    id: CompetencyId;
    label: string;
    reason: string;
    evidenceRefs: string[];
  };
  interviewerNote: string;
  competencies: CompetencyEvaluation[];
  criticalCoverage: {
    sufficient: boolean;
    coveredGroups: string[];
    missingGroups: string[];
  };
  miniLesson: {
    title: string;
    body: string;
    interviewTakeaway: string;
  };
  nextDrill: {
    id: string;
    title: string;
    reason: string;
    airResourcePath?: string;
  };
  architectureComparison: {
    candidateSummary: string;
    alternatives: ReferenceArchitecture[];
  };
  generatedAt: string;
  degraded: boolean;
}

export interface CohortFeedback {
  realismComparedToChatGPT: 1 | 2 | 3 | 4 | 5;
  wouldReturnTomorrow: boolean;
  comments?: string;
  submittedAt: string;
}

export interface ScenarioFact {
  id: string;
  knowledge: "known" | "unknown" | "stakeholder" | "constraint";
  triggers: string[];
  response: string;
}

export interface HiddenRequirement {
  id: string;
  criticality: "important" | "critical";
  competencies: CompetencyId[];
  strongSignals: string[];
  weakSignals: string[];
}

export interface ScenarioProbe {
  id: string;
  minimumLevel: FdeLevel;
  competencies: CompetencyId[];
  question: string;
  lateConstraint?: boolean;
}

export interface ScenarioSpec {
  id: string;
  version: number;
  title: string;
  domain: string;
  candidateCharter: string;
  openings: Record<FdeLevel, string>;
  drills: Array<{
    id: string;
    title: string;
    focusCompetencies: CompetencyId[];
    opening: string;
    closingPrompt: string;
  }>;
  facts: ScenarioFact[];
  hiddenRequirements: HiddenRequirement[];
  probes: ScenarioProbe[];
  referenceArchitectures: ReferenceArchitecture[];
  remediation: Partial<
    Record<
      CompetencyId,
      {
        title: string;
        airResourcePath: string;
        nextDrillId: string;
      }
    >
  >;
}

export interface StartRequest {
  mode: FdeMode;
  durationMinutes: FdeDuration;
  level: FdeLevel;
  drillId?: string | null;
  researchConsent: boolean;
  confidentialityAcknowledged: boolean;
}

export interface MessageRequest {
  session: InterviewSession;
  candidateMessage: string;
  graph: ArchitectureGraph;
  elapsedSeconds: number;
  requestHint?: boolean;
}

export interface FinishRequest {
  session: InterviewSession;
  graph: ArchitectureGraph;
  elapsedSeconds: number;
}

export interface ReportRequest {
  session: InterviewSession;
  email: string;
  subscribe: boolean;
}

export interface FeedbackRequest {
  sessionId: string;
  realismComparedToChatGPT: 1 | 2 | 3 | 4 | 5;
  wouldReturnTomorrow: boolean;
  comments?: string;
}

export interface InterviewerOutput {
  message: string;
  revealedFactIds: string[];
  testedCompetencies: CompetencyId[];
  phase: InterviewPhase;
  shouldEnd: boolean;
  degraded: boolean;
}

export interface WorkersAiBinding {
  run: (
    model: string,
    input: unknown,
  ) => Promise<{ response?: string } | string | Record<string, unknown>>;
}

export interface KvBinding {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number; metadata?: Record<string, unknown> },
  ) => Promise<void>;
}

export interface FdeGymEnv {
  AI?: WorkersAiBinding;
  FDE_GYM_SESSIONS?: KvBinding;
  FDE_GYM_INTERVIEW_MODEL?: string;
  FDE_GYM_EVALUATOR_MODEL?: string;
  FDE_GYM_SESSION_TTL_SECONDS?: string;
  /** Local-only escape hatch. Never enable for Cohort 0 production. */
  FDE_GYM_ALLOW_STATELESS_DEV?: string;
  RESEND_API_KEY?: string;
  FDE_GYM_FROM_EMAIL?: string;
  FDE_GYM_REPLY_TO?: string;
  FDE_GYM_REPORT_WEBHOOK_URL?: string;
  SUBSTACK_ORIGIN?: string;
  LEAD_WEBHOOK_URL?: string;
}

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
