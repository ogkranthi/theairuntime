import type {
  ArchitectureGraph,
  CompetencyId,
  CoverageEntry,
  InterviewPhase,
  InterviewSession,
} from "./types";

export const nowIso = () => new Date().toISOString();

export function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
}

export function phaseFor(
  durationMinutes: 15 | 30,
  elapsedSeconds: number,
): InterviewPhase {
  const minute = elapsedSeconds / 60;
  if (durationMinutes === 15) {
    if (minute < 0.5) return "opening";
    if (minute < 3) return "discovery";
    if (minute < 9) return "architecture";
    if (minute < 12.5) return "deep-dive";
    if (minute < 14.5) return "final-defense";
    return "close";
  }

  if (minute < 0.5) return "opening";
  if (minute < 6) return "discovery";
  if (minute < 18) return "architecture";
  if (minute < 25) return "deep-dive";
  if (minute < 29) return "final-defense";
  return "close";
}

export function safeGraph(value: unknown): ArchitectureGraph {
  const raw = (value ?? {}) as Partial<ArchitectureGraph>;
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.slice(0, 60).map((node, index) => {
        const n = node as ArchitectureGraph["nodes"][number];
        return {
          id: cleanText(n?.id, 80) || `node-${index + 1}`,
          kind: n?.kind ?? "custom",
          label: cleanText(n?.label, 120) || "Component",
          technology: cleanText(n?.technology, 80) || undefined,
          position: {
            x: clampInt(n?.position?.x, -10000, 10000),
            y: clampInt(n?.position?.y, -10000, 10000),
          },
        };
      })
    : [];

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(raw.edges)
    ? raw.edges
        .slice(0, 120)
        .map((edge, index) => {
          const e = edge as ArchitectureGraph["edges"][number];
          return {
            id: cleanText(e?.id, 80) || `edge-${index + 1}`,
            source: cleanText(e?.source, 80),
            target: cleanText(e?.target, 80),
            label: cleanText(e?.label, 100) || undefined,
          };
        })
        .filter(
          (edge) =>
            edge.source &&
            edge.target &&
            edge.source !== edge.target &&
            nodeIds.has(edge.source) &&
            nodeIds.has(edge.target),
        )
    : [];

  return {
    nodes,
    edges,
    revision: clampInt(raw.revision, 0, 10000),
  };
}

