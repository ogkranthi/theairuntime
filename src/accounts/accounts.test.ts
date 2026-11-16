import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { securityRuntime } from '../security/test-runtime';
import { handleAccountRequest } from './routes';
import { identity } from './auth';
import type { AccountEnv } from './types';
import { verifyToken } from '@clerk/backend';
const ORIGIN = 'https://learn.test', ISSUER = 'https://test.clerk.accounts.dev', DAY = 86_400_000;
let runtime: Awaited<ReturnType<typeof securityRuntime>>, dbRuntime: Miniflare, env: AccountEnv, key: CryptoKey, publicKey: string;
let ai: ReturnType<typeof vi.fn>;
const b64 = (s: string) => Buffer.from(s).toString('base64url');
async function token(user = 'alice', overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT', cat: 'cl_B7d4PD111AAA', kid: 'local-test' }))}.${b64(JSON.stringify({ sub: `user_${user}`, sid: `sess_${user}`, iss: ISSUER, azp: ORIGIN, iat: now, nbf: now - 1, exp: now + 60, v: 2, ...overrides }))}`;
  return `${unsigned}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))).toString('base64url')}`;
}
async function request(action: string, body?: unknown, user = 'alice', requestKey: string = crypto.randomUUID(), bearer?: string) {
  return handleAccountRequest(new Request(`${ORIGIN}/api/coach-account/${action}`, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${bearer ?? await token(user)}`, origin: ORIGIN, 'content-type': 'application/json', 'idempotency-key': requestKey }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
}
async function parsed(action: string, body?: unknown, user = 'alice', key?: string) { const r = await request(action, body, user, key); return { status: r.status, body: await r.json() as any }; }
beforeAll(async () => {
  runtime = await securityRuntime();
  dbRuntime = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', d1Databases: ['DB'], compatibilityDate: '2025-05-01' });
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  key = pair.privateKey;
  publicKey = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(await crypto.subtle.exportKey('spki', pair.publicKey)).toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`;
  const db = await dbRuntime.getD1Database('DB');
  for (const name of ['0001_accounts.sql','0002_observability.sql']) await db.exec((await readFile(`migrations/coach/${name}`, 'utf8')).replace(/\n/g, ' '));
  env = { FDE_COACH_ACCOUNTS_ENABLED: 'true', FDE_COACH_CHAT_ENABLED: 'true', AI_SECURITY: runtime.namespace, COACH_DB: db as any, COACH_IDENTITY_KEY: 'local-only-identity-key-at-least-32-characters', CLERK_JWT_KEY: publicKey, CLERK_ISSUER: ISSUER, CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('test.clerk.accounts.dev$').toString('base64')}`, COACH_ALLOWED_ORIGIN: ORIGIN };
}, 30_000);
afterAll(async () => { await runtime?.mf.dispose(); await dbRuntime?.dispose(); });
beforeEach(async () => {
  await runtime.rpc('__reset');
  await env.COACH_DB!.exec('DELETE FROM coach_messages; DELETE FROM coach_conversations; DELETE FROM coach_accounts; DELETE FROM coach_activity; DELETE FROM coach_monthly_activity;');
  env.COACH_DAILY_RESPONSES = '10'; env.COACH_DAILY_REQUESTS = '30';
  ai = vi.fn(async (_model: string, input: any) => {
    const data = JSON.parse(input.messages[1].content);
    return { response: JSON.stringify({ answer: 'Use a stable operation key to separate an order from delivery attempts.', question: 'How would you test a lost response?', sourceIds: [data.untrustedCurriculum[0].id], gaps: [], nextStep: { task: 'Add a duplicate write test.', definitionOfDone: 'One write after two identical requests.' }, profileEvidence: { background: '', example: '', focus: '' } }), usage: { total_tokens: 40 } };
  });
  env.AI = { run: ai };
  env.FDE_COACH_METRICS_ENABLED='false';env.COACH_METRICS=undefined;
});
async function start(user = 'alice', key?: string) { expect((await parsed('me', undefined, user)).status).toBe(200); const r = await parsed('start', { goal: 'skills' }, user, key); expect(r.status).toBe(200); return r.body.token.split('.')[1]; }
const message = (id: string, revision = 0) => ({ conversationId: id, revision, message: 'I build APIs. Explain idempotency for a fictional order service.' });
describe('Clerk identity and account isolation', () => {
  it('runs the pinned Clerk verifier inside a Cloudflare-compatible Worker runtime', async () => {
    const compiled = await build({ stdin: { contents: `import {identity} from './src/accounts/auth'; export default {async fetch(request,env){try{return Response.json({id:await identity(request,env)})}catch(e){return new Response('denied',{status:e.status||503})}}}`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'neutral', conditions: ['workerd','worker','browser'], mainFields: ['module','main'], external: ['node:*'] });
    const edge = new Miniflare({ modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2025-05-01', compatibilityFlags: ['nodejs_compat'], bindings: { CLERK_JWT_KEY: publicKey, CLERK_ISSUER: ISSUER, CLERK_PUBLISHABLE_KEY: env.CLERK_PUBLISHABLE_KEY!, COACH_ALLOWED_ORIGIN: ORIGIN, COACH_IDENTITY_KEY: env.COACH_IDENTITY_KEY! } });
    try { const r = await edge.dispatchFetch(`${ORIGIN}/api/coach-account/me`, { headers: { authorization: `Bearer ${await token()}` } }); expect(r.status).toBe(200); expect((await r.json() as any).id).toMatch(/^[a-f0-9]{64}$/); } finally { await edge.dispose(); }
  });
  it('verifies an actual RS256 Clerk-shaped session, rejecting expired, wrong issuer/party and forged tokens', async () => {
    expect((await verifyToken(await token(), { jwtKey: publicKey, authorizedParties: [ORIGIN] })).sub).toBe('user_alice');
    expect((await parsed('me')).status).toBe(200);
    for (const overrides of [{ exp: 1 }, { iss: 'https://evil.test' }, { azp: 'https://evil.test' }, { nbf: Math.floor(Date.now()/1000)+1000 }]) expect((await request('me', undefined, 'alice', undefined, await token('alice', overrides))).status).toBe(401);
    expect((await request('me', undefined, 'alice', undefined, 'forged')).status).toBe(401);
    const cookieOnly = new Request(`${ORIGIN}/api/coach-account/me`, { headers: { cookie: `__session=${await token()}`, 'x-user-id': 'user_alice' } });
    await expect(identity(cookieOnly, env)).rejects.toMatchObject({ status: 401 });
  });
  it('rejects cross-origin mutations and client IDs, and does not reserve invalid starts', async () => {
    await parsed('me');
    const r = await handleAccountRequest(new Request(`${ORIGIN}/api/coach-account/start`, { method: 'POST', headers: { authorization: `Bearer ${await token()}`, origin: 'https://evil.test' }, body: '{}' }), env);
    expect(r.status).toBe(403);
    for (let i=0;i<205;i++) expect((await parsed('start', { goal: 'invalid' })).status).toBe(400);
    expect((await parsed('start', { goal: 'skills', userId: 'bob' })).status).toBe(400);
    expect((await parsed('start', { goal: 'skills' })).status).toBe(200);
  }, 20_000);
  it('scopes concurrent start keys to verified users, never returning another user conversation', async () => {
    const same = crypto.randomUUID();
    const [a,b] = await Promise.all([start('alice', same), start('bob', same)]);
    expect(a).not.toBe(b);
    expect((await parsed(`conversation?id=${a}`, undefined, 'bob')).status).toBe(404);
    expect((await parsed('message', message(a), 'bob')).status).toBe(404);
    expect(JSON.stringify((await parsed('export', undefined, 'bob')).body)).not.toContain(a);
  });
  it('resumes, exports and deletes only the owner data; deleting cannot reset quota', async () => {
    const a = await start(), b = await start('bob');
    expect((await parsed('message', message(a))).body.mode).toBe('ai');
    expect((await parsed(`conversation?id=${a}`)).body.messages).toHaveLength(2);
    expect(JSON.stringify((await parsed('export')).body)).toContain('Explain idempotency');
    expect((await parsed('delete', { confirm: 'DELETE' })).status).toBe(200);
    expect((await parsed('me')).status).toBe(410);
    expect((await parsed(`conversation?id=${b}`, undefined, 'bob')).status).toBe(200);
    expect((await env.COACH_DB!.prepare('SELECT count(*) AS n FROM coach_messages WHERE conversation=?').bind(a).first<any>()).n).toBe(0);
  });
});
describe('successful-response quotas and durable recovery', () => {
  it('records daily/monthly activity once under concurrency without content or account identifiers in telemetry',async()=>{
    env.FDE_COACH_METRICS_ENABLED='true';const events:any[]=[];env.COACH_METRICS={writeDataPoint:p=>events.push(p)};
    await Promise.all(Array.from({length:6},()=>parsed('me')));
    expect(events.filter(e=>e.blobs[0]==='active_day')).toHaveLength(1);expect(events.filter(e=>e.blobs[0]==='active_month')).toHaveLength(1);
    const id=await start();await parsed('message',message(id));
    expect(events.some(e=>e.blobs[0]==='model_attempt')).toBe(true);expect(events.some(e=>e.blobs[0]==='interaction')).toBe(true);
    const serialized=JSON.stringify(events);expect(serialized).not.toContain('user_alice');expect(serialized).not.toContain('fictional order');expect(serialized).not.toContain(id);
  });
  it('authorizes feedback/explicit completion per owner and includes it in export/deletion',async()=>{
    const a=await start(),b=await start('bob'),reply=(await parsed('message',message(a))).body;
    expect((await parsed('feedback',{operation:reply.responseId,rating:'incorrect'},'bob')).status).toBe(404);
    expect((await parsed('feedback',{operation:reply.responseId,rating:'helpful'})).status).toBe(200);
    expect((await parsed('feedback',{operation:reply.responseId,completed:true})).status).toBe(200);
    expect((await parsed(`conversation?id=${a}`)).body.messages.at(-1).reply.feedback).toEqual({rating:'helpful',completed:true});
    const feedback=(await parsed('export')).body.feedback;expect(feedback).toHaveLength(1);expect(feedback[0]).toMatchObject({rating:'helpful',completed:1});
    expect((await parsed('feedback',{operation:reply.responseId,rating:'raw private text'})).status).toBe(400);
    expect((await parsed('export',undefined,'bob')).body.feedback).toHaveLength(0);
    await parsed('delete',{confirm:'DELETE'});expect((await env.COACH_DB!.prepare('SELECT count(*) AS n FROM coach_feedback').first<any>()).n).toBe(0);
    expect((await parsed(`conversation?id=${b}`,undefined,'bob')).status).toBe(200);
  });
  it('exact retries are charged once and simultaneous requests run AI once', async () => {
    const id = await start(), key = crypto.randomUUID();
    const responses = await Promise.all(Array.from({length: 8}, () => parsed('message', message(id), 'alice', key)));
    expect(responses.some(r => r.status===200)).toBe(true);
    expect(ai).toHaveBeenCalledTimes(1);
    expect((await parsed('message', message(id), 'alice', key)).body.usage.used).toBe(1);
    expect((await parsed('message', { ...message(id), message: 'different' }, 'alice', key)).status).toBe(409);
  });
  it('enforces the final free response across different concurrent conversations', async () => {
    env.COACH_DAILY_RESPONSES = '1';
    const a = await start(), b = await start();
    const r = await Promise.all([parsed('message', message(a)), parsed('message', message(b))]);
    expect(r.map(v=>v.status).sort()).toEqual([200,429]); expect(ai).toHaveBeenCalledTimes(1);
    expect((await parsed('me')).body.usage.remaining).toBe(0);
  });
  it('does not charge authored fallbacks, counts physical failures and stops repeated failed requests', async () => {
    env.COACH_DAILY_REQUESTS = '1';
    ai.mockRejectedValue(new Error('private provider diagnostic must not escape'));
    const id = await start();
    const r = await parsed('message', message(id));
    expect(r.body.mode).toBe('fallback'); expect(r.body.usage.used).toBe(0); expect(ai).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(r.body)).not.toContain('private provider');
    expect((await parsed('message', message(id,1))).status).toBe(429);
    const counters = (await runtime.rpc('__inspect')).body.counters;
    expect(counters.find((c:any)=>c.id.startsWith('ai:day:')).value).toBe(2);
  });
  it('fails closed if atomic admission or configuration is unavailable', async () => {
    const id = await start(); const original = env.AI_SECURITY; env.AI_SECURITY = undefined;
    expect((await parsed('message', message(id))).status).toBe(503); expect(ai).not.toHaveBeenCalled(); env.AI_SECURITY = original;
    env.COACH_DAILY_RESPONSES = 'NaN'; expect((await parsed('message', message(id))).status).toBe(503); expect(ai).not.toHaveBeenCalled();
  });
  it('recovers a saved reply after a lost settlement without new inference or double charging', async () => {
    const id=await start(), key=crypto.randomUUID(), original=env.AI_SECURITY!;
    let lost=true;
    env.AI_SECURITY={idFromName:original.idFromName.bind(original),get:(object:any)=>({fetch:async(url:any,init:any)=>{ const r=await original.get(object).fetch(url,init); if(String(url).endsWith('user-commit')&&lost){lost=false;throw new Error('lost response');} return r; }}) as any};
    expect((await parsed('message',message(id),'alice',key)).status).toBe(503);
    expect((await parsed('message',message(id),'alice',key)).body.usage.used).toBe(1); expect(ai).toHaveBeenCalledTimes(1);
    env.AI_SECURITY=original;
  });
  it('deletion during inference cannot recreate messages', async () => {
    const id=await start(); let unblock!:()=>void, entered!:()=>void;
    const started=new Promise<void>(r=>entered=r), held=new Promise<void>(r=>unblock=r), original=ai.getMockImplementation()!;
    ai.mockImplementation(async (...args:any[])=>{entered();await held;return original(...args as [string,any]);});
    const pending=parsed('message',message(id)); await started;
    expect((await parsed('delete',{confirm:'DELETE'})).status).toBe(200); unblock();
    expect((await pending).status).toBe(410);
    expect((await env.COACH_DB!.prepare('SELECT count(*) AS n FROM coach_messages').first<any>()).n).toBe(0);
  });
});
