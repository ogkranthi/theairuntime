import {it,expect,vi} from 'vitest';
import {handleChatRequest} from '../coach-chat/routes';
it('requires the authenticated quota boundary when account mode is enabled',async()=>{
 const run=vi.fn();
 for(const action of ['start','message']){
  const r=await handleChatRequest(new Request(`https://learn.test/api/coach-chat/${action}`,{method:'POST',body:JSON.stringify({goal:'skills'})}),{FDE_COACH_ACCOUNTS_ENABLED:'true',FDE_COACH_CHAT_ENABLED:'true',AI:{run}});
  expect(r.status).toBe(401);expect(await r.text()).toContain('Sign in');
 }
 expect(run).not.toHaveBeenCalled();
});
it('keeps public health available and preserves anonymous compatibility when accounts are off',async()=>{
 const health=await handleChatRequest(new Request('https://learn.test/api/coach-chat/health'),{FDE_COACH_ACCOUNTS_ENABLED:'true'});
 expect(health.status).toBe(200);
 const disabled=await handleChatRequest(new Request('https://learn.test/api/coach-chat/start',{method:'POST',body:'{}'}),{FDE_COACH_ACCOUNTS_ENABLED:'false'});
 expect(disabled.status).toBe(503);
});
