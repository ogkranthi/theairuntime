import { capability, resources } from "./catalog";
import type {
  Connection,
  DevelopArea,
  FirstStepOption,
  Mapping,
  OpenQuestion,
  OwnedPart,
  PathAnswers,
  Plan,
  Priority,
} from "./types";

/**
 * The guide, without a model.
 *
 * This is not a stub for when the AI is down. It is the self-guided path the
 * spec asks for, it is the fallback when a model call fails, and it is the
 * floor under every AI result: anything the model returns is merged onto this,
 * never substituted for it. If the model never runs, the learner still gets a
 * plan that answers "why this, given what I told you".
 *
 * Nothing here scores anybody. There is no readiness percentage, no verdict,
 * and no probability of being hired, because none of those could be honest from
 * four questions about someone's own account of their work.
 */

const OWNED_LABEL: Record<OwnedPart, string> = {
  discovery: "working out what was actually needed",
  design: "designing how it would work",
  coding: "writing the code",
  testing: "testing it",
  deployment: "deploying it",
  support: "supporting it once people used it",
  unsure: "",
};

const OWNED_CAPABILITY: Record<OwnedPart, string> = {
  discovery: "discovery",
  design: "shaping",
  coding: "implementation",
  testing: "evaluation",
  deployment: "production",
  support: "production",
  unsure: "",
};

const CARRIES: Record<string, string> = {
  discovery:
    "That is the same muscle an FDE uses on day one of an engagement, when the request and the real problem are not the same thing.",
  shaping:
    "FDE work adds one question to that: which parts genuinely need a model, and which are more reliable as ordinary software.",
  implementation:
    "FDE work is build work. The difference is that it happens against a customer's systems, data, and constraints rather than your own.",
  evaluation:
    "AI systems move that further forward. You have to decide what a good answer means for this customer before you can tell whether it is working.",
  production:
    "That experience transfers directly. An AI system that nobody is watching after launch is the most common way these projects quietly fail.",
  communication:
    "Explaining a system to the people who depend on it is most of the job once the code runs.",
};

const NEXT_STRETCH: Record<string, string> = {
  discovery:
    "You have not described sitting with the people doing the work to find out what they actually need. That is where FDE engagements start.",
  shaping:
    "Deciding what should and should not be an agent is a distinct skill, and it is the one that keeps projects out of trouble.",
  implementation:
    "Building the working system yourself is the part that turns advice into something that runs.",
  evaluation:
    "Deciding what good output means, and measuring it, is what separates a demo from something a customer will rely on.",
  production:
    "Owning the system after launch is where AI projects are won or lost, and it is the part most people have never done.",
  communication:
    "Writing a system up so someone else can judge it is the cheapest way to make your work legible.",
};

const ORDER = [
  "discovery",
  "shaping",
  "implementation",
  "evaluation",
  "production",
  "communication",
];

const DIRECTION_TEXT: Record<string, string> = {
  "building-systems": "Building the systems, close to the customer's problem",
  "working-with-customers":
    "Working directly with customers, with the technical depth to build what they need",
  "owning-delivery": "Owning a delivery end to end, from the first conversation to production",
  exploring: "Still deciding, and worth deciding from contact with the work",
};

function ownedParts(answers: PathAnswers): OwnedPart[] {
  return answers.owned.filter((part) => part !== "unsure");
}

/** The learner's own words for a given claim, so nothing is attributed to them falsely. */
function quoteFor(answers: PathAnswers, parts: OwnedPart[]): string {
  if (answers.example.trim()) return answers.example.trim();
  if (parts.length) {
    return `You selected: ${parts.map((part) => OWNED_LABEL[part]).filter(Boolean).join(", ")}.`;
  }
  return answers.contextNote.trim();
}

