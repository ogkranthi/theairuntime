import { expect, it, vi } from 'vitest';
import { handleChatRequest } from '../../src/coach-chat/routes';
import { readFileSync } from 'node:fs';
it('unconfigured capture never accepts arbitrary client answers or retains opted-in text',async()=>{
  const prepare=vi.fn();const env={FDE_COACH_CHAT_ENABLED:'true',COACH_EVAL:{prepare}} as any;
  const response=await handleChatRequest(new Request('https://local.test/api/coach-chat/contribute',{method:'POST',body:JSON.stringify({consent:true,question:'Synthetic selected question',answer:'A fabricated client answer',helpful:true})}),env);
  expect(response.status).toBe(404);expect(prepare).not.toHaveBeenCalled();const health=await handleChatRequest(new Request('https://local.test/api/coach-chat/health'),env);expect(await health.json()).toMatchObject({captureEnabled:false});
});
it('capture proposal is not a live binding, migration, or runtime dependency',()=>{
  const configs=readFileSync('wrangler.toml','utf8')+readFileSync('preview/coach-chat.wrangler.toml','utf8');expect(configs).not.toMatch(/d1_databases|COACH_EVAL/);
  const component=readFileSync('learn/src/components/fde-coach/FdeCoach.tsx','utf8');expect(component).not.toContain('data-share-exchange');
});
