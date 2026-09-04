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

const SESSION_KEY_PREFIX = "fde-gym:session:";
const CONSENT_VERSION = "cohort-0-v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

const validModes: FdeMode[] = ["practice", "mock"];
const validLevels: FdeLevel[] = ["foundations", "fde", "senior"];
const validDurations: FdeDuration[] = [15, 30];

function sessionKey(id: string) {
  return `${SESSION_KEY_PREFIX}${id}`;
}

function ttlSeconds(env: FdeGymEnv): number {
  return clampInt(
    env.FDE_GYM_SESSION_TTL_SECONDS ?? DEFAULT_TTL_SECONDS,
    60,
    60 * 60 * 24 * 90,
  );
}

async function persistSession(
  env: FdeGymEnv,
  session: InterviewSession,
): Promise<void> {
  if (!env.FDE_GYM_SESSIONS || !session.researchConsent.accepted) return;

  await env.FDE_GYM_SESSIONS.put(
    sessionKey(session.id),
    JSON.stringify(session),
    {
      expirationTtl: ttlSeconds(env),
      metadata: {
        status: session.status,
        scenarioId: session.scenarioId,
        consentVersion: session.researchConsent.version,
      },
    },
  );
}

async function canonicalSession(
  env: FdeGymEnv,
  clientSession: InterviewSession,
): Promise<InterviewSession> {
  if (!env.FDE_GYM_SESSIONS) return clientSession;

  const stored = await env.FDE_GYM_SESSIONS.get(
    sessionKey(clientSession.id),
  );
  if (!stored) {
    throw new Error("This interview session was not found or has expired.");
  }
  return JSON.parse(stored) as InterviewSession;
}

function statelessDevAllowed(env: FdeGymEnv): boolean {
  return env.FDE_GYM_ALLOW_STATELESS_DEV === "true";
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
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) throw new Error("Request is too large.");

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error("Request is too large.");
  }
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
  if (!env.FDE_GYM_SESSIONS && !statelessDevAllowed(env)) {
    // A visitor sees this on the setup screen, so it stays in plain language.
    // The precise cause (the FDE_GYM_SESSIONS binding is absent, and stateless
    // mode is a local-development escape hatch only) is reported by
    // /api/fde-gym/health, which is where an operator looks.
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

  const candidateMessage = cleanText(body.candidateMessage, 3000);
  if (!candidateMessage) {
    return jsonResponse(
      { error: "Enter a response before sending." },
      { status: 400 },
    );
  }

  const elapsedSeconds = clampInt(
    body.elapsedSeconds,
    session.elapsedSeconds,
    session.durationMinutes * 60 + 600,
  );
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

  const elapsedSeconds = clampInt(
    body.elapsedSeconds,
    session.elapsedSeconds,
    session.durationMinutes * 60 + 600,
  );
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

  if (!env.FDE_GYM_SESSIONS || !sessionId) {
    return jsonResponse({ ok: true, retained: false });
  }

  const stored = await env.FDE_GYM_SESSIONS.get(sessionKey(sessionId));
  if (!stored) return jsonResponse({ ok: true, retained: false });

  const session = safeSession(JSON.parse(stored));
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
  // aiConfigured only means the binding exists. A bound but failing model still
  // produces working sessions on the deterministic path, so the binding alone
  // is not evidence that interviews are real. lastModelError is what separates
  // the two, and it carries a model name and the runtime's error, never prompt
  // or transcript content.
  const failure = lastModelFailure();
  return jsonResponse({
    ok: true,
    aiConfigured: Boolean(env.AI),
    retentionConfigured: Boolean(env.FDE_GYM_SESSIONS),
    emailConfigured: Boolean(
      (env.RESEND_API_KEY && env.FDE_GYM_FROM_EMAIL) ||
        env.FDE_GYM_REPORT_WEBHOOK_URL,
    ),
    statelessDevAllowed: statelessDevAllowed(env),
    lastModelError: failure,
  });
}

export async function handleFdeGymRequest(
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
    const message =
      error instanceof Error ? error.message : "Unexpected FDE Gym error.";
    return jsonResponse({ error: message }, { status: 400 });
  }
}

export type { FdeGymEnv } from "./types";
export { renderReportHtml };
