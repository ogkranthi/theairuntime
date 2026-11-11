import { LIMITS } from "../security/types";
import { withSessionSecurity } from "../security/boundary";
import { readLimitedText } from "../security/body";
import { COUNTERPARTY_DUE_DILIGENCE } from "./scenario";
import { evaluateSession } from "./evaluator";
import { lastModelFailure } from "./model";
import { openingTurn, runInterviewer } from "./interviewer";
import { semanticGraphRevisions } from "./rules";
import {
  renderReportHtml,
  sendPersonalizedReport,
  subscribeToAir,
} from "./report";
import type {
  ArchitectureGraph,
  CompetencyId,
  FeedbackRequest,
  FdeDuration,
  FdeGymEnv,
  FdeLevel,
  FdeMode,
  FinishRequest,
  InterviewSession,
  MessageRequest,
  ReportRequest,
  StartRequest,
} from "./types";
import {
  clampInt,
  cleanText,
  isValidEmail,
  jsonResponse,
  normalizeSessionForClient,
  nowIso,
  phaseFor,
  safeGraph,
  updateCoverageFromCandidateTurn,
} from "./utils";

const CONSENT_VERSION = "cohort-0-v1";
export const MAX_CANDIDATE_TURNS = LIMITS.gymTurns;

const validModes: FdeMode[] = ["practice", "mock"];
const validLevels: FdeLevel[] = ["foundations", "fde", "senior"];
const validDurations: FdeDuration[] = [15, 30];

async function persistSession(env: FdeGymEnv, session: InterviewSession): Promise<void> {
  if (!env.securityExecution) throw new Error("Session security is unavailable.");
  env.securityExecution.saveSession(session);
}

async function canonicalSession(
  env: FdeGymEnv,
  clientSession: InterviewSession,
): Promise<InterviewSession> {
  if (!env.FDE_GYM_SESSIONS) throw new Error("Session storage is unavailable.");
  const session = env.securityExecution?.canonicalSession
    ? structuredClone(env.securityExecution.canonicalSession)
    : null;
  if (!session?.accessToken || !clientSession.accessToken ||
      !(await sameCapability(session.accessToken, clientSession.accessToken))) {
    throw new SessionAccessError();
  }
  if (!session.expiresAt || Date.now() >= session.expiresAt) {
    throw new SessionAccessError();
  }
  return session;
}

class SessionAccessError extends Error {}

async function sameCapability(expected: string, supplied: string): Promise<boolean> {
  if (typeof supplied !== "string" || supplied.length > 100) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(expected),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const data = encoder.encode("gym-session-capability");
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const suppliedKey = await crypto.subtle.importKey("raw", encoder.encode(supplied),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", suppliedKey, signature, data);
}

function serverElapsed(session: InterviewSession): number {
  return Math.max(session.elapsedSeconds, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000));
}

function sanitizeLevel(value: unknown): FdeLevel {
  return validLevels.includes(value as FdeLevel)
    ? (value as FdeLevel)
    : "fde";
}

function sanitizeMode(value: unknown): FdeMode {
  return validModes.includes(value as FdeMode)
    ? (value as FdeMode)
    : "mock";
}

function sanitizeDuration(value: unknown): FdeDuration {
  const number = Number(value);
  return validDurations.includes(number as FdeDuration)
    ? (number as FdeDuration)
    : 30;
}

