import { AdmissionError } from '../security/types';
import type { Account, AccountEnv } from './types';
import { RETENTION } from './types';
export async function account(env: AccountEnv, id: string, create = false): Promise<Account> {
  const db = env.COACH_DB!, now = Date.now();
  if (create) await db.prepare(`INSERT INTO coach_accounts(id,generation,created,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(id, crypto.randomUUID(), now, now).run();
  const row = await db.prepare('SELECT * FROM coach_accounts WHERE id=?').bind(id).first<Account>();
  if (!row || row.deleted) throw new AdmissionError(410, 'Your Coach data was deleted.');
  return row;
}
export async function conversation(env: AccountEnv, owner: string, id: unknown) {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) throw new AdmissionError(404, 'Conversation unavailable.');
  const row = await env.COACH_DB!.prepare('SELECT * FROM coach_conversations WHERE id=? AND owner=? AND expires>?').bind(id, owner, Date.now()).first<{ id: string; goal: string; revision: number; state: string; generation: string }>();
  if (!row) throw new AdmissionError(404, 'Conversation unavailable.');
  return row;
}
export async function purgeExpired(env: AccountEnv) {
  // Bounded cleanup in addition to query-time expiry. Operator sweep handles dormant data.
  await env.COACH_DB!.prepare('DELETE FROM coach_conversations WHERE id IN (SELECT id FROM coach_conversations WHERE expires<=? LIMIT 50)').bind(Date.now()).run();
  await env.COACH_DB!.prepare('DELETE FROM coach_accounts WHERE id IN (SELECT id FROM coach_accounts WHERE deleted>0 AND deleted<=? LIMIT 50)').bind(Date.now()-RETENTION).run();
  if (env.FDE_COACH_METRICS_ENABLED === 'true') await env.COACH_DB!.batch([
    env.COACH_DB!.prepare('DELETE FROM coach_activity WHERE day<?').bind(new Date(Date.now()-35*86_400_000).toISOString().slice(0,10)),
    env.COACH_DB!.prepare('DELETE FROM coach_monthly_activity WHERE month<?').bind(new Date(Date.now()-62*86_400_000).toISOString().slice(0,7)),
  ]).catch(() => undefined);
}
export async function exportAccount(env: AccountEnv, owner: string) {
  const profile = await account(env, owner);
  const conversations = await env.COACH_DB!.prepare('SELECT id,goal,revision,created,updated,expires FROM coach_conversations WHERE owner=? AND expires>? ORDER BY updated DESC').bind(owner, Date.now()).all();
  const messages = await env.COACH_DB!.prepare('SELECT m.conversation,m.revision,m.question,m.response,m.metadata,m.created FROM coach_messages m JOIN coach_conversations c ON c.id=m.conversation WHERE m.owner=? AND c.owner=? AND c.expires>? ORDER BY m.created').bind(owner, owner, Date.now()).all();
  const feedback = await env.COACH_DB!.prepare('SELECT operation,rating,completed,updated FROM coach_feedback WHERE owner=?').bind(owner).all();
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), profile: { background: profile.background, goal: profile.goal, created: profile.created }, conversations: conversations.results, messages: messages.results, feedback: feedback.results, retentionDays: RETENTION / 86_400_000 };
}
