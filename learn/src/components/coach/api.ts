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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(
      data.error || "I could not continue the lesson just now.",
    );
  }
  return data;
}

export function startLesson() {
  return postJson<CoachReply>("/api/coach/start", {});
}

export function sendMessage(token: string, message: string, stageTurns: StageTurn[]) {
  return postJson<CoachReply>("/api/coach/message", { token, message, stageTurns });
}

export interface CoachHealth {
  ok: boolean;
  aiConfigured: boolean;
  tokenConfigured: boolean;
}

export async function readHealth(): Promise<CoachHealth | null> {
  try {
    const response = await fetch("/api/coach/health");
    if (!response.ok) return null;
    return (await response.json()) as CoachHealth;
  } catch {
    return null;
  }
}
