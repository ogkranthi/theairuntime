import { callModel, parseJsonObject } from "../fde-gym/model";
import { cleanText, jsonResponse } from "../fde-gym/utils";
import { CAPABILITIES, EXTERNAL_REVIEWED, RESOURCES } from "./catalog";
import {
  deterministicMapping,
  deterministicPlan,
  firstStepOptions,
} from "./planner";
import { followUpMessages, mappingMessages, planMessages } from "./prompt";
import type {
  CurrentContext,
  Direction,
  FdePathEnv,
  Mapping,
  OwnedPart,
  PathAnswers,
} from "./types";
import { mergeMapping, mergePlan, validateFollowUps } from "./validate";

const BODY_LIMIT = 24_000;
const FIELD_LIMIT = 1_500;
const AI_CALLS_PER_HOUR = 40;

const CONTEXTS: CurrentContext[] = ["student", "software-developer", "solutions", "other"];
const OWNED: OwnedPart[] = [
  "discovery",
  "design",
  "coding",
  "testing",
  "deployment",
  "support",
  "unsure",
];
const DIRECTIONS: Direction[] = [
  "building-systems",
  "working-with-customers",
  "owning-delivery",
  "exploring",
];

export async function handleFdePathRequest(
  request: Request,
  env: FdePathEnv,
): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/fde-path/health") {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }
    return jsonResponse({
      ok: true,
      aiConfigured: Boolean(env.AI),
      capabilities: CAPABILITIES.length,
      resources: RESOURCES.length,
      externalReviewed: EXTERNAL_REVIEWED,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Awaited inside the try so a validation rejection is a 400, not a 500.
    if (pathname === "/api/fde-path/followup") return await handleFollowUp(request, env);
    if (pathname === "/api/fde-path/mapping") return await handleMapping(request, env);
    if (pathname === "/api/fde-path/plan") return await handlePlan(request, env);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That request could not be read.";
    return jsonResponse({ error: message }, { status: 400 });
  }

  return jsonResponse({ error: "Not found" }, { status: 404 });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > BODY_LIMIT) throw new Error("That was more than the guide can read at once.");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new Error("That request could not be read.");
  }
}

/**
 * The learner's answers, clamped.
 *
 * Everything is optional. "I do not know yet" has to survive this function
 * intact, because a guide that refuses to proceed without a complete profile is
 * useless to exactly the person who needs it most.
 */
function safeAnswers(raw: unknown): PathAnswers {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const context = CONTEXTS.find((item) => item === value.context) ?? null;
  const direction = DIRECTIONS.find((item) => item === value.direction) ?? null;

  const owned = Array.isArray(value.owned)
    ? OWNED.filter((part) => (value.owned as unknown[]).includes(part))
    : [];

  const followUps = Array.isArray(value.followUps)
    ? (value.followUps as unknown[])
        .slice(0, 2)
        .map((item) => {
          const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            question: cleanText(entry.question, 300),
            answer: cleanText(entry.answer, FIELD_LIMIT),
          };
        })
        .filter((item) => item.question)
    : [];

  return {
    context,
    contextNote: cleanText(value.contextNote, 400),
    example: cleanText(value.example, FIELD_LIMIT),
    owned,
    direction,
    note: cleanText(value.note, 600),
    followUps,
  };
}

