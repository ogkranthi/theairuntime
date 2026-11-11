import { beforeEach, describe, expect, it, vi } from "vitest";
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
function post(path: string, body: unknown, target = env) {
  return handleFdeGymRequest(new Request(`https://learn.theairuntime.com/api/fde-gym/${path}`, {
    method: "POST", body: JSON.stringify(body),
  }), target);
}
async function start() {
  const response = await post("start", { researchConsent: true, confidentialityAcknowledged: true });
  expect(response.status).toBe(200);
  return ((await response.json()) as { session: InterviewSession }).session;
}
function save(session: InterviewSession) {
  sessions.set(`fde-gym:session:${session.id}`, JSON.stringify(session));
}
beforeEach(() => { sessions.clear(); ai.run.mockClear(); });

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
    const before = sessions.get(`fde-gym:session:${session.id}`);
    expect((await post("feedback", { sessionId: session.id })).status).toBe(403);
    expect(sessions.get(`fde-gym:session:${session.id}`)).toBe(before);
    expect((await post("feedback", { sessionId: session.id, accessToken: session.accessToken })).status).toBe(200);
  });
  it("rejects expired sessions even when KV still returns the record", async () => {
    const session = await start();
    save({ ...session, expiresAt: Date.now() - 1 });
    for (const path of ["message", "finish", "report", "feedback"]) {
      expect((await post(path, { session, sessionId: session.id, accessToken: session.accessToken,
        candidateMessage: "hello", email: "person@example.com", subscribe: true })).status).toBe(403);
    }
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("uses the server clock despite a reset client timer", async () => {
    const session = await start();
    save({ ...session, startedAt: new Date(Date.now() - 31 * 60_000).toISOString() });
    expect((await post("message", { session, candidateMessage: "hello", elapsedSeconds: 0 })).status).toBe(409);
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("enforces the canonical turn limit despite a forged client transcript", async () => {
    const session = await start();
    const turn = { id: "turn", role: "candidate" as const, content: "hello", atSeconds: 0 };
    save({ ...session, transcript: Array.from({ length: MAX_CANDIDATE_TURNS }, () => turn) });
    expect((await post("message", { session: { ...session, transcript: [] }, candidateMessage: "hello" })).status).toBe(409);
    expect(ai.run).not.toHaveBeenCalled();
  });
  it("does not extend retention when feedback is saved", async () => {
    const session = await start();
    const expiresAt = Date.now() + 120_000;
    save({ ...session, expiresAt });
    await post("feedback", { sessionId: session.id, accessToken: session.accessToken });
    expect(JSON.parse(sessions.get(`fde-gym:session:${session.id}`)!).expiresAt).toBe(expiresAt);
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
    const before = sessions.get(`fde-gym:session:${session.id}`);
    const duplicate = await post("finish", { session: updated }, offline);
    expect(duplicate.status).toBe(200);
    expect(sessions.get(`fde-gym:session:${session.id}`)).toBe(before);
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
