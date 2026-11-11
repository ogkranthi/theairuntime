import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

it("reuses the Coach key and original payload after a lost response", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("response lost"))
    .mockResolvedValueOnce(Response.json({ token: "next-token" }));
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
