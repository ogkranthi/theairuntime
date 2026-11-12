import { afterEach, expect, it, vi } from "vitest";
import { readHealth, sendMessage, startLesson } from "./api";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("preserves the existing lesson endpoint and answer context", async () => {
  const fetch = vi.fn(async (_path: string, _options?: RequestInit) => Response.json({ token: "next" }));
  vi.stubGlobal("fetch", fetch);
  await sendMessage("current", "my answer", [{ role: "coach", text: "question" }]);
  expect(fetch.mock.calls[0][0]).toBe("/api/coach/message");
  expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ token: "current", message: "my answer", stageTurns: [{ role: "coach", text: "question" }] });
});
it("aborts a stalled lesson request and never retries automatically", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn((_path, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
  vi.stubGlobal("fetch", fetch);
  const result = expect(startLesson()).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20_000);
  await result;
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("cancels a request when the learner starts a new conversation", async () => {
  vi.stubGlobal("fetch", vi.fn((_path, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))))));
  const controller = new AbortController();
  const result = expect(startLesson(controller.signal)).rejects.toThrow("Aborted");
  controller.abort(); await result;
});
it("treats missing health as unavailable instead of starting a lesson", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Network unavailable"); }));
  expect(await readHealth()).toBeNull();
});
