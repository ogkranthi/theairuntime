import { describe, expect, it } from "vitest";
import { deterministicMapping, deterministicPlan } from "./planner";
import type { PathAnswers } from "./types";
import { mergeMapping, mergePlan, validateFollowUps, verifyQuote } from "./validate";

const answers: PathAnswers = {
  context: "software-developer",
  contextNote: "",
  example:
    "I built and ran a billing reconciliation service that pulled from two payment providers and flagged mismatches for the finance team.",
  owned: ["coding", "deployment"],
  direction: "owning-delivery",
  note: "",
  followUps: [],
};

const baseline = deterministicMapping(answers);
const basePlan = deterministicPlan(answers, baseline);

describe("evidence has to be the learner's own words", () => {
  it("accepts a span copied out of what they wrote", () => {
    expect(verifyQuote(answers, "flagged mismatches for the finance team")).toBe(
      "flagged mismatches for the finance team",
    );
  });

  it("tolerates spacing and trailing punctuation, since models tidy quotes", () => {
    expect(verifyQuote(answers, "  pulled from two   payment providers.  ")).toBeTruthy();
  });

  it("rejects a paraphrase, however reasonable", () => {
    // Every one of these is a fair summary. None of them is what they typed,
    // and the screen says "Based on your answer".
    for (const quote of [
      "I worked on payment reconciliation systems",
      "built a service for finance",
      "I ran billing infrastructure at scale",
    ]) {
      expect(verifyQuote(answers, quote)).toBeNull();
    }
  });

  it("rejects invented experience outright", () => {
    expect(verifyQuote(answers, "I led a team of six engineers at a bank")).toBeNull();
  });

  it("rejects a quote too short to mean anything", () => {
    expect(verifyQuote(answers, "I built")).toBeNull();
    expect(verifyQuote(answers, "the")).toBeNull();
  });

  it("rejects anything that is not a string", () => {
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(verifyQuote(answers, bad)).toBeNull();
    }
  });
});

describe("merging a model mapping", () => {
  it("keeps a connection whose quote checks out", () => {
    const merged = mergeMapping(
      {
        connections: [
          {
            capabilityId: "production",
            described: "You described running a service other people depended on.",
            because: "That may transfer to operating a customer facing AI system.",
            quote: "flagged mismatches for the finance team",
          },
        ],
      },
      answers,
      baseline,
    );
    expect(merged.connections).toHaveLength(1);
    expect(merged.connections[0].capabilityId).toBe("production");
  });

  it("drops a connection with a fabricated quote and falls back to the catalog", () => {
    const merged = mergeMapping(
      {
        connections: [
          {
            capabilityId: "production",
            described: "You described leading a large platform team.",
            because: "That may transfer.",
            quote: "I led a team of six engineers at a bank",
          },
        ],
      },
      answers,
      baseline,
    );
    expect(merged.connections).toEqual(baseline.connections);
    expect(
      merged.connections.some((item) => item.quote.includes("six engineers")),
    ).toBe(false);
  });

  it("refuses a capability that does not exist", () => {
    const merged = mergeMapping(
      {
        connections: [
          {
            capabilityId: "vibe-alignment",
            described: "You described something.",
            because: "It may transfer.",
            quote: "flagged mismatches for the finance team",
          },
        ],
      },
      answers,
      baseline,
    );
    expect(merged.connections).toEqual(baseline.connections);
  });

  it("never lets the model write the open questions", () => {
    const merged = mergeMapping(
      { unknowns: [{ id: "x", question: "Are you actually any good?" }] },
      answers,
      baseline,
    );
    expect(merged.unknowns).toEqual(baseline.unknowns);
  });

  it("falls back whole when the reply is unusable", () => {
    for (const bad of [null, undefined, "text", 42, {}]) {
      expect(mergeMapping(bad, answers, baseline)).toEqual(baseline);
    }
  });
});

describe("merging a model plan", () => {
  it("takes the wording and keeps the catalog's links", () => {
    const merged = mergePlan(
      {
        direction: "Owning delivery on AI systems",
        reason: "Because you already ran something people depended on.",
        priorities: [
          {
            title: "Define what good output means",
            why: "You have operated services but not judged model output.",
            action: "Write an evaluation plan for something you already built.",
            output: "A short evaluation plan.",
            resourceIds: ["course-002", "does-not-exist"],
          },
          {
            title: "Write one system up",
            why: "Nobody outside your team can read your work.",
            action: "Use the Field Report structure.",
            output: "A published write up.",
            resourceIds: ["field-report"],
          },
        ],
      },
      basePlan,
    );

    expect(merged.selfGuided).toBe(false);
    expect(merged.direction).toBe("Owning delivery on AI systems");
    expect(merged.priorities).toHaveLength(2);
    // The invented id is gone, the real one survives.
    expect(merged.priorities[0].resources.map((item) => item.id)).toEqual(["course-002"]);
  });

  it("lends a priority the catalog's resources when the model cites none that exist", () => {
    const merged = mergePlan(
      {
        priorities: [
          {
            title: "A",
            why: "b",
            action: "c",
            output: "d",
            resourceIds: ["https://example.com/course"],
          },
          { title: "E", why: "f", action: "g", output: "h", resourceIds: [] },
        ],
      },
      basePlan,
    );
    expect(merged.priorities[0].resources).toEqual(basePlan.priorities[0].resources);
    for (const priority of merged.priorities) {
      for (const item of priority.resources) {
        expect(item.href.startsWith("http")).toBe(false);
      }
    }
  });

  it("keeps the catalog plan when the model returns fewer than two priorities", () => {
    const merged = mergePlan(
      { priorities: [{ title: "A", why: "b", action: "c", output: "d", resourceIds: [] }] },
      basePlan,
    );
    expect(merged.priorities).toEqual(basePlan.priorities);
  });

  it("falls back whole when the reply is unusable", () => {
    for (const bad of [null, undefined, "text", 42]) {
      expect(mergePlan(bad, basePlan)).toEqual(basePlan);
    }
  });
});

describe("follow-up questions", () => {
  it("keeps at most two real questions", () => {
    expect(
      validateFollowUps({
        questions: [
          "Did anyone outside your team use it?",
          "How did you know the matches were right?",
          "What is your salary expectation?",
        ],
      }),
    ).toHaveLength(2);
  });

  it("drops anything that is not a question", () => {
    expect(
      validateFollowUps({ questions: ["You should learn Python.", "ok?", "", 7] }),
    ).toEqual([]);
  });

  it("returns nothing for an unusable reply", () => {
    for (const bad of [null, undefined, "text", 42, {}]) {
      expect(validateFollowUps(bad)).toEqual([]);
    }
  });
});
