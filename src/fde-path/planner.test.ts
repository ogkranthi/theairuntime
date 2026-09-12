import { describe, expect, it } from "vitest";
import { CAPABILITIES, RESOURCES } from "./catalog";
import {
  deterministicMapping,
  deterministicPlan,
  firstStepOptions,
  openQuestions,
} from "./planner";
import type { PathAnswers } from "./types";

const base: PathAnswers = {
  context: null,
  contextNote: "",
  example: "",
  owned: [],
  direction: null,
  note: "",
  followUps: [],
};

const developer: PathAnswers = {
  ...base,
  context: "software-developer",
  example:
    "I built and ran a billing reconciliation service that pulled from two payment providers and flagged mismatches for the finance team.",
  owned: ["coding", "deployment", "support"],
  direction: "owning-delivery",
  note: "About five hours a week.",
};

const student: PathAnswers = {
  ...base,
  context: "student",
  example: "",
  owned: [],
  direction: "exploring",
};

describe("the guide without a model", () => {
  it("produces a usable plan from nothing but the catalog", () => {
    const mapping = deterministicMapping(developer);
    const plan = deterministicPlan(developer, mapping);

    expect(plan.selfGuided).toBe(true);
    expect(plan.direction).toBeTruthy();
    expect(plan.reason).toBeTruthy();
    expect(plan.priorities.length).toBeGreaterThanOrEqual(2);
    for (const priority of plan.priorities) {
      expect(priority.title).toBeTruthy();
      expect(priority.why).toBeTruthy();
      expect(priority.action).toBeTruthy();
      expect(priority.output).toBeTruthy();
      expect(priority.resources.length).toBeLessThanOrEqual(2);
    }
  });

  it("gives a student and an experienced developer different plans", () => {
    const forDeveloper = deterministicPlan(developer, deterministicMapping(developer));
    const forStudent = deterministicPlan(student, deterministicMapping(student));

    expect(forDeveloper.reason).not.toBe(forStudent.reason);
    expect(forDeveloper.priorities.map((item) => item.title)).not.toEqual(
      forStudent.priorities.map((item) => item.title),
    );
  });

  it("still answers someone who has built nothing yet", () => {
    const mapping = deterministicMapping(student);
    const plan = deterministicPlan(student, mapping);
    expect(plan.priorities.length).toBeGreaterThanOrEqual(2);
    expect(mapping.unknowns.length).toBeGreaterThan(0);
  });
});

describe("what carries over", () => {
  it("connects owned work to capabilities, and quotes the learner", () => {
    const mapping = deterministicMapping(developer);
    expect(mapping.connections.length).toBeGreaterThan(0);
    for (const connection of mapping.connections) {
      expect(CAPABILITIES.some((item) => item.id === connection.capabilityId)).toBe(true);
      expect(connection.quote.length).toBeGreaterThan(0);
      // The quote has to be the learner's own text, not a summary of it.
      expect(developer.example.includes(connection.quote) || connection.quote.startsWith("You selected")).toBe(
        true,
      );
    }
  });

  it("never puts the same capability in both columns", () => {
    const mapping = deterministicMapping(developer);
    const carried = new Set(mapping.connections.map((item) => item.capabilityId));
    for (const item of mapping.develop) {
      expect(carried.has(item.capabilityId)).toBe(false);
    }
  });

  it("counts something they described even when they claimed no ownership", () => {
    const mapping = deterministicMapping({
      ...base,
      example: "I made a small site for my course that scraped the timetable.",
    });
    expect(mapping.connections).toHaveLength(1);
    expect(mapping.connections[0].quote).toContain("timetable");
  });

  it("caps the two columns", () => {
    const everything = { ...developer, owned: ["discovery", "design", "coding", "testing", "deployment", "support"] } as PathAnswers;
    const mapping = deterministicMapping(everything);
    expect(mapping.connections.length).toBeLessThanOrEqual(4);
    expect(mapping.develop.length).toBeLessThanOrEqual(3);
  });
});

describe("what is still unknown", () => {
  it("asks about the things that were left blank", () => {
    const questions = openQuestions(base).map((item) => item.id);
    expect(questions).toContain("unknown-example");
    expect(questions).toContain("unknown-owned");
    expect(questions).toContain("unknown-direction");
  });

  it("stops asking once the learner has answered", () => {
    const questions = openQuestions(developer).map((item) => item.id);
    expect(questions).not.toContain("unknown-example");
    expect(questions).not.toContain("unknown-owned");
    expect(questions).not.toContain("unknown-time");
  });

  it("carries a skipped follow-up through as unanswered rather than as a gap", () => {
    const questions = openQuestions({
      ...developer,
      followUps: [{ question: "Did anyone outside your team use it?", answer: "" }],
    });
    expect(questions.some((item) => item.question.includes("outside your team"))).toBe(true);
  });
});

describe("first steps", () => {
  it("offers at most three, each with a definition of done", () => {
    const plan = deterministicPlan(developer, deterministicMapping(developer));
    const steps = firstStepOptions(plan);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(3);
    for (const step of steps) {
      expect(step.task).toBeTruthy();
      expect(step.doneWhen.toLowerCase()).toContain("done when");
      expect(step.output).toBeTruthy();
      expect(step.bringBack).toBeTruthy();
      expect(step.estimate).toBeTruthy();
    }
  });
});

describe("the catalog", () => {
  it("has no duplicate ids", () => {
    const ids = RESOURCES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every external link with a review date, and no internal one", () => {
    for (const item of RESOURCES) {
      if (item.href.startsWith("http")) {
        expect(item.external).toBe(true);
        expect(item.reviewed).toBeTruthy();
      } else {
        expect(item.href.startsWith("/")).toBe(true);
        expect(item.href.endsWith("/")).toBe(true);
        expect(item.external).toBeUndefined();
      }
    }
  });

  it("never recommends an external posting as a plan resource", () => {
    // Employer postings illustrate the role. They go stale, and a plan that
    // depends on one is a plan that breaks quietly.
    const plan = deterministicPlan(developer, deterministicMapping(developer));
    for (const priority of plan.priorities) {
      for (const item of priority.resources) {
        expect(item.external).toBeUndefined();
      }
    }
  });
});
