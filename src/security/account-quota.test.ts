import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import { securityRuntime } from './test-runtime';
const DAY=86_400_000, NOW=1_800_000_000_000;
let runtime: Awaited<ReturnType<typeof securityRuntime>>;
beforeAll(async()=>{runtime=await securityRuntime();},30_000);
afterAll(async()=>{await runtime?.mf.dispose();});
beforeEach(async()=>{await runtime.rpc('__reset');await runtime.rpc('__clock',{now:NOW});});
const input=(overrides:Record<string,unknown>={})=>({user:'a'.repeat(64),generation:'generation',conversation:crypto.randomUUID(),operation:crypto.randomUUID(),fingerprint:'fingerprint',revision:0,start:true,limit:10,requestLimit:30,actor:crypto.randomUUID(),...overrides});
async function start(b=input()) {const r=await runtime.rpc('user-reserve',b);expect(r.status).toBe(200);expect((await runtime.rpc('user-commit',{...b,nonce:r.body.nonce,ai:false})).status).toBe(200);return {...b,start:false,operation:crypto.randomUUID()};}
it('reserves only one of concurrent final-success slots across conversations',async()=>{
 const requests=await Promise.all(Array.from({length:10},()=>start(input({limit:1}))));
 const r=await Promise.all(requests.map(b=>runtime.rpc('user-reserve',b)));
 expect(r.filter(x=>x.status===200)).toHaveLength(1);expect(r.filter(x=>x.status===429)).toHaveLength(9);
});
it('never reissues an uncertain or expired reservation and retains its hold until UTC reset',async()=>{
 const b=await start(input({limit:1})),r=await runtime.rpc('user-reserve',b);
 await runtime.rpc('__clock',{now:NOW+120_001}); await runtime.rpc('__alarm');
 const retry=await runtime.rpc('user-reserve',b);expect(retry.body.state).toBe('uncertain');expect(retry.body.nonce).toBe(r.body.nonce);
 expect((await runtime.rpc('user-attempt',{...b,nonce:r.body.nonce,slot:0})).status).toBe(409);
 expect((await runtime.rpc('user-status',b)).body.remaining).toBe(0);
 await runtime.rpc('__clock',{now:(Math.floor(NOW/DAY)+1)*DAY});expect((await runtime.rpc('user-status',b)).body.remaining).toBe(1);
});
it('charges validated AI once, releases authored fallback allowance, and enforces failure abuse ceilings',async()=>{
 const b=await start(input({limit:1,requestLimit:2})),r=await runtime.rpc('user-reserve',b);
 expect((await runtime.rpc('user-commit',{...b,nonce:r.body.nonce,ai:false})).body.remaining).toBe(1);
 const next={...b,operation:crypto.randomUUID(),revision:1},n=await runtime.rpc('user-reserve',next);
 expect((await runtime.rpc('user-commit',{...next,nonce:n.body.nonce,ai:true})).body.used).toBe(1);
 expect((await runtime.rpc('user-commit',{...next,nonce:n.body.nonce,ai:true})).body.used).toBe(1);
 expect((await runtime.rpc('user-reserve',{...next,operation:crypto.randomUUID(),revision:2})).status).toBe(429);
});
it('shares the original 500-attempt cap, counts primary/fallback, and rejects duplicate slots',async()=>{
 const b=await start(),r=await runtime.rpc('user-reserve',b),auth={...b,nonce:r.body.nonce};
 await runtime.rpc('__counter',{id:`ai:day:${Math.floor(NOW/DAY)}`,value:498,expires:NOW+DAY});
 const calls=await Promise.all(Array.from({length:8},()=>runtime.rpc('user-attempt',{...auth,slot:0})));
 expect(calls.filter(x=>x.status===200)).toHaveLength(1);
 expect((await runtime.rpc('user-attempt',{...auth,slot:1})).status).toBe(200);
 const other=await start(input({user:'b'.repeat(64)})),o=await runtime.rpc('user-reserve',other);
 expect((await runtime.rpc('user-attempt',{...other,nonce:o.body.nonce,slot:0})).status).toBe(429);
});
it('settles a response crossing midnight in the completion day, and cannot exceed that day quota',async()=>{
 const end=(Math.floor(NOW/DAY)+1)*DAY;
 await runtime.rpc('__clock',{now:end-1000});
 const b=await start(input({limit:1})),r=await runtime.rpc('user-reserve',b);
 await runtime.rpc('__clock',{now:end+1});
 expect((await runtime.rpc('user-commit',{...b,nonce:r.body.nonce,ai:true})).body.used).toBe(1);
 const other=await start(input({limit:1}));expect((await runtime.rpc('user-reserve',other)).status).toBe(429);
 expect((await runtime.rpc('user-commit',{...b,nonce:r.body.nonce,ai:true})).body.used).toBe(1);
});
it('fails closed when start limits, user limits or failed-request limits are zero',async()=>{
 const b=await start(input({requestLimit:0}));expect((await runtime.rpc('user-reserve',b)).status).toBe(429);
 const c=await start(input({limit:0}));expect((await runtime.rpc('user-reserve',c)).status).toBe(429);
 await runtime.rpc('__counter',{id:`starts:day:${Math.floor(NOW/DAY)}`,value:200,expires:NOW+DAY});
 expect((await runtime.rpc('user-reserve',input())).status).toBe(429);
});
it('prevents generation changes and mismatched fingerprints from using a prior reservation',async()=>{
 const b=await start(),r=await runtime.rpc('user-reserve',b);
 expect((await runtime.rpc('user-reserve',{...b,generation:'another'})).status).toBe(409);
 expect((await runtime.rpc('user-reserve',{...b,fingerprint:'another'})).status).toBe(409);
 expect((await runtime.rpc('user-commit',{...b,nonce:'wrong',ai:true})).status).toBe(409);
 expect((await runtime.rpc('user-commit',{...b,nonce:r.body.nonce,ai:true})).status).toBe(200);
});
