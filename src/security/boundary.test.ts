import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { handleCoachRequest } from "../coach/routes";
import { verifyState } from "../coach/token";
import { handleFdeGymRequest } from "../fde-gym/routes";
import type { FdeGymEnv } from "../fde-gym/types";
import { admissionRpc, digest } from "./boundary";
import { securityRuntime } from "./test-runtime";
import type { CoachEnv } from "../coach/types";
import { LIMITS } from "./types";

let runtime: Awaited<ReturnType<typeof securityRuntime>>;
let env: FdeGymEnv & CoachEnv;
let store: Map<string, string>;
let ai: ReturnType<typeof vi.fn>;
let control: (path: string, body?: unknown) => Promise<any>;
const CLIENT = crypto.randomUUID() + crypto.randomUUID();
const SECRET = "local-test-signing-key";
const coachReply = { response: JSON.stringify({ message: "Consider the evidence and tradeoffs.", action: "advance" }) };
beforeAll(async () => { runtime = await securityRuntime(); }, 30_000);
afterAll(async () => { await runtime?.mf.dispose(); });
beforeEach(() => {
  store = new Map();
  ai = vi.fn(async () => coachReply);
  const id = runtime.namespace.idFromName(crypto.randomUUID());
  const stub = runtime.namespace.get(id);
  env = { COACH_TOKEN_SECRET: SECRET, AI: { run: ai },
    AI_SECURITY: { idFromName: () => id, get: () => stub },
    FDE_GYM_SESSIONS: { get: async key => store.get(key) ?? null, put: async (key, value) => { store.set(key, value); } },
  };
  control = async (path, body = {}) => {
    const response = await stub.fetch(`https://security/${path}`, { method: "POST", body: JSON.stringify(body) });
    return response.json();
  };
});
async function post(kind: "coach" | "gym", action: string, body: unknown, key = crypto.randomUUID(), client = CLIENT, ip?: string) {
  const request = new Request(`https://learn.theairuntime.com/api/${kind === "gym" ? "fde-gym" : "coach"}/${action}`, {
    method: "POST", headers: { "idempotency-key": key, "x-session-client": client, ...(ip ? { "cf-connecting-ip": ip } : {}) }, body: JSON.stringify(body),
  });
  const response = kind === "coach" ? await handleCoachRequest(request, env) : await handleFdeGymRequest(request, env);
  return { status: response.status, body: await response.json() as any };
}
async function start(kind: "coach" | "gym") {
  const response = await post(kind, "start", kind === "gym" ? { researchConsent: true, confidentialityAcknowledged: true } : {});
  expect(response.status).toBe(200);
  return response.body;
}
async function head(token: string) {
  const state = (await verifyState(token, SECRET, Date.now()))!;
  return admissionRpc<any>(env, "head", { sessionId: state.sessionId, capability: await digest(`coach:${state.sessionId}`) });
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function interceptRpc(path: string, mode: "before" | "after") {
  const original = env.AI_SECURITY!;
  let failed = false;
  env.AI_SECURITY = { idFromName: name => original.idFromName(name), get: id => {
    const stub = original.get(id);
    return { fetch: async (url: string, init: RequestInit) => {
      if (!failed && new URL(url).pathname === `/${path}`) {
        failed = true;
        if (mode === "after") await stub.fetch(url, init);
        throw new Error("simulated transport loss");
      }
      return stub.fetch(url, init);
    } } as unknown as ReturnType<typeof original.get>;
  } };
}

describe("Worker security boundary", () => {
  it("replays a start result without minting another session", async () => {
    const key = crypto.randomUUID();
    const first = await post("coach", "start", {}, key);
    const retry = await post("coach", "start", {}, key);
    expect(retry).toEqual(first);
    expect((await control("__inspect")).sessions).toHaveLength(1);
    expect(ai).not.toHaveBeenCalled();
  });
  it.each([
    ["coach", { lessonId: "missing-lesson" }],
    ["coach", { lessonId: "__proto__" }], ["coach", { lessonId: "constructor" }], ["coach", { lessonId: "toString" }], ["coach", { lessonId: "" }],
    ["coach", { lessonId: 12 }], ["coach", { unknown: true }],
    ["gym", {}], ["gym", { researchConsent: false, confidentialityAcknowledged: true }],
    ["gym", { researchConsent: "true", confidentialityAcknowledged: true }],
    ["gym", { researchConsent: true, confidentialityAcknowledged: "false" }],
    ...[{ mode: "unknown" }, { level: "unknown" }, { durationMinutes: 60 },
      { durationMinutes: "15" }, { drillId: "unknown" }, { drillId: 123 }, { extra: true }]
      .map(options => ["gym", { researchConsent: true, confidentialityAcknowledged: true, ...options }]),
  ] as const)("rejects invalid %s starts without contacting admission", async (kind, payload) => {
    const binding = env.AI_SECURITY!;
    const fetch = vi.fn((url: string, init: RequestInit) => binding.get(binding.idFromName("ignored")).fetch(url, init));
    env.AI_SECURITY = { idFromName: name => binding.idFromName(name), get: () => ({ fetch }) as unknown as ReturnType<typeof binding.get> };
    expect((await post(kind as "coach" | "gym", "start", payload)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(await control("__inspect")).toEqual({ sessions: [], operations: [], counters: [] });
    expect(store.size).toBe(0);
    expect(ai).not.toHaveBeenCalled();
  });
  it.each(["coach", "gym"] as const)("does not pin a %s start key rejected before admission", async kind => {
    const key = crypto.randomUUID();
    const invalid = kind === "coach" ? { lessonId: "missing" } : { researchConsent: false, confidentialityAcknowledged: true };
    expect((await post(kind, "start", invalid, key)).status).toBe(400);
    expect(await control("__inspect")).toEqual({ sessions: [], operations: [], counters: [] });
    const valid = kind === "coach" ? {} : { researchConsent: true, confidentialityAcknowledged: true };
    expect((await post(kind, "start", valid, key)).status).toBe(200);
    const metadata = await control("__inspect");
    expect(metadata.sessions).toHaveLength(1);
    expect(metadata.operations).toHaveLength(1);
    expect(metadata.counters.find((counter: any) => counter.id.startsWith("starts:day:")).value).toBe(1);
  });
  it("does not let a flood of rejected starts consume the final daily slot", async () => {
    const day = Math.floor(Date.now() / 86_400_000);
    await control("__counter", { id: `starts:day:${day}`, value: LIMITS.startsPerDay - 1, expires: Date.now() + 86_400_000 });
    const before = await control("__inspect");
    const rejected = await Promise.all(Array.from({ length: 24 }, (_, index) =>
      index % 2 ? post("coach", "start", { lessonId: "missing" }) : post("gym", "start", {})));
    expect(rejected.every(result => result.status === 400)).toBe(true);
    expect(await control("__inspect")).toEqual(before);
    const admitted = await Promise.all([post("coach", "start", {}), post("gym", "start", { researchConsent: true, confidentialityAcknowledged: true })]);
    expect(admitted.map(result => result.status).sort()).toEqual([200, 429]);
    const after = await control("__inspect");
    expect(after.sessions).toHaveLength(1);
    expect(after.counters.find((counter: any) => counter.id === `starts:day:${day}`).value).toBe(LIMITS.startsPerDay);
  });
  it.each(["coach", "gym"] as const)("isolates %s credentials for concurrent clients with colliding keys behind one IP", async kind => {
    const key = crypto.randomUUID();
    const clients = [crypto.randomUUID() + crypto.randomUUID(), crypto.randomUUID() + crypto.randomUUID()];
    const payload = kind === "gym" ? { researchConsent: true, confidentialityAcknowledged: true } : {};
    const results = await Promise.all(clients.map(client => post(kind, "start", payload, key, client, "192.0.2.1")));
    expect(results.map(result => result.status)).toEqual([200, 200]);
    const credentials = results.map(result => kind === "gym" ? result.body.session.accessToken : result.body.token);
    expect(credentials[0]).not.toBe(credentials[1]);
    for (let i = 0; i < clients.length; i++) {
      expect(await post(kind, "start", payload, key, clients[i], "192.0.2.1")).toEqual(results[i]);
    }
    const metadata = await control("__inspect");
    expect(metadata.sessions).toHaveLength(2);
    expect(metadata.counters.find((counter: any) => counter.id.startsWith("starts:day:")).value).toBe(2);
    for (const client of clients) expect(JSON.stringify(metadata)).not.toContain(client);
  });
  it.each(["coach", "gym"] as const)("grants only one execution for simultaneous identical %s starts", async kind => {
    const key = crypto.randomUUID();
    const payload = kind === "gym" ? { researchConsent: true, confidentialityAcknowledged: true } : {};
    const results = await Promise.all(Array.from({ length: 8 }, () => post(kind, "start", payload, key)));
    const accepted = results.filter(result => result.status === 200);
    expect(accepted.length).toBeGreaterThan(0);
    expect(results.every(result => result.status === 200 || result.status === 409)).toBe(true);
    expect(accepted.every(result => JSON.stringify(result.body) === JSON.stringify(accepted[0].body))).toBe(true);
    const metadata = await control("__inspect");
    expect(metadata.sessions).toHaveLength(1);
    expect(metadata.operations).toHaveLength(1);
    expect(metadata.counters.find((counter: any) => counter.id.startsWith("starts:day:")).value).toBe(1);
  });
  it("rejects malformed and oversized starts and missing client scopes before admission", async () => {
    for (const kind of ["coach", "gym"] as const) {
      for (const [text, status] of [["{", 400], ["[]", 400], ["null", 400], ["x".repeat(31_000), 413]] as const) {
        const request = new Request(`https://example.com/api/${kind === "gym" ? "fde-gym" : "coach"}/start`, {
          method: "POST", headers: { "idempotency-key": crypto.randomUUID(), "x-session-client": CLIENT }, body: text,
        });
        expect((await (kind === "gym" ? handleFdeGymRequest(request, env) : handleCoachRequest(request, env))).status).toBe(status);
      }
      const payload = kind === "gym" ? { researchConsent: true, confidentialityAcknowledged: true } : {};
      expect((await post(kind, "start", payload, crypto.randomUUID(), "")).status).toBe(400);
    }
    expect(await control("__inspect")).toEqual({ sessions: [], operations: [], counters: [] });
  });
  it("keeps one client's retry private across an IP change and rejects changed input", async () => {
    const key = crypto.randomUUID();
    const first = await post("coach", "start", {}, key, CLIENT, "192.0.2.1");
    expect(await post("coach", "start", {}, key, CLIENT, "192.0.2.2")).toEqual(first);
    const before = await control("__inspect");
    expect((await post("coach", "start", { lessonId: "vendor-research-agent" }, key, CLIENT, "192.0.2.2")).status).toBe(409);
    expect(await control("__inspect")).toEqual(before);
  });
  it("rejects legacy Coach tokens and missing idempotency headers", async () => {
    const response = await handleCoachRequest(new Request("https://example.com/api/coach/start", { method: "POST", body: "{}" }), env);
    expect(response.status).toBe(400);
    expect((await post("coach", "message", { token: "legacy", message: "hello" })).status).toBe(403);
    expect(ai).not.toHaveBeenCalled();
  });
  it("blocks simultaneous duplicates, replays the result, and rejects token rollback", async () => {
    const initial = await start("coach");
    const entered = deferred(); const release = deferred();
    ai.mockImplementation(async () => { entered.resolve(); await release.promise; return coachReply; });
    const payload = { token: initial.token, message: "Reason about available evidence" };
    const key = crypto.randomUUID();
    const first = post("coach", "message", payload, key);
    await entered.promise;
    const competitors = await Promise.all(Array.from({ length: 10 }, (_, i) => post("coach", "message", payload, i ? crypto.randomUUID() : key)));
    expect(competitors.every(r => r.status === 409)).toBe(true);
    release.resolve();
    const result = await first;
    expect(result.status).toBe(200);
    expect(await post("coach", "message", payload, key)).toEqual(result);
    expect((await post("coach", "message", { ...payload, message: "changed" }, key)).status).toBe(409);
    expect((await post("coach", "message", payload)).status).toBe(409);
    expect((await head(result.body.token)).revision).toBe(1);
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it("rejects cross-session capabilities even when both session IDs are known", async () => {
    const first = await start("gym");
    const second = await start("gym");
    const response = await post("gym", "message", {
      session: { ...first.session, accessToken: second.session.accessToken }, candidateMessage: "hello",
    });
    expect(response.status).toBe(403);
    expect(ai).not.toHaveBeenCalled();
  });
  it("serializes concurrent Gym finishes and returns one saved evaluation", async () => {
    const { session } = await start("gym");
    const entered = deferred(); const release = deferred();
    ai.mockImplementation(async () => { entered.resolve(); await release.promise; return { response: "{}" }; });
    const payload = { session, elapsedSeconds: 0, graph: session.graph };
    const first = post("gym", "finish", payload);
    await entered.promise;
    expect((await post("gym", "finish", payload)).status).toBe(409);
    release.resolve();
    const result = await first;
    expect(result.status).toBe(200);
    expect(await post("gym", "finish", payload)).toEqual(result);
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it("counts failed primary calls and successful fallbacks against the session quota", async () => {
    let { token } = await start("coach");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    ai.mockImplementation(async (model: string) => {
      if (model.includes("3.3")) throw new Error("provider failed");
      return { response: JSON.stringify({ message: "Explain the constraint.", action: "probe" }) };
    });
    try {
      for (let turn = 0; turn < 8; turn++) {
        const result = await post("coach", "message", { token, message: "Here is my reasoning about the architecture" });
        expect(result.status).toBe(200);
        token = result.body.token;
      }
      expect(ai).toHaveBeenCalledTimes(LIMITS.coachAttempts);
      expect((await head(token)).attempts).toBe(LIMITS.coachAttempts);
    } finally { warning.mockRestore(); }
  });
  it("uses deterministic fallbacks when the daily quota denies a fallback call", async () => {
    const initial = await start("coach");
    await control("__counter", { id: `ai:day:${Math.floor(Date.now() / 86_400_000)}`, value: LIMITS.dailyAttempts - 1, expires: Date.now() + 86_400_000 });
    ai.mockRejectedValue(new Error("provider unavailable"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = await post("coach", "message", { token: initial.token, message: "Reason through the architecture" });
      expect(result.status).toBe(200);
      expect(result.body.degraded).toBe(true);
      expect(ai).toHaveBeenCalledTimes(1);
      expect((await head(result.body.token)).attempts).toBe(1);
    } finally { warning.mockRestore(); }
  });
  it("fails closed when the binding is missing and when admission fails", async () => {
    const binding = env.AI_SECURITY;
    env.AI_SECURITY = undefined;
    expect((await post("coach", "start", {})).status).toBe(503);
    env.AI_SECURITY = binding;
    const initial = await start("coach");
    interceptRpc("admit", "after");
    const payload = { token: initial.token, message: "Reason through the architecture" };
    const key = crypto.randomUUID();
    expect((await post("coach", "message", payload, key)).status).toBe(503);
    expect((await post("coach", "message", payload, key)).status).toBe(409);
    expect(ai).not.toHaveBeenCalled();
  });
  it("never invokes AI when every attempt admission is unavailable", async () => {
    const initial = await start("coach");
    const binding = env.AI_SECURITY!;
    env.AI_SECURITY = { idFromName: name => binding.idFromName(name), get: id => {
      const stub = binding.get(id);
      return { fetch: async (url: string, init: RequestInit) => {
        if (new URL(url).pathname === "/attempt") throw new Error("coordinator unavailable");
        return stub.fetch(url, init);
      } } as unknown as ReturnType<typeof binding.get>;
    } };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = await post("coach", "message", { token: initial.token, message: "Reason through the architecture" });
      expect(result.status).toBe(200);
      expect(result.body.degraded).toBe(true);
      expect(ai).not.toHaveBeenCalled();
      expect((await head(result.body.token)).attempts).toBe(0);
    } finally { warning.mockRestore(); }
  });
  it("burns a lost attempt admission without invoking AI twice", async () => {
    const initial = await start("coach");
    interceptRpc("attempt", "after");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = await post("coach", "message", { token: initial.token, message: "Reason through the architecture" });
      expect(result.status).toBe(200);
      expect(ai).toHaveBeenCalledTimes(1);
      expect((await head(result.body.token)).attempts).toBe(2);
    } finally { warning.mockRestore(); }
  });
  it.each(["before", "after"] as const)("recovers from a lost %s-commit response without repeating AI", async mode => {
    const initial = await start("coach");
    interceptRpc("commit", mode);
    const key = crypto.randomUUID();
    const payload = { token: initial.token, message: "Reason through the architecture" };
    expect((await post("coach", "message", payload, key)).status).toBe(503);
    const recovered = await post("coach", "message", payload, key);
    expect(recovered.status).toBe(200);
    expect((await head(recovered.body.token)).revision).toBe(1);
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it("never repeats AI after a failed result write, even after reservation expiry", async () => {
    const initial = await start("coach");
    const originalPut = env.FDE_GYM_SESSIONS!.put;
    env.FDE_GYM_SESSIONS!.put = async () => { throw new Error("KV unavailable"); };
    const key = crypto.randomUUID();
    const payload = { token: initial.token, message: "Reason through the architecture" };
    expect((await post("coach", "message", payload, key)).status).toBe(503);
    env.FDE_GYM_SESSIONS!.put = originalPut;
    expect((await post("coach", "message", payload, key)).status).toBe(409);
    await control("__clock", { now: Date.now() + LIMITS.reservationMs + 1 });
    expect((await post("coach", "message", payload, key)).status).toBe(409);
    expect((await post("coach", "message", payload)).status).toBe(409);
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it("does not reserve or execute a Gym mutation when the canonical KV head is unavailable", async () => {
    const { session } = await start("gym");
    const get = env.FDE_GYM_SESSIONS!.get;
    env.FDE_GYM_SESSIONS!.get = async () => null;
    const key = crypto.randomUUID();
    const payload = { session, candidateMessage: "What data is available?" };
    expect((await post("gym", "message", payload, key)).status).toBe(503);
    env.FDE_GYM_SESSIONS!.get = get;
    expect((await post("gym", "message", payload, key)).status).toBe(200);
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it("never reruns an operation to replace an eventually missing replay result", async () => {
    const initial = await start("coach");
    const key = crypto.randomUUID();
    const payload = { token: initial.token, message: "Reason through the architecture" };
    expect((await post("coach", "message", payload, key)).status).toBe(200);
    const get = env.FDE_GYM_SESSIONS!.get;
    env.FDE_GYM_SESSIONS!.get = async () => null;
    expect((await post("coach", "message", payload, key)).status).toBe(503);
    env.FDE_GYM_SESSIONS!.get = get;
    expect((await post("coach", "message", payload, key)).status).toBe(200);
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it("stores hashes and pointers rather than conversation content or bearer tokens in SQLite", async () => {
    const initial = await start("coach");
    const message = "private learner conversation canary";
    await post("coach", "message", { token: initial.token, message });
    const metadata = JSON.stringify(await control("__inspect"));
    expect(metadata).not.toContain(message);
    expect(metadata).not.toContain(initial.token);
    expect(metadata).not.toContain(coachReply.response);
  });
});

describe("report at-most-once delivery", () => {
  it.each(["simultaneous", "failed-result-write"])("does not duplicate external delivery after %s", async mode => {
    const { session } = await start("gym");
    const completed = await post("gym", "finish", { session });
    env.FDE_GYM_REPORT_WEBHOOK_URL = "https://test.invalid/report";
    const entered = deferred(); const release = deferred();
    const external: string[] = [];
    const realFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("test.invalid") || url.includes("theairuntime.com/api/v1/free")) {
        external.push(url);
        if (mode === "simultaneous") { entered.resolve(); await release.promise; }
        return new Response("{}", { status: 200 });
      }
      return realFetch(input, init);
    });
    try {
      const originalPut = env.FDE_GYM_SESSIONS!.put;
      if (mode === "failed-result-write") env.FDE_GYM_SESSIONS!.put = async () => { throw new Error("KV write failed"); };
      const payload = { session: completed.body.session, email: "person@test.invalid", subscribe: true };
      const first = post("gym", "report", payload);
      if (mode === "simultaneous") {
        await entered.promise;
        expect((await post("gym", "report", payload)).status).toBe(409);
        release.resolve();
      }
      expect((await first).status).toBe(mode === "simultaneous" ? 200 : 503);
      env.FDE_GYM_SESSIONS!.put = originalPut;
      expect((await post("gym", "report", payload)).status).toBe(mode === "simultaneous" ? 200 : 409);
      if (mode === "failed-result-write") {
        await control("__clock", { now: Date.now() + LIMITS.reservationMs + 1 });
        expect((await post("gym", "report", payload)).status).toBe(409);
      }
      expect(external).toHaveLength(2);
      expect(new Set(external).size).toBe(2);
    } finally { release.resolve(); fetchSpy.mockRestore(); }
  });
  it.each([false, true])("does not redeliver after an uncertain delivery (failure=%s)", async fail => {
    const { session } = await start("gym");
    const completed = await post("gym", "finish", { session });
    env.RESEND_API_KEY = "local-test-only";
    env.FDE_GYM_FROM_EMAIL = "coach@test.invalid";
    env.LEAD_WEBHOOK_URL = "https://test.invalid/lead";
    env.FDE_GYM_REPORT_WEBHOOK_URL = "https://test.invalid/report";
    const external: string[] = [];
    const realFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("test.invalid") || url.includes("api.resend.com") || url.includes("theairuntime.com/api/v1/free")) {
        external.push(url);
        if (fail) throw new Error("delivery outcome unknown");
        return new Response("{}", { status: 200 });
      }
      return realFetch(input, init);
    });
    try {
      interceptRpc("commit", "before");
      const payload = { session: completed.body.session, email: "person@test.invalid", subscribe: true };
      expect((await post("gym", "report", { ...payload, email: "invalid" })).status).toBe(400);
      expect((await post("gym", "report", { ...payload, subscribe: false })).status).toBe(400);
      // The first response is lost after all external work and the result write.
      expect((await post("gym", "report", payload)).status).toBe(503);
      const recovered = await post("gym", "report", payload);
      expect(recovered.status).toBe(fail ? 503 : 200);
      expect(await post("gym", "report", payload)).toEqual(recovered);
      expect((await post("gym", "report", { ...payload, email: "other@test.invalid" })).status).toBe(409);
      expect(external).toHaveLength(4);
      expect(new Set(external).size).toBe(4);
      expect(JSON.stringify(await control("__inspect"))).not.toContain("person@test.invalid");
    } finally { fetchSpy.mockRestore(); }
  });
});