export function deterministicMapping(answers: PathAnswers): Mapping {
  const owned = ownedParts(answers);
  const seen = new Set<string>();
  const connections: Connection[] = [];

  for (const part of owned) {
    const id = OWNED_CAPABILITY[part];
    if (!id || seen.has(id)) continue;
    const cap = capability(id);
    if (!cap) continue;
    seen.add(id);
    connections.push({
      id: `conn-${id}`,
      capabilityId: id,
      capabilityLabel: cap.label,
      described: `You said you personally handled ${OWNED_LABEL[part]}.`,
      because: CARRIES[id] ?? "",
      quote: quoteFor(answers, owned),
    });
    if (connections.length >= 4) break;
  }

  // Nothing owned, but they described something anyway. That is still a real
  // connection and saying otherwise would be a worse reading of their answer
  // than the one they gave.
  if (!connections.length && answers.example.trim()) {
    const cap = capability("implementation");
    if (cap) {
      connections.push({
        id: "conn-example",
        capabilityId: "implementation",
        capabilityLabel: cap.label,
        described: "You described something you helped deliver.",
        because:
          "Having shipped anything at all, including coursework or a personal project, is a better starting point than reading about the work.",
        quote: answers.example.trim(),
      });
    }
  }

  const develop: DevelopArea[] = [];
  for (const id of ORDER) {
    if (seen.has(id) || develop.length >= 3) continue;
    const cap = capability(id);
    if (!cap) continue;
    develop.push({
      id: `dev-${id}`,
      capabilityId: id,
      capabilityLabel: cap.label,
      because: NEXT_STRETCH[id] ?? "",
    });
  }

  return { connections, develop, unknowns: openQuestions(answers) };
}

/**
 * What we did not ask, or they did not answer.
 *
 * Kept separate from the areas to develop, and labelled that way on screen. Not
 * knowing something about a person is not the same as that person having a gap,
 * and collapsing the two would let the guide invent weaknesses out of silence.
 */
export function openQuestions(answers: PathAnswers): OpenQuestion[] {
  const unknowns: OpenQuestion[] = [];
  if (!answers.example.trim()) {
    unknowns.push({
      id: "unknown-example",
      question: "What you have built or helped deliver, and what problem it addressed.",
    });
  }
  if (!ownedParts(answers).length) {
    unknowns.push({
      id: "unknown-owned",
      question: "Which parts of that work you personally owned.",
    });
  }
  if (!answers.direction || answers.direction === "exploring") {
    unknowns.push({
      id: "unknown-direction",
      question: "Which part of the work you want more of.",
    });
  }
  if (!answers.note.trim()) {
    unknowns.push({
      id: "unknown-time",
      question: "How much time you have, and anything else constraining the next few weeks.",
    });
  }
  for (const followUp of answers.followUps) {
    if (!followUp.answer.trim()) {
      unknowns.push({ id: `unknown-fu-${unknowns.length}`, question: followUp.question });
    }
  }
  return unknowns.slice(0, 5);
}

const PRIORITY: Record<string, Omit<Priority, "id" | "resources"> & { resourceIds: string[] }> = {
  discovery: {
    title: "See what the discovery half of the job looks like",
    why: "You have not described doing this part, and it is the half of FDE work that is least like the work you have already done.",
    action: "Read the role boundaries page, then write a one page problem brief for any workflow you actually know.",
    output: "A brief naming the user, the current workflow, the problem, and a useful outcome.",
    resourceIds: ["career-roles", "field-report"],
  },
  shaping: {
    title: "Learn to decide what should and should not be an agent",
    why: "Most of the damage in these projects is done at this decision, before anything is built.",
    action: "Work through the ten minute Agent System Design Coach lesson, answering in your own words.",
    output: "A short written design for one agent, naming the tools and where a human decides.",
    resourceIds: ["coach-lesson", "course-002"],
  },
  implementation: {
    title: "Build one small system that actually runs",
    why: "You have described the work around building more than the building itself, and the fastest way to close that is one real thing.",
    action: "Pick the smallest useful workflow you understand and build it end to end, badly, then improve one part.",
    output: "A running system you can demonstrate and describe.",
    resourceIds: ["course-001", "asd-practice"],
  },
  evaluation: {
    title: "Decide what good output means, then measure it",
    why: "This is the part that is specific to AI systems, and it is where confident looking work falls over.",
    action: "Take something you have built or read about and write down how you would know it is working.",
    output: "A short evaluation plan: what counts as correct, and how you would check it.",
    resourceIds: ["course-002", "failure-labs"],
  },
  production: {
    title: "Take one thing past the demo",
    why: "You have built things, and the next stretch is staying responsible for one after other people start using it.",
    action: "Run a failure lab and diagnose what actually broke, rather than guessing.",
    output: "A failure timeline naming the mechanism, not just the symptom.",
    resourceIds: ["failure-labs", "course-001"],
  },
  communication: {
    title: "Write one system up so a stranger can judge it",
    why: "Your work is only legible to the people who can read it, and right now nobody outside your team can.",
    action: "Use the Field Report structure on anything you have already built.",
    output: "A published write up: problem, design, failures, evidence, limits.",
    resourceIds: ["field-report", "career-interviews"],
  },
};

