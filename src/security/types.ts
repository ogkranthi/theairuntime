import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import type { ChatMetadata } from "../coach-chat/types";
import type { InterviewSession } from "../fde-gym/types";

export type SecurityNamespace = Pick<DurableObjectNamespace, "idFromName" | "get">;
export interface SecurityExecution {
  sessionId: string;
  accessToken?: string;
  expiresAt: number;
  revision: number;
  canonicalSession?: InterviewSession;
  attemptCount?: number;
  /** Trusted per-call deadline, captured before grant RPC; never request JSON. */
  modelDeadlineMs?: number;
  metadata?: ChatMetadata;
  saveSession(session: InterviewSession): void;
}
export interface SecurityEnv {
  AI_SECURITY?: SecurityNamespace;
  /** Created inside the Worker only, never populated from request JSON. */
  securityExecution?: SecurityExecution;
}
export const LIMITS = {
  dailyAttempts: 500,
  coachAttempts: 14,
  chatAttempts: 20,
  chatTurns: 10,
  gymAttempts: 82,
  coachTurns: 12,
  gymTurns: 40,
  startsPerHour: 12,
  startsPerDay: 200,
  operationsPerSession: 64,
  reservationMs: 120_000,
} as const;
export interface Lease {
  sessionId: string;
  operationId: string;
  nonce: string;
}
export interface Admission extends Lease {
  revision: number;
  head: string | null;
  expiresAt: number;
  replay?: string;
  pending?: boolean;
}
export class AdmissionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
