import { callModel, parseJsonObject } from "../fde-gym/model";
import { cleanText, jsonResponse } from "../fde-gym/utils";
import { lessonById, VENDOR_RESEARCH_AGENT } from "./lesson";
import {
  decide,
  initialState,
  isComplete,
  MAX_MODEL_CALLS,
  scriptedProbe,
  stageOf,
  validateCoachResponse,
  type Decision,
} from "./machine";
import { buildMessages } from "./prompt";
import { signState, verifyState } from "./token";
import type { CoachEnv, CoachState, CoachTurn, Lesson } from "./types";

const START_BODY_LIMIT = 2_000;
const MESSAGE_BODY_LIMIT = 20_000;
const LEARNER_MESSAGE_LIMIT = 2_000;
const STAGE_TURN_LIMIT = 6;
const STARTS_PER_HOUR = 12;

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export async function handleCoachRequest(
  request: Request,
  env: CoachEnv,
  ctx?: ExecutionContextLike,
): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/coach/health") {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }
    return jsonResponse({
      ok: true,
      aiConfigured: Boolean(env.AI),
      tokenConfigured: Boolean(env.COACH_TOKEN_SECRET),
      countersConfigured: Boolean(env.FDE_GYM_SESSIONS),
      lessons: Object.keys({ [VENDOR_RESEARCH_AGENT.id]: true }),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Awaited inside the try on purpose. Returning these promises un-awaited is
    // what turned every FDE Gym validation error into a 500 for its first week.
    if (pathname === "/api/coach/start") return await handleStart(request, env, ctx);
    if (pathname === "/api/coach/message") return await handleMessage(request, env, ctx);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That request could not be read.";
    return jsonResponse({ error: message }, { status: 400 });
  }

  return jsonResponse({ error: "Not found" }, { status: 404 });
}

async function readJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > limit) throw new Error("That request was too large.");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    throw new Error("That request could not be read.");
  }
}

/**
 * A configuration gap, reported as one.
 *
 * Deliberately fatal rather than falling back to an unsigned token: the
 * signature is the only thing enforcing the per lesson model call ceiling, and
 * a lesson that quietly runs without one is an open AI endpoint. 503 rather
 * than 400 because nothing is wrong with the request. The client asks health
 * first and never shows a start button it cannot honour.
 */
const NOT_CONFIGURED = "The coach is not open yet.";

function unconfigured(): Response {
  return jsonResponse({ error: NOT_CONFIGURED }, { status: 503 });
}

async function handleStart(
  request: Request,
  env: CoachEnv,
  ctx?: ExecutionContextLike,
): Promise<Response> {
  const secret = env.COACH_TOKEN_SECRET;
  if (!secret) return unconfigured();
  const body = await readJson(request, START_BODY_LIMIT);

  const lesson =
    lessonById(cleanText(body.lessonId, 100) || VENDOR_RESEARCH_AGENT.id) ??
    null;
  if (!lesson) throw new Error("That lesson does not exist.");

  if (!(await allowStart(env, request))) {
    return jsonResponse(
      { error: "That is a lot of lessons at once. Try again in a little while." },
      { status: 429 },
    );
  }

  const state = initialState(lesson.id, Date.now());
  count(env, ctx, `${lesson.id}:started`);

  return jsonResponse({
    token: await signState(state, secret),
    lesson: { id: lesson.id, title: lesson.title, subtitle: lesson.subtitle },
    parts: [{ kind: "ask", text: lesson.stages[0].initialPrompt }],
    stage: stageMeta(lesson, state),
    done: false,
    degraded: !env.AI,
    aiAvailable: Boolean(env.AI),
  });
}

async function handleMessage(
  request: Request,
  env: CoachEnv,
  ctx?: ExecutionContextLike,
): Promise<Response> {
  const secret = env.COACH_TOKEN_SECRET;
  if (!secret) return unconfigured();
  const body = await readJson(request, MESSAGE_BODY_LIMIT);

  const state = await verifyState(body.token, secret, Date.now());
  if (!state) {
    return jsonResponse(
      { error: "This lesson expired. Start it again to pick up where you left off." },
      { status: 409 },
    );
  }

  const lesson = lessonById(state.lessonId);
  if (!lesson) throw new Error("That lesson does not exist.");

  if (isComplete(lesson, state)) {
    return jsonResponse({
      token: body.token,
      parts: [],
      stage: stageMeta(lesson, state),
      done: true,
      degraded: false,
      aiAvailable: Boolean(env.AI),
      summary: summaryOf(lesson),
    });
  }

  const learnerMessage = cleanText(body.message, LEARNER_MESSAGE_LIMIT);
  if (!learnerMessage) throw new Error("Write an answer first.");

  const decision = await run(env, lesson, state, learnerMessage, safeTurns(body.stageTurns));

  if (decision.state.stageIndex > state.stageIndex) {
    count(env, ctx, `${lesson.id}:stage-${state.stageIndex + 1}-done`);
  }
  if (decision.done) count(env, ctx, `${lesson.id}:completed`);
  if (decision.state.probed && !state.probed) count(env, ctx, `${lesson.id}:probed`);

  return jsonResponse({
    token: await signState(decision.state, secret),
    parts: decision.parts,
    stage: stageMeta(lesson, decision.state),
    done: decision.done,
    degraded: decision.scripted,
    aiAvailable: Boolean(env.AI),
    ...(decision.done ? { summary: summaryOf(lesson) } : {}),
  });
}

