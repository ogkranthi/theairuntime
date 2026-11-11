import { cleanText, isValidEmail, normalizeSessionForClient } from "../fde-gym/utils";
import type { FdeGymEnv, InterviewSession } from "../fde-gym/types";
import type { CoachEnv } from "../coach/types";
import { signState, verifyState } from "../coach/token";
import { readLimitedText } from "./body";
import { AdmissionError, type Admission, type SecurityEnv, type SecurityExecution } from "./types";

type Env = FdeGymEnv & CoachEnv;
type Cached = { status: number; body: Record<string, any>; canonical?: InterviewSession; sessionIncluded?: boolean };

export async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export async function admissionRpc<T>(env: SecurityEnv, path: string, body: unknown): Promise<T> {
  if (!env.AI_SECURITY) throw new AdmissionError(503, "Session security is unavailable. Try again later.");
  try {
    const id = env.AI_SECURITY.idFromName("coach-gym-v1");
    const response = await env.AI_SECURITY.get(id).fetch(`https://security/${path}`, {
      method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
    });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new AdmissionError(response.status, result.error || "Session security is unavailable.");
    return result;
  } catch (error) {
    if (error instanceof AdmissionError) throw error;
    throw new AdmissionError(503, "Session security is unavailable. Try again later.");
  }
}
function responseOf(result: Cached): Response {
  const body = result.sessionIncluded && result.canonical
    ? { ...result.body, session: normalizeSessionForClient(result.canonical) } : result.body;
  return Response.json(body, { status: result.status, headers: { "cache-control": "no-store" } });
}
async function cached(env: Env, key: string): Promise<Cached> {
  const raw = await env.FDE_GYM_SESSIONS?.get(key);
  // Never rerun external work to repair a missing/eventually consistent KV result.
  if (!raw) throw new AdmissionError(503, "The saved result is not available yet. Retry the same request shortly.");
  return JSON.parse(raw) as Cached;
}

