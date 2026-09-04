import { describe, expect, it } from "vitest";
import { signState, verifyState } from "./token";
import type { CoachState } from "./types";

const SECRET = "test-secret-not-the-real-one";
const NOW = 1_700_000_000_000;

const state: CoachState = {
  lessonId: "vendor-research-agent",
  stageIndex: 3,
  probed: true,
  calls: 9,
  issuedAt: NOW,
};

describe("lesson token", () => {
  it("round trips the state", async () => {
    const token = await signState(state, SECRET);
    expect(await verifyState(token, SECRET, NOW + 1_000)).toEqual(state);
  });

  it("rejects an edited payload", async () => {
    const token = await signState(state, SECRET);
    const [payload, signature] = token.split(".");
    const forged =
      btoa(JSON.stringify({ ...state, calls: 0 }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "") + `.${signature}`;
    expect(forged).not.toBe(token);
    expect(payload).not.toBe("");
    expect(await verifyState(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects a signature made with another secret", async () => {
    const token = await signState(state, "some-other-secret");
    expect(await verifyState(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a token past its window", async () => {
    const token = await signState(state, SECRET);
    const fourHours = 4 * 60 * 60 * 1000;
    expect(await verifyState(token, SECRET, NOW + fourHours)).toBeNull();
  });

  it("rejects malformed input without throwing", async () => {
    for (const bad of [
      "",
      ".",
      "not-a-token",
      "a.b",
      "!!!.!!!",
      null,
      undefined,
      42,
      {},
      "x".repeat(5_000),
    ]) {
      expect(await verifyState(bad, SECRET, NOW)).toBeNull();
    }
  });

  it("rejects a validly signed token whose state is nonsense", async () => {
    // Signed with the right key, so only the shape check can catch these.
    for (const bad of [
      { ...state, stageIndex: -1 },
      { ...state, stageIndex: 5_000 },
      { ...state, calls: -4 },
      { ...state, probed: "yes" },
      { ...state, lessonId: 7 },
      { ...state, issuedAt: "recently" },
    ]) {
      const token = await signState(bad as unknown as CoachState, SECRET);
      expect(await verifyState(token, SECRET, NOW)).toBeNull();
    }
  });
});
