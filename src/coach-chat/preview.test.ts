import { expect, it, vi } from 'vitest';
import preview from '../../preview/coach-entry';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
it('preview cannot serve production hosts or invoke external integrations',async()=>{
  const fetch=vi.fn(async()=>new Response('local asset'));const env={ASSETS:{fetch}} as any;
  expect((await preview.fetch(new Request('https://learn.theairuntime.com/'),env)).status).toBe(403);
  for(const path of ['/api/subscribe','/api/fde-gym/report','/api/ask','/api/intake','/api/waitlist'])expect((await preview.fetch(new Request('https://coach-review.example.workers.dev'+path,{method:'POST'}),env)).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();expect(await (await preview.fetch(new Request('https://coach-review.example.workers.dev/learn/'),env)).text()).toBe('local asset');
});
it('preview permits coarse chat health without assuming enforcement is available',async()=>{
  const response=await preview.fetch(new Request('https://coach-review.example.workers.dev/api/coach-chat/health'),{ASSETS:{} } as any);
  expect(await response.json()).toMatchObject({enabled:false,securityConfigured:false,captureEnabled:false});
});
it('preview config guard rejects placeholder and production KV identifiers',()=>{
  const directory=mkdtempSync(join(tmpdir(),'coach-preview-'));try {
    const template=readFileSync('preview/coach-chat.wrangler.toml','utf8');
    for(const id of ['00000000000000000000000000000000','8cb02842b8d44f07886395524b17128a']) {
      const file=join(directory,'wrangler.toml');writeFileSync(file,template.replace('00000000000000000000000000000000',id));
      expect(()=>execFileSync(process.execPath,['scripts/check-coach-preview.mjs',file],{stdio:'pipe'})).toThrow();
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});
