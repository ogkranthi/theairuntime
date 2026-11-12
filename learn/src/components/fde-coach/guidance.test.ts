import { describe, expect, it } from "vitest";
import { guidanceFor, prompts, routeQuestion, starters } from "./guidance";

describe("curated FDE guidance", () => {
  it("has exactly the three requested starting journeys", () => {
    expect(starters.map(item => item.title)).toEqual(["Become an FDE", "Prepare for an FDE Interview", "Improve My FDE Skills"]);
  });
  it.each([...starters, ...prompts])("offers existing resources for $title without claiming personal AI work", item => {
    const result = guidanceFor(item.id);
    expect(result.resources.length).toBeGreaterThan(0);
    expect(result.resources.every(resource => resource.href.startsWith("/") && !resource.href.startsWith("//"))).toBe(true);
    expect(result.paragraphs.join(" ")).not.toMatch(/Frontend Development Engineer|Foundational Design|I reviewed your|your score/i);
  });
  it("states the limits of review, planning, stories and unknown questions", () => {
    for (const goal of ["review", "plan", "story", "general"] as const) {
      expect(guidanceFor(goal).paragraphs.join(" ")).toMatch(/not|does not/);
    }
  });
  it.each([["I have a job interview", "interview"], ["Help with my project story", "story"],
    ["Review my architecture", "review"], ["Create a learning plan", "plan"],
    ["Design a scalable system", "design"], ["Improve my skills", "skills"], ["Become an FDE", "become"],
    ["Tell me the weather", "general"]])("routes '%s' to authored guidance", (question, expected) => {
    expect(routeQuestion(question)).toBe(expected);
  });
});
