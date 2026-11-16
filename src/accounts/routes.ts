import { identity, privateId } from './auth';
import { account, conversation, purgeExpired } from './store';
import { streamAccountExport } from './export';
import { configuredLimit, RETENTION, type AccountEnv } from './types';
import { admissionRpc, digest } from '../security/boundary';
import { AdmissionError, type SecurityExecution } from '../security/types';
import { readLimitedText, BodyTooLargeError } from '../security/body';
import { GOALS, type ChatGoal, type ChatState, type ChatReply } from '../coach-chat/types';
import { sensitive, validateChatMessage } from '../coach-chat/validation';
import { mentorTurn, openingQuestion } from '../coach-chat/engine';
import { PROMPT_VERSION } from '../coach-chat/prompt';
import { RETRIEVAL_VERSION } from '../coach-chat/retrieval';
import { emitMetric, recordActivity } from './metrics';
import { handleResearchRequest } from './research';
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
function fields(b: Record<string, unknown>, names: string[]) { if (Object.keys(b).some(k => !names.includes(k))) throw new AdmissionError(400, 'Invalid account request.'); }
function text(v: unknown, max: number) { if (typeof v !== 'string' || v.length > max || sensitive(v)) throw new AdmissionError(400, 'Use a fictional example without contact details or credentials.'); return v.trim(); }
export async function handleAccountRequest(request: Request, env: AccountEnv): Promise<Response> {
  if (env.FDE_COACH_ACCOUNTS_ENABLED !== 'true') return json({ error: 'Accounts are not enabled.' }, 404);
  try {
    if (!env.COACH_DB) throw new AdmissionError(503, 'Accounts are unavailable.');
    const owner = await identity(request, env);
    const action = new URL(request.url).pathname.split('/').pop();
    if (!['GET','POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
    const profile = await account(env, owner, true);
    await recordActivity(env, profile);
    if (action?.startsWith('research')) return await handleResearchRequest(request,env,profile);
    const policy = () => ({ user: owner, limit: configuredLimit(env.COACH_DAILY_RESPONSES, 10, 100), requestLimit: configuredLimit(env.COACH_DAILY_REQUESTS, 30, 200) });
    const usageStatus = async () => { try { return await admissionRpc(env, 'user-status', policy()); } catch { emitMetric(env,'error',undefined,{category:'admission_unavailable'});return {available:false,used:0,reserved:0,remaining:0,limit:0,resetsAt:(Math.floor(Date.now()/86_400_000)+1)*86_400_000}; } };
    if (request.method === 'GET') {
      if (action === 'me') {
        await purgeExpired(env);
        const usage = await usageStatus();
        const conversations = await env.COACH_DB.prepare('SELECT id,goal,revision,updated FROM coach_conversations WHERE owner=? AND expires>? ORDER BY updated DESC LIMIT 20').bind(owner, Date.now()).all();
        return json({ profile: { background: profile.background, goal: profile.goal }, usage, conversations: conversations.results });
      }
      if (action === 'export') return await streamAccountExport(env, owner);
      if (action === 'conversation') {
        const c = await conversation(env, owner, new URL(request.url).searchParams.get('id'));
        const messages = await env.COACH_DB.prepare('SELECT m.question,m.response,m.revision,f.rating,f.completed FROM coach_messages m LEFT JOIN coach_feedback f ON f.operation=m.operation AND f.owner=m.owner WHERE m.owner=? AND m.conversation=? ORDER BY m.revision DESC LIMIT 40').bind(owner, c.id).all();
        return json({ id: c.id, revision: c.revision, messages: messages.results.reverse().map((m: any) => ({ question: m.question, reply: { ...JSON.parse(m.response), feedback: { rating:m.rating??null, completed:Boolean(m.completed) } } })), usage: await usageStatus() });
      }
      return json({ error: 'Not found' }, 404);
    }
    const b = JSON.parse(await readLimitedText(request, 4000));
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new AdmissionError(400, 'Invalid account request.');
    if (action === 'profile') {
      fields(b, ['background','goal']);
      await env.COACH_DB.prepare('UPDATE coach_accounts SET background=?,goal=?,updated=? WHERE id=? AND generation=? AND deleted=0').bind(text(b.background, 180), text(b.goal, 400), Date.now(), owner, profile.generation).run();
      return json({ ok: true });
    }
    if (action === 'delete') {
      fields(b, ['confirm']);
      if (b.confirm !== 'DELETE') throw new AdmissionError(400, 'Confirm deletion.');
      await env.COACH_DB.batch([
        env.COACH_DB.prepare(`UPDATE coach_accounts SET background='',goal='',deleted=?,updated=? WHERE id=? AND generation=?`).bind(Date.now(), Date.now(), owner, profile.generation),
        env.COACH_DB.prepare('DELETE FROM coach_conversations WHERE owner=?').bind(owner),
        env.COACH_DB.prepare('DELETE FROM coach_activity WHERE owner=?').bind(owner),
        env.COACH_DB.prepare('DELETE FROM coach_monthly_activity WHERE owner=?').bind(owner),
      ]);
      // Data deletion remains available during a quota outage; never refund spent quota.
      try { await admissionRpc(env, 'user-delete', { ...policy(), generation: profile.generation }); } catch { /* D1 generation/deleted guards prevent resurrection; metadata expires independently. */ }
      return json({ ok: true, identityProviderAccountRetained: true });
    }
    if (action === 'feedback') {
      fields(b, ['operation','rating','completed']);
      if (typeof b.operation !== 'string' || !/^[a-f0-9]{64}$/.test(b.operation) || (b.rating !== undefined && !['helpful','unhelpful','incorrect'].includes(b.rating)) || (b.completed !== undefined && typeof b.completed !== 'boolean') || (b.rating === undefined && b.completed === undefined)) throw new AdmissionError(400, 'Choose a feedback option.');
      const saved = await env.COACH_DB.prepare('SELECT m.response FROM coach_messages m JOIN coach_conversations c ON c.id=m.conversation WHERE m.operation=? AND m.owner=? AND c.owner=? AND c.expires>? AND m.revision>0').bind(b.operation,owner,owner,Date.now()).first<{response:string}>();
      if (!saved) throw new AdmissionError(404, 'Response unavailable.');
      if (b.completed && !JSON.parse(saved.response).nextStep) throw new AdmissionError(400, 'There is no next step to complete.');
      // The insert-select prevents a concurrent account deletion resurrecting feedback.
      const feedbackWrite = await env.COACH_DB.prepare(`INSERT INTO coach_feedback(operation,owner,rating,completed,updated) SELECT ?,?,?,?,? FROM coach_accounts a JOIN coach_messages m ON m.owner=a.id WHERE a.id=? AND a.generation=? AND a.deleted=0 AND m.operation=? ON CONFLICT(operation) DO UPDATE SET rating=COALESCE(excluded.rating,coach_feedback.rating),completed=CASE WHEN ? THEN excluded.completed ELSE coach_feedback.completed END,updated=excluded.updated WHERE coach_feedback.rating IS NOT COALESCE(excluded.rating,coach_feedback.rating) OR coach_feedback.completed != CASE WHEN ? THEN excluded.completed ELSE coach_feedback.completed END`).bind(b.operation,owner,b.rating??null,b.completed?1:0,Date.now(),owner,profile.generation,b.operation,b.completed===undefined?0:1,b.completed===undefined?0:1).run();
      if (feedbackWrite.meta.changes) emitMetric(env,b.completed?'step_completed':'feedback',undefined,{rating:b.rating});
      return json({ok:true});
    }
    if (!['start','message'].includes(action ?? '')) return json({ error: 'Not found' }, 404);
    if (env.FDE_COACH_CHAT_ENABLED !== 'true') throw new AdmissionError(503, 'AI coaching is not enabled.');
    const start = action === 'start';
    fields(b, start ? ['goal'] : ['conversationId','revision','message']);
    const key = request.headers.get('idempotency-key');
    if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) throw new AdmissionError(400, 'A valid Idempotency-Key is required.');
    if (start && !GOALS.includes(b.goal)) throw new AdmissionError(400, 'Choose a coaching goal.');
    if (!start) { validateChatMessage({ token: '', message: b.message, history: [] }); if (!Number.isSafeInteger(b.revision) || b.revision < 0) throw new AdmissionError(400, 'Invalid revision.'); }
    const operation = await privateId(env, 'operation', JSON.stringify([owner, profile.generation, action, key]));
    const id = start ? await privateId(env, 'conversation', operation) : b.conversationId;
    const c = start ? null : await conversation(env, owner, id);
    const now = Date.now();
    const fingerprint = await privateId(env, 'request', JSON.stringify(b));
    const actor = await digest(`${Math.floor(now / 3_600_000)}:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
    const limits=policy();
    const auth = { ...limits, generation: profile.generation, conversation: id, operation, fingerprint, start, revision: start ? 0 : b.revision, actor };
    const lease = await admissionRpc<{ nonce: string; state: string; deadline: number }>(env, 'user-reserve', auth);
    if (lease.state !== 'new') emitMetric(env, 'retry');
    const saved = await env.COACH_DB.prepare('SELECT response,metadata FROM coach_messages WHERE operation=? AND owner=? AND conversation=?').bind(operation, owner, id).first<{ response: string; metadata: string }>();
    if (saved) {
      const reply = JSON.parse(saved.response);
      const usage = await admissionRpc(env, 'user-commit', { ...auth, nonce: lease.nonce, ai: reply.mode === 'ai' });
      return json({ ...reply, usage });
    }
    if (lease.state !== 'new' || Date.now() >= lease.deadline) throw new AdmissionError(409, 'The previous request is pending or uncertain. Retry its exact key. It will not run AI again.');
    let state: ChatState = start ? { version: 1, sessionId: id, revision: 0, issuedAt: now, expiresAt: now + 3_600_000, goal: b.goal as ChatGoal, turn: 0, profile: { background: profile.background, example: '', focus: profile.goal.slice(0, 180) }, lastTask: '' } : JSON.parse(c!.state);
    const execution: SecurityExecution = { sessionId: id, expiresAt: lease.deadline, revision: start ? 0 : b.revision, attemptCount: 0, saveSession() {} };
    let reply: ChatReply;
    if (start) {
      reply = { token: `account1.${id}.0`, goal: state.goal, turn: 0, remainingTurns: 10, mode: 'intake', answer: 'Let’s work from your experience. Your account saves this conversation so you can return later. Use fictional or non-sensitive examples.', question: openingQuestion(state.goal), gaps: [], nextStep: null, sources: [], done: false };
      execution.metadata = { templateId: `intake-${state.goal}`, promptVersion: PROMPT_VERSION, retrievalVersion: RETRIEVAL_VERSION, resourceIds: [], model: null, attempts: 0, latencyMs: 0, tokens: null, usageComplete: false, outcome: 'intake', errorCategory: null };
    } else {
      const recent = await env.COACH_DB.prepare('SELECT question,response FROM coach_messages WHERE owner=? AND conversation=? AND revision>0 ORDER BY revision DESC LIMIT 2').bind(owner, id).all<{ question: string; response: string }>();
      const history = recent.results.reverse().flatMap(m => [{ role: 'learner' as const, text: m.question.slice(0,700) }, { role: 'coach' as const, text: JSON.parse(m.response).answer.slice(0,700) }]);
      let slot = 0;
      const scoped: AccountEnv = { ...env, securityExecution: execution, AI: env.AI ? { run: async (model, input) => {
        await admissionRpc(env, 'user-attempt', { ...auth, nonce: lease.nonce, slot: slot++ });
        if (Date.now() >= Math.min(lease.deadline, execution.modelDeadlineMs ?? lease.deadline)) throw new AdmissionError(503, 'Attempt deadline elapsed.');
        execution.attemptCount = (execution.attemptCount ?? 0) + 1;
        return env.AI!.run(model, input);
      } } : undefined };
      const result = await mentorTurn(scoped, state, b.message.trim(), history);
      for (const attempt of execution.metadata?.attemptDetails ?? []) emitMetric(env,'model_attempt',{...execution.metadata!,model:attempt.model,latencyMs:attempt.latencyMs,tokens:attempt.tokens,attempts:attempt.executed?1:0,attemptDetails:[attempt],usageComplete:attempt.executed&&attempt.tokens!==null},{category:attempt.error??undefined});
      state = { ...state, revision: c!.revision + 1, turn: (state.turn % 10) + 1, profile: result.profile, lastTask: result.nextStep?.task ?? state.lastTask };
      reply = { token: `account1.${id}.${state.revision}`, goal: state.goal, turn: state.turn, remainingTurns: 10 - state.turn, mode: result.mode, answer: result.answer, question: result.question, gaps: result.gaps, nextStep: result.nextStep, sources: result.sources, done: false };
    }
    // An atomic D1 batch durably saves the reply before the DO settles its successful-response charge.
    // Generation/deleted guards prevent an in-flight response resurrecting deleted account content.
    reply = { ...reply, responseId: operation };
    const db = env.COACH_DB;
    const statements = start ? [db.prepare(`INSERT INTO coach_conversations(id,owner,generation,goal,state,created,updated,expires) SELECT ?,?,?,?,?,?,?,? FROM coach_accounts WHERE id=? AND generation=? AND deleted=0`).bind(id, owner, profile.generation, state.goal, JSON.stringify(state), now, now, now + RETENTION, owner, profile.generation)] : [];
    statements.push(db.prepare(`INSERT INTO coach_messages(operation,owner,conversation,revision,question,response,metadata,created) SELECT ?,?,?,?,?,?,?,? FROM coach_conversations c JOIN coach_accounts a ON a.id=c.owner WHERE c.id=? AND c.owner=? AND c.revision=? AND a.generation=? AND a.deleted=0`).bind(operation, owner, id, state.revision, start ? '' : b.message.trim(), JSON.stringify(reply), JSON.stringify(execution.metadata), now, id, owner, start ? 0 : b.revision, profile.generation));
    statements.push(db.prepare(`UPDATE coach_conversations SET revision=?,state=?,updated=?,expires=? WHERE id=? AND owner=? AND EXISTS(SELECT 1 FROM coach_accounts WHERE id=? AND generation=? AND deleted=0)`).bind(state.revision, JSON.stringify(state), now, now + RETENTION, id, owner, owner, profile.generation));
    const results = await db.batch(statements);
    if (!results[start ? 1 : 0].meta.changes) throw new AdmissionError(410, 'Conversation data is unavailable.');
    const usage = await admissionRpc(env, 'user-commit', { ...auth, nonce: lease.nonce, ai: reply.mode === 'ai' });
    emitMetric(env, start ? 'conversation_start' : 'interaction', execution.metadata, { category: execution.metadata?.errorCategory ?? undefined, ...(usage as object) });
    return json({ ...reply, usage });
  } catch (error) {
    const status = error instanceof AdmissionError ? error.status : error instanceof BodyTooLargeError ? 413 : error instanceof SyntaxError ? 400 : 503;
    emitMetric(env,status===429?'limit':'error',undefined,{category:status===401||status===403?'auth':status===400||status===413?'invalid_request':status===409?'conflict':status===429?'usage_limit':'storage_or_security'});
    return json({ error: error instanceof AdmissionError ? error.message : status === 400 ? 'Invalid request.' : 'The request could not complete safely. Retry the original request.' }, status);
  }
}