/**
 * One learner turn.
 *
 * The model is asked for a reply and gets to suggest what happens next. If it is
 * missing, over budget, or unreadable, the lesson keeps going on its authored
 * text instead. That is the property worth protecting: the curriculum does not
 * depend on the model being available.
 */
async function run(
  env: CoachEnv,
  lesson: Lesson,
  state: CoachState,
  learnerMessage: string,
  stageTurns: CoachTurn[],
): Promise<Decision> {
  const stage = stageOf(lesson, state);
  if (!stage) return decide(lesson, state, null);

  const canCallModel = Boolean(env.AI) && state.calls < MAX_MODEL_CALLS;
  if (!canCallModel) {
    // No model, so no way to judge the answer. A thin one still gets the
    // authored probe, which is the nudge a person would have given anyway.
    if (isThin(learnerMessage)) {
      const probe = scriptedProbe(lesson, state);
      if (probe) return probe;
    }
    return decide(lesson, state, null);
  }

  const raw = await callModel(
    env,
    "coach",
    buildMessages(
      lesson,
      stage,
      state.stageIndex + 1,
      lesson.stages.length,
      state.probed,
      stageTurns,
      learnerMessage,
    ),
    400,
  );

  const spent: CoachState = { ...state, calls: state.calls + 1 };
  const response = validateCoachResponse(parseJsonObject(raw));
  const decision = decide(lesson, spent, response);
  return { ...decision, state: { ...decision.state, calls: spent.calls } };
}

function isThin(message: string): boolean {
  return message.split(/\s+/).filter(Boolean).length < 4;
}

/**
 * The learner's own words from this stage, echoed back by the client.
 *
 * Untrusted, and it does not need to be trusted: it only ever becomes model
 * context, never curriculum state, and the learner could type the same thing
 * into the message field anyway.
 */
function safeTurns(value: unknown): CoachTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: CoachTurn[] = [];
  for (const item of value.slice(-STAGE_TURN_LIMIT)) {
    if (!item || typeof item !== "object") continue;
    const turn = item as Record<string, unknown>;
    const text = cleanText(turn.text, LEARNER_MESSAGE_LIMIT);
    if (!text) continue;
    turns.push({ role: turn.role === "coach" ? "coach" : "learner", text });
  }
  return turns;
}

function stageMeta(lesson: Lesson, state: CoachState) {
  const stage = stageOf(lesson, state);
  return {
    number: Math.min(state.stageIndex + 1, lesson.stages.length),
    total: lesson.stages.length,
    title: stage?.title ?? "Complete",
  };
}

function summaryOf(lesson: Lesson) {
  return {
    recap: lesson.recap,
    design: lesson.design,
    takeaway: lesson.takeaway,
  };
}

/**
 * Best effort start throttle.
 *
 * KV has no atomic increment and is eventually consistent, so this is a speed
 * bump rather than a limit, and it is not the real defense. The real one is the
 * signed per lesson call ceiling: this only raises the cost of minting fresh
 * lessons to get more ceilings.
 */
async function allowStart(env: CoachEnv, request: Request): Promise<boolean> {
  const store = env.FDE_GYM_SESSIONS;
  const ip = request.headers.get("cf-connecting-ip");
  if (!store || !ip) return true;

  const key = `coach:rl:${ip}:${Math.floor(Date.now() / 3_600_000)}`;
  try {
    const seen = Number((await store.get(key)) ?? "0");
    if (Number.isFinite(seen) && seen >= STARTS_PER_HOUR) return false;
    await store.put(key, String((Number.isFinite(seen) ? seen : 0) + 1), {
      expirationTtl: 3_600,
    });
  } catch {
    return true;
  }
  return true;
}

/**
 * Aggregate funnel counters.
 *
 * The learn site's stated position is no account, no server, no analytics in the
 * browser, and this keeps that promise: no cookie, no identifier, nothing per
 * person. It counts how many lessons reached each stage, which is the only
 * question V1 has to answer. Lost updates under concurrency are acceptable for
 * a funnel shape.
 */
function count(env: CoachEnv, ctx: ExecutionContextLike | undefined, event: string): void {
  const store = env.FDE_GYM_SESSIONS;
  if (!store || !ctx) return;
  const key = `coach:stat:${event}`;
  ctx.waitUntil(
    (async () => {
      try {
        const seen = Number((await store.get(key)) ?? "0");
        await store.put(key, String((Number.isFinite(seen) ? seen : 0) + 1));
      } catch {
        // Counting is never worth failing a lesson turn over.
      }
    })(),
  );
}
