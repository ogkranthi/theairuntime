import { paths } from "../../data/paths";

export type Goal = "become" | "interview" | "skills" | "design" | "review" | "plan" | "story" | "general";
export interface Resource { title: string; href: string; detail: string }
export interface Guidance { title: string; paragraphs: string[]; resources: Resource[]; followups: Goal[]; lesson?: boolean }
export const starters = [
  { id: "become", title: "Become an FDE", description: "Find your starting point and build a path into the role.", tone: "blue" },
  { id: "interview", title: "Prepare for an FDE Interview", description: "Practice the decisions, tradeoffs, and stories that matter.", tone: "green" },
  { id: "skills", title: "Improve My FDE Skills", description: "Build stronger systems and put your knowledge to work.", tone: "orange" },
] as const;
export const prompts = [
  { id: "design", title: "Design a scalable system" }, { id: "review", title: "Review my architecture" },
  { id: "plan", title: "Create an FDE learning plan" }, { id: "story", title: "Turn my project into an FDE story" },
] as const;
export const goalLabel = (goal: Goal) => [...starters, ...prompts].find(item => item.id === goal)?.title ?? "Find my next step";
const library = { title: "Explore the learning library", href: "/learn/", detail: "Existing courses, concepts, patterns, and reference systems." };
const fieldReport = { title: "Build a Field Report", href: "/practice/field-report/", detail: "Turn decisions and evidence into a reproducible account of your work." };
export function guidanceFor(goal: Goal): Guidance {
  switch (goal) {
    case "become": return { title: "Start with the work, then choose your path.", paragraphs: [
      "A Forward Deployed Engineer turns an ambiguous customer problem into a working system. The job combines engineering, discovery, deployment, and explaining tradeoffs.",
      "You do not have to start from scratch. Choose the transition closest to your experience, or use the existing guided path to work out what carries over.",
    ], resources: [{ title: "Find my FDE path", href: "/paths/find-my-path/", detail: "A guided introduction to the role, your experience, and your first step." },
      ...paths.map(path => ({ title: path.title, href: `/paths/${path.slug}/`, detail: path.description }))], followups: ["skills", "interview"] };
    case "interview": return { title: "Practice your reasoning, not a memorized answer.", paragraphs: [
      "Start with the customer outcome. Make your assumptions visible, defend the architecture, and explain what you would measure when it reaches production.",
      "The existing FDE Gym offers a structured practice interview. Research consent is requested in the Gym before a session begins. This chat has not started an interview or assessed your readiness.",
    ], resources: [{ title: "Open FDE Gym", href: "/fde-gym/", detail: "Practice or mock interviews with an architecture canvas." },
      { title: "Read the interview preparation guide", href: "/career/interviews/", detail: "Prepare for discovery, system design, technical depth, and field judgment." }, fieldReport], followups: ["story", "design"] };
    case "skills": return { title: "Build one system. Learn from where it breaks.", paragraphs: [
      "Pick a production boundary to get better at: state, tools, context, evaluation, or operating a system when something fails.",
      "The two existing courses build those skills through complete systems and practical exercises. For a smaller first step, try the six-question guided agent-design lesson.",
    ], resources: [{ title: "Agentic AI System Design", href: "/learn/courses/agentic-system-design/", detail: "Design authority, tools, context, evaluation, and operations for Atlas." },
      { title: "Engineering Long-Running AI Agents", href: "/learn/courses/long-running-agents/", detail: "Build bounded, observable, and recoverable workflows." }], lesson: true, followups: ["design", "review"] };
    case "design": return { title: "Define the outcome before drawing the boxes.", paragraphs: [
      "Who needs the system, what must it do, and how will you know it worked? Then make the tradeoffs around data, latency, reliability, cost, and human control explicit.",
      "The guided lesson works through one vendor-research agent scenario. It is a structured lesson, not an open-ended system-design assistant.",
    ], resources: [{ title: "Study agentic system design", href: "/learn/courses/agentic-system-design/", detail: "Work through the existing foundations, architecture, and production material." }], lesson: true, followups: ["review", "skills"] };
    case "review": return { title: "Make the architecture explain its decisions.", paragraphs: [
      "Use a review to trace the customer outcome, authority boundaries, state, failure recovery, and evidence. Each box should have a job; each connection should have a contract.",
      "Personalized diagram review is not connected to this chat yet. The existing Field Report template and reference systems give you a concrete way to review your own design.",
    ], resources: [fieldReport, { title: "Explore reference systems", href: "/learn/systems/", detail: "Study system boundaries and the tradeoffs behind them." }], followups: ["design", "story"] };
    case "plan": return { title: "Choose a first proof, not a long reading list.", paragraphs: [
      "A useful learning plan connects your current experience to one thing you can build and demonstrate. Start with the guided path, then choose a small proof of capability.",
      "This chat does not generate a personalized plan. The existing path experience explains the role, asks about your background, and helps you choose your next step.",
    ], resources: [{ title: "Work through Find my FDE path", href: "/paths/find-my-path/", detail: "Use the existing guided experience to connect your background to a first action." }, library], followups: ["become", "skills"] };
    case "story": return { title: "Tell the story of a decision that mattered.", paragraphs: [
      "Frame the customer problem, explain the decision and its tradeoff, describe what you shipped, and show evidence of the outcome. Include what failed and what you changed.",
      "A personalized rewrite is not available here yet. Use the existing interview guide and Field Report template to build an evidence-backed project story.",
    ], resources: [fieldReport, { title: "Prepare your interview stories", href: "/career/interviews/", detail: "Connect discovery, implementation, deployment, and customer outcomes." }], followups: ["interview", "review"] };
    default: return { title: "Let’s find a useful next step.", paragraphs: [
      "This chat currently offers curated guidance and links to existing learning material. It does not generate personal AI answers, review uploads, or remember conversations between visits.",
      "Choose a direction below, search the library for your topic, or start the existing guided system-design lesson.",
    ], resources: [{ title: "Search the learning library", href: "/search/", detail: "Find existing courses, concepts, patterns, and reference systems." }, library], lesson: true, followups: ["become", "interview", "skills"] };
  }
}
export function routeQuestion(text: string): Goal {
  if (/\b(interview|mock|hiring|recruit|job)\b/i.test(text)) return "interview";
  if (/\b(story|stories|project|resume)\b/i.test(text)) return "story";
  if (/\b(review|diagram|architecture)\b/i.test(text)) return "review";
  if (/\b(plan|roadmap|path)\b/i.test(text)) return "plan";
  if (/\b(design|scale|scalable|system|agent)\b/i.test(text)) return "design";
  if (/\b(skills|improve|practice|course|learn)\b/i.test(text)) return "skills";
  if (/\b(become|beginner|start|fde)\b/i.test(text)) return "become";
  return "general";
}
