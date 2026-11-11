import { lessonById, VENDOR_RESEARCH_AGENT } from "../coach/lesson";
import { COUNTERPARTY_DUE_DILIGENCE } from "../fde-gym/scenario";
import type { StartRequest } from "../fde-gym/types";
import { AdmissionError } from "./types";

function fields(body: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw new AdmissionError(400, "Invalid start options.");
  }
}
function option<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if (!allowed.includes(value as T)) throw new AdmissionError(400, "Invalid interview options.");
  return value as T;
}

/** Pure validation shared by pre-admission and session construction. */
export function validateCoachStart(body: Record<string, unknown>) {
  fields(body, ["lessonId"]);
  if (body.lessonId !== undefined && typeof body.lessonId !== "string") {
    throw new AdmissionError(400, "Invalid lesson.");
  }
  const id = body.lessonId === undefined ? VENDOR_RESEARCH_AGENT.id : (body.lessonId as string).trim();
  const lesson = lessonById(id);
  if (!lesson) throw new AdmissionError(400, "That lesson does not exist.");
  return lesson;
}

export function validateGymStart(body: Record<string, unknown>): StartRequest {
  fields(body, ["mode", "durationMinutes", "level", "drillId", "researchConsent", "confidentialityAcknowledged"]);
  if (body.researchConsent !== true || body.confidentialityAcknowledged !== true) {
    throw new AdmissionError(400, "Research consent and confidentiality acknowledgement are required.");
  }
  const mode = option(body.mode, ["practice", "mock"] as const, "mock");
  const level = option(body.level, ["foundations", "fde", "senior"] as const, "fde");
  const durationMinutes = option(body.durationMinutes, [15, 30] as const, 30);
  const drill = body.drillId;
  if (drill !== undefined && drill !== null &&
      (typeof drill !== "string" || !COUNTERPARTY_DUE_DILIGENCE.drills.some(item => item.id === drill))) {
    throw new AdmissionError(400, "Invalid interview drill.");
  }
  return { mode, level, durationMinutes,
    drillId: durationMinutes === 15 ? (drill as string | undefined) ?? COUNTERPARTY_DUE_DILIGENCE.drills[0]?.id ?? null : null,
    researchConsent: true, confidentialityAcknowledged: true };
}
