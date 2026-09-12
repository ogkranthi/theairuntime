import { capability, resource } from "./catalog";
import type { Mapping, PathAnswers, Plan, Priority } from "./types";

/**
 * What the model is allowed to change.
 *
 * Every function here takes a deterministic baseline and merges the model's
 * answer onto it. The model can phrase things better than the catalog can. It
 * cannot add a capability that does not exist, cite a resource that does not
 * exist, or attribute words to the learner that the learner did not write.
 *
 * The last one is the important one. "Based on your answer" is the whole claim
 * this feature makes, so a quote is checked against what the person actually
 * typed before it can reach the screen.
 */

const MIN_QUOTE = 12;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

/** Everything the learner wrote, as one haystack. */
export function learnerText(answers: PathAnswers): string {
  return [
    answers.contextNote,
    answers.example,
    answers.note,
    ...answers.followUps.map((item) => item.answer),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The learner's own words, or nothing.
 *
 * A quote the model paraphrased, embellished, or invented returns null, and the
 * caller drops that connection rather than showing a fabricated excerpt under a
 * label that promises it came from the learner. Very short quotes are refused
 * too: "I built" appears in half of all answers and proves nothing.
 */
export function verifyQuote(answers: PathAnswers, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const quote = raw.trim();
  if (quote.length < MIN_QUOTE) return null;

  const needle = normalize(quote);
  const haystack = normalize(learnerText(answers));
  if (!needle || !haystack.includes(needle)) return null;

  return quote.slice(0, 400);
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Merge a model mapping onto the deterministic one.
 *
 * Connections survive only with a verified quote and a real capability. The
 * open questions are never taken from the model: they are a factual statement
 * about which fields are empty, and a model guessing at them would turn
 * "we did not ask" into "you did not know".
 */
export function mergeMapping(raw: unknown, answers: PathAnswers, baseline: Mapping): Mapping {
  if (!raw || typeof raw !== "object") return baseline;
  const value = raw as Record<string, unknown>;

  const connections: Mapping["connections"] = [];
  for (const item of asArray(value.connections)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const cap = capability(clean(entry.capabilityId, 40));
    const quote = verifyQuote(answers, entry.quote);
    const described = clean(entry.described, 260);
    const because = clean(entry.because, 320);
    if (!cap || !quote || !described || !because) continue;
    connections.push({
      id: `conn-${cap.id}-${connections.length}`,
      capabilityId: cap.id,
      capabilityLabel: cap.label,
      described,
      because,
      quote,
    });
    if (connections.length >= 4) break;
  }

  const develop: Mapping["develop"] = [];
  for (const item of asArray(value.develop)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const cap = capability(clean(entry.capabilityId, 40));
    const because = clean(entry.because, 320);
    if (!cap || !because) continue;
    if (connections.some((existing) => existing.capabilityId === cap.id)) continue;
    develop.push({
      id: `dev-${cap.id}-${develop.length}`,
      capabilityId: cap.id,
      capabilityLabel: cap.label,
      because,
    });
    if (develop.length >= 3) break;
  }

  return {
    connections: connections.length ? connections : baseline.connections,
    develop: develop.length ? develop : baseline.develop,
    unknowns: baseline.unknowns,
  };
}

/**
 * Merge a model plan onto the deterministic one.
 *
 * Resources are resolved from the catalog by id and anything unrecognised is
 * dropped, so the plan cannot contain a link the model wrote. A priority that
 * ends up with no resources borrows the baseline's, because a priority with no
 * way to act on it is not a priority.
 */
export function mergePlan(raw: unknown, baseline: Plan): Plan {
  if (!raw || typeof raw !== "object") return baseline;
  const value = raw as Record<string, unknown>;

  const priorities: Priority[] = [];
  for (const item of asArray(value.priorities)) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const title = clean(entry.title, 120);
    const why = clean(entry.why, 320);
    const action = clean(entry.action, 320);
    const output = clean(entry.output, 220);
    if (!title || !why || !action || !output) continue;

    const picked = asArray(entry.resourceIds)
      .map((id) => resource(clean(id, 60)))
      .filter((found): found is NonNullable<typeof found> => found !== null)
      .slice(0, 2);

    const fallbackResources = baseline.priorities[priorities.length]?.resources ?? [];
    priorities.push({
      id: `priority-${priorities.length + 1}`,
      title,
      why,
      action,
      output,
      resources: picked.length ? picked : fallbackResources,
    });
    if (priorities.length >= 3) break;
  }

  const direction = clean(value.direction, 160);
  const reason = clean(value.reason, 400);

  return {
    direction: direction || baseline.direction,
    reason: reason || baseline.reason,
    priorities: priorities.length >= 2 ? priorities : baseline.priorities,
    milestone: clean(value.milestone, 320) || baseline.milestone,
    generatedAt: new Date().toISOString(),
    selfGuided: false,
  };
}

/**
 * At most two follow-up questions for the whole intake.
 *
 * The budget is deliberate. A guide that keeps asking is a guide that has not
 * decided what it needs, and the learner came here for an answer rather than an
 * interview.
 */
export function validateFollowUps(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const value = raw as Record<string, unknown>;
  return asArray(value.questions)
    .map((item) => clean(item, 220))
    .filter((question) => question.length > 12 && question.includes("?"))
    .slice(0, 2);
}