function safeSession(value: unknown): InterviewSession {
  const raw = value as InterviewSession;
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof raw.id !== "string" ||
    raw.scenarioId !== COUNTERPARTY_DUE_DILIGENCE.id
  ) {
    throw new Error("Invalid FDE Gym session.");
  }

  const transcript = Array.isArray(raw.transcript)
    ? raw.transcript.slice(0, 100).map((turn, index) => ({
        id: cleanText(turn.id, 80) || `turn-${index + 1}`,
        role:
          turn.role === "candidate"
            ? ("candidate" as const)
            : ("interviewer" as const),
        content: cleanText(turn.content, 4000),
        atSeconds: clampInt(turn.atSeconds, 0, 60 * 60),
        testedCompetencies: Array.isArray(turn.testedCompetencies)
          ? (turn.testedCompetencies.slice(0, 6) as CompetencyId[])
          : undefined,
        hint: Boolean(turn.hint),
      }))
    : [];

  const validFactIds = new Set(
    COUNTERPARTY_DUE_DILIGENCE.facts.map((fact) => fact.id),
  );
  const revealedFactIds = Array.isArray(raw.revealedFactIds)
    ? raw.revealedFactIds
        .filter((id): id is string => typeof id === "string")
        .filter((id) => validFactIds.has(id))
    : [];

  return {
    ...raw,
    version: 1,
    scenarioId: COUNTERPARTY_DUE_DILIGENCE.id,
    scenarioVersion: COUNTERPARTY_DUE_DILIGENCE.version,
    mode: sanitizeMode(raw.mode),
    durationMinutes: sanitizeDuration(raw.durationMinutes),
    level: sanitizeLevel(raw.level),
    drillId: cleanText(raw.drillId, 100) || null,
    status: raw.status === "completed" ? "completed" : "active",
    elapsedSeconds: clampInt(
      raw.elapsedSeconds,
      0,
      sanitizeDuration(raw.durationMinutes) * 60 + 600,
    ),
    phase: raw.phase ?? "opening",
    transcript,
    graph: safeGraph(raw.graph),
    revisions: Array.isArray(raw.revisions)
      ? raw.revisions.slice(0, 100)
      : [],
    revealedFactIds: [...new Set(revealedFactIds)],
    coverage: raw.coverage ?? {},
    researchConsent: {
      accepted: Boolean(raw.researchConsent?.accepted),
      confidentialityAcknowledged: Boolean(
        raw.researchConsent?.confidentialityAcknowledged,
      ),
      version: cleanText(raw.researchConsent?.version, 80) || CONSENT_VERSION,
      acceptedAt:
        cleanText(raw.researchConsent?.acceptedAt, 80) || raw.startedAt,
    },
    hintCount: clampInt(raw.hintCount, 0, 100),
    // Evaluation is accepted only from the canonical KV copy when available.
    evaluation: raw.evaluation,
  };
}

async function readBody<T>(request: Request, maxBytes = 300_000): Promise<T> {
  const text = await readLimitedText(request, maxBytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON.");
  }
}

function startSession(body: StartRequest): InterviewSession {
  const mode = sanitizeMode(body.mode);
  const durationMinutes = sanitizeDuration(body.durationMinutes);
  const level = sanitizeLevel(body.level);
  const drillId =
    durationMinutes === 15
      ? cleanText(body.drillId, 100) ||
        COUNTERPARTY_DUE_DILIGENCE.drills[0]?.id ||
        null
      : null;
  const startedAt = nowIso();
  const base: InterviewSession = {
    id: crypto.randomUUID(),
    version: 1,
    scenarioId: COUNTERPARTY_DUE_DILIGENCE.id,
    scenarioVersion: COUNTERPARTY_DUE_DILIGENCE.version,
    mode,
    durationMinutes,
    level,
    drillId,
    status: "active",
    startedAt,
    elapsedSeconds: 0,
    phase: "opening",
    transcript: [],
    graph: { nodes: [], edges: [], revision: 0 },
    revisions: [],
    revealedFactIds: [],
    coverage: {},
    researchConsent: {
      accepted: Boolean(body.researchConsent),
      confidentialityAcknowledged: Boolean(
        body.confidentialityAcknowledged,
      ),
      version: CONSENT_VERSION,
      acceptedAt: startedAt,
    },
    hintCount: 0,
  };
  base.transcript.push({
    id: "turn-1",
    role: "interviewer",
    content: openingTurn(COUNTERPARTY_DUE_DILIGENCE, base),
    atSeconds: 0,
  });
  return base;
}

async function handleStart(request: Request, env: FdeGymEnv): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await readBody<StartRequest>(request, 30_000);
  if (!env.FDE_GYM_SESSIONS) {
    // A visitor sees this on the setup screen, so it stays in plain language.
    // Storage is required for canonical state and session capabilities.
    return jsonResponse(
      {
        error:
          "FDE Gym is not open yet. Session retention is still being configured, so interviews cannot start. Please try again later.",
      },
      { status: 503 },
    );
  }
  if (!body.researchConsent || !body.confidentialityAcknowledged) {
    return jsonResponse(
      {
        error:
          "Cohort 0 requires research consent and acknowledgement that confidential information must not be entered.",
      },
      { status: 400 },
    );
  }

  const session = startSession(body);
  session.id = env.securityExecution!.sessionId;
  session.accessToken = env.securityExecution!.accessToken;
  session.expiresAt = env.securityExecution!.expiresAt;
  session.revision = 0;
  await persistSession(env, session);
  return jsonResponse({
    session: normalizeSessionForClient(session),
    charter: COUNTERPARTY_DUE_DILIGENCE.candidateCharter,
    degraded: !env.AI,
  });
}