export function deterministicPlan(answers: PathAnswers, mapping: Mapping): Plan {
  const owned = ownedParts(answers);
  const direction =
    DIRECTION_TEXT[answers.direction ?? "exploring"] ?? DIRECTION_TEXT.exploring;

  const reason = answers.direction
    ? reasonFor(answers, owned)
    : "You have not settled on a direction yet, so this plan is built to give you contact with the work rather than to commit you to a specialism.";

  // Priorities come from the areas to develop, in the order the engagement
  // itself runs. Two people with different answers get different priorities
  // because the mapping that produced them is different.
  const ids = mapping.develop.map((item) => item.capabilityId).slice(0, 3);
  const chosen = ids.length ? ids : fallbackPriorityIds(answers);

  const priorities: Priority[] = chosen.map((id, index) => {
    const template = PRIORITY[id] ?? PRIORITY.discovery;
    return {
      id: `priority-${index + 1}-${id}`,
      title: template.title,
      why: template.why,
      action: template.action,
      output: template.output,
      resources: resources(template.resourceIds).slice(0, 2),
    };
  });

  return {
    direction,
    reason,
    priorities,
    milestone: milestoneFor(answers, owned),
    generatedAt: new Date().toISOString(),
    selfGuided: true,
  };
}

function reasonFor(answers: PathAnswers, owned: OwnedPart[]): string {
  if (answers.context === "student" && !owned.length) {
    return "You are early, and the useful move is contact with a real workflow rather than more reading. The plan below starts there.";
  }
  if (owned.includes("coding") && owned.includes("deployment")) {
    return "You have built and operated things, so the plan skips the build fundamentals and starts with the parts of FDE work that are not engineering: the customer half and the evaluation half.";
  }
  if (owned.includes("discovery") && !owned.includes("coding")) {
    return "You already work close to the customer. The plan is weighted toward implementation depth, which is what separates this role from the one you are in.";
  }
  return "The plan starts from what you said you have not done yet, in the order an engagement actually runs.";
}

function fallbackPriorityIds(answers: PathAnswers): string[] {
  if (answers.context === "student") return ["discovery", "implementation", "communication"];
  if (answers.context === "solutions") return ["implementation", "evaluation", "production"];
  return ["discovery", "evaluation", "communication"];
}

function milestoneFor(answers: PathAnswers, owned: OwnedPart[]): string | null {
  if (answers.direction === "working-with-customers" && !owned.includes("coding")) return null;
  return "Later, when the pieces above are real rather than planned, they come together in one agent you build and operate yourself.";
}

/**
 * At most three first steps, drawn from the plan the learner just read.
 *
 * Reading or writing counts. The first useful move for someone who has never
 * seen the work is not always to open an editor, and a guide that insists
 * otherwise is optimising for looking technical.
 */
export function firstStepOptions(plan: Plan): FirstStepOption[] {
  return plan.priorities.slice(0, 3).map((priority, index) => ({
    id: `step-${index + 1}`,
    task: priority.action,
    estimate: index === 0 ? "about 60 to 90 minutes" : "about 2 hours",
    output: priority.output,
    doneWhen: doneWhen(priority),
    bringBack: "Bring the output back here and we will work out what it tells you about the next step.",
  }));
}

function doneWhen(priority: Priority): string {
  return `Done when you can hand someone ${lowerFirst(priority.output)} and they can follow it without you explaining it.`;
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1).replace(/\.$/, "") : value;
}
