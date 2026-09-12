import type { KvBinding, WorkersAiBinding } from "../fde-gym/types";

/**
 * Find my FDE path.
 *
 * A five stage guide: understand the role, describe your experience, review
 * what carries over, read a short plan, choose one first step.
 *
 * Two rules shape every type here. Nothing claims to measure the learner, and
 * nothing claims evidence the learner did not supply. An interview about
 * someone's experience tells you what they say they did, which is worth a lot
 * and is not the same as proof they can do it.
 */

export type CurrentContext =
  | "student"
  | "software-developer"
  | "solutions"
  | "other";

export type OwnedPart =
  | "discovery"
  | "design"
  | "coding"
  | "testing"
  | "deployment"
  | "support"
  | "unsure";

export type Direction =
  | "building-systems"
  | "working-with-customers"
  | "owning-delivery"
  | "exploring";

/** Everything the learner told us. Every field can be empty or unknown. */
export interface PathAnswers {
  context: CurrentContext | null;
  contextNote: string;
  /** Something they built or helped deliver, and the problem it addressed. */
  example: string;
  owned: OwnedPart[];
  direction: Direction | null;
  /** Time, constraints, anything else. "I don't know yet" is a valid answer. */
  note: string;
  /** Answers to at most two follow-up questions. */
  followUps: Array<{ question: string; answer: string }>;
}

/** An FDE capability, from the curated catalog. Never model invented. */
export interface Capability {
  id: string;
  label: string;
  /** What this looks like in the work, in one line. */
  summary: string;
}

export interface Resource {
  id: string;
  title: string;
  href: string;
  /** Why this one, not a description of what it is. */
  why: string;
  /** External links carry a review date so a stale link is visible. */
  reviewed?: string;
  external?: boolean;
}

/**
 * One thing the learner described, connected to one capability.
 *
 * `quote` is the learner's own words and is verified against their answers
 * before it ever reaches the screen. A connection whose quote cannot be found
 * in what they actually wrote is dropped rather than shown, because the whole
 * value of "Based on your answer" is that it is true.
 */
export interface Connection {
  id: string;
  capabilityId: string;
  capabilityLabel: string;
  /** What they described, in our words. */
  described: string;
  /** Why the one may carry to the other. Hedged on purpose. */
  because: string;
  /** Their exact words, found in their answers. */
  quote: string;
}

export interface DevelopArea {
  id: string;
  capabilityId: string;
  capabilityLabel: string;
  /** Grounded in something they said, not in what they omitted. */
  because: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
}

export interface Mapping {
  connections: Connection[];
  develop: DevelopArea[];
  unknowns: OpenQuestion[];
}

export interface Priority {
  id: string;
  title: string;
  /** Why this, for this person. */
  why: string;
  action: string;
  output: string;
  resources: Resource[];
}

export interface Plan {
  /** Work they want to do, not a job title. */
  direction: string;
  reason: string;
  priorities: Priority[];
  /** The optional later milestone, when one fits. */
  milestone: string | null;
  generatedAt: string;
  /** True when this plan came from the catalog alone, with no model. */
  selfGuided: boolean;
}

export interface FirstStepOption {
  id: string;
  task: string;
  /** Labelled an estimate wherever it is shown. */
  estimate: string;
  output: string;
  doneWhen: string;
  bringBack: string;
}

export interface FdePathEnv {
  AI?: WorkersAiBinding;
  /** Reused from FDE Gym for a per IP throttle only. No answers are stored. */
  FDE_GYM_SESSIONS?: KvBinding;
  FDE_GYM_INTERVIEW_MODEL?: string;
}