const COMPETENCY_PATTERNS: Partial<Record<CompetencyId, RegExp[]>> = {
  problem_discovery: [
    /\brequirement/i,
    /\bwho (decides|uses|owns)/i,
    /\bsuccess criteria/i,
    /\bassum/i,
    /\bfailure cost/i,
  ],
  architecture_decomposition: [
    /\bdeterministic/i,
    /\bagentic/i,
    /\bworkflow/i,
    /\bwhy (an )?agent/i,
    /\bboundary/i,
  ],
  context_engineering: [
    /\bcontext window/i,
    /\bsummar/i,
    /\bretriev/i,
    /\bworking context/i,
    /\bcontext budget/i,
  ],
  state_data_architecture: [
    /\bsource of truth/i,
    /\bstate/i,
    /\bpersist/i,
    /\bdatabase/i,
    /\bevidence store/i,
  ],
  planning_orchestration: [
    /\borchestrat/i,
    /\bstate machine/i,
    /\bnext step/i,
    /\bplanner/i,
    /\bworkflow controls/i,
  ],
  reasoning_contracts: [
    /\boutput schema/i,
    /\bstructured output/i,
    /\btermination/i,
    /\bescalat/i,
    /\bmust not/i,
  ],
  human_system_interaction: [
    /\bhuman/i,
    /\banalyst/i,
    /\bapproval/i,
    /\bescalat/i,
    /\boverride/i,
  ],
  execution_reliability: [
    /\bdurable/i,
    /\bcheckpoint/i,
    /\bretry/i,
    /\bresume/i,
    /\brecover/i,
    /\blong[- ]running/i,
  ],
  action_safety: [
    /\bidempoten/i,
    /\breconcil/i,
    /\bside effect/i,
    /\backnowledg/i,
    /\bduplicate/i,
  ],
  ai_quality_evaluation: [
    /\beval/i,
    /\bgrounded/i,
    /\brecall/i,
    /\bprecision/i,
    /\btask success/i,
    /\bfalse negative/i,
  ],
  system_operational_validation: [
    /\bshadow/i,
    /\bcanary/i,
    /\brollback/i,
    /\bfailure injection/i,
    /\brelease gate/i,
    /\bregression/i,
  ],
  data_identity_security: [
    /\bacl/i,
    /\bidentity/i,
    /\bauthoriz/i,
    /\btenant/i,
    /\bjurisdiction/i,
    /\bleast privilege/i,
  ],
  agent_authority_safety: [
    /\bauthority/i,
    /\bpermission/i,
    /\bpolicy/i,
    /\bconsequential/i,
    /\bmodel cannot/i,
  ],
  tool_boundaries: [
    /\bnarrow tool/i,
    /\btool boundary/i,
    /\binput validation/i,
    /\bfunction schema/i,
    /\bmcp/i,
  ],
  operational_visibility: [
    /\btrace/i,
    /\blog/i,
    /\bobservab/i,
    /\bdebug/i,
    /\bstate transition/i,
  ],
  trust_explainability: [
    /\bcitation/i,
    /\bprovenance/i,
    /\baudit/i,
    /\breconstruct/i,
    /\bversion/i,
  ],
  performance_architecture: [
    /\blatency/i,
    /\bthroughput/i,
    /\bconcurrency/i,
    /\bbackpressure/i,
    /\brate limit/i,
  ],
  ai_economics: [
    /\bcost per/i,
    /\btoken cost/i,
    /\bbudget/i,
    /\broi/i,
    /\bhuman review cost/i,
  ],
  model_inference_architecture: [
    /\bmodel rout/i,
    /\bsmaller model/i,
    /\bmultimodal/i,
    /\bstructured output/i,
    /\binference/i,
  ],
  fde_judgment: [
    /\btradeoff/i,
    /\bmvp/i,
    /\bdefer/i,
    /\bvalidate/i,
    /\bif .* changed/i,
    /\bsix weeks/i,
  ],
};

export function inferCandidateCompetencies(text: string): CompetencyId[] {
  const out: CompetencyId[] = [];
  for (const [id, patterns] of Object.entries(COMPETENCY_PATTERNS) as Array<
    [CompetencyId, RegExp[]]
  >) {
    if (patterns.some((pattern) => pattern.test(text))) out.push(id);
  }
  return out;
}

export function updateCoverageFromCandidateTurn(
  session: InterviewSession,
  turnId: string,
  candidateText: string,
  priorTested: CompetencyId[],
): void {
  const inferred = new Set<CompetencyId>([
    ...inferCandidateCompetencies(candidateText),
    ...priorTested,
  ]);

  for (const id of inferred) {
    const existing: CoverageEntry = session.coverage[id] ?? {
      status: "untested",
      evidenceTurnIds: [],
      testedByInterviewer: false,
    };

    if (!existing.evidenceTurnIds.includes(turnId)) {
      existing.evidenceTurnIds.push(turnId);
    }
    if (priorTested.includes(id)) existing.testedByInterviewer = true;

    const directlyMentioned = inferCandidateCompetencies(candidateText).includes(id);
    existing.status = directlyMentioned
      ? existing.status === "demonstrated"
        ? "demonstrated"
        : "partial"
      : existing.status === "untested"
        ? "partial"
        : existing.status;
    session.coverage[id] = existing;
  }
}

export function normalizeSessionForClient(session: InterviewSession): InterviewSession {
  const cloned = JSON.parse(JSON.stringify(session)) as InterviewSession;
  // Detailed evaluation evidence stays server-side until the report request.
  delete cloned.evaluation;
  delete cloned.feedback;
  delete cloned.reportEmail;
  return cloned;
}
