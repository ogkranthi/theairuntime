import type { FdeGymEnv, ModelMessage } from "./types";

/**
 * Workers AI model defaults, overridable with FDE_GYM_INTERVIEW_MODEL and
 * FDE_GYM_EVALUATOR_MODEL.
 *
 * The two roles want different things. The interviewer runs on every candidate
 * message, so latency is part of realism: a fast instruct model is the right
 * trade. The evaluator runs once and must return strict JSON, so it gets a
 * model with native structured output.
 *
 * A model id that no longer exists does not fail loudly. callModel catches and
 * returns null, and the session silently drops to the deterministic path while
 * the health route still reports aiConfigured: true. Check these against
 * developers.cloudflare.com/workers-ai/models when a model is retired.
 */
const DEFAULT_INTERVIEW_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_EVALUATOR_MODEL = "@cf/zai-org/glm-5.3";

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
