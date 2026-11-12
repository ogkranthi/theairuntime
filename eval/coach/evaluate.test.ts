import { expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { CASES, DATASET_DIGEST, smokeSuite, scoreResponse, validateDataset, validateReferenceReviews } from './evaluate';
import { validateApproval, runProviderSuite, projectOwnerTelemetry, joinOwnerTelemetry, type Approval } from './provider';
import { PROMPT_VERSION } from '../../src/coach-chat/prompt';
import { RETRIEVAL_VERSION, CATALOG } from '../../src/coach-chat/retrieval';
import type { createChatClient } from '../../learn/src/components/fde-coach/chat-api';
function approval():Approval {return {origin:'https://theairuntime-coach-review.synthetic.workers.dev',datasetDigest:DATASET_DIGEST,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,approvedForSyntheticInference:true,isolatedKvAndDoReviewed:true,privateAccessReviewed:true,noProductionData:true,expiresAt:new Date(Date.now()+3_600_000).toISOString(),expectedPrimaryModel:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',maxCases:3,maxAttempts:12};}
const health={enabled:true,aiConfigured:true,securityConfigured:true,captureEnabled:false,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION};
function fakeClient() {
  const token=`chat1.${Buffer.from(JSON.stringify({sessionId:crypto.randomUUID()})).toString('base64url')}.fixture`;
  const reply={token,goal:'skills',turn:1,remainingTurns:9,mode:'ai',answer:CASES[0].reference.answer,question:CASES[0].reference.question,gaps:[],nextStep:CASES[0].reference.nextStep,sources:[],done:false};
  return {start:vi.fn(async()=>({...reply,turn:0,mode:'intake'})),message:vi.fn(async()=>reply),acknowledge:vi.fn(),abandon:vi.fn()} as unknown as ReturnType<typeof createChatClient>;
}
it('covers 40 synthetic FDE cases and all seven categories without model signoff',()=>{expect(validateDataset()).toMatchObject({caseCount:40,categories:7});const report=smokeSuite();expect(report.structuralCasesPassed).toBe(40);expect(report.providerCalls).toBe(0);expect(report.humanSignoffs).toBe(0);expect(report.releaseQualified).toBe(false);});
it('does not treat matching words as correctness or human approval',()=>{const score=scoreResponse(CASES[0],{answer:'working tree index commit '.repeat(6),question:'What did you change?',nextStep:{task:'Do something',definitionOfDone:'Done'},mode:'ai',sources:[]});expect(score.heuristics.conceptCoverage).toBe(1);expect(score.humanJudgment.fdeCorrectness).toBe('pending');expect(score.releaseQualified).toBe(false);});
it.each([
  {answer:'I deployed your branch and you are 95% job ready',question:'First? Second?',sources:[],mode:'ai'},
  {answer:'A useful answer',question:'One?',sources:[{...CATALOG[0],href:'https://evil.test'}],mode:'ai'},
  {answer:'Read https://evil.test for proof',question:'One?',sources:[],mode:'ai'},
  {answer:'Written fallback',question:'One?',sources:[],mode:'fallback'},
])('flags critical unsupported claims, unknown URLs and non-model output (%j)',reply=>{expect(scoreResponse(CASES[0],{...reply,nextStep:null} as any).criticalFailures.length).toBeGreaterThan(0);});
it.each([
  {approvedForSyntheticInference:false},{isolatedKvAndDoReviewed:false},{privateAccessReviewed:false},{noProductionData:false},
  {origin:'https://learn.theairuntime.com'},{origin:'http://theairuntime-coach-review.synthetic.workers.dev'},{origin:'https://evil.test'},
  {expiresAt:'2000-01-01'},{expiresAt:'invalid'},{datasetDigest:'changed'},{promptVersion:'changed'},{retrievalVersion:'changed'},
])('blocks unapproved or mismatched provider execution before any client call (%j)',async mutation=>{
  const createClient=vi.fn(fakeClient),readHealth=vi.fn(async()=>health);
  await expect(runProviderSuite({...approval(),...mutation},{start:0,count:3,budget:12},{createClient,health:readHealth})).rejects.toThrow();expect(createClient).not.toHaveBeenCalled();expect(readHealth).not.toHaveBeenCalled();
});
it.each([[40,160],[3,2],[3,500],[0,0],[4,16]])('enforces small owner-approved batches and conservative budgets (%s/%s)',(count,budget)=>{expect(()=>validateApproval(approval(),count,budget)).toThrow();});
it('performs exactly one start and two bounded message operations per approved synthetic case',async()=>{const clients:ReturnType<typeof createChatClient>[]=[];const result=await runProviderSuite(approval(),{start:0,count:3,budget:12},{health:async()=>health,createClient:()=>{const client=fakeClient();clients.push(client);return client;}});expect(result.results).toHaveLength(3);expect(result.attemptUpperBoundUsed).toBe(12);for(const client of clients){expect(client.start).toHaveBeenCalledTimes(1);expect(client.message).toHaveBeenCalledTimes(2);}expect(JSON.stringify(result)).not.toContain('chat1.');expect(result.actualModelQualitySignoff).toBe(false);});
it('halts on uncertainty with no automatic retry or replacement case',async()=>{const client=fakeClient();vi.mocked(client.message).mockRejectedValueOnce(new Error('lost'));const createClient=vi.fn(()=>client);const result=await runProviderSuite(approval(),{start:0,count:3,budget:12},{health:async()=>health,createClient});expect(result.results).toHaveLength(1);expect(result.results[0]).toMatchObject({status:'outcome_unknown',automaticRetry:false});expect(client.message).toHaveBeenCalledTimes(1);expect(createClient).toHaveBeenCalledTimes(1);});
it('does not score deterministic fallback as a provider-model response',async()=>{const client=fakeClient();vi.mocked(client.message).mockResolvedValueOnce({...await client.start('skills'),mode:'fallback'});const result=await runProviderSuite(approval(),{start:0,count:1,budget:4},{health:async()=>health,createClient:()=>client});expect(result.results[0]).toMatchObject({status:'blocked_fallback'});});
it('requires matching enabled preview health and capture disabled',async()=>{const createClient=vi.fn(fakeClient);await expect(runProviderSuite(approval(),{start:0,count:1,budget:4},{health:async()=>({...health,captureEnabled:true}),createClient})).rejects.toThrow();expect(createClient).not.toHaveBeenCalled();});
it('projects only metadata from matched synthetic-session records, excluding bodies and credentials',()=>{
  const hash=createHash('sha256').update('synthetic-session').digest('hex'),metadata={model:approval().expectedPrimaryModel,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,attempts:1,tokens:120,usageComplete:true};
  const projection=projectOwnerTelemetry({mode:'approved-preview-provider-run',syntheticOnly:true,datasetDigest:DATASET_DIGEST,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,results:[{id:'fde-01',correlationHash:hash}]},[1,2].map(turn=>({key:`security:result:synthetic-session:key-${turn}:nonce`,value:{metadata,body:{turn,token:'PRIVATE_TOKEN',answer:'PRIVATE_BODY',profile:'PRIVATE_PROFILE'}}})));
  expect(projection[0]).toMatchObject({attempts:2,tokens:240,costUsd:null});expect(JSON.stringify(projection)).not.toMatch(/PRIVATE_|synthetic-session/);
});
it('records actual models and owner cost estimates only with complete reviewed usage',()=>{
  const run={mode:'approved-preview-provider-run',syntheticOnly:true,datasetDigest:DATASET_DIGEST,results:[{id:'fde-01'}],promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION};const row={caseId:'fde-01',model:approval().expectedPrimaryModel,contextModel:approval().expectedPrimaryModel,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,attempts:2,tokens:240,costUsd:.001,costSource:'owner-reviewed-billing-or-priced-usage',usageComplete:false};
  expect(joinOwnerTelemetry(run,[row]).results[0].costUsd).toBeNull();expect(joinOwnerTelemetry(run,[{...row,usageComplete:true}]).results[0]).toMatchObject({actualModel:row.model,costUsd:.001,costStatus:'owner-provided-estimate'});expect(()=>joinOwnerTelemetry(run,[row,row])).toThrow('Duplicate');
});
it('CLI provider mode is explicitly opt-in and never the default smoke path',()=>{expect(()=>execFileSync(process.execPath,['scripts/evaluate-coach.mjs','provider'],{stdio:'pipe'})).toThrow();expect(CASES.every(item=>item.context.priorLearnerMessages.length===0)).toBe(true);});

it('requires explicit version-bound human reference signoff, never helpfulness or model labels',()=>{
  const review={caseId:'fde-01',source:'human',decision:'approved',reviewer:'synthetic-owner-review-fixture',reviewedAt:new Date(Date.now()-1000).toISOString(),notes:'Synthetic mechanical fixture only; no actual human approval recorded.'};
  const document={rubricVersion:'fde-rubric-v1',datasetDigest:DATASET_DIGEST,reviews:[review]};
  expect(validateReferenceReviews(document)).toHaveLength(1);
  for(const change of [{source:'llm'},{source:'thumbs-up'},{reviewer:''},{decision:'helpful'}])expect(()=>validateReferenceReviews({...document,reviews:[{...review,...change}]})).toThrow();
  expect(()=>validateReferenceReviews({...document,datasetDigest:'old'})).toThrow();
});

it('rejects arbitrary or private run imports rather than treating them as synthetic evaluation data',()=>{expect(()=>projectOwnerTelemetry({results:[],syntheticOnly:false},[])).toThrow('synthetic');expect(()=>joinOwnerTelemetry({results:[],promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION},[])).toThrow('synthetic');});

it('CLI metadata projection is private, excludes cached bodies, and refuses overwrite',async()=>{
  const {mkdtempSync,writeFileSync,readFileSync,statSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const directory=mkdtempSync(join(tmpdir(),'coach-private-projection-'));
  try {
    const hash=createHash('sha256').update('synthetic-session').digest('hex');
    const run={mode:'approved-preview-provider-run',syntheticOnly:true,datasetDigest:DATASET_DIGEST,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,results:[{id:'fde-01',correlationHash:hash}]};
    const metadata={model:approval().expectedPrimaryModel,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,attempts:1,tokens:100,usageComplete:true};
    const rows=[1,2].map(turn=>({key:`security:result:synthetic-session:key-${turn}:nonce`,value:{body:{turn,answer:'PRIVATE_CACHED_TEXT',token:'PRIVATE_CREDENTIAL'},metadata}}));
    const runFile=join(directory,'run.json'),kvFile=join(directory,'kv.json'),output=join(directory,'projection.json');writeFileSync(runFile,JSON.stringify(run));writeFileSync(kvFile,JSON.stringify(rows));
    const args=['scripts/evaluate-coach.mjs','projection','--run',runFile,'--kv-export',kvFile,'--out',output];execFileSync(process.execPath,args,{stdio:'pipe'});
    expect(statSync(output).mode&0o777).toBe(0o600);expect(readFileSync(output,'utf8')).not.toMatch(/PRIVATE_|synthetic-session/);expect(()=>execFileSync(process.execPath,args,{stdio:'pipe'})).toThrow();
  } finally {rmSync(directory,{recursive:true,force:true});}
});
it('CLI refuses to put provider reports in the public repository',async()=>{
  const {existsSync,rmSync}=await import('node:fs');const out='docs/coach-evaluation/forbidden-private-result.json';
  try {expect(()=>execFileSync(process.execPath,['scripts/evaluate-coach.mjs','report','--out',out],{stdio:'pipe'})).toThrow();expect(existsSync(out)).toBe(false);}finally{rmSync(out,{force:true});}
});

it('keeps failed/partial model telemetry unknown instead of fabricating a model or zero cost',()=>{
  const run={mode:'approved-preview-provider-run',syntheticOnly:true,datasetDigest:DATASET_DIGEST,results:[{id:'fde-01',status:'blocked_fallback'}],promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION};
  const row={caseId:'fde-01',model:null,attempts:1,tokens:null,usageComplete:false,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,outcome:'fallback',errorCategory:'usage_limit',resourceIds:['asd-03']};
  expect(joinOwnerTelemetry(run,[row]).results[0]).toMatchObject({actualModel:null,costUsd:null,outcome:'fallback',errorCategory:'usage_limit'});
  expect(()=>joinOwnerTelemetry(run,[{...row,resourceIds:['https://evil.test']}])).toThrow('resource');
});
