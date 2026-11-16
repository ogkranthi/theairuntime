import { createRequestClient, requestJson } from '../coach/api';
import { validateChatReply, type ChatGoal, type HistoryTurn } from './chat-api';
export type Usage = { used: number; reserved: number; remaining: number; limit: number; resetsAt: number };
export type AccountInfo = { profile: { background: string; goal: string }; usage: Usage; conversations: { id: string; goal: string; revision: number; updated: number }[] };
export type TokenProvider = () => Promise<string>;
export function createAccountClient(token: TokenProvider) {
  const headers = async () => ({ authorization: `Bearer ${await token()}` });
  const transport = createRequestClient(v => validateChatReply(v, true), headers);
  return { ...transport,
    start: (goal: ChatGoal, signal?: AbortSignal) => transport.post('/api/coach-account/start', { goal }, signal),
    message: (state: string, message: string, _history: HistoryTurn[], signal?: AbortSignal) => {
      const [, conversationId, revision] = state.split('.');
      return transport.post('/api/coach-account/message', { conversationId, revision: Number(revision), message }, signal);
    },
  };
}
export async function accountRequest<T>(token: TokenProvider, action: string, body?: unknown): Promise<T> {
  return requestJson(`/api/coach-account/${action}`, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, v => v as T);
}
