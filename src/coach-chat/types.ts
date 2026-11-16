import type { CoachEnv } from '../coach/types';
export const GOALS = ['become','interview','skills','design','review','plan','story','general'] as const;
export type ChatGoal = typeof GOALS[number];
export type Profile = { background: string; example: string; focus: string };
export type HistoryTurn = { role: 'learner' | 'coach'; text: string };
export interface ChatState {
  version: 1; sessionId: string; revision: number; issuedAt: number; expiresAt: number;
  goal: ChatGoal; turn: number; profile: Profile; lastTask: string;
}
export interface ChatEnv extends CoachEnv {
  FDE_COACH_ACCOUNTS_ENABLED?: string;
  FDE_COACH_CHAT_ENABLED?: string;
  FDE_COACH_CHAT_MODEL?: string;
}
export type ChatSource = { id: string; title: string; href: string; excerpt: string; contentHash: string };
export interface ChatReply {
  responseId?: string;
  feedback?: { rating: 'helpful'|'unhelpful'|'incorrect'|null; completed: boolean };
  token: string; goal: ChatGoal; turn: number; remainingTurns: number;
  mode: 'intake' | 'ai' | 'fallback'; answer: string; question: string;
  gaps: { gap: string; evidence: string }[];
  nextStep: { task: string; definitionOfDone: string } | null;
  sources: ChatSource[]; done: boolean;
}
export interface ChatMetadata {
  attemptDetails?: { slot: number; model: string; executed: boolean; latencyMs: number; tokens: number | null; inputTokens: number | null; outputTokens: number | null; error: string | null }[];
  templateId: string; promptVersion: string; retrievalVersion: string; resourceIds: string[];
  model: string | null; attempts: number; latencyMs: number; tokens: number | null; usageComplete: boolean;
  outcome: 'intake' | 'ai' | 'fallback'; errorCategory: string | null;
}