function safeMapping(raw: unknown, answers: PathAnswers): Mapping {
  const baseline = deterministicMapping(answers);
  if (!raw || typeof raw !== "object") return baseline;
  const value = raw as Record<string, unknown>;

  // The client sends back the mapping the learner confirmed, minus anything
  // they rejected. Only ids are trusted: the text is re-read from the baseline
  // or from the model result the client already received, never widened here.
  const keep = new Set(
    (Array.isArray(value.keepIds) ? value.keepIds : [])
      .map((id) => cleanText(id, 80))
      .filter(Boolean),
  );
  if (!keep.size) return baseline;

  const connections = (Array.isArray(value.connections) ? value.connections : [])
    .map((item) => {
      const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        id: cleanText(entry.id, 80),
        capabilityId: cleanText(entry.capabilityId, 40),
        capabilityLabel: cleanText(entry.capabilityLabel, 120),
        described: cleanText(entry.described, 260),
        because: cleanText(entry.because, 320),
        quote: cleanText(entry.quote, 400),
      };
    })
    .filter((item) => item.id && keep.has(item.id) && item.capabilityId)
    .slice(0, 4);

  const develop = (Array.isArray(value.develop) ? value.develop : [])
    .map((item) => {
      const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        id: cleanText(entry.id, 80),
        capabilityId: cleanText(entry.capabilityId, 40),
        capabilityLabel: cleanText(entry.capabilityLabel, 120),
        because: cleanText(entry.because, 320),
      };
    })
    .filter((item) => item.id && keep.has(item.id) && item.capabilityId)
    .slice(0, 3);

  return {
    connections: connections.length ? connections : baseline.connections,
    develop: develop.length ? develop : baseline.develop,
    unknowns: baseline.unknowns,
  };
}

async function handleFollowUp(request: Request, env: FdePathEnv): Promise<Response> {
  const body = await readBody(request);
  const answers = safeAnswers(body.answers);

  if (!(await allowAi(env, request))) {
    return jsonResponse({ questions: [], degraded: true, throttled: true });
  }

  const raw = await callModel(env, "coach", followUpMessages(answers), 220);
  const questions = validateFollowUps(parseJsonObject(raw));
  return jsonResponse({ questions, degraded: raw === null });
}

async function handleMapping(request: Request, env: FdePathEnv): Promise<Response> {
  const body = await readBody(request);
  const answers = safeAnswers(body.answers);
  const baseline = deterministicMapping(answers);

  if (body.selfGuided === true || !(await allowAi(env, request))) {
    return jsonResponse({ mapping: baseline, degraded: true });
  }

  const raw = await callModel(env, "coach", mappingMessages(answers), 900);
  const mapping = mergeMapping(parseJsonObject(raw), answers, baseline);
  return jsonResponse({ mapping, degraded: raw === null });
}

async function handlePlan(request: Request, env: FdePathEnv): Promise<Response> {
  const body = await readBody(request);
  const answers = safeAnswers(body.answers);
  const mapping = safeMapping(body.mapping, answers);
  const baseline = deterministicPlan(answers, mapping);

  if (body.selfGuided === true || !(await allowAi(env, request))) {
    return jsonResponse({
      plan: baseline,
      steps: firstStepOptions(baseline),
      degraded: true,
    });
  }

  const raw = await callModel(env, "coach", planMessages(answers, mapping), 900);
  const plan = mergePlan(parseJsonObject(raw), baseline);
  return jsonResponse({
    plan,
    steps: firstStepOptions(plan),
    degraded: raw === null,
  });
}

/**
 * Best effort throttle on the AI calls.
 *
 * These endpoints take free text and spend the Workers AI allowance that FDE
 * Gym and the Coach also draw on, with no account in front of them. KV has no
 * atomic increment so this is a speed bump rather than a limit, and refusing it
 * costs the visitor nothing: every route falls through to the catalog planner,
 * which is the self-guided experience rather than an error.
 */
async function allowAi(env: FdePathEnv, request: Request): Promise<boolean> {
  if (!env.AI) return false;
  const store = env.FDE_GYM_SESSIONS;
  const ip = request.headers.get("cf-connecting-ip");
  if (!store || !ip) return true;

  const key = `fde-path:rl:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  try {
    const seen = Number((await store.get(key)) ?? "0");
    if (Number.isFinite(seen) && seen >= AI_CALLS_PER_HOUR) return false;
    await store.put(key, String((Number.isFinite(seen) ? seen : 0) + 1), {
      expirationTtl: 3_600,
    });
  } catch {
    return true;
  }
  return true;
}
