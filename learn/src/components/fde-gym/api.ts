import type {
  ArchitectureGraph,
  InterviewSession,
  ResultSummary,
  StartOptions,
} from "./types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }
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
  }>("/api/fde-gym/message", input);
}

export async function finishInterview(input: {
  session: InterviewSession;
  graph: ArchitectureGraph;
  elapsedSeconds: number;
}) {
  return postJson<{
    session: InterviewSession;
    summary: ResultSummary;
  }>("/api/fde-gym/finish", input);
}

export async function requestReport(input: {
  session: InterviewSession;
  email: string;
  subscribe: boolean;
}) {
  return postJson<{
    ok: true;
    subscribed: boolean;
    emailed: boolean;
    webhookDelivered?: boolean;
  }>("/api/fde-gym/report", input);
}

export async function sendFeedback(input: {
  sessionId: string;
  realismComparedToChatGPT: 1 | 2 | 3 | 4 | 5;
  wouldReturnTomorrow: boolean;
  comments?: string;
}) {
  return postJson<{ ok: true; retained?: boolean }>(
    "/api/fde-gym/feedback",
    input,
  );
}
