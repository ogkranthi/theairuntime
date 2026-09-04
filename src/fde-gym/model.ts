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

/**
 * Pull the text out of a message content field.
 *
 * Older instruct models put a plain string here. Newer chat models, and every
 * reasoning model, put an array of typed parts instead, so a string check
 * alone silently reads nothing.
 */
function partText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(partText).join("");
  if (!value || typeof value !== "object") return "";
  const part = value as Record<string, unknown>;
  if (typeof part.text === "string") return part.text;
  if (typeof part.content === "string") return part.content;
  return "";
}

/**
 * Normalize a Workers AI response into the assistant's text.
 *
 * Workers AI does not return one envelope. It returns the shape the underlying
 * model family uses, and which one you get changes with the model id:
 *
 *   { response: "..." }                        older @cf/meta instruct models
 *   { result: { response: "..." } }            the REST envelope, if it leaks
 *   { choices: [{ message: { content } }] }    OpenAI compatible chat models,
 *                                              which is what both defaults
 *                                              above return today
 *
 * Reading only `response` and `result` is what produced the failure this
 * function was rewritten for: the call succeeded, a well formed envelope came
 * back, this returned "", and every session dropped to the deterministic path
 * while health still reported aiConfigured true. Read every shape, and treat a
 * shape we do not recognize as the failure it is rather than as empty text.
 *
 * Reasoning models also carry `reasoning_content` alongside `content`. That is
 * deliberately not read: the interviewer's chain of thought is not the turn,
 * and the evaluator's is not the JSON.
 */
function responseText(value: unknown, depth = 0): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || depth > 3) return "";
  const record = value as Record<string, unknown>;

  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0];
    if (first && typeof first === "object") {
      const choice = first as Record<string, unknown>;
      const message = choice.message;
      if (message && typeof message === "object") {
        const text = partText((message as Record<string, unknown>).content).trim();
        if (text) return text;
      }
      const direct = partText(choice.text).trim();
      if (direct) return direct;
    }
  }

  const response = partText(record.response).trim();
  if (response) return response;

  if (typeof record.output_text === "string") return record.output_text.trim();

  if (typeof record.result === "string") return record.result.trim();
  if (record.result && typeof record.result === "object") {
    return responseText(record.result, depth + 1);
  }

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
    const text = responseText(result) || null;
    if (text === null) {
      recordFailure(role, model, `empty response, shape: ${describeShape(result)}`);
    }
    return text;
  } catch (error) {
    recordFailure(
      role,
      model,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Why the last model call failed, for /api/fde-gym/health.
 *
 * A failing model call is not an outage here: the session drops to the
 * deterministic path and keeps working. That is the right behavior and the
 * wrong thing to be silent about, because the symptom is a session that reads
 * plausibly while health still reports aiConfigured true. Without this, the
 * only way to tell a working model from a broken one is to notice that the
 * interviewer repeats itself.
 *
 * Module scope, so it lives as long as the isolate and costs nothing. It holds
 * the model name and the runtime's own error text. Prompt content, transcript
 * and candidate text never reach it.
 */
export interface ModelFailure {
  role: "interviewer" | "evaluator";
  model: string;
  message: string;
  at: string;
}

let lastFailure: ModelFailure | null = null;

function describeShape(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return typeof value;
  return Object.keys(value as Record<string, unknown>).slice(0, 6).join(",") || "empty object";
}

function recordFailure(
  role: "interviewer" | "evaluator",
  model: string,
  message: string,
): void {
  lastFailure = {
    role,
    model,
    message: message.slice(0, 300),
    at: new Date().toISOString(),
  };
  // Surfaces in the Worker log tail. Model name and error only.
  console.warn(`[fde-gym] ${role} model call failed on ${model}: ${lastFailure.message}`);
}

export function lastModelFailure(): ModelFailure | null {
  return lastFailure;
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
