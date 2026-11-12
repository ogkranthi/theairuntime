import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { securityRuntime } from "./test-runtime";
import { LIMITS } from "./types";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
let runtime: Awaited<ReturnType<typeof securityRuntime>>;
let persist: string;
beforeAll(async () => {
  persist = await mkdtemp(join(tmpdir(), "air-security-"));
  runtime = await securityRuntime(persist);
}, 30_000);
afterAll(async () => { await runtime?.mf.dispose(); if (persist) await rm(persist, { recursive: true, force: true }); });
beforeEach(async () => { await runtime.rpc("__reset"); await runtime.rpc("__clock", { now: NOW }); });
async function create(kind = "coach", actor = crypto.randomUUID()) {
  const input = { sessionId: crypto.randomUUID(), capability: "test-capability-hash", operationId: crypto.randomUUID(),
    fingerprint: "start-hash", actor, kind, ttlMs: DAY, duration: 15 };
  const { status, body } = await runtime.rpc("start", input);
  expect(status).toBe(200);
  const auth = { ...body, capability: input.capability };
  expect((await runtime.rpc("commit", { ...auth, result: `kv:${input.sessionId}:initial`, success: true })).status).toBe(200);
  return { ...input, revision: 0 };
}
async function reserve(session: Record<string, any>, action = "message", operationId = crypto.randomUUID(), fingerprint = "request-hash") {
  const result = await runtime.rpc("admit", { ...session, action, operationId, fingerprint });
  return { ...result, auth: { ...result.body, capability: session.capability } };
}
async function commit(auth: Record<string, any>, completed = false) {
  return runtime.rpc("commit", { ...auth, success: true, completed, result: `kv:${auth.operationId}` });
}