async function handleMessage(
  request: Request,
  env: FdeGymEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await readBody<MessageRequest>(request);
  let session = safeSession(body.session);
  session = await canonicalSession(env, session);
  session = safeSession(session);

  if (session.status !== "active") {
    return jsonResponse(
      { error: "This interview is already complete." },
      { status: 409 },
    );
  }

  if (serverElapsed(session) >= session.durationMinutes * 60 ||
      session.transcript.filter(turn => turn.role === "candidate").length >= MAX_CANDIDATE_TURNS) {
    return jsonResponse({ error: "This interview has reached its limit. Finish to see your result." }, { status: 409 });
  }

  const candidateMessage = cleanText(body.candidateMessage, 3000);
  if (!candidateMessage) {
    return jsonResponse(
      { error: "Enter a response before sending." },
      { status: 400 },
    );
  }

  const elapsedSeconds = serverElapsed(session);
  const graph: ArchitectureGraph = safeGraph(body.graph);
  const revisions = semanticGraphRevisions(
    session.graph,
    graph,
    elapsedSeconds,
  );
  session.revisions.push(...revisions);
  session.graph = graph;
  session.elapsedSeconds = elapsedSeconds;
  session.phase = phaseFor(session.durationMinutes, elapsedSeconds);

  const priorInterviewer = [...session.transcript]
    .reverse()
    .find((turn) => turn.role === "interviewer");
  const priorTested = priorInterviewer?.testedCompetencies ?? [];
  const candidateTurnId = `turn-${session.transcript.length + 1}`;
  session.transcript.push({
    id: candidateTurnId,
    role: "candidate",
    content: candidateMessage,
    atSeconds: elapsedSeconds,
  });
  updateCoverageFromCandidateTurn(
    session,
    candidateTurnId,
    candidateMessage,
    priorTested,
  );

  const requestHint =
    session.mode === "practice" && Boolean(body.requestHint);
  if (requestHint) session.hintCount += 1;

  const output = await runInterviewer(
    env,
    COUNTERPARTY_DUE_DILIGENCE,
    session,
    candidateMessage,
    requestHint,
  );

  session.revealedFactIds = [
    ...new Set([
      ...session.revealedFactIds,
      ...output.revealedFactIds,
    ]),
  ];

  for (const id of output.testedCompetencies) {
    const entry = session.coverage[id] ?? {
      status: "untested" as const,
      evidenceTurnIds: [],
      testedByInterviewer: false,
    };
    entry.testedByInterviewer = true;
    session.coverage[id] = entry;
  }

  const interviewerTurnId = `turn-${session.transcript.length + 1}`;
  session.transcript.push({
    id: interviewerTurnId,
    role: "interviewer",
    content: output.message,
    atSeconds: elapsedSeconds,
    testedCompetencies: output.testedCompetencies,
    hint: requestHint,
  });

  await persistSession(env, session);
  return jsonResponse({
    session: normalizeSessionForClient(session),
    interviewerMessage: output.message,
    phase: output.phase,
    shouldEnd: output.shouldEnd,
    degraded: output.degraded,
  });
}

async function handleFinish(
  request: Request,
  env: FdeGymEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await readBody<FinishRequest>(request);
  let session = safeSession(body.session);
  session = await canonicalSession(env, session);
  session = safeSession(session);

  if (session.status === "completed" && session.evaluation) {
    return jsonResponse({
      session: normalizeSessionForClient(session),
      summary: session.evaluation,
    });
  }

  const elapsedSeconds = serverElapsed(session);
  const graph = safeGraph(body.graph);
  session.revisions.push(
    ...semanticGraphRevisions(session.graph, graph, elapsedSeconds),
  );
  session.graph = graph;
  session.elapsedSeconds = elapsedSeconds;
  session.phase = "close";

  const evaluation = await evaluateSession(
    env,
    COUNTERPARTY_DUE_DILIGENCE,
    session,
  );
  session.evaluation = evaluation;
  session.status = "completed";
  session.completedAt = nowIso();

  await persistSession(env, session);
  return jsonResponse({
    session: normalizeSessionForClient(session),
    summary: {
      verdict: evaluation.verdict,
      score: evaluation.score,
      targetLevel: evaluation.targetLevel,
      strongest: evaluation.strongest,
      biggestGap: evaluation.biggestGap,
      interviewerNote: evaluation.interviewerNote,
      barRelative: evaluation.barRelative,
      criticalCoverage: evaluation.criticalCoverage,
      degraded: evaluation.degraded,
    },
  });
}

