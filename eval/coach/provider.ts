import { createHash } from 'node:crypto';
import { CASES, DATASET_DIGEST, validateDataset, RUBRIC_VERSION, scoreResponse } from './evaluate';
import { PROMPT_VERSION } from '../../src/coach-chat/prompt';
import { RETRIEVAL_VERSION, CATALOG } from '../../src/coach-chat/retrieval';
import type { createChatClient } from '../../learn/src/components/fde-coach/chat-api';
export type Approval = {
  origin:string; datasetDigest:string; promptVersion:string; retrievalVersion:string; approvedForSyntheticInference:boolean; isolatedKvAndDoReviewed:boolean; privateAccessReviewed:boolean;
  noProductionData:boolean; expiresAt:string; expectedPrimaryModel:string; maxCases:number; maxAttempts:number;
};
export function validateApproval(approval:Approval,count:number,budget:number) {
  validateDataset();
  if(approval.datasetDigest!==DATASET_DIGEST||approval.promptVersion!==PROMPT_VERSION||approval.retrievalVersion!==RETRIEVAL_VERSION)throw new Error('Owner approval must match the exact cases, prompt, and retrieval versions.');
  const url=new URL(approval.origin);
  if(url.protocol!=='https:'||url.origin!==approval.origin||url.username||url.password||!url.hostname.endsWith('.workers.dev')||!url.hostname.includes('coach-review'))throw new Error('An exact approved isolated Coach Workers.dev origin is required; production and arbitrary hosts are forbidden.');
  if(!approval.approvedForSyntheticInference||!approval.isolatedKvAndDoReviewed||!approval.privateAccessReviewed||!approval.noProductionData||Date.parse(approval.expiresAt)<=Date.now()||!Number.isFinite(Date.parse(approval.expiresAt)))throw new Error('Owner inference/isolation/access approval is missing or expired.');
  if(!Number.isInteger(count)||count<1||count>10||count>approval.maxCases||!Number.isInteger(budget)||budget<count*4||budget>40||budget>approval.maxAttempts)throw new Error('Use batches of at most 10 cases with a conservative four-attempt budget per case, within the owner-approved limit.');
  if(!/^@cf\/[a-z0-9_./-]+$/.test(approval.expectedPrimaryModel))throw new Error('Expected model must be explicit.');
}
export async function runProviderSuite(approval:Approval,options:{start:number;count:number;budget:number},dependencies:{createClient:typeof createChatClient;health:()=>Promise<{enabled:boolean;aiConfigured:boolean;securityConfigured:boolean;captureEnabled:boolean;promptVersion:string;retrievalVersion:string}>}) {
  validateApproval(approval,options.count,options.budget);
  if(!Number.isInteger(options.start)||options.start<0||options.start+options.count>CASES.length)throw new Error('Invalid case range.');
  const health=await dependencies.health();
  if(!health.enabled||!health.aiConfigured||!health.securityConfigured||health.captureEnabled||health.promptVersion!==PROMPT_VERSION||health.retrievalVersion!==RETRIEVAL_VERSION)throw new Error('Preview must have matching versions, real AI, enforcement, and capture disabled.');
  const results:Record<string,unknown>[]=[];let upperBound=0;
  for(const item of CASES.slice(options.start,options.start+options.count)) {
    const client=dependencies.createClient(),began=Date.now();
    let correlationHash:string|null=null;
    try {
      const intake=await client.start(item.goal as Parameters<typeof client.start>[0]);client.acknowledge(intake);
      try { const id=JSON.parse(Buffer.from(intake.token.split('.')[1],'base64url').toString()).sessionId; if(typeof id==='string')correlationHash=createHash('sha256').update(id).digest('hex'); } catch { /* No credential is written to the report. */ }
      if(!correlationHash||results.some(row=>row.correlationHash===correlationHash))throw new Error('invalid_session_correlation');
      if(upperBound+2>options.budget)throw new Error('budget');upperBound+=2;
      const background=await client.message(intake.token,item.context.background,[]);client.acknowledge(background);
      if(background.mode!=='ai')throw new Error('fallback');
      if(upperBound+2>options.budget)throw new Error('budget');upperBound+=2;
      const reply=await client.message(background.token,item.question,[{role:'learner',text:item.context.background},{role:'coach',text:`${background.answer} ${background.question}`.slice(0,700)}]);
      if(reply.mode!=='ai')throw new Error('fallback');client.acknowledge(reply);
      results.push({id:item.id,correlationHash,category:item.category,expectedModel:approval.expectedPrimaryModel,actualModel:null,providerMetadataStatus:'owner-projection-required',latencyMs:Date.now()-began,modelAttempts:null,tokens:null,costUsd:null,costStatus:'unmeasured',reply:{answer:reply.answer,question:reply.question,nextStep:reply.nextStep,sources:reply.sources},...scoreResponse(item,reply)});
    } catch(error) {
      results.push({id:item.id,correlationHash,status:error instanceof Error&&error.message==='fallback'?'blocked_fallback':'outcome_unknown',automaticRetry:false,releaseQualified:false});
      client.abandon();break;
    }
    client.abandon();
  }
  return {mode:'approved-preview-provider-run',datasetDigest:DATASET_DIGEST,rubricVersion:RUBRIC_VERSION,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,origin:approval.origin,syntheticOnly:true,attemptUpperBoundUsed:upperBound,attemptBudget:options.budget,actualModelQualitySignoff:false,releaseQualified:false,results};
}
function assertSyntheticRun(run:Record<string,any>) {
  if(run.mode!=='approved-preview-provider-run'||run.syntheticOnly!==true||run.datasetDigest!==DATASET_DIGEST||run.promptVersion!==PROMPT_VERSION||run.retrievalVersion!==RETRIEVAL_VERSION||!Array.isArray(run.results)||run.results.some((row:any)=>!CASES.some(c=>c.id===row.id)))throw new Error('Only matching synthetic preview runs may be projected or reported.');
}
export function projectOwnerTelemetry(run:{results:Record<string,any>[];[key:string]:any},rows:{key:string;value:unknown}[]) {
  assertSyntheticRun(run);
  return run.results.flatMap(result=>{
    const relevant=rows.flatMap(row=>{
      const match=/^security:result:([^:]+):/.exec(row.key);
      if(!match||createHash('sha256').update(match[1]).digest('hex')!==result.correlationHash)return [];
      const value=typeof row.value==='string'?JSON.parse(row.value):row.value;
      const record=value as {metadata?:Record<string,any>;body?:{turn?:number}};
      return record.metadata&&[1,2].includes(record.body?.turn??-1)?[{turn:record.body!.turn,metadata:record.metadata}]:[];
    });
    if(relevant.filter(row=>row.turn===1).length!==1||relevant.filter(row=>row.turn===2).length!==1)return [];
    const context=relevant.find(row=>row.turn===1)?.metadata,answer=relevant.find(row=>row.turn===2)?.metadata;
    if(!context||!answer)return [];
    return [{caseId:result.id,templateId:answer.templateId??null,resourceIds:answer.resourceIds??null,contextResourceIds:context.resourceIds??null,outcome:answer.outcome??null,errorCategory:answer.errorCategory??null,model:answer.model,contextModel:context.model,promptVersion:answer.promptVersion,retrievalVersion:answer.retrievalVersion,attempts:context.attempts+answer.attempts,tokens:typeof context.tokens==='number'&&typeof answer.tokens==='number'?context.tokens+answer.tokens:null,usageComplete:context.usageComplete===true&&answer.usageComplete===true,costUsd:null,costSource:'unmeasured'}];
  });
}
export function joinOwnerTelemetry(run:{results:Record<string,any>[];promptVersion:string;retrievalVersion:string},telemetry:Record<string,any>[]) {
  assertSyntheticRun(run);
  if(new Set(telemetry.map(row=>row.caseId)).size!==telemetry.length)throw new Error('Duplicate telemetry case IDs.');
  return {...run,results:run.results.map(result=>{
    const record=telemetry.find(row=>row.caseId===result.id);
    if(!record)return result;
    if(record.promptVersion!==run.promptVersion||record.retrievalVersion!==run.retrievalVersion||(record.model!==null&&(typeof record.model!=='string'||!/^@cf\/[a-z0-9_./-]+$/.test(record.model)))||!Number.isInteger(record.attempts)||record.attempts<(result.status?0:2)||record.attempts>4)throw new Error('Invalid or mismatched owner telemetry projection.');
    for(const ids of [record.resourceIds,record.contextResourceIds])if(ids!=null&&(!Array.isArray(ids)||ids.length>3||ids.some(id=>typeof id!=='string'||!CATALOG.some(s=>s.id===id))))throw new Error('Unapproved telemetry resource IDs.');
    const costKnown=record.model!==null&&typeof record.costUsd==='number'&&Number.isFinite(record.costUsd)&&record.costUsd>=0&&record.costSource==='owner-reviewed-billing-or-priced-usage'&&record.usageComplete===true;
    return {...result,actualModel:record.model,templateId:typeof record.templateId==='string'&&/^mentor-[a-z]+$/.test(record.templateId)?record.templateId:null,resourceIds:record.resourceIds??null,contextResourceIds:record.contextResourceIds??null,outcome:['ai','fallback'].includes(record.outcome)?record.outcome:null,errorCategory:['usage_limit','admission_unavailable','timeout','provider_failure','model_output_invalid','input_budget','unsafe_instruction','ai_unavailable'].includes(record.errorCategory)?record.errorCategory:null,contextActualModel:typeof record.contextModel==='string'&&/^@cf\/[a-z0-9_./-]+$/.test(record.contextModel)?record.contextModel:null,modelAttempts:record.attempts,tokens:typeof record.tokens==='number'&&Number.isSafeInteger(record.tokens)&&record.tokens>=0?record.tokens:null,costUsd:costKnown?record.costUsd:null,costStatus:costKnown?'owner-provided-estimate':'unmeasured',providerMetadataStatus:'owner-projection',usageComplete:record.usageComplete===true};
  })};
}
