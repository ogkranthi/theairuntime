import type {
  ArchitectureGraph,
  InterviewSession,
  ResultSummary,
  StartOptions,
} from "./types";

const pendingRequests = new Map<string, string>();
let startClient: string | undefined;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const payload = JSON.stringify(body);
  const identity = path + payload;
  let key = pendingRequests.get(identity);
  if (!key) {
    key = crypto.randomUUID();
    if (pendingRequests.size >= 8) pendingRequests.delete(pendingRequests.keys().next().value!);
    pendingRequests.set(identity, key);
  }
  const headers: Record<string, string> = { "content-type": "application/json", "idempotency-key": key };
  if (path.endsWith("/start")) {
    startClient ??= crypto.randomUUID() + crypto.randomUUID();
    headers["x-session-client"] = startClient;
  }
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: payload,
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }
  pendingRequests.delete(identity);
  return data;
}

export async function startInterview(options: StartOptions) {
  return postJson<{
    session: InterviewSession;
    charter: string;
    degraded: boolean;
  }>("/api/fde-gym/start", {
    ...options,
    drillId:
      options.durationMinutes === 15 ? "reliability-action-safety" : null,
  });
}

export async function sendInterviewMessage(input: {
  session: InterviewSession;
  candidateMessage: string;
  graph: ArchitectureGraph;
  elapsedSeconds: number;
  requestHint?: boolean;
}) {
  return postJson<{
    session: InterviewSession;
    interviewerMessage: string;
    phase: string;
    shouldEnd: boolean;
    degraded: boolean;
  }>("/api/fde-gym/message", {
    session: input.session, candidateMessage: input.candidateMessage,
    graph: input.graph, requestHint: input.requestHint,
  });
}

export async function finishInterview(input: {
  session: InterviewSession;
  graph: ArchitectureGraph;
  elapsedSeconds: number;
}) {
  return postJson<{
    session: InterviewSession;
    summary: ResultSummary;
  }>("/api/fde-gym/finish", { session: input.session, graph: input.graph });
}

export async function requestReport(input: {
  session: InterviewSession;
  email: string;
  subscribe: boolean;
}) {
  const result = await postJson<{
    ok: true;
    subscribed: boolean;
    emailed: boolean;
    webhookDelivered?: boolean;
  }>("/api/fde-gym/report", input);
  if (result.ok !== true || (result.emailed !== true && result.webhookDelivered !== true)) {
    throw new Error("Report delivery could not be confirmed. Your interview result remains available.");
  }
  return result;
}

export async function sendFeedback(input: {
  sessionId: string;
  accessToken?: string;
  realismComparedToChatGPT: 1 | 2 | 3 | 4 | 5;
  wouldReturnTomorrow: boolean;
  comments?: string;
}) {
  return postJson<{ ok: true; retained?: boolean }>(
    "/api/fde-gym/feedback",
    input,
  );
}
