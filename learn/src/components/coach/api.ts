export interface CoachPart {
  kind: "say" | "principle" | "ask";
  text: string;
}

export interface StageMeta {
  number: number;
  total: number;
  title: string;
}

export interface SummaryLine {
  label: string;
  body: string;
}

export interface CoachSummary {
  recap: SummaryLine[];
  design: SummaryLine[];
  takeaway: string;
}

export interface CoachReply {
  token: string;
  parts: CoachPart[];
  stage: StageMeta;
  done: boolean;
  degraded: boolean;
  aiAvailable: boolean;
  summary?: CoachSummary;
  lesson?: { id: string; title: string; subtitle: string };
}

export interface StageTurn {
  role: "coach" | "learner";
  text: string;
}

async function fetchWithTimeout(path: string, options: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20_000);
  try { return await fetch(path, { ...options, signal: controller.signal }); }
  catch (cause) { if (timedOut) throw new Error("The connection timed out. Your conversation is still here; retry your last request."); throw cause; }
  finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
}
async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithTimeout(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }, signal);
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(data.error || "I could not continue the lesson just now.");
  return data;
}
export function startLesson(signal?: AbortSignal) {
  return postJson<CoachReply>("/api/coach/start", {}, signal);
}
export function sendMessage(token: string, message: string, stageTurns: StageTurn[], signal?: AbortSignal) {
  return postJson<CoachReply>("/api/coach/message", { token, message, stageTurns }, signal);
}

export interface CoachHealth {
  ok: boolean;
  aiConfigured: boolean;
  tokenConfigured: boolean;
}

export async function readHealth(signal?: AbortSignal): Promise<CoachHealth | null> {
  try {
    const response = await fetchWithTimeout("/api/coach/health", {}, signal);
    if (!response.ok) return null;
    return (await response.json()) as CoachHealth;
  } catch {
    return null;
  }
}
