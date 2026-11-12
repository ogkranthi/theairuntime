import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createCoachClient } from "../../learn/src/components/coach/api";
import { handleCoachRequest } from "../coach/routes";
import { verifyState } from "../coach/token";
import type { CoachEnv } from "../coach/types";
import { securityRuntime } from "./test-runtime";
let runtime: Awaited<ReturnType<typeof securityRuntime>>;
let env: CoachEnv;
let store: Map<string,string>;
let ai: ReturnType<typeof vi.fn>;
let control: (path:string,body?:unknown)=>Promise<any>;
let calls: Request[];
const SECRET="integration-only-signing-key";
beforeAll(async()=>{runtime=await securityRuntime();},30_000);
afterAll(async()=>{await runtime?.mf.dispose();});
afterEach(()=>{vi.unstubAllGlobals();});
beforeEach(()=>{
  store=new Map();calls=[];
  ai=vi.fn(async()=>({response:JSON.stringify({message:"Consider evidence and tradeoffs.",action:"advance"})}));
  const id=runtime.namespace.idFromName(crypto.randomUUID());const stub=runtime.namespace.get(id);
  env={COACH_TOKEN_SECRET:SECRET,AI:{run:ai},AI_SECURITY:{idFromName:()=>id,get:()=>stub},FDE_GYM_SESSIONS:{get:async key=>store.get(key)??null,put:async(key,value)=>{store.set(key,value);}}};
  control=async(path,body={})=>(await stub.fetch(`https://security/${path}`,{method:"POST",body:JSON.stringify(body)})).json();
});
function bridge(intercept?: (request:Request,execute:()=>Promise<Response>)=>Promise<Response>) {
  const fetch=vi.fn(async(path:string|URL|Request,init?:RequestInit)=>{
    const request=new Request(new URL(String(path),"https://local.test"),init);calls.push(request.clone() as Request);
    return intercept?intercept(request,()=>handleCoachRequest(request,env)):handleCoachRequest(request,env);
  });vi.stubGlobal("fetch",fetch);return fetch;
}
async function sameRequest(a=0,b=1) {
  expect(calls[b].headers.get("idempotency-key")).toBe(calls[a].headers.get("idempotency-key"));
  expect(calls[b].headers.get("x-session-client")).toBe(calls[a].headers.get("x-session-client"));
  expect(await calls[b].clone().text()).toBe(await calls[a].clone().text());
}
async function start(client:ReturnType<typeof createCoachClient>) { const reply=await client.startLesson();client.acknowledge(reply);return reply; }
it("recovers a durably committed start after response loss across an IP change",async()=>{
  let lost=false;let saved="";
  bridge(async(request,execute)=>{request.headers.set("cf-connecting-ip",lost?"192.0.2.2":"192.0.2.1");const response=await execute();if(!lost){saved=(await response.clone().json() as any).token;lost=true;throw new Error("lost after commit");}return response;});
  const client=createCoachClient();await expect(client.startLesson()).rejects.toThrow("lost after commit");
  expect((await client.startLesson()).token).toBe(saved);await sameRequest();
  expect((await control("__inspect")).sessions).toHaveLength(1);expect(ai).not.toHaveBeenCalled();
});
it("separates real client scopes even when their start request keys collide",async()=>{
  bridge(async(request)=>{request.headers.set("idempotency-key","same-colliding-key-1234");return handleCoachRequest(request,env);});
  const first=createCoachClient(),second=createCoachClient();
  const [a,b]=await Promise.all([first.startLesson(),second.startLesson()]);
  expect(a.token).not.toBe(b.token);expect((await first.startLesson()).token).toBe(a.token);expect((await second.startLesson()).token).toBe(b.token);
  expect((await control("__inspect")).sessions).toHaveLength(2);
});
it.each(["lost", "malformed"])("recovers a committed message after %s response without another AI attempt",async failure=>{
  let interrupted=false;bridge(async(request,execute)=>{const response=await execute();if(request.url.endsWith('/message')&&!interrupted){interrupted=true;if(failure==='lost')throw new Error('response lost');return Response.json({token:'incomplete'});}return response;});
  const client=createCoachClient();const initial=await start(client);
  await expect(client.sendMessage(initial.token,"A fictional customer outcome",[])).rejects.toThrow();
  const recovered=await client.sendMessage(initial.token,"A fictional customer outcome",[]);await sameRequest(1,2);
  expect((await verifyState(recovered.token,SECRET,Date.now()))?.revision).toBe(1);expect(ai).toHaveBeenCalledTimes(1);
  client.acknowledge(recovered);
  const stale=await handleCoachRequest(new Request('https://local.test/api/coach/message',{method:'POST',headers:{'idempotency-key':crypto.randomUUID()},body:JSON.stringify({token:initial.token,message:'changed',stageTurns:[]})}),env);
  expect(stale.status).toBe(409);expect(ai).toHaveBeenCalledTimes(1);
});
it("a duplicate wire request while AI runs gets no second grant",async()=>{
  let release!:()=>void;let entered!:()=>void;const ready=new Promise<void>(resolve=>{entered=resolve;});
  ai.mockImplementationOnce(async()=>{entered();await new Promise<void>(resolve=>{release=resolve;});return {response:JSON.stringify({message:'Evidence',action:'advance'})};});
  bridge();const client=createCoachClient();const initial=await start(client);
  const first=client.sendMessage(initial.token,'A fictional outcome',[]);await ready;
  const duplicate=await handleCoachRequest(calls[1].clone() as Request,env);expect(duplicate.status).toBe(409);
  await expect(client.sendMessage(initial.token,'A fictional outcome',[])).rejects.toMatchObject({status:409});
  release();await first;expect(ai).toHaveBeenCalledTimes(1);
});
it("missing saved KV results return 503 and exact retry recovers without repeating AI",async()=>{
  bridge();const client=createCoachClient();const initial=await start(client);const reply=await client.sendMessage(initial.token,'A fictional outcome',[]);
  const saved=new Map(store);store.clear();await expect(client.sendMessage(initial.token,'A fictional outcome',[])).rejects.toMatchObject({status:503});
  store=new Map(saved);expect((await client.sendMessage(initial.token,'A fictional outcome',[])).token).toBe(reply.token);expect(ai).toHaveBeenCalledTimes(1);
});
it("lease expiry fences an interrupted request and a fresh key cannot bypass it",async()=>{
  let release!:()=>void;let entered!:()=>void;const ready=new Promise<void>(resolve=>{entered=resolve;});
  ai.mockImplementationOnce(async()=>{entered();await new Promise<void>(resolve=>{release=resolve;});return {response:JSON.stringify({message:'Evidence',action:'advance'})};});
  bridge();const client=createCoachClient();const initial=await start(client);
  const result=expect(client.sendMessage(initial.token,'A fictional outcome',[])).rejects.toMatchObject({status:409});await ready;
  await control('__clock',{now:Date.now()+120_001});release();await result;
  await expect(client.sendMessage(initial.token,'A fictional outcome',[])).rejects.toMatchObject({status:409});await sameRequest(1,2);
  const fresh=createCoachClient();await expect(fresh.sendMessage(initial.token,'A fictional outcome',[])).rejects.toMatchObject({status:409});expect(ai).toHaveBeenCalledTimes(1);
});
it("server session expiry stops the client without new work",async()=>{
  bridge();const client=createCoachClient();const initial=await start(client);await control('__clock',{now:Date.now()+3*3_600_000+1});
  await expect(client.sendMessage(initial.token,'A fictional outcome',[])).rejects.toMatchObject({status:403,retryable:false});expect(ai).not.toHaveBeenCalled();
});
it("missing atomic enforcement fails closed with no model call",async()=>{
  bridge();env.AI_SECURITY=undefined;const client=createCoachClient();await expect(client.startLesson()).rejects.toMatchObject({status:503});expect(ai).not.toHaveBeenCalled();expect(store.size).toBe(0);
});
