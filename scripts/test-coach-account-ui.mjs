import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
// Synthetic Clerk and model fixtures exist only in this temporary test bundle.
// The server uses real signature verification, local D1 and the actual DO.
const { chromium } = await import(process.env.AIR_PLAYWRIGHT || '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');
const temporary = await mkdtemp(join(tmpdir(), 'air-account-ui-'));
const artifacts = process.env.AIR_COACH_ARTIFACT_DIR || '/tmp/air-account-ui-evidence';
await mkdir(artifacts, { recursive: true });
const research=process.env.AIR_COACH_RESEARCH==='1';
let browser, mf, server, calls = 0, bearer;
const checks = [];
const check = (name, condition = true) => { assert.ok(condition, name); checks.push(name); };
try {
  const coordinator = await build({ stdin: { contents: `export {AiSecurityCoordinator} from './src/security/coordinator'; export default {fetch(){return new Response('local')}}`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'neutral' });
  mf = new Miniflare({ modules: true, script: coordinator.outputFiles[0].text, compatibilityDate: '2025-05-01', durableObjects: { AI_SECURITY: { className: 'AiSecurityCoordinator', useSQLite: true } }, d1Databases: ['DB'] });
  const db = await mf.getD1Database('DB'), namespace = await mf.getDurableObjectNamespace('AI_SECURITY');
  for (const migration of ['0001_accounts.sql','0002_observability.sql','0003_research.sql']) await db.exec((await readFile(`migrations/coach/${migration}`, 'utf8')).replace(/\n/g,' '));
  const compiled = await build({ entryPoints: ['src/accounts/routes.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
  await writeFile(join(temporary, 'server.mjs'), compiled.outputFiles[0].text);
  const { handleAccountRequest } = await import(pathToFileURL(join(temporary, 'server.mjs')));
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const publicKey = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(await crypto.subtle.exportKey('spki', pair.publicKey)).toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
  const env = { FDE_COACH_RESEARCH_ENABLED:research?'true':'false', FDE_COACH_ACCOUNTS_ENABLED: 'true', FDE_COACH_CHAT_ENABLED: 'true', AI_SECURITY: namespace, COACH_DB: db, COACH_IDENTITY_KEY: 'synthetic-test-key-at-least-32-characters', CLERK_JWT_KEY: publicKey, CLERK_ISSUER: 'https://test.clerk.accounts.dev', CLERK_PUBLISHABLE_KEY: 'pk_test_dGVzdC5jbGVyay5hY2NvdW50cy5kZXYk', AI: { run: async (_model,input) => {
    calls++; const data=JSON.parse(input.messages[1].content);
    return { response: JSON.stringify({ answer: 'Your API background gives us a practical starting point. Keep the same operation key across retries, and verify the stored outcome before repeating a write.', question: 'How would you test response loss after a committed write?', sourceIds: [data.untrustedCurriculum[0].id], gaps: [], nextStep: { task: 'Add a duplicate-request test.', definitionOfDone: 'Two delivery attempts create one fictional order.' }, profileEvidence: { background: '', example: '', focus: '' } }), usage: { total_tokens: 120 } };
  } } };
  server = createServer(async (req,res) => {
    try {
      if (req.url.startsWith('/api/')) {
        const chunks=[]; for await (const c of req) chunks.push(c);
        const response=await handleAccountRequest(new Request(`${env.COACH_ALLOWED_ORIGIN}${req.url}`, { method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks).toString()}:{}) }),env);
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
      }
      if (req.url==='/app.js'||req.url==='/app.css') {res.setHeader('content-type',req.url.endsWith('.js')?'application/javascript':'text/css');res.end(await readFile(join(temporary,req.url.slice(1))));return;}
      res.setHeader('content-type','text/html');res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FDE Coach account tests</title><link rel="stylesheet" href="/app.css"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#fbfcfd}header.site-header{padding:16px 24px;border-bottom:1px solid #ddd}main{max-width:1160px;margin:auto;padding:20px}.test-label{font-size:12px;color:#824100}</style><header class="site-header">FDE COMMONS / by AIR <span class="test-label">LOCAL TEST: synthetic sign-in and AI</span></header><main id="app"></main><script type="module" src="/app.js"></script></html>`);
    } catch {res.statusCode=500;res.end('Local test failed');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));env.COACH_ALLOWED_ORIGIN=`http://127.0.0.1:${server.address().port}`;
  const now=Math.floor(Date.now()/1000),enc=s=>Buffer.from(JSON.stringify(s)).toString('base64url');
  const unsigned=`${enc({alg:'RS256',typ:'JWT',cat:'cl_B7d4PD111AAA',kid:'local'})}.${enc({sub:'user_fixture',sid:'sess_fixture',azp:env.COACH_ALLOWED_ORIGIN,iss:env.CLERK_ISSUER,iat:now,nbf:now-1,exp:now+3600,v:2})}`;
  bearer=`${unsigned}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(unsigned))).toString('base64url')}`;
  const mock=`export class Clerk {constructor(){this.session=localStorage.getItem('signed')?this.make():null;} make(){return {id:'sess_fixture',getToken:async()=>${JSON.stringify(bearer)}}} async load(){} addListener(fn){this.listener=fn;fn({session:this.session});return()=>{}} openSignIn(){localStorage.setItem('signed','yes');this.session=this.make();this.listener({session:this.session})} async signOut(){localStorage.removeItem('signed');this.session=null;this.listener({session:null})}}`;
  await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import FdeCoach from './learn/src/components/fde-coach/FdeCoach';createRoot(document.getElementById('app')).render(<FdeCoach aiBeta accountsEnabled researchEnabled={${research}} clerkKey="synthetic"/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',outfile:join(temporary,'app.js'),jsx:'automatic',alias:{react:join(process.cwd(),'learn/node_modules/react'),'react-dom':join(process.cwd(),'learn/node_modules/react-dom')},plugins:[{name:'synthetic-clerk-only',setup(b){b.onResolve({filter:/^@clerk\/clerk-js$/},()=>({path:'clerk-fixture',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:mock,loader:'js'}));}}]});
  browser=await chromium.launch({executablePath:process.env.AIR_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser exception:',e.message);});
  await page.goto(env.COACH_ALLOWED_ORIGIN+'/coach/');
  await page.getByRole('button',{name:'Sign in with Google or GitHub'}).click();
  await page.getByText('10 of 10 free AI replies available today').waitFor();check('signed-in allowance is visible');
  if(research){
    await page.getByText('Optional coaching research',{exact:true}).click();
    const checkbox=page.getByRole('checkbox',{name:'I choose to enable selected contributions for private research.'});
    check('research is unchecked by default',!(await checkbox.isChecked()));
    check('consent cannot be submitted unchecked',await page.getByRole('button',{name:'Enable selected research contributions'}).isDisabled());
    await page.screenshot({path:join(artifacts,'desktop-research-consent.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(artifacts,'mobile-research-consent.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:1440,height:1100});
    await checkbox.check();await page.getByRole('button',{name:'Enable selected research contributions'}).click();
    await page.getByRole('button',{name:'Withdraw research consent and delete contributions'}).waitFor();check('research opt-in is explicit');
    await page.getByText('Optional coaching research',{exact:true}).click();
  }

  await page.getByText('Your learning and data',{exact:true}).click();
  await page.getByLabel('Your experience',{exact:true}).fill('I build fictional order APIs');
  await page.getByLabel('Your learning goal',{exact:true}).fill('Explain retry safety to customers');
  await page.getByRole('button',{name:'Save experience and goal'}).click();
  await page.getByText('Experience and goal saved.').waitFor();check('experience and goal save');
  await page.screenshot({path:join(artifacts,'desktop-account.png'),fullPage:true,animations:"disabled"});
  await page.getByText('Your learning and data',{exact:true}).click();
  await page.getByRole('button',{name:/Become an FDE/}).first().click();
  await page.getByText('Coach intake',{exact:true}).waitFor();
  await page.getByLabel('Ask your FDE Coach',{exact:true}).fill('I build APIs. Explain safe retries.');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await page.getByText('9 of 10 free AI replies available today').waitFor();check('AI response decrements allowance');
  if(research){
    await page.getByRole('button',{name:'Review research contribution'}).last().click();
    await page.getByRole('heading',{name:'Review this selected exchange'}).waitFor();check('selected contribution has a review preview');
    await page.screenshot({path:join(artifacts,'desktop-research-preview.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(artifacts,'mobile-research-preview.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:1440,height:1100});
    await page.getByRole('button',{name:'Contribute this selected exchange'}).click();
    await page.getByText('Selected exchange contributed privately. It is not published or approved for training.').waitFor();check('only the selected exchange is contributed');
  }

  await page.getByRole('button',{name:'Helpful',exact:true}).last().click();await page.getByText('Feedback saved. Thank you.').last().waitFor();check('helpful feedback saves');
  await page.getByRole('button',{name:'I completed this next step',exact:true}).last().click();await page.getByText('Next step marked complete.').last().waitFor();check('completion is explicitly reported');
  await page.screenshot({path:join(artifacts,'desktop-conversation.png'),fullPage:true,animations:"disabled"});
  let lost=false;
  await page.route('**/api/coach-account/message',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.getByLabel('Ask your FDE Coach',{exact:true}).fill('What should a duplicate request test assert?');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await page.getByRole('button',{name:'Retry last request'}).click();
  await page.getByText('8 of 10 free AI replies available today').waitFor();check('interrupted reply retries without duplicate charge',calls===2);
  await page.reload();await page.getByText('8 of 10 free AI replies available today').waitFor();
  await page.getByText('Your learning and data',{exact:true}).click();await page.getByRole('button',{name:/Resume become conversation/}).first().click();
  await page.getByText('What should a duplicate request test assert?',{exact:true}).waitFor();check('saved conversation resumes after reload');check('saved feedback and completion resume visibly',await page.getByRole('button',{name:'You reported this step complete',exact:true}).count()===1);
  await page.setViewportSize({width:390,height:844});
  await page.getByText('Your learning and data',{exact:true}).click();
  await page.screenshot({path:join(artifacts,'mobile-conversation.png'),fullPage:true,animations:"disabled"});
  check('mobile has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const transcript=page.getByRole('log',{name:'FDE Coach conversation'});check('transcript exposes live log semantics',await transcript.getAttribute('aria-live')==='polite');
  await page.getByText('Your learning and data',{exact:true}).click();
  await page.screenshot({path:join(artifacts,'mobile-account.png'),fullPage:true,animations:"disabled"});

  if(research){
    await page.getByText('Optional coaching research',{exact:true}).click();await page.getByRole('button',{name:'Withdraw research consent and delete contributions'}).click();
    await page.getByRole('checkbox',{name:'I choose to enable selected contributions for private research.'}).waitFor();
    check('withdrawal removes contribution controls',await page.getByRole('button',{name:'Review research contribution'}).count()===0);
    await page.getByText('8 of 10 free AI replies available today').waitFor();check('research participation does not change free allowance');
  }
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export my Coach data'}).click();check('export downloads private account JSON',(await download).suggestedFilename()==='fde-coach-data.json');
  let exportRelease,exportEntered;const exporting=new Promise(r=>exportEntered=r),blockedExport=new Promise(r=>exportRelease=r);let lateDownloads=0;page.on('download',()=>lateDownloads++);
  await page.route('**/api/coach-account/export',async route=>{const response=await route.fetch();exportEntered();await blockedExport;try{await route.fulfill({response});}catch{}});
  await page.getByRole('button',{name:'Export my Coach data'}).click();await exporting;
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in with Google or GitHub'}).waitFor();exportRelease();await page.waitForTimeout(150);
  check('sign-out clears private conversation',await page.getByRole('log').count()===0);check('interrupted export cannot download after sign-out',lateDownloads===0);
  check('no browser exceptions',errors.length===0);
  await writeFile(join(artifacts,'checks.json'),JSON.stringify({fixture:'synthetic identity and model; actual account routes, D1 and DO',checks},null,2));
  console.log(`Passed ${checks.length} account browser checks. Synthetic identity/model only. Evidence: ${artifacts}`);
} finally {await browser?.close();await new Promise(r=>server?server.close(r):r());await mf?.dispose();await rm(temporary,{recursive:true,force:true});}
