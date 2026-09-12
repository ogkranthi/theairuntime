import type { StoredAnswers, StoredMapping, StoredPlan, StoredStep } from "./store";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(data.error || "The guide could not finish that just now.");
  }
  return data;
}

export function askFollowUps(answers: StoredAnswers) {
  return postJson<{ questions: string[]; degraded: boolean; throttled?: boolean }>(
    "/api/fde-path/followup",
    { answers },
  );
}

export function buildMapping(answers: StoredAnswers, selfGuided: boolean) {
  return postJson<{ mapping: StoredMapping; degraded: boolean }>("/api/fde-path/mapping", {
    answers,
    selfGuided,
  });
}

export function buildPlan(
  answers: StoredAnswers,
  mapping: StoredMapping,
  keepIds: string[],
  selfGuided: boolean,
) {
  return postJson<{ plan: StoredPlan; steps: StoredStep[]; degraded: boolean }>(
    "/api/fde-path/plan",
    { answers, mapping: { ...mapping, keepIds }, selfGuided },
  );
}
