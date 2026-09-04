import type { Lesson } from "./types";

/**
 * Lesson 01: design your first agent.
 *
 * Authored content only, no logic. Every string here can be read by a person
 * and edited without touching a component, which is the whole reason lesson 2
 * will not need a rewrite.
 *
 * The vendors stay A, B and C on purpose. Naming real observability products
 * would put a freshness liability inside a lesson that is about reasoning, not
 * about who charges what this quarter.
 */
export const VENDOR_RESEARCH_AGENT: Lesson = {
  id: "vendor-research-agent",
  title: "Design your first AI agent",
  subtitle: "Design your first AI agent in 10 minutes.",
  scenario:
    "The learner's engineering team wants an AI agent that can compare software vendors. A user might ask: \"Compare three observability platforms for our AI workloads and recommend the best option.\" The candidate vendors are called Vendor A, Vendor B and Vendor C. The learner's job is to design how the agent should work.",

  stages: [
    {
      id: "outcome",
      title: "Define the outcome",
      objective:
        "The learner sees that design starts from the job to be done, and that a bare recommendation is not a usable outcome for a real purchasing decision.",
      initialPrompt:
        "Your team asks you to build an AI agent that compares software vendors.\n\nBefore thinking about models, frameworks, or tools: what should the agent actually deliver to the user?",
      concepts: [
        "a comparison, not just an answer",
        "a recommendation",
        "evidence or sources behind the claims",
        "the requirements that matter to this buyer",
        "trade-offs between options",
        "a human makes the final decision",
      ],
      probe:
        "That is a start. If someone were making a real purchasing decision, would \"Vendor A is best\" be enough? What else would they need?",
      teachingPoint:
        "The first design decision is the outcome: produce an evidence-backed comparison and recommendation that a human uses to decide. Agent design starts with the job to be done, not with the AI framework.",
    },
    {
      id: "reasoning",
      title: "AI reasoning versus ordinary software",
      objective:
        "The learner separates work that genuinely needs a model from work that ordinary code does more reliably.",
      initialPrompt:
        "Now separate the work.\n\nWhich parts of this actually need AI reasoning, and which parts could ordinary software handle more reliably?",
      concepts: [
        "understanding ambiguous requirements needs reasoning",
        "comparing incomplete information needs reasoning",
        "identifying trade-offs needs reasoning",
        "synthesising a recommendation needs reasoning",
        "explaining uncertainty needs reasoning",
        "fetching a URL is ordinary software",
        "calling an API is ordinary software",
        "storing a source is ordinary software",
        "arithmetic is ordinary software",
        "validating required fields is ordinary software",
      ],
      probe:
        "Take the arithmetic in a pricing comparison. Does that need a language model, or would you rather it were a function that returns the same answer every time?",
      teachingPoint:
        "A useful agent does not make the model responsible for everything. Use models for judgment and ambiguity. Use ordinary software for deterministic work wherever you can.",
    },
    {
      id: "tools",
      title: "Tools",
      objective:
        "The learner understands that tools are how the system reaches current facts, and that model memory is not a source.",
      initialPrompt:
        "What capabilities would the agent need in order to research vendors, rather than answering from model memory alone?",
      concepts: [
        "web search",
        "a page or source reader",
        "APIs",
        "a calculator",
        "retrieval of current information",
      ],
      probe:
        "Should the model itself be trusted to remember today's vendor pricing?",
      teachingPoint:
        "For a first version, give it three: search, a source reader, and a calculator. The model reasons. Tools retrieve information and perform reliable actions. Facts that change should come from authoritative sources, not from model memory.",
    },
    {
      id: "evidence",
      title: "Evidence and uncertainty",
      objective:
        "The learner sees that the system must distinguish what a source said from what the model inferred, and must be able to say it does not know.",
      initialPrompt:
        "Here is a failure.\n\nThe agent says: \"Vendor A costs $20 per user per month.\"\n\nBut the source it retrieved only says: \"Contact sales.\"\n\nWhat should the system do?",
      concepts: [
        "do not invent the price",
        "cite what the evidence actually says",
        "report the value as unknown",
        "flag the uncertainty to the user",
        "separate retrieved fact from model inference",
      ],
      probe:
        "The pressure here is to return a complete looking answer. What does the system lose if it fills that gap with a plausible number?",
      teachingPoint:
        "Production agents distinguish what the evidence says from what the model inferred. The correct output here is that public pricing could not be verified from the available source. Uncertainty is information. Do not hide it.",
    },
    {
      id: "human-control",
      title: "Human control",
      objective:
        "The learner places the human at the consequential decision rather than at every model response.",
      initialPrompt:
        "The agent finishes its analysis and recommends Vendor B.\n\nShould it go ahead and purchase the software? And if not, where exactly should the human enter the workflow?",
      concepts: [
        "the agent must not purchase autonomously",
        "human approval before a consequential action",
        "escalate when evidence is insufficient",
        "organizational accountability for the decision",
        "research and synthesis can run unattended",
      ],
      probe:
        "If a person had to approve every single model response, what would you have built instead of an agent?",
      teachingPoint:
        "Human-in-the-loop does not mean a person reviews every model response. Put human judgment where consequences are high, where evidence is insufficient, or where organizational accountability requires it. The research can run on its own. The purchase cannot.",
    },
    {
      id: "evaluation",
      title: "Evaluation",
      objective:
        "The learner distinguishes evaluating a whole system's outcome from testing a model's output.",
      initialPrompt:
        "The agent produced a polished answer.\n\nHow would you know it actually did a good job?",
      concepts: [
        "the required criteria were covered",
        "material claims are supported by sources",
        "the calculations are correct",
        "missing information was identified rather than filled in",
        "the recommendation follows from the evidence",
        "the human remained the decision maker",
      ],
      probe:
        "Notice that \"the answer reads well\" should not be on that list. What could you actually check, mechanically, after a run?",
      teachingPoint:
        "This is the difference between testing a model and evaluating an agent system. A useful evaluation asks whether the system produced the intended business outcome, correctly, with enough evidence to defend it.",
    },
  ],

  recap: [
    {
      label: "Outcome",
      body: "What job does the system actually need to accomplish?",
    },
    { label: "Reasoning", body: "Where is AI judgment useful?" },
    { label: "Tools", body: "What capabilities should ordinary software provide?" },
    { label: "Evidence", body: "What supports the agent's claims?" },
    {
      label: "Human control",
      body: "Where should consequential judgment remain human owned?",
    },
    { label: "Evaluation", body: "How will you know the complete system worked?" },
  ],

  design: [
    {
      label: "Goal",
      body: "Produce an evidence-backed vendor recommendation.",
    },
    {
      label: "AI responsibility",
      body: "Interpret requirements, compare evidence, explain trade-offs and uncertainty.",
    },
    { label: "Tools", body: "Search, source reader, calculator." },
    {
      label: "Evidence rule",
      body: "Material claims must be supported by retrieved evidence. Unknown facts stay explicitly unknown.",
    },
    {
      label: "Human responsibility",
      body: "Approve consequential business decisions.",
    },
    {
      label: "Success",
      body: "Requirements covered, claims supported, calculations correct, uncertainty visible.",
    },
  ],

  takeaway: "The model is only one component of the system.",
};

export const LESSONS: Record<string, Lesson> = {
  [VENDOR_RESEARCH_AGENT.id]: VENDOR_RESEARCH_AGENT,
};

export function lessonById(id: string): Lesson | null {
  return LESSONS[id] ?? null;
}
