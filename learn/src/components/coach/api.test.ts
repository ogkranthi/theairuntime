import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCoachClient, readHealth, type CoachReply } from "./api";
const reply: CoachReply = { token: "signed-next", stage: { number: 1, total: 6, title: "Outcome" }, parts: [{ kind: "ask", text: "What is useful?" }], done: false, degraded: true, aiAvailable: false };
let client: ReturnType<typeof createCoachClient>;
beforeEach(() => { client = createCoachClient(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function capture() {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => Response.json(reply));
  vi.stubGlobal("fetch", fetch); return fetch;
}
function identity(fetch: ReturnType<typeof capture>, index = 0) {
  const [path, init] = fetch.mock.calls[index];
  return { path, body: init!.body, headers: init!.headers };
}
it("preserves the hardened endpoint, exact context, and private request key", async () => {
  const fetch = capture();
  await client.sendMessage("current", "my answer", [{ role: "coach", text: "question" }]);
  expect(identity(fetch).path).toBe("/api/coach/message");
  expect(JSON.parse(identity(fetch).body as string)).toEqual({ token: "current", message: "my answer", stageTurns: [{ role: "coach", text: "question" }] });
  expect(new Headers(identity(fetch).headers).get("idempotency-key")).toMatch(/^[\w-]{16,128}$/);
});
it("retains start key, scope, and body after a lost response, until application acknowledgement", async () => {
  const fetch = capture().mockRejectedValueOnce(new Error("lost"));
  await expect(client.startLesson()).rejects.toThrow("lost");
  const recovered = await client.startLesson();
  expect(identity(fetch, 1)).toEqual(identity(fetch));
  expect(new Headers(identity(fetch).headers).get("x-session-client")).toMatch(/^[\w-]{32,128}$/);
  await expect(client.sendMessage(recovered.token, "changed", [])).rejects.toThrow("original request");
  client.acknowledge(recovered);
  await client.sendMessage(recovered.token, "answer", []);
  expect(new Headers(identity(fetch, 2).headers).get("idempotency-key")).not.toBe(new Headers(identity(fetch).headers).get("idempotency-key"));
});
it.each([{}, { ...reply, parts: [{kind:"invented",text:"bad"}] }, { ...reply, stage: {number:7,total:6,title:"bad"} }, { ...reply, done:true }, { ...reply, summary: {recap:[],design:[],takeaway:"bad"} }])("rejects malformed HTTP success without retiring identity (%j)", async body => {
  const fetch = capture().mockResolvedValueOnce(Response.json(body));
  await expect(client.startLesson()).rejects.toThrow("could not be read");
  await client.startLesson(); expect(identity(fetch, 1)).toEqual(identity(fetch));
});
it("does not accept another operation's acknowledgement", async () => {
  capture(); await client.startLesson(); expect(() => client.acknowledge(reply)).toThrow("current operation");
});
it.each([409, 503])("retains exact retry identity after HTTP %s", async status => {
  const fetch = capture().mockResolvedValueOnce(Response.json({error:"Retry original request"},{status}));
  await expect(client.sendMessage("token", "answer", [])).rejects.toMatchObject({status,retryable:true});
  await client.sendMessage("token", "answer", []);expect(identity(fetch,1)).toEqual(identity(fetch));
});
it.each([400,403,413,429])("exposes terminal HTTP %s without retrying or changing credentials", async status => {
  const fetch = capture().mockResolvedValueOnce(Response.json({error:"Restart or wait"},{status}));
  await expect(client.startLesson()).rejects.toMatchObject({status,retryable:false}); expect(fetch).toHaveBeenCalledTimes(1);
});
it("rejects a changed pending payload before fetching", async () => {
  const fetch = capture().mockRejectedValueOnce(new Error("lost"));
  await expect(client.sendMessage("t", "one", [])).rejects.toThrow();
  await expect(client.sendMessage("t", "two", [])).rejects.toThrow("original request"); expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(["headers", "body"])("bounds stalled %s and retains exact identity without an automatic retry", async phase => {
  vi.useFakeTimers();
  const fetch = capture().mockImplementationOnce(async () => phase === "headers" ? new Promise<Response>(()=>{}) : {ok:true,json:()=>new Promise(()=>{})} as Response);
  const result = expect(client.startLesson()).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20_000);await result;
  expect(fetch).toHaveBeenCalledTimes(1);
  await client.startLesson();expect(identity(fetch,1)).toEqual(identity(fetch));
});
it("external abort after headers retains identity even when body ignores abort", async () => {
  const fetch = capture().mockResolvedValueOnce({ok:true,json:()=>new Promise(()=>{})} as Response);
  const abort = new AbortController(); const result = expect(client.startLesson(abort.signal)).rejects.toThrow("canceled");
  await Promise.resolve();abort.abort();await result;
  await client.startLesson();expect(identity(fetch,1)).toEqual(identity(fetch));
});
it("a pre-aborted request sends no network traffic", async () => {
  const fetch=capture();const abort=new AbortController();abort.abort();
  await expect(client.startLesson(abort.signal)).rejects.toThrow("canceled");expect(fetch).not.toHaveBeenCalled();
});
it("simultaneous calls cannot execute twice", async () => {
  let finish!: (response:Response)=>void; const fetch=capture().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const first=client.startLesson();await expect(client.startLesson()).rejects.toMatchObject({status:409});
  finish(Response.json(reply));await first;expect(fetch).toHaveBeenCalledTimes(1);
});
it("abandoning an unresolved start rejects late replies and creates a fresh isolated scope", async () => {
  let finish!: (response:Response)=>void;const fetch=capture().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const late=expect(client.startLesson()).rejects.toThrow("abandoned");client.abandon();
  const next=createCoachClient();await next.startLesson();finish(Response.json(reply));await late;
  expect(new Headers(identity(fetch,1).headers).get("x-session-client")).not.toBe(new Headers(identity(fetch).headers).get("x-session-client"));
  expect(new Headers(identity(fetch,1).headers).get("idempotency-key")).not.toBe(new Headers(identity(fetch).headers).get("idempotency-key"));
  await expect(client.startLesson()).rejects.toThrow("abandoned");
});
it("health requires the complete coarse security configuration contract", async () => {
  const fetch=capture().mockResolvedValueOnce(Response.json({ok:true,tokenConfigured:true,aiConfigured:true}));
  expect(await readHealth()).toBeNull();
  fetch.mockResolvedValueOnce(Response.json({ok:true,tokenConfigured:true,aiConfigured:false,countersConfigured:true,securityConfigured:false}));
  expect((await readHealth())?.securityConfigured).toBe(false);
});
