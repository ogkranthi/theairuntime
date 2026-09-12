import type { Capability, Resource } from "./types";

/**
 * The curated catalog.
 *
 * Everything the guide can recommend lives here. The model is never asked for a
 * URL, a course name, or a capability, because a plausible looking link to a
 * page that does not exist is worse than no link at all, and there is no way to
 * check one at request time.
 *
 * Internal hrefs are verified against the built routes by the test suite.
 */

export const CAPABILITIES: Capability[] = [
  {
    id: "discovery",
    label: "Understanding the problem",
    summary:
      "Sitting with the people doing the work, learning the real workflow, and turning a vague request into an outcome you can observe.",
  },
  {
    id: "shaping",
    label: "Shaping the solution",
    summary:
      "Deciding what the system should do, what it should not do, and where a model helps more than ordinary software.",
  },
  {
    id: "implementation",
    label: "Building it",
    summary:
      "Writing and integrating the working system: services, data, tools, and the code that holds them together.",
  },
  {
    id: "evaluation",
    label: "Checking quality",
    summary:
      "Deciding what good output means for this customer, then measuring it rather than trusting a demo.",
  },
  {
    id: "production",
    label: "Running it in production",
    summary:
      "Deploying, watching, recovering, and staying responsible for the system after the first successful run.",
  },
  {
    id: "communication",
    label: "Explaining the decision",
    summary:
      "Telling a customer what you built, what it cannot do yet, and why that trade was the right one.",
  },
];

export function capability(id: string): Capability | null {
  return CAPABILITIES.find((item) => item.id === id) ?? null;
}

/**
 * Reading and practice, all on routes this site actually serves.
 *
 * `reviewed` marks the two external employer examples. They are illustrations
 * of how two companies describe the work, not a description of the job market,
 * and a posting that disappears must not break the role guide.
 */
export const RESOURCES: Resource[] = [
  {
    id: "career-roles",
    title: "Role boundaries",
    href: "/career/roles/",
    why: "Separates FDE from solutions architecture, applied AI, and consulting, which is the confusion most people arrive with.",
  },
  {
    id: "career-index",
    title: "Understand the FDE profession",
    href: "/career/",
    why: "The definition, the segments, and how companies actually structure field engineering.",
  },
  {
    id: "career-segments",
    title: "Eight market segments",
    href: "/career/segments/",
    why: "Useful once you know you want the work and are choosing what to forward deploy.",
  },
  {
    id: "career-interviews",
    title: "Interview preparation",
    href: "/career/interviews/",
    why: "Discovery, system design, debugging, and judgment, which is what the loop actually tests.",
  },
  {
    id: "coach-lesson",
    title: "Agent System Design Coach",
    href: "/coach/",
    why: "Ten minutes, no prior agent experience, and it starts from the decisions rather than the frameworks.",
  },
  {
    id: "course-002",
    title: "Course 002: Agentic AI System Design",
    href: "/learn/courses/agentic-system-design/",
    why: "The full treatment of authority, tool contracts, context, evaluation, and operations, built around one system.",
  },
  {
    id: "course-001",
    title: "Course 001: Engineering Long-Running AI Agents",
    href: "/learn/courses/long-running-agents/",
    why: "What happens when a run takes hours, a tool half succeeds, or the process restarts in the middle.",
  },
  {
    id: "failure-labs",
    title: "Failure Labs",
    href: "/learn/courses/long-running-agents/labs/",
    why: "Break a running system on purpose and prove you can diagnose it, which is closer to the job than building from scratch.",
  },
  {
    id: "asd-practice",
    title: "Practice scenarios",
    href: "/learn/courses/agentic-system-design/practice/",
    why: "Twelve customer shaped design problems with staged constraints, to be worked under a clock.",
  },
  {
    id: "field-report",
    title: "Field Report template",
    href: "/practice/field-report/",
    why: "The structure for writing up a system so someone else can judge it: problem, design, failures, evidence, limits.",
  },
  {
    id: "fde-gym",
    title: "FDE Gym",
    href: "/fde-gym/",
    why: "A graded system design interview. Worth doing once you have a system to talk about.",
  },
  // The careers index rather than one posting. A specific req number is the
  // first thing to 404, and a dead link offered as evidence of what the job
  // involves is worse than no link.
  {
    id: "openai-fde",
    title: "OpenAI careers, Forward Deployed Engineer",
    href: "https://openai.com/careers/",
    why: "One employer's description of discovery, technical scoping, implementation, and production rollout.",
    reviewed: "2026-09-12",
    external: true,
  },
  {
    id: "palantir-fdse",
    title: "Palantir careers, Forward Deployed Software Engineer",
    href: "https://www.palantir.com/careers/",
    why: "A longer running version of the role, with the emphasis on customer stakeholders and owning the implementation.",
    reviewed: "2026-09-12",
    external: true,
  },
];

export function resource(id: string): Resource | null {
  return RESOURCES.find((item) => item.id === id) ?? null;
}

export function resources(ids: string[]): Resource[] {
  return ids.map(resource).filter((item): item is Resource => item !== null);
}

/**
 * Whether the two employer examples should be shown.
 *
 * They are illustrative and they go stale. Everything else on the page works
 * without them, so a caller can drop them rather than present a dead link as
 * evidence of what the job requires.
 */
export const EXTERNAL_REVIEWED = "2026-09-12";