async function handleReport(
  request: Request,
  env: FdeGymEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await readBody<ReportRequest>(request);
  const email = cleanText(body.email, 320).toLowerCase();
  if (!isValidEmail(email)) {
    return jsonResponse(
      { error: "Please provide a valid email." },
      { status: 400 },
    );
  }
  if (!body.subscribe) {
    return jsonResponse(
      { error: "Explicit subscription consent is required to send the report." },
      { status: 400 },
    );
  }

  let session = safeSession(body.session);
  session = await canonicalSession(env, session);
  session = safeSession(session);

  if (session.status !== "completed" || !session.evaluation) {
    return jsonResponse(
      {
        error: env.FDE_GYM_SESSIONS
          ? "Complete the interview before requesting a report."
          : "Detailed reports are not available yet. Session retention is still being configured.",
      },
      { status: env.FDE_GYM_SESSIONS ? 409 : 503 },
    );
  }

  const subscribed = await subscribeToAir(env, email, session);
  const delivery = await sendPersonalizedReport(env, email, session);
  session.reportEmail = email;
  await persistSession(env, session);

  const delivered = delivery.emailed || delivery.webhookDelivered;
  if (!delivered) {
    return jsonResponse(
      {
        error:
          "The report could not be delivered because email delivery is not configured or failed. Your result remains available in this session.",
        subscribed,
        emailed: false,
      },
      { status: 503 },
    );
  }

  return jsonResponse({
    ok: true,
    subscribed,
    emailed: delivery.emailed,
    webhookDelivered: delivery.webhookDelivered,
  });
}

async function handleFeedback(
  request: Request,
  env: FdeGymEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const body = await readBody<FeedbackRequest>(request, 40_000);
  const sessionId = cleanText(body.sessionId, 100);
  const realism = clampInt(body.realismComparedToChatGPT, 1, 5) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  const comments = cleanText(body.comments, 2000);

  const session = await canonicalSession(env, { id: sessionId, accessToken: body.accessToken } as InterviewSession);
  session.feedback = {
    realismComparedToChatGPT: realism,
    wouldReturnTomorrow: Boolean(body.wouldReturnTomorrow),
    comments: comments || undefined,
    submittedAt: nowIso(),
  };
  await persistSession(env, session);
  return jsonResponse({ ok: true, retained: true });
}

function health(env: FdeGymEnv): Response {
  const failure = lastModelFailure();
  return jsonResponse({
    ok: true,
    aiConfigured: Boolean(env.AI),
    retentionConfigured: Boolean(env.FDE_GYM_SESSIONS),
    securityConfigured: Boolean(env.AI_SECURITY),
    emailConfigured: Boolean(
      (env.RESEND_API_KEY && env.FDE_GYM_FROM_EMAIL) ||
        env.FDE_GYM_REPORT_WEBHOOK_URL,
    ),
    statelessDevAllowed: false,
    modelStatus: !env.AI ? "unavailable" : failure ? "degraded" : "unknown",
  });
}

async function routeFdeGymRequest(
  request: Request,
  env: FdeGymEnv,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  try {
    if (pathname === "/api/fde-gym/health") {
      return request.method === "GET"
        ? health(env)
        : jsonResponse({ error: "Method not allowed." }, { status: 405 });
    }
    // Each handler is awaited, not returned directly. Returning the promise
    // from inside a try block lets a rejection escape the catch below, which
    // turned every validation failure into a 500 instead of a 400.
    if (pathname === "/api/fde-gym/start") return await handleStart(request, env);
    if (pathname === "/api/fde-gym/message") return await handleMessage(request, env);
    if (pathname === "/api/fde-gym/finish") return await handleFinish(request, env);
    if (pathname === "/api/fde-gym/report") return await handleReport(request, env);
    if (pathname === "/api/fde-gym/feedback") return await handleFeedback(request, env);

    return jsonResponse({ error: "FDE Gym route not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof SessionAccessError) {
      return jsonResponse({ error: "This interview is unavailable. Start a new interview." }, { status: 403 });
    }
    return jsonResponse({ error: "This request could not be processed." }, { status: 400 });
  }
}

export type { FdeGymEnv } from "./types";
export { renderReportHtml };

export async function handleFdeGymRequest(request: Request, env: FdeGymEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (request.method !== "POST" || path === "/api/fde-gym/health" ||
      !["start", "message", "finish", "report", "feedback"].some(action => path === `/api/fde-gym/${action}`)) {
    return routeFdeGymRequest(request, env);
  }
  return withSessionSecurity(request, env, "gym", routeFdeGymRequest);
}
