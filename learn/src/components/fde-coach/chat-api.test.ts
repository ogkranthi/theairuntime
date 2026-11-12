import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createChatClient, validateChatReply } from './chat-api';
import catalog from '../../../../src/coach-chat/catalog.generated.json';
const reply={token:'chat1.synthetic.signature',goal:'skills',turn:0,remainingTurns:10,mode:'intake',answer:'Synthetic intake',question:'What have you built?',gaps:[],nextStep:null,sources:[],done:false};
let client:ReturnType<typeof createChatClient>;
beforeEach(()=>{client=createChatClient();});afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('uses chat-specific endpoints and preserves start receipt on a lost response',async()=>{
  const fetch=vi.fn().mockRejectedValueOnce(new Error('lost')).mockResolvedValueOnce(Response.json(reply));vi.stubGlobal('fetch',fetch);
  await expect(client.start('skills')).rejects.toThrow('lost');await client.start('skills');
  expect(fetch.mock.calls[1][0]).toBe('/api/coach-chat/start');expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);expect(fetch.mock.calls[1][1].headers).toEqual(fetch.mock.calls[0][1].headers);
});
it('requires application acknowledgement before a new operation and uses the returned signed token',async()=>{
  const fetch=vi.fn().mockImplementation(async()=>Response.json(reply));vi.stubGlobal('fetch',fetch);const first=await client.start('skills');
  await expect(client.message(first.token,'I built an API',[])).rejects.toThrow('original request');client.acknowledge(first);await client.message(first.token,'I built an API',[]);
  expect(fetch.mock.calls.at(-1)![0]).toBe('/api/coach-chat/message');expect(JSON.parse(fetch.mock.calls.at(-1)![1].body).token).toBe(first.token);
});
it.each([{sources:[{...catalog.resources[0],href:'https://evil.test'}]},{token:'legacy-token'},{turn:20},{mode:'invented'},{remainingTurns:99},{done:true},{nextStep:{task:'missing done'}}])('rejects invalid response without consuming identity (%j)',async mutation=>{
  const fetch=vi.fn().mockResolvedValueOnce(Response.json({...reply,...mutation})).mockResolvedValueOnce(Response.json(reply));vi.stubGlobal('fetch',fetch);
  await expect(client.start('skills')).rejects.toThrow('could not be read');await client.start('skills');expect(fetch.mock.calls[1][1].headers).toEqual(fetch.mock.calls[0][1].headers);
});
it('keeps completed bounded chats and valid canonical references readable',()=>{expect(validateChatReply({...reply,turn:10,remainingTurns:0,done:true,mode:'ai',sources:[catalog.resources[0]]}).done).toBe(true);});
