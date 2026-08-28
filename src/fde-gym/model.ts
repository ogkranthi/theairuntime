import type { FdeGymEnv, ModelMessage } from "./types";

const DEFAULT_INTERVIEW_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_EVALUATOR_MODEL = "@cf/meta/llama-3.1-8b-instruct";

function responseText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.response === "string") return record.response.trim();
  if (typeof record.result === "string") return record.result.trim();
  return "";
}

export async function callModel(
  env: FdeGymEnv,
  role: "interviewer" | "evaluator",
  messages: ModelMessage[],
  maxTokens: number,
): Promise<string | null> {
  if (!env.AI) return null;

  const model =
    role === "interviewer"
      ? env.FDE_GYM_INTERVIEW_MODEL || DEFAULT_INTERVIEW_MODEL
      : env.FDE_GYM_EVALUATOR_MODEL || DEFAULT_EVALUATOR_MODEL;

  try {
    const result = await env.AI.run(model, {
      messages,
      max_tokens: maxTokens,
      temperature: role === "interviewer" ? 0.35 : 0.1,
    });
    return responseText(result) || null;
  } catch {
    return null;
  }
}

export function parseJsonObject<T>(text: string | null): T | null {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
