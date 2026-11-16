/**
 * Open Engineering Apprenticeship: pure, author-controlled mission protocol.
 * NOT a network security boundary. A Worker route must authenticate signed state,
 * enforce replay/quotas and keep the authoring pack server-side before use.
 */
export const PHASES = ["decide", "defend", "break", "prove", "transfer"] as const;
export type Phase = (typeof PHASES)[number];

export interface MissionPhase {
  id: Phase;
  coachQuestion: string;
  simulatedTeammate?: { label: string; proposal: string };
  inject?: { label: string; text: string };
}
export interface MissionSpec {
  id: string;
  version: string;
  title: string;
  fictional: true;
  brief: { customer: string; system: string; stakes: string; constraints: string[] };
  phases: MissionPhase[];
  transferVariantIds: string[];
}
export interface TransferSpec {
  id: string;
  parentMission: string;
  brief: string;
  prompt: string;
}
export interface AnswerRecord {
  phase: Phase;
  answer: string;
  assisted: boolean;
}
export interface MissionState {
  protocolVersion: 1;
  missionId: string;
  missionVersion: string;
  transferId: string;
  phaseIndex: number;
  revision: number;
  answers: AnswerRecord[];
}
export interface Submission {
  expectedRevision: number;
  phase: Phase;
  answer: string;
}

const fail = (message: string): never => { throw new Error(message); };
function assertCompatible(mission: MissionSpec, transfer: TransferSpec): void {
  if (!mission || mission.fictional !== true || !mission.id || !mission.version || !mission.title) fail("A reviewed fictional mission is required.");
  if (!Array.isArray(mission.phases) || mission.phases.length !== PHASES.length ||
      mission.phases.some((step, i) => step.id !== PHASES[i] || !step.coachQuestion)) fail("Mission phases must be authored in protocol order.");
  if (!transfer || transfer.parentMission !== mission.id || !mission.transferVariantIds.includes(transfer.id) || !transfer.brief || !transfer.prompt)
    fail("The authored transfer case must belong to this mission.");
}
function assertState(mission: MissionSpec, transfer: TransferSpec, state: MissionState): void {
  assertCompatible(mission, transfer);
  if (!state || state.protocolVersion !== 1 || state.missionId !== mission.id || state.missionVersion !== mission.version || state.transferId !== transfer.id ||
      !Number.isInteger(state.phaseIndex) || state.phaseIndex < 0 || state.phaseIndex > PHASES.length ||
      state.revision !== state.phaseIndex || !Array.isArray(state.answers) || state.answers.length !== state.phaseIndex ||
      state.answers.some((answer, i) => answer.phase !== PHASES[i] || !answer.answer))
    fail("Mission state is invalid or belongs to a different version.");
}
export function startMission(mission: MissionSpec, transfer: TransferSpec): MissionState {
  assertCompatible(mission, transfer);
  return { protocolVersion: 1, missionId: mission.id, missionVersion: mission.version,
    transferId: transfer.id, phaseIndex: 0, revision: 0, answers: [] };
}
/** Only return the currently releasable public step, not the expert rubric. */
export function visibleStep(mission: MissionSpec, transfer: TransferSpec, state: MissionState) {
  assertState(mission, transfer, state);
  if (state.phaseIndex === PHASES.length) return { phase: "complete" as const, prompt: "Mission completed.", hintsAllowed: false };
  const step = mission.phases[state.phaseIndex];
  if (step.id === "transfer") {
    return { phase: step.id, prompt: transfer.prompt, brief: transfer.brief,
      assessmentMode: "unassisted" as const, hintsAllowed: false };
  }
  return { phase: step.id, prompt: step.coachQuestion,
    ...(step.id === "decide" ? { brief: mission.brief } : {}),
    ...(step.id === "break" && step.simulatedTeammate ? { simulatedTeammate: step.simulatedTeammate } : {}),
    ...(step.id === "break" && step.inject ? { inject: step.inject } : {}),
    hintsAllowed: step.id !== "decide" };
}
/** Caller must pass trusted signed state; this function does not authenticate it. */
export function submitDecision(mission: MissionSpec, transfer: TransferSpec, state: MissionState, submission: Submission, serverAssistanceUsed = false): MissionState {
  assertState(mission, transfer, state);
  if (state.phaseIndex >= PHASES.length) return fail("This mission is already complete.");
  if (!submission || submission.expectedRevision !== state.revision || submission.phase !== PHASES[state.phaseIndex])
    return fail("The submitted phase or revision is stale or out of order.");
  if (typeof submission.answer !== "string" || submission.answer.trim().length < 10 || submission.answer.length > 2000)
    return fail("Explain your decision in 10–2000 characters.");
  if (submission.phase === "transfer" && serverAssistanceUsed) return fail("Transfer must be attempted without coaching hints.");
  return {
    ...state, phaseIndex: state.phaseIndex + 1, revision: state.revision + 1,
    answers: [...state.answers, { phase: submission.phase, answer: submission.answer.trim(), assisted: Boolean(serverAssistanceUsed) }],
  };
}
/** Self-reported portable record; never a certificate or validated hiring score. */
export function decisionRecord(mission: MissionSpec, transfer: TransferSpec, state: MissionState) {
  assertState(mission, transfer, state);
  if (state.phaseIndex !== PHASES.length) return fail("Complete the unassisted transfer before exporting.");
  return { format: "theairuntime-decision-record-v0", title: mission.title,
    missionId: mission.id, missionVersion: mission.version, transferId: transfer.id,
    fictional: true, verification: "self-reported-not-independently-verified" as const,
    answers: state.answers.map(a => ({ ...a })),
    limitations: "This records submitted reasoning and assistance, not employment readiness or an independently verified assessment." };
}
