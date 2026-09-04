import { describe, expect, it } from "vitest";
import { VENDOR_RESEARCH_AGENT as LESSON } from "./lesson";
import {
  decide,
  initialState,
  isComplete,
  scriptedProbe,
  validateCoachResponse,
} from "./machine";
import type { CoachResponse, CoachState } from "./types";

const fresh = (): CoachState => initialState(LESSON.id, 1_700_000_000_000);

const say = (action: CoachResponse["action"]): CoachResponse => ({
  message: "A model reply.",
  action,
});

const asks = (parts: { kind: string; text: string }[]) =>
  parts.filter((part) => part.kind === "ask").map((part) => part.text);

describe("stage transitions", () => {
  it("walks all six stages and finishes", () => {
    let state = fresh();
    for (let i = 0; i < LESSON.stages.length; i += 1) {
      expect(isComplete(LESSON, state)).toBe(false);
      const result = decide(LESSON, state, say("advance"));
      expect(result.state.stageIndex).toBe(i + 1);
      state = result.state;
    }
    expect(isComplete(LESSON, state)).toBe(true);
  });

  it("asks the next stage's question when it advances, and none at the end", () => {
    const first = decide(LESSON, fresh(), say("advance"));
    expect(asks(first.parts)).toEqual([LESSON.stages[1].initialPrompt]);
    expect(first.done).toBe(false);

    const last = decide(
      LESSON,
      { ...fresh(), stageIndex: LESSON.stages.length - 1 },
      say("advance"),
    );
    expect(asks(last.parts)).toEqual([]);
    expect(last.done).toBe(true);
  });

  it("always states the stage's principle when it advances", () => {
    const result = decide(LESSON, fresh(), say("advance"));
    const principles = result.parts.filter((part) => part.kind === "principle");
    expect(principles).toHaveLength(1);
    expect(principles[0].text).toBe(LESSON.stages[0].teachingPoint);
  });

  it("does not advance past the end", () => {
    const past: CoachState = { ...fresh(), stageIndex: LESSON.stages.length };
    const result = decide(LESSON, past, say("advance"));
    expect(result.done).toBe(true);
    expect(result.state.stageIndex).toBe(LESSON.stages.length);
    expect(result.parts).toEqual([]);
  });
});

describe("probing", () => {
  it("probes once without advancing", () => {
    const result = decide(LESSON, fresh(), say("probe"));
    expect(result.state.stageIndex).toBe(0);
    expect(result.state.probed).toBe(true);
    expect(result.parts).toEqual([{ kind: "ask", text: "A model reply." }]);
  });

  it("refuses a second probe on the same stage and teaches instead", () => {
    const probed: CoachState = { ...fresh(), probed: true };
    const result = decide(LESSON, probed, say("probe"));
    expect(result.state.stageIndex).toBe(1);
    expect(result.parts.some((part) => part.kind === "principle")).toBe(true);
  });

  it("clears the probe flag for the next stage", () => {
    const probed: CoachState = { ...fresh(), probed: true };
    expect(decide(LESSON, probed, say("advance")).state.probed).toBe(false);
  });

  it("offers the authored probe only while the stage has one left", () => {
    expect(scriptedProbe(LESSON, fresh())?.parts).toEqual([
      { kind: "ask", text: LESSON.stages[0].probe },
    ]);
    expect(scriptedProbe(LESSON, { ...fresh(), probed: true })).toBeNull();
  });
});

describe("the lesson without a model", () => {
  it("delivers every stage from authored text alone", () => {
    let state = fresh();
    const taught: string[] = [];
    for (let i = 0; i < LESSON.stages.length; i += 1) {
      const result = decide(LESSON, state, null);
      expect(result.scripted).toBe(true);
      for (const part of result.parts) {
        if (part.kind === "principle") taught.push(part.text);
      }
      state = result.state;
    }
    expect(isComplete(LESSON, state)).toBe(true);
    expect(taught).toEqual(LESSON.stages.map((stage) => stage.teachingPoint));
  });

  it("says nothing in the model's voice when there is no model", () => {
    const result = decide(LESSON, fresh(), null);
    expect(result.parts.some((part) => part.kind === "say")).toBe(false);
  });
});

describe("reading the model's reply", () => {
  it("accepts a well formed response", () => {
    expect(
      validateCoachResponse({
        message: "  Good start.  ",
        action: "teach_and_advance",
        detectedConcepts: ["evidence", 7, "trade-offs"],
      }),
    ).toEqual({
      message: "Good start.",
      action: "teach_and_advance",
      detectedConcepts: ["evidence", "trade-offs"],
    });
  });

  it("rejects anything it cannot trust", () => {
    for (const bad of [
      null,
      undefined,
      "a string",
      42,
      {},
      { message: "hi" },
      { action: "advance" },
      { message: "", action: "advance" },
      { message: "hi", action: "skip_to_end" },
      { message: "hi", action: "" },
      { message: 12, action: "advance" },
    ]) {
      expect(validateCoachResponse(bad)).toBeNull();
    }
  });

  it("trims a long reply rather than discarding the turn", () => {
    const result = validateCoachResponse({
      message: "x".repeat(5_000),
      action: "advance",
    });
    expect(result?.message).toHaveLength(1_200);
  });

  it("falls back to the authored lesson when the reply is unusable", () => {
    const result = decide(LESSON, fresh(), validateCoachResponse({ nonsense: true }));
    expect(result.scripted).toBe(true);
    expect(result.state.stageIndex).toBe(1);
    expect(result.parts.some((part) => part.text === LESSON.stages[0].teachingPoint)).toBe(
      true,
    );
  });
});
