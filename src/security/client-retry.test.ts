import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

it("reuses the Coach key and original payload after a lost response", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("response lost"))
    .mockResolvedValueOnce(Response.json({ token: "next-token", stage: {number: 1, total: 6, title: "Outcome"}, parts: [{kind: "ask", text: "Question"}], done: false, degraded: true, aiAvailable: false }));
  vi.stubGlobal("fetch", fetch);
  const api = await import("../../learn/src/components/coach/api");
  await expect(api.sendMessage("token", "reasoning", [])).rejects.toThrow("response lost");
  await api.sendMessage("token", "reasoning", []);
  const first = fetch.mock.calls[0][1];
  const second = fetch.mock.calls[1][1];
  expect(second.headers["idempotency-key"]).toBe(first.headers["idempotency-key"]);
  expect(second.body).toBe(first.body);
});

it("keeps Gym retries stable while the browser interview timer advances", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("response lost"))
    .mockResolvedValueOnce(Response.json({ session: {} }));
  vi.stubGlobal("fetch", fetch);
  const api = await import("../../learn/src/components/fde-gym/api");
  const input = {
    session: { id: "session", accessToken: "capability", revision: 0 } as Parameters<typeof api.sendInterviewMessage>[0]["session"],
    candidateMessage: "reasoning", graph: { nodes: [], edges: [], revision: 0 }, elapsedSeconds: 10,
  };
  await expect(api.sendInterviewMessage(input)).rejects.toThrow("response lost");
  await api.sendInterviewMessage({ ...input, elapsedSeconds: 15 });
  const first = fetch.mock.calls[0][1];
  const second = fetch.mock.calls[1][1];
  expect(second.headers["idempotency-key"]).toBe(first.headers["idempotency-key"]);
  expect(second.body).toBe(first.body);
  expect(JSON.parse(first.body)).not.toHaveProperty("elapsedSeconds");
});

it.each(["coach", "gym"] as const)("keeps a private %s start scope stable for retries and separate for another client", async kind => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("response lost"))
    .mockImplementation(async () => Response.json({ session: {}, token: "test", stage: {number: 1, total: 6, title: "Outcome"}, parts: [{kind: "ask", text: "Question"}], done: false, degraded: true, aiAvailable: false }));
  vi.stubGlobal("fetch", fetch);
  async function caller() {
    if (kind === "coach") {
      const api = await import("../../learn/src/components/coach/api");
      return () => api.startLesson();
    }
    const api = await import("../../learn/src/components/fde-gym/api");
    return () => api.startInterview({ mode: "mock", durationMinutes: 30, level: "fde", researchConsent: true, confidentialityAcknowledged: true });
  }
  const firstClient = await caller();
  await expect(firstClient()).rejects.toThrow("response lost");
  await firstClient();
  const first = fetch.mock.calls[0][1];
  const retry = fetch.mock.calls[1][1];
  expect(retry.headers["x-session-client"]).toBe(first.headers["x-session-client"]);
  expect(retry.headers["idempotency-key"]).toBe(first.headers["idempotency-key"]);
  expect(first.headers["x-session-client"].length).toBeGreaterThan(64);
  vi.resetModules();
  await (await caller())();
  expect(fetch.mock.calls[2][1].headers["x-session-client"]).not.toBe(first.headers["x-session-client"]);
});

it.each([
  [503, { error: "Delivery outcome unknown" }], [409, { error: "Request in progress" }],
  [200, {}], [200, { ok: true, emailed: false, webhookDelivered: false }],
  [200, { ok: false, emailed: true }], [200, { ok: true, emailed: "true" }],
] as const)("rejects an unconfirmed report response (%s, %j) before the screen can show acceptance", async (status, body) => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(body, { status })));
  const api = await import("../../learn/src/components/fde-gym/api");
  const input = { session: {} as Parameters<typeof api.requestReport>[0]["session"], email: "person@test.invalid", subscribe: true };
  await expect(api.requestReport(input)).rejects.toThrow();
});
it.each([{ ok: true, emailed: true }, { ok: true, emailed: false, webhookDelivered: true }])("accepts only an explicit provider acknowledgement (%j)", async body => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
  const api = await import("../../learn/src/components/fde-gym/api");
  await expect(api.requestReport({ session: {} as Parameters<typeof api.requestReport>[0]["session"], email: "person@test.invalid", subscribe: true })).resolves.toEqual(body);
});
