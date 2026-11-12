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
  FDE_COACH_CHAT_ENABLED?: string;
  FDE_COACH_CHAT_MODEL?: string;
}
export type ChatSource = { id: string; title: string; href: string; excerpt: string; contentHash: string };
export interface ChatReply {
  token: string; goal: ChatGoal; turn: number; remainingTurns: number;
  mode: 'intake' | 'ai' | 'fallback'; answer: string; question: string;
  gaps: { gap: string; evidence: string }[];
  nextStep: { task: string; definitionOfDone: string } | null;
  sources: ChatSource[]; done: boolean;
}
export interface ChatMetadata {
  templateId: string; promptVersion: string; retrievalVersion: string; resourceIds: string[];
  model: string | null; attempts: number; latencyMs: number; tokens: number | null; usageComplete: boolean;
  outcome: 'intake' | 'ai' | 'fallback'; errorCategory: string | null;
}
