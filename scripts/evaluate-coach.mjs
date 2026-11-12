import { readFile, writeFile, mkdir, mkdtemp, rm, open, realpath } from 'node:fs/promises';
import { resolve, join, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const [mode='smoke',...args]=process.argv.slice(2);
const option=(name,fallback)=>{const index=args.indexOf(name);return index<0?fallback:args[index+1];};
async function privateOutput(path) {
  const out=resolve(path||join(tmpdir(),`coach-model-${randomUUID()}.json`));
  const parent=await realpath(dirname(out)),base=await realpath(tmpdir());
  if(parent!==base&&!parent.startsWith(base+sep))throw new Error('Provider artifacts must remain in the private temporary workspace, outside public repositories.');
  return {out,file:await open(out,'wx',0o600)};
}
const temporary=await mkdtemp(join(tmpdir(),'coach-eval-'));
try {
  const source=`export {smokeSuite} from './eval/coach/evaluate.ts'; export {runProviderSuite,validateApproval,joinOwnerTelemetry,projectOwnerTelemetry} from './eval/coach/provider.ts'; export {createChatClient} from './learn/src/components/fde-coach/chat-api.ts';`;
  const compiled=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
  await writeFile(join(temporary,'evaluation.mjs'),compiled.outputFiles[0].text);
  const api=await import(pathToFileURL(join(temporary,'evaluation.mjs')).href);
  if(mode==='smoke') {
    const result=api.smokeSuite(),out=resolve('docs/coach-evaluation/deterministic-results.json');
    await mkdir(resolve('docs/coach-evaluation'),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n');
    console.log(`${result.structuralCasesPassed} synthetic reference fixtures passed. Provider calls: 0. Human/model signoff: pending.`);
  } else if(mode==='provider') {
    if(!args.includes('--allow-provider'))throw new Error('Provider execution requires explicit --allow-provider and an owner approval file.');
    const approval=JSON.parse(await readFile(option('--approval',''),'utf8'));
    const count=Number(option('--count','3')),start=Number(option('--start','0')),budget=Number(option('--attempt-budget','12'));
    api.validateApproval(approval,count,budget);
    const output=await privateOutput(option('--out'));
    const out=output.out;
    const nativeFetch=globalThis.fetch;
    try {
    const access=JSON.parse(await readFile(option('--access-headers',''),'utf8'));
    if(Object.keys(access).some(key=>!['cf-access-client-id','cf-access-client-secret'].includes(key.toLowerCase()))||!Object.values(access).every(value=>typeof value==='string'))throw new Error('Only owner-supplied private Access headers are accepted.');
    globalThis.fetch=(path,init={})=>{
      if(typeof path!=='string'||!path.startsWith('/api/coach-chat/'))throw new Error('Unexpected provider-evaluation endpoint.');
      return nativeFetch(approval.origin+path,{...init,headers:{...Object.fromEntries(new Headers(init.headers)),...access},redirect:'error'});
    };
      const result=await api.runProviderSuite(approval,{start,count,budget},{createClient:api.createChatClient,health:async()=>{
        const response=await globalThis.fetch('/api/coach-chat/health',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Preview health unavailable');return response.json();
      }});
      await output.file.writeFile(JSON.stringify(result,null,2)+'\n');console.log(`Private synthetic run written to ${out}. Cost/model projection and human review are still required.`);
    } finally {globalThis.fetch=nativeFetch;await output.file.close();}
  } else if(mode==='projection') {
    const run=JSON.parse(await readFile(option('--run',''),'utf8')),rows=JSON.parse(await readFile(option('--kv-export',''),'utf8'));
    const output=await privateOutput(option('--out'));try {await output.file.writeFile(JSON.stringify(api.projectOwnerTelemetry(run,rows),null,2)+'\n');} finally {await output.file.close();}
    console.log(`Metadata-only private projection written to ${output.out}. Cached bodies and credentials are excluded.`);
  } else if(mode==='report') {
    const output=await privateOutput(option('--out'));
    try {
    const run=JSON.parse(await readFile(option('--run',''),'utf8')),telemetry=JSON.parse(await readFile(option('--telemetry',''),'utf8'));
    await output.file.writeFile(JSON.stringify(api.joinOwnerTelemetry(run,telemetry),null,2)+'\n');} finally {await output.file.close();}
    console.log(`Owner metadata joined at ${output.out}. Human signoff remains pending; no quality pass is inferred.`);
  } else throw new Error('Use smoke, provider, projection, or report.');
} catch(error) {
  if(mode==='smoke')throw error;
  console.error('Evaluation aborted. Check owner approval, exact versions, private paths/access, and input schema. No automatic retry was made; an interrupted provider outcome can remain unknown.');process.exitCode=1;
} finally {await rm(temporary,{recursive:true,force:true});}
