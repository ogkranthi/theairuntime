import type { D1Database } from '@cloudflare/workers-types';
import type { ChatEnv } from '../coach-chat/types';
export interface AccountEnv extends ChatEnv {
  FDE_COACH_ACCOUNTS_ENABLED?: string;
  COACH_DB?: D1Database;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_JWT_KEY?: string;
  CLERK_ISSUER?: string;
  COACH_ALLOWED_ORIGIN?: string;
  COACH_IDENTITY_KEY?: string;
  COACH_DAILY_RESPONSES?: string;
  COACH_DAILY_REQUESTS?: string;
  FDE_COACH_METRICS_ENABLED?: string;
  COACH_METRICS?: { writeDataPoint(event: { indexes: string[]; blobs: string[]; doubles: number[] }): void };
  COACH_MODEL_PRICES_JSON?: string;
}
export type Account = { id: string; generation: string; background: string; goal: string; created: number; updated: number; deleted: number };
export const DAY = 86_400_000;
export const RETENTION = 90 * DAY;
export function configuredLimit(value: string | undefined, fallback: number, max: number) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < 0 || n > max) throw new Error('Invalid quota configuration');
  return n;
}
