import type { SecurityEnv } from "../security/types";
import type { KvBinding, WorkersAiBinding } from "../fde-gym/types";

/**
 * Agent System Design Coach.
 *
 * One authored lesson, six stages, taught by asking rather than telling. The
 * curriculum is data and the model is an enhancement on top of it: every stage
 * carries its own opening question, its own probe, and its own teaching point,
 * so the lesson still runs end to end when the model is unavailable.
 */

export interface LessonStage {
  id: string;
  title: string;
  /** What the learner should walk away understanding. Sent to the model. */
  objective: string;
  /** The question that opens the stage. Authored, never generated. */
  initialPrompt: string;
  /** Ideas that count as getting it. Sent to the model to judge against. */
  concepts: string[];
  /** The single follow-up when the answer is thin. Used verbatim when the model is unavailable. */
  probe: string;
  /** The principle, stated plainly. The floor the lesson never drops below. */
  teachingPoint: string;
}

export interface SummaryLine {
  label: string;
  body: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  /** The situation, restated to the model on every turn. */
  scenario: string;
  stages: LessonStage[];
  /** The six decisions, replayed at the end. */
  recap: SummaryLine[];
  /** The closing design summary. Deterministic structure, no score. */
  design: SummaryLine[];
  takeaway: string;
}

/**
 * What the model is asked to return.
 *
 * `action` is a proposal, not a decision. The server owns the stage index and
 * decides whether to honour it, so a compromised or confused response can
 * change the wording of a turn but never the shape of the lesson.
 */
export interface CoachResponse {
  message: string;
  action: "probe" | "teach_and_advance" | "advance";
  detectedConcepts?: string[];
}

/** Client-held signed position. Signing prevents edits, not replay. */
export interface CoachState {
  sessionId?: string;
  revision?: number;
  lessonId: string;
  stageIndex: number;
  /** Whether the current stage has already used its one probe. */
  probed: boolean;
  /** Logical model turns. Physical attempts are enforced by AI_SECURITY. */
  calls: number;
  issuedAt: number;
}

export interface CoachEnv extends SecurityEnv {
  AI?: WorkersAiBinding;
  /**
   * Shared KV retention for short-lived replay responses and aggregate stage
   * counters. No raw Coach learner turns are written.
   */
  FDE_GYM_SESSIONS?: KvBinding;
  FDE_GYM_INTERVIEW_MODEL?: string;
  /** HMAC key for the state token. Set with `npx wrangler secret put`. */
  COACH_TOKEN_SECRET?: string;
}

export interface CoachTurn {
  role: "coach" | "learner";
  text: string;
}