/** Reserve in the object, execute in the Worker, write immutable KV, then commit. */
export async function withSessionSecurity(
  request: Request,
  env: Env,
  kind: "coach" | "gym",
  execute: (request: Request, env: Env) => Promise<Response>,
): Promise<Response> {
  try {
    const action = new URL(request.url).pathname.split("/").pop()!;
    if (!env.FDE_GYM_SESSIONS || (kind === "coach" && !env.COACH_TOKEN_SECRET)) {
      throw new AdmissionError(503, "This session is not open yet.");
    }
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) throw new AdmissionError(400, "A valid Idempotency-Key header is required.");
    const text = await readLimitedText(request, kind === "coach" ? (action === "start" ? 2_000 : 20_000) : (action === "start" ? 30_000 : action === "feedback" ? 40_000 : 300_000));
    const body = JSON.parse(text || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AdmissionError(400, "Invalid request.");
    // Reject report validation errors before pinning the one delivery slot.
    if (kind === "gym" && action === "report") {
      if (!isValidEmail(cleanText(body.email, 320).toLowerCase())) throw new AdmissionError(400, "Please provide a valid email.");
      if (!body.subscribe) throw new AdmissionError(400, "Explicit subscription consent is required to send the report.");
    }
    // Hash the parsed request including every user-controlled field. JSON order is
    // intentionally significant: retries must resend the original payload.
    const fingerprint = await digest(JSON.stringify({ kind, action, body }));
    let capability: string;
    let lease: Admission;
    let accessToken: string | undefined;
    let canonical: InterviewSession | undefined;
    if (action === "start") {
      accessToken = kind === "gym" ? crypto.randomUUID() + crypto.randomUUID() : undefined;
      const sessionId = crypto.randomUUID();
      capability = await digest(accessToken ?? `coach:${sessionId}`);
      const hour = Math.floor(Date.now() / 3_600_000);
      const actor = await digest(`${hour}:${request.headers.get("cf-connecting-ip") ?? "unknown"}`);
      lease = await admissionRpc<Admission>(env, "start", {
        kind, sessionId, capability, operationId: `start:${kind}:${await digest(key)}`,
        fingerprint: await digest(`${key}:${request.headers.get("cf-connecting-ip") ?? "unknown"}:${fingerprint}`), actor,
        ttlMs: Math.min(90 * 86_400, Math.max(60, Number(env.FDE_GYM_SESSION_TTL_SECONDS) || 30 * 86_400)) * 1000,
        duration: Number(body.durationMinutes) === 15 ? 15 : 30,
      });
    } else {
      let sessionId: string;
      let revision: number;
      if (kind === "coach") {
        const state = await verifyState(body.token, env.COACH_TOKEN_SECRET!, Date.now());
        if (!state?.sessionId || !Number.isInteger(state.revision)) throw new AdmissionError(403, "This lesson is unavailable. Start again.");
        sessionId = state.sessionId;
        revision = state.revision!;
        capability = await digest(`coach:${sessionId}`);
      } else {
        sessionId = action === "feedback" ? body.sessionId : body.session?.id;
        accessToken = action === "feedback" ? body.accessToken : body.session?.accessToken;
        if (typeof sessionId !== "string" || typeof accessToken !== "string" || accessToken.length > 100) {
          throw new AdmissionError(403, "This interview is unavailable. Start again.");
        }
        capability = await digest(accessToken);
        revision = body.session?.revision;
      }
      let expectedHead: string | null | undefined;
      if (kind === "gym") {
        const head = await admissionRpc<{ revision: number; head: string | null }>(env, "head", { sessionId, capability });
        if (action === "feedback" || action === "report") revision = head.revision;
        expectedHead = head.head;
        if (revision === head.revision && head.head) canonical = (await cached(env, head.head)).canonical;
      }
      const operationId = `${sessionId}:${["report", "feedback", "finish"].includes(action) ? action : await digest(key)}`;
      lease = await admissionRpc<Admission>(env, "admit", { sessionId, capability, revision, operationId, fingerprint, action, expectedHead });
    }
    if (lease.replay) return responseOf(await cached(env, lease.replay));
    if (lease.pending) {
      const resultKey = `security:result:${lease.operationId}:${lease.nonce}`;
      const raw = await env.FDE_GYM_SESSIONS.get(resultKey);
      if (!raw) throw new AdmissionError(409, "A request is already in progress. Retry the same request shortly.");
      const record = JSON.parse(raw) as Cached;
      const recoveryCapability = kind === "gym" && action === "start"
        ? await digest(record.canonical!.accessToken!) : kind === "coach" ? await digest(`coach:${lease.sessionId}`) : capability;
      await admissionRpc(env, "commit", {
        sessionId: lease.sessionId, operationId: lease.operationId, nonce: lease.nonce,
        capability: recoveryCapability, result: resultKey, success: record.status < 400,
        completed: kind === "coach" ? Boolean(record.body.done) : record.canonical?.status === "completed",
      });
      return responseOf(record);
    }
    let saved: InterviewSession | undefined;
    const execution: SecurityExecution = {
      sessionId: lease.sessionId, accessToken, expiresAt: lease.expiresAt, revision: lease.revision,
      saveSession(session) { saved = structuredClone(session); },
    };
    if (kind === "gym" && action !== "start") {
      if (!lease.head) throw new AdmissionError(503, "Session state is unavailable.");
      execution.canonicalSession = canonical;
      if (!execution.canonicalSession || execution.canonicalSession.revision !== lease.revision) {
        throw new AdmissionError(503, "Session state is unavailable. Retry the same request shortly.");
      }
    }
    let slot = 0;
    const leaseAuth = { sessionId: lease.sessionId, operationId: lease.operationId, nonce: lease.nonce, capability };
    const scoped: Env = {
      ...env, securityExecution: execution,
      AI: env.AI ? {
        run: async (model, input) => {
          // Never retry this RPC or issue the same slot twice. Lost admission
          // responses burn quota safely without starting a provider call.
          await admissionRpc(env, "attempt", { ...leaseAuth, slot: slot++ });
          return env.AI!.run(model, input);
        },
      } : undefined,
    };
    const forwarded = new Request(request.url, { method: "POST", headers: request.headers, body: text });
    const response = await execute(forwarded, scoped);
    const result = await response.json() as Record<string, any>;
    const success = response.ok;
    const advances = success && (action === "message" || action === "finish");
    const revision = lease.revision + (advances ? 1 : 0);
    if (kind === "coach" && success && typeof result.token === "string") {
      const state = await verifyState(result.token, env.COACH_TOKEN_SECRET!, Date.now());
      if (!state) throw new AdmissionError(503, "Session state is unavailable.");
      result.token = await signState({ ...state, sessionId: lease.sessionId, revision }, env.COACH_TOKEN_SECRET!);
    }
    if (saved) saved.revision = revision;
    if (result.session) result.session.revision = revision;
    const record: Cached = { status: response.status, body: result, canonical: saved ?? execution.canonicalSession };
    // Retain a Gym transcript once per snapshot, rather than copying it into
    // both the canonical record and the replay response.
    if (kind === "gym" && result.session && record.canonical) {
      record.body = { ...result };
      delete record.body.session;
      record.sessionIncluded = true;
    }
    const resultKey = `security:result:${lease.operationId}:${lease.nonce}`;
    await env.FDE_GYM_SESSIONS.put(resultKey, JSON.stringify(record), {
      expirationTtl: Math.max(60, Math.ceil((lease.expiresAt - Date.now()) / 1000)),
    });
    // Commit only a pointer. Responses and retained Gym conversations stay in KV.
    await admissionRpc(env, "commit", {
      ...leaseAuth, result: resultKey, success,
      completed: kind === "coach" ? Boolean(result.done) : saved?.status === "completed",
    });
    return responseOf(record);
  } catch (error) {
    const status = error instanceof AdmissionError ? error.status : error instanceof SyntaxError ? 400 : 503;
    const message = error instanceof AdmissionError ? error.message : status === 400 ? "Invalid request." : "This request could not be completed safely. Retry the original request or restart.";
    return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
  }
}
