/**
 * Find my FDE path, saved in this browser.
 *
 * No account, no server copy, no analytics. Everything the learner typed stays
 * on their machine, which is the honest reading of a guide that asks people to
 * describe work they may not be able to share.
 *
 * Follows the shape of asd-progress.ts: versioned, migrated field by field,
 * and every accessor wrapped, because blocked storage should quietly cost the
 * learner their history rather than the page.
 */

export const STORAGE_KEY = "air-fde-path";
export const SCHEMA_VERSION = 1;
/** Bump when the wording of the processing notice changes. */
export const NOTICE_VERSION = "2026-09-12";

export type StageNumber = 1 | 2 | 3 | 4 | 5;

export type ProcessingChoice = "ai" | "self";

export interface Consent {
  choice: ProcessingChoice;
  at: string;
  noticeVersion: string;
}

export interface StoredAnswers {
  context: string | null;
  contextNote: string;
  example: string;
  owned: string[];
  direction: string | null;
  note: string;
  followUps: Array<{ question: string; answer: string }>;
}

export interface StoredConnection {
  id: string;
  capabilityId: string;
  capabilityLabel: string;
  described: string;
  because: string;
  quote: string;
}

export interface StoredDevelop {
  id: string;
  capabilityId: string;
  capabilityLabel: string;
  because: string;
}

export interface StoredMapping {
  connections: StoredConnection[];
  develop: StoredDevelop[];
  unknowns: Array<{ id: string; question: string }>;
}

export interface StoredResource {
  id: string;
  title: string;
  href: string;
  why: string;
  reviewed?: string;
  external?: boolean;
}

export interface StoredPriority {
  id: string;
  title: string;
  why: string;
  action: string;
  output: string;
  resources: StoredResource[];
}

export interface StoredPlan {
  direction: string;
  reason: string;
  priorities: StoredPriority[];
  milestone: string | null;
  generatedAt: string;
  selfGuided: boolean;
}

export interface StoredStep {
  id: string;
  task: string;
  estimate: string;
  output: string;
  doneWhen: string;
  bringBack: string;
}

export interface PathState {
  schemaVersion: number;
  stage: StageNumber;
  answers: StoredAnswers;
  consent: Consent | null;
  mapping: StoredMapping | null;
  /** Connections and areas the learner said do not fit. Never silently restored. */
  removedIds: string[];
  /** The learner confirmed the mapping. Required before a plan is generated. */
  confirmed: boolean;
  plan: StoredPlan | null;
  /** Kept when a plan is replaced, so regenerating is not destructive. */
  previousPlan: StoredPlan | null;
  steps: StoredStep[];
  chosenStepId: string | null;
  chosenAt: string | null;
  completedAt: string | null;
  completionNote: string;
  updatedAt: string;
}

export function emptyAnswers(): StoredAnswers {
  return {
    context: null,
    contextNote: "",
    example: "",
    owned: [],
    direction: null,
    note: "",
    followUps: [],
  };
}

export function empty(): PathState {
  return {
    schemaVersion: SCHEMA_VERSION,
    stage: 1,
    answers: emptyAnswers(),
    consent: null,
    mapping: null,
    removedIds: [],
    confirmed: false,
    plan: null,
    previousPlan: null,
    steps: [],
    chosenStepId: null,
    chosenAt: null,
    completedAt: null,
    completionNote: "",
    updatedAt: "",
  };
}

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function migrateAnswers(raw: unknown): StoredAnswers {
  const base = emptyAnswers();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Record<string, unknown>;
  return {
    context: typeof value.context === "string" ? value.context : null,
    contextNote: str(value.contextNote),
    example: str(value.example),
    owned: strings(value.owned),
    direction: typeof value.direction === "string" ? value.direction : null,
    note: str(value.note),
    followUps: Array.isArray(value.followUps)
      ? value.followUps
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({ question: str(item.question), answer: str(item.answer) }))
          .filter((item) => item.question)
      : [],
  };
}

/**
 * Bring any stored shape up to the current schema.
 *
 * Field by field rather than all or nothing, so a future version can add keys
 * without throwing away someone's half finished journey.
 */
export function migrate(raw: unknown): PathState {
  const base = empty();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<PathState> & Record<string, unknown>;

  const stage = Number(value.stage);
  return {
    schemaVersion: SCHEMA_VERSION,
    stage: (stage >= 1 && stage <= 5 ? stage : 1) as StageNumber,
    answers: migrateAnswers(value.answers),
    consent:
      value.consent && typeof value.consent === "object"
        ? {
            choice: (value.consent as Consent).choice === "self" ? "self" : "ai",
            at: str((value.consent as Consent).at),
            noticeVersion: str((value.consent as Consent).noticeVersion),
          }
        : null,
    mapping: (value.mapping as StoredMapping) ?? null,
    removedIds: strings(value.removedIds),
    confirmed: value.confirmed === true,
    plan: (value.plan as StoredPlan) ?? null,
    previousPlan: (value.previousPlan as StoredPlan) ?? null,
    steps: Array.isArray(value.steps) ? (value.steps as StoredStep[]) : [],
    chosenStepId: typeof value.chosenStepId === "string" ? value.chosenStepId : null,
    chosenAt: typeof value.chosenAt === "string" ? value.chosenAt : null,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    completionNote: str(value.completionNote),
    updatedAt: str(value.updatedAt),
  };
}

export function isAvailable(): boolean {
  try {
    const probe = "__air_path_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function read(): PathState {
  try {
    return migrate(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return empty();
  }
}

/**
 * Write, and say whether it worked.
 *
 * The caller shows "Saved" only on true. A guide that claims to have saved
 * someone's plan and has not is worse than one that admits it cannot.
 */
export function write(state: PathState): boolean {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function reset(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Is there a journey worth resuming? Drives the "Continue my path" entry point. */
export function hasJourney(state: PathState): boolean {
  return Boolean(
    state.chosenStepId ||
      state.plan ||
      state.mapping ||
      state.answers.example.trim() ||
      state.answers.context,
  );
}
