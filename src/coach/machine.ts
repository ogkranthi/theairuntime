import type { CoachResponse, CoachState, Lesson } from "./types";

/**
 * The curriculum, as a pure function.
 *
 * Nothing here touches the network, the clock, or the model. The model's reply
 * arrives as an argument and leaves as a suggestion: this decides what actually
 * happens, which is what keeps a bad or hostile model response from reordering,
 * skipping, or inventing a stage.
 */

/**
 * Per lesson ceiling on model calls.
 *
 * Six stages with at most one probe each is twelve turns, plus a little slack.
 * The endpoint is unauthenticated by design, the Workers AI daily allowance is
 * shared with FDE Gym through one [ai] binding, and this cap is what stops one
 * visitor from spending the whole day's allowance. It is enforceable only
 * because the state carrying it is signed.
 */
export const MAX_MODEL_CALLS = 14;

export type CoachPartKind = "say" | "principle" | "ask";

export interface CoachPart {
  kind: CoachPartKind;
  text: string;
}

export interface Decision {
  parts: CoachPart[];
  state: CoachState;
  done: boolean;
  /** True when the model did not shape this turn, so the UI can say so. */
  scripted: boolean;
}

export function initialState(lessonId: string, now: number): CoachState {
  return { lessonId, stageIndex: 0, probed: false, calls: 0, issuedAt: now };
}

export function stageOf(lesson: Lesson, state: CoachState) {
  return lesson.stages[state.stageIndex] ?? null;
}

export function isComplete(lesson: Lesson, state: CoachState): boolean {
  return state.stageIndex >= lesson.stages.length;
}

/**
 * Read a model reply, or decide it is unusable.
 *
 * There is no native structured output on this Workers AI plan, so the shape is
 * asked for in the prompt and has to be checked here. Anything unexpected
 * returns null rather than a partly trusted object, and null is a supported
 * path: the lesson simply falls back to its authored text.
 */
export function validateCoachResponse(raw: unknown): CoachResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (!message) return null;

  const action = value.action;
  if (action !== "probe" && action !== "teach_and_advance" && action !== "advance") {
    return null;
  }

  const detectedConcepts = Array.isArray(value.detectedConcepts)
    ? value.detectedConcepts
        .filter((item): item is string => typeof item === "string")
        .slice(0, 12)
    : undefined;

  // A model that runs long is still usable, it just gets trimmed. Losing the
  // whole turn over length would drop the learner into the scripted path for a
  // reply that was merely wordy.
  return { message: message.slice(0, 1200), action, detectedConcepts };
}

/**
 * Advance the lesson by one learner turn.
 *
 * `response` is null when the model was unreachable, unparseable, or over the
 * call ceiling. That is not an error state: it produces the authored teaching
 * point and moves on, so a lesson with no model at all still delivers all six
 * stages in order.
 */
export function decide(
  lesson: Lesson,
  state: CoachState,
  response: CoachResponse | null,
): Decision {
  const stage = stageOf(lesson, state);
  if (!stage) {
    return { parts: [], state, done: true, scripted: true };
  }

  // One probe per stage, ever. A learner who is stuck gets taught, not asked
  // again, and the second ask cannot be reintroduced by the model deciding it
  // wants another go.
  const wantsProbe = response?.action === "probe" && !state.probed;

  if (wantsProbe && response) {
    return {
      parts: [{ kind: "ask", text: response.message }],
      state: { ...state, probed: true },
      done: false,
      scripted: false,
    };
  }

  const advanced: CoachState = {
    ...state,
    stageIndex: state.stageIndex + 1,
    probed: false,
  };
  const done = isComplete(lesson, advanced);
  const next = lesson.stages[advanced.stageIndex];

  const parts: CoachPart[] = [];
  if (response) parts.push({ kind: "say", text: response.message });
  parts.push({ kind: "principle", text: stage.teachingPoint });
  if (!done && next) parts.push({ kind: "ask", text: next.initialPrompt });

  return { parts, state: advanced, done, scripted: !response };
}

/**
 * The scripted probe, for the degraded path.
 *
 * Only reached when the model is unavailable and the learner has answered the
 * opening question. Kept separate from decide() so the fallback stays a
 * deliberate choice at the call site rather than a hidden branch.
 */
export function scriptedProbe(lesson: Lesson, state: CoachState): Decision | null {
  const stage = stageOf(lesson, state);
  if (!stage || state.probed) return null;
  return {
    parts: [{ kind: "ask", text: stage.probe }],
    state: { ...state, probed: true },
    done: false,
    scripted: true,
  };
}