describe("SQLite atomic admission", () => {
  it("admits one of simultaneous competing session revisions", async () => {
    const session = await create();
    const results = await Promise.all(Array.from({ length: 20 }, () => reserve(session)));
    expect(results.filter(r => r.status === 200 && !r.body.pending)).toHaveLength(1);
    expect(results.filter(r => r.status === 409)).toHaveLength(19);
  });
  it("identifies simultaneous exact duplicates without granting a second execution", async () => {
    const session = await create();
    const id = crypto.randomUUID();
    const results = await Promise.all(Array.from({ length: 10 }, () => reserve(session, "message", id)));
    expect(results.filter(r => !r.body.pending)).toHaveLength(1);
    expect(new Set(results.map(r => r.body.nonce)).size).toBe(1);
    const original = results[0];
    await commit(original.auth);
    expect((await reserve(session, "message", id)).body.replay).toBe(`kv:${id}`);
    expect((await reserve(session, "message", id, "different-payload")).status).toBe(409);
    expect((await reserve(session)).status).toBe(409);
  });
  it("persists and charges each attempt slot once, including fallbacks", async () => {
    const session = await create();
    const op = await reserve(session);
    const attempts = await Promise.all(Array.from({ length: 12 }, () => runtime.rpc("attempt", { ...op.auth, slot: 0 })));
    expect(attempts.filter(r => r.status === 200)).toHaveLength(1);
    expect((await runtime.rpc("attempt", { ...op.auth, slot: 1 })).status).toBe(200);
    expect((await runtime.rpc("attempt", { ...op.auth, slot: 2 })).status).toBe(409);
    expect((await runtime.rpc("head", session)).body.attempts).toBe(2);
  });
  it("enforces the session attempt ceiling without refunding failures or lost admissions", async () => {
    const session = await create();
    for (let i = 0; i < LIMITS.coachAttempts / 2; i++) {
      const op = await reserve({ ...session, revision: i });
      expect((await runtime.rpc("attempt", { ...op.auth, slot: 0 })).status).toBe(200);
      expect((await runtime.rpc("attempt", { ...op.auth, slot: 1 })).status).toBe(200);
      await commit(op.auth);
    }
    const next = await reserve({ ...session, revision: LIMITS.coachAttempts / 2 });
    expect((await runtime.rpc("attempt", { ...next.auth, slot: 0 })).status).toBe(429);
    expect((await runtime.rpc("head", session)).body.attempts).toBe(LIMITS.coachAttempts);
  });
  it("shares the daily ceiling across Coach and Gym under concurrency", async () => {
    const coach = await reserve(await create("coach"));
    const gym = await reserve(await create("gym"));
    await runtime.rpc("__counter", { id: `ai:day:${Math.floor(NOW / DAY)}`, value: LIMITS.dailyAttempts - 1, expires: NOW + DAY });
    const results = await Promise.all([
      runtime.rpc("attempt", { ...coach.auth, slot: 0 }),
      runtime.rpc("attempt", { ...gym.auth, slot: 0 }),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([200, 429]);
    await runtime.rpc("__clock", { now: (Math.floor(NOW / DAY) + 1) * DAY });
    // The old reservations have expired at midnight; a fresh session gets a fresh daily counter.
    const fresh = await reserve(await create("gym"));
    expect((await runtime.rpc("attempt", { ...fresh.auth, slot: 0 })).status).toBe(200);
  });
  it("enforces turn and server-time ceilings without model work", async () => {
    const session = await create();
    for (let revision = 0; revision < LIMITS.coachTurns; revision++) await commit((await reserve({ ...session, revision })).auth);
    expect((await reserve({ ...session, revision: LIMITS.coachTurns })).status).toBe(409);
    const gym = await create("gym");
    await runtime.rpc("__clock", { now: NOW + 15 * 60_000 });
    expect((await reserve(gym)).status).toBe(409);
    expect((await reserve(gym, "finish")).status).toBe(200);
  });
  it("enforces the Gym turn ceiling while simultaneous requests compete for the last turn", async () => {
    const session = await create("gym");
    for (let revision = 0; revision < LIMITS.gymTurns - 1; revision++) {
      expect((await commit((await reserve({ ...session, revision })).auth)).status).toBe(200);
    }
    const last = { ...session, revision: LIMITS.gymTurns - 1 };
    const results = await Promise.all([reserve(last), reserve(last)]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    await commit(results.find(result => result.status === 200)!.auth);
    expect((await reserve({ ...session, revision: LIMITS.gymTurns })).status).toBe(409);
  });
  it("bounds admitted errors and idempotency metadata independently of turn count", async () => {
    const session = await create();
    for (let i = 1; i < LIMITS.operationsPerSession; i++) {
      const op = await reserve(session);
      expect((await runtime.rpc("commit", { ...op.auth, success: false, result: `kv:error:${i}` })).status).toBe(200);
    }
    expect((await reserve(session)).status).toBe(429);
    expect((await runtime.rpc("head", session)).body.revision).toBe(0);
    expect((await runtime.rpc("__inspect")).body.operations).toHaveLength(LIMITS.operationsPerSession);
  });
  it("expires session authority at the absolute boundary", async () => {
    const session = await create();
    await runtime.rpc("__clock", { now: NOW + 3 * 3_600_000 });
    expect((await reserve(session)).status).toBe(403);
    expect((await runtime.rpc("head", session)).status).toBe(403);
  });
  it("never releases expired reservations to a replacement Worker", async () => {
    const session = await create("gym");
    const original = await reserve(session);
    await runtime.rpc("attempt", { ...original.auth, slot: 0 });
    await runtime.rpc("__clock", { now: NOW + LIMITS.reservationMs });
    expect((await runtime.rpc("attempt", { ...original.auth, slot: 1 })).status).toBe(409);
    expect((await commit(original.auth)).status).toBe(409);
    expect((await reserve(session)).status).toBe(409);
    await runtime.rpc("__alarm");
    expect((await reserve(session, "finish")).status).toBe(409);
  });
  it("keeps pending reservations and spent attempts across an actual runtime restart", async () => {
    const session = await create("gym");
    const original = await reserve(session);
    await runtime.rpc("attempt", { ...original.auth, slot: 0 });
    await runtime.mf.dispose();
    runtime = await securityRuntime(persist);
    expect((await runtime.rpc("attempt", { ...original.auth, slot: 0 })).status).toBe(409);
    expect((await runtime.rpc("head", session)).body.attempts).toBe(1);
    const retry = await reserve(session, "message", original.auth.operationId);
    expect(retry.body.pending).toBe(1);
    expect(retry.body.nonce).toBe(original.auth.nonce);
  }, 30_000);
  it("fences commits and makes completed commits idempotent", async () => {
    const session = await create();
    const op = await reserve(session);
    expect((await commit({ ...op.auth, nonce: "wrong" })).status).toBe(409);
    expect((await commit(op.auth)).status).toBe(200);
    expect((await commit(op.auth)).status).toBe(200);
    expect((await runtime.rpc("commit", { ...op.auth, result: "different" })).status).toBe(409);
    expect((await runtime.rpc("head", session)).body.revision).toBe(1);
  });
  it("pins the report recipient and allows no second report reservation", async () => {
    const session = await create("gym");
    await commit((await reserve(session, "finish")).auth, true);
    const ready = { ...session, revision: 1 };
    const report = await reserve(ready, "report", `${session.sessionId}:report`, "hashed-recipient-A");
    const simultaneous = await reserve(ready, "report", `${session.sessionId}:report`, "hashed-recipient-A");
    expect(simultaneous.body.pending).toBe(1);
    await commit(report.auth);
    expect((await reserve(ready, "report", `${session.sessionId}:report`, "hashed-recipient-A")).body.replay).toBeTruthy();
    expect((await reserve(ready, "report", `${session.sessionId}:report`, "hashed-recipient-B")).status).toBe(409);
  });
  it("bounds anonymous starts atomically rather than relying on KV counters", async () => {
    const attempts = await Promise.all(Array.from({ length: 20 }, () => runtime.rpc("start", {
      kind: "coach", sessionId: crypto.randomUUID(), capability: "cap", operationId: crypto.randomUUID(), fingerprint: "hash", actor: "same-hour-hash",
    })));
    expect(attempts.filter(r => r.status === 200)).toHaveLength(LIMITS.startsPerHour);
    expect(attempts.filter(r => r.status === 429)).toHaveLength(20 - LIMITS.startsPerHour);
  });
  it("enforces the shared daily start ceiling across different IP buckets", async () => {
    await runtime.rpc("__counter", { id: `starts:day:${Math.floor(NOW / DAY)}`, value: LIMITS.startsPerDay - 1, expires: NOW + DAY });
    const results = await Promise.all(Array.from({ length: 10 }, () => runtime.rpc("start", {
      kind: "coach", sessionId: crypto.randomUUID(), capability: "cap", operationId: crypto.randomUUID(),
      fingerprint: "hash", actor: crypto.randomUUID(),
    })));
    expect(results.filter(result => result.status === 200)).toHaveLength(1);
    expect(results.filter(result => result.status === 429)).toHaveLength(9);
  });
  it("deletes expired metadata and counters without retaining conversations", async () => {
    await create();
    const before = await runtime.rpc("__inspect");
    expect(before.body.sessions).toHaveLength(1);
    expect(JSON.stringify(before.body)).not.toMatch(/transcript|candidateMessage|prompt|email/);
    await runtime.rpc("__clock", { now: NOW + DAY + 1 });
    await runtime.rpc("__alarm");
    const after = await runtime.rpc("__inspect");
    expect(after.body.sessions).toEqual([]);
    expect(after.body.operations).toEqual([]);
    expect(after.body.counters).toEqual([]);
  });
});
