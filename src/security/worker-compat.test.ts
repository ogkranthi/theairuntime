import { describe, expect, it, vi } from "vitest";
import worker from "../worker";
import { callModel } from "../fde-gym/model";

function assetsEnv() {
  const fetch = vi.fn(async (request: Request) => new Response(new URL(request.url).pathname));
  return { fetch, env: { ASSETS: { fetch } } as unknown as Parameters<typeof worker.fetch>[1] };
}

describe("shared Worker compatibility", () => {
  it.each(["/", "/learn/", "/paths/", "/practice/", "/search/", "/coach/", "/fde-gym/"])("preserves Commons asset routing for %s without a security binding", async path => {
    const { env } = assetsEnv();
    const response = await worker.fetch(new Request(`https://learn.theairuntime.com${path}`), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(`/learn-site${path}`);
  });
  it("preserves events and lab host behavior", async () => {
    const { env } = assetsEnv();
    const events = await worker.fetch(new Request("https://events.theairuntime.com/"), env);
    expect(await events.text()).toBe("/");
    const lab = await worker.fetch(new Request("https://lab.theairuntime.com/"), env);
    expect(await lab.text()).toBe("/lab-home/");
    const redirect = await worker.fetch(new Request("https://events.theairuntime.com/investigations/"), env);
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("location")).toBe("https://lab.theairuntime.com/investigations/");
  });
  it("leaves the shared model client usable by endpoints outside the security boundary", async () => {
    const run = vi.fn(async () => ({ response: "outside-boundary" }));
    expect(await callModel({ AI: { run } }, "coach", [], 10)).toBe("outside-boundary");
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("leaves the existing FDE Path API available without an atomic binding", async () => {
    const { env } = assetsEnv();
    const response = await worker.fetch(new Request("https://learn.theairuntime.com/api/fde-path/health"), env);
    expect(response.status).toBe(200);
  });
});
