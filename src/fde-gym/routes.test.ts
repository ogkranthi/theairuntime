import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { securityRuntime } from "../security/test-runtime";
import { admissionRpc, digest } from "../security/boundary";
import { callModel } from "./model";
import { handleFdeGymRequest, MAX_CANDIDATE_TURNS } from "./routes";
import type { FdeGymEnv, InterviewSession } from "./types";

const sessions = new Map<string, string>();
const ai = { run: vi.fn(async () => ({ response: "{}" })) };
const env: FdeGymEnv = {
  AI: ai,
  FDE_GYM_SESSIONS: {
    get: async key => sessions.get(key) ?? null,
    put: async (key, value) => { sessions.set(key, value); },
  },
};
function post(path: string, body: unknown, target = env, key = crypto.randomUUID()) {
  return handleFdeGymRequest(new Request(`https://learn.theairuntime.com/api/fde-gym/${path}`, {
    method: "POST", body: JSON.stringify(body), headers: { "idempotency-key": key, "x-session-client": "test-client-private-token-at-least-32-characters" },
  }), target);
}
async function start() {
  const response = await post("start", { researchConsent: true, confidentialityAcknowledged: true });
  expect(response.status).toBe(200);
  return ((await response.json()) as { session: InterviewSession }).session;
}
async function save(session: InterviewSession) {
  const head = await admissionRpc<{ head: string }>(env, "head", { sessionId: session.id, capability: await digest(session.accessToken!) });
  const record = JSON.parse(sessions.get(head.head)!);
  record.canonical = session;
  sessions.set(head.head, JSON.stringify(record));
}
let runtime: Awaited<ReturnType<typeof securityRuntime>>;
beforeAll(async () => { runtime = await securityRuntime(); }, 30_000);
afterAll(async () => { await runtime?.mf.dispose(); });
beforeEach(() => {
  sessions.clear(); ai.run.mockClear();
  const id = runtime.namespace.idFromName(crypto.randomUUID());
  env.AI_SECURITY = { idFromName: () => id, get: () => runtime.namespace.get(id as never) };
});

describe("Gym session security", () => {
  it("requires canonical storage even if the old development bypass is set", async () => {
    expect((await post("start", {}, { FDE_GYM_ALLOW_STATELESS_DEV: "true" })).status).toBe(503);
  });
  it("issues a capability distinct from the public session ID", async () => {
    const session = await start();
    expect(session.accessToken?.length).toBeGreaterThan(64);
    expect(session.accessToken).not.toContain(session.id);
  });
  it.each(["message", "finish", "report"])("rejects missing and wrong capabilities on %s", async path => {
    const session = await start();
    for (const accessToken of [undefined, "incorrect"]) {
      const response = await post(path, {
        session: { ...session, accessToken }, candidateMessage: "hello", email: "person@example.com", subscribe: true,
      });
      expect(response.status).toBe(403);
    }
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("rejects unauthorized feedback without mutating the session", async () => {
    const session = await start();
    const before = JSON.stringify([...sessions]);
    expect((await post("feedback", { sessionId: session.id })).status).toBe(403);
    expect(JSON.stringify([...sessions])).toBe(before);
    expect((await post("feedback", { sessionId: session.id, accessToken: session.accessToken })).status).toBe(200);
  });
  it("rejects expired sessions even when KV still returns the record", async () => {
    const session = await start();
    await env.AI_SECURITY!.get(env.AI_SECURITY!.idFromName("ignored")).fetch("https://security/__clock", {
      method: "POST", body: JSON.stringify({ now: session.expiresAt! }),
    });
    for (const path of ["message", "finish", "report", "feedback"]) {
      expect((await post(path, { session, sessionId: session.id, accessToken: session.accessToken,
        candidateMessage: "hello", email: "person@example.com", subscribe: true })).status).toBe(403);
    }
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("uses the server clock despite a reset client timer", async () => {
    const session = await start();
    await save({ ...session, startedAt: new Date(Date.now() - 31 * 60_000).toISOString() });
    expect((await post("message", { session, candidateMessage: "hello", elapsedSeconds: 0 })).status).toBe(409);
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("enforces the canonical turn limit despite a forged client transcript", async () => {
    const session = await start();
    const turn = { id: "turn", role: "candidate" as const, content: "hello", atSeconds: 0 };
    await save({ ...session, transcript: Array.from({ length: MAX_CANDIDATE_TURNS }, () => turn) });
    expect((await post("message", { session: { ...session, transcript: [] }, candidateMessage: "hello" })).status).toBe(409);
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("does not extend retention when feedback is saved", async () => {
    const session = await start();
    const expiresAt = Date.now() + 120_000;
    await save({ ...session, expiresAt });
    await post("feedback", { sessionId: session.id, accessToken: session.accessToken });
    const head = await admissionRpc<{ head: string }>(env, "head", { sessionId: session.id, capability: await digest(session.accessToken!) });
    expect(JSON.parse(sessions.get(head.head)!).canonical.expiresAt).toBe(expiresAt);
  });
  it("rejects concurrent unauthorized requests before any model call", async () => {
    const session = await start();
    const results = await Promise.all(Array.from({ length: 20 }, () =>
      post("message", { session: { ...session, accessToken: "wrong" }, candidateMessage: "hello" })));
    expect(results.every(response => response.status === 403)).toBe(true);
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("preserves the authorized degraded journey and sequential duplicate finish", async () => {
    const offline = { ...env, AI: undefined };
    const session = await start();
    const message = await post("message", { session, candidateMessage: "What data is available?" }, offline);
    expect(message.status).toBe(200);
    const updated = (await message.json() as { session: InterviewSession }).session;
    const first = await post("finish", { session: updated }, offline);
    expect(first.status).toBe(200);
    const before = JSON.stringify([...sessions]);
    const duplicate = await post("finish", { session: updated }, offline);
    expect(duplicate.status).toBe(200);
    expect(JSON.stringify([...sessions])).toBe(before);
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("returns coarse health without provider error details", async () => {
    const response = await handleFdeGymRequest(new Request("https://example.com/api/fde-gym/health"), env);
    const health = await response.json() as { modelStatus: string };
    expect(health.modelStatus).toBe("unknown");
    expect(health).not.toHaveProperty("lastModelError");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await callModel({ AI: { run: async () => { throw new Error("sensitive-provider-detail"); } } }, "interviewer", [], 10);
      const failedHealth = await handleFdeGymRequest(new Request("https://example.com/api/fde-gym/health"), env);
      const publicText = await failedHealth.text();
      expect(JSON.parse(publicText).modelStatus).toBe("degraded");
      expect(publicText).not.toContain("sensitive-provider-detail");
      expect(publicText).not.toContain("lastModelError");
    } finally {
      warning.mockRestore();
    }
  });
});
