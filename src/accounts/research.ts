import { AdmissionError } from '../security/types';
import { privateId } from './auth';
import { readLimitedText } from '../security/body';
import { redactResearch, REDACTION_VERSION } from './research-redaction';
import type { Account, AccountEnv } from './types';
export const CONSENT_VERSION='coach-private-research-v1';
const DAY=86_400_000;
type Consent={enabled:number;participant:string;epoch:string;version:string;updated:number};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
async function consent(env:AccountEnv,owner:string){return env.COACH_DB!.prepare('SELECT * FROM coach_research_consent WHERE owner=?').bind(owner).first<Consent>();}
export async function researchExport(env:AccountEnv,owner:string){
  const choice=await consent(env,owner);
  const rows=await env.COACH_DB!.prepare(`SELECT e.id,e.created,e.expires,e.state FROM coach_research_examples e JOIN coach_research_links l ON l.contribution=e.id WHERE l.owner=? AND e.expires>? ORDER BY e.created DESC LIMIT 200`).bind(owner,Date.now()).all();
  const count=await env.COACH_DB!.prepare(`SELECT COUNT(*) AS n FROM coach_research_examples e JOIN coach_research_links l ON l.contribution=e.id WHERE l.owner=? AND e.expires>?`).bind(owner,Date.now()).first<{n:number}>();
  return {consent:{enabled:Boolean(choice?.enabled),version:choice?.version??CONSENT_VERSION,updated:choice?.updated??null},contributions:rows.results,contributionCount:count?.n??0};
}
export async function researchPreview(env:AccountEnv,profile:Account,operation:unknown){
  if(typeof operation!=='string'||!/^[a-f0-9]{64}$/.test(operation))throw new AdmissionError(404,'Selected response unavailable.');
  const row=await env.COACH_DB!.prepare(`SELECT m.question,m.response,m.metadata,m.created,m.revision,m.conversation,c.goal FROM coach_messages m JOIN coach_conversations c ON c.id=m.conversation WHERE m.operation=? AND m.owner=? AND c.owner=? AND c.expires>? AND m.revision>0`).bind(operation,profile.id,profile.id,Date.now()).first<any>();
  if(!row)throw new AdmissionError(404,'Selected response unavailable.');
  const recent=await env.COACH_DB!.prepare(`SELECT question,response FROM coach_messages WHERE owner=? AND conversation=? AND revision>0 AND revision<? ORDER BY revision DESC LIMIT 2`).bind(profile.id,row.conversation,row.revision).all<any>();
  const feedback=await env.COACH_DB!.prepare('SELECT rating,completed FROM coach_feedback WHERE operation=? AND owner=?').bind(operation,profile.id).first<any>();
  let redactions=0;
  const red=(v:string)=>{const r=redactResearch(v);redactions+=r.redactions;return r.text;};
  const reply=JSON.parse(row.response),metadata=JSON.parse(row.metadata);
  const result={schemaVersion:1,question:red(row.question),context:recent.results.reverse().flatMap(m=>[{role:'learner',text:red(m.question.slice(0,700))},{role:'coach',text:red(JSON.parse(m.response).answer.slice(0,700))}]),originalResponse:red(`${reply.answer}${reply.question?'\n'+reply.question:''}`),learningGoal:red(profile.goal),skillCategory:row.goal,model:metadata.model,promptVersion:metadata.promptVersion,retrievalVersion:metadata.retrievalVersion,sourceIds:metadata.resourceIds,mode:reply.mode,feedback:feedback?.rating??null,explicitlyReportedOutcome:feedback?.completed?'learner_reported_step_complete':null,responseCreatedAt:row.created,latencyMs:metadata.latencyMs,tokens:metadata.tokens,usageComplete:metadata.usageComplete,redactionVersion:REDACTION_VERSION,redactions:0};
  result.redactions=redactions;return result;
}
export async function handleResearchRequest(request:Request,env:AccountEnv,profile:Account):Promise<Response>{
  const action=new URL(request.url).pathname.split('/').pop(),db=env.COACH_DB!,now=Date.now();
  if(request.method==='GET'&&action==='research')return json({available:env.FDE_COACH_RESEARCH_ENABLED==='true',...(await researchExport(env,profile.id))});
  if(request.method==='GET'&&action==='research-preview'){
    if(env.FDE_COACH_RESEARCH_ENABLED!=='true')throw new AdmissionError(503,'Research contributions are paused.');
    return json(await researchPreview(env,profile,new URL(request.url).searchParams.get('operation')));
  }
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const b=JSON.parse(await readLimitedText(request,1000));
  if(!b||typeof b!=='object'||Array.isArray(b))throw new AdmissionError(400,'Invalid research request.');
  if(action==='research-consent'){
    if(Object.keys(b).some(k=>!['enabled','version'].includes(k))||typeof b.enabled!=='boolean'||(b.enabled&&b.version!==CONSENT_VERSION))throw new AdmissionError(400,'Review the current research consent.');
    if(!b.enabled){
      // Trigger removes examples, reviews and dataset memberships in the same transaction.
      await db.prepare(`UPDATE coach_research_consent SET enabled=0,participant='',epoch=?,updated=? WHERE owner=?`).bind(crypto.randomUUID(),now,profile.id).run();
      return json({ok:true,consent:false});
    }
    if(env.FDE_COACH_RESEARCH_ENABLED!=='true')throw new AdmissionError(503,'Research contributions are paused.');
    await db.prepare(`INSERT INTO coach_research_consent(owner,enabled,participant,epoch,version,updated) SELECT id,1,?,?,?,? FROM coach_accounts WHERE id=? AND generation=? AND deleted=0 ON CONFLICT(owner) DO UPDATE SET enabled=1,participant=CASE WHEN coach_research_consent.enabled=1 THEN coach_research_consent.participant ELSE excluded.participant END,epoch=CASE WHEN coach_research_consent.enabled=1 THEN coach_research_consent.epoch ELSE excluded.epoch END,version=excluded.version,updated=excluded.updated`).bind(crypto.randomUUID(),crypto.randomUUID(),CONSENT_VERSION,now,profile.id,profile.generation).run();
    return json({ok:true,consent:true});
  }
  if(action!=='research-contribute')return json({error:'Not found'},404);
  if(env.FDE_COACH_RESEARCH_ENABLED!=='true')throw new AdmissionError(503,'Research contributions are paused.');
  if(Object.keys(b).some(k=>k!=='operation'))throw new AdmissionError(400,'Select one exchange.');
  const choice=await consent(env,profile.id);
  if(!choice?.enabled||choice.version!==CONSENT_VERSION)throw new AdmissionError(403,'Research consent is required. Free coaching is unchanged.');
  const key=request.headers.get('idempotency-key');
  if(!key||!/^[a-zA-Z0-9_-]{16,128}$/.test(key))throw new AdmissionError(400,'A valid Idempotency-Key is required.');
  const preview=await researchPreview(env,profile,b.operation);
  const requestKey=await privateId(env,'research-request',JSON.stringify([profile.id,choice.epoch,key]));
  const contribution=await privateId(env,'research-contribution',JSON.stringify([profile.id,choice.epoch,b.operation]));
  const prior=await db.prepare('SELECT source_operation FROM coach_research_requests WHERE request_key=?').bind(requestKey).first<any>();
  if(prior&&prior.source_operation!==b.operation)throw new AdmissionError(409,'Research key conflict.');
  const {originalResponse,...payload}=preview;
  try {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO coach_research_examples(id,participant,payload,original_response,created,expires) SELECT ?,?,?,?,?,? FROM coach_research_consent c JOIN coach_accounts a ON a.id=c.owner WHERE c.owner=? AND c.enabled=1 AND c.epoch=? AND a.generation=? AND a.deleted=0`).bind(contribution,choice.participant,JSON.stringify(payload),originalResponse,now,now+30*DAY,profile.id,choice.epoch,profile.generation),
      db.prepare(`INSERT OR IGNORE INTO coach_research_links(contribution,owner,source_operation,epoch) SELECT id,?,?,? FROM coach_research_examples WHERE id=?`).bind(profile.id,b.operation,choice.epoch,contribution),
      // A concurrent different-payload key collision rolls the entire batch back.
      db.prepare(`INSERT INTO coach_research_requests(request_key,source_operation,contribution) SELECT ?,?,id FROM coach_research_examples WHERE id=? ON CONFLICT(request_key) DO UPDATE SET source_operation=CASE WHEN coach_research_requests.source_operation=excluded.source_operation THEN excluded.source_operation ELSE NULL END`).bind(requestKey,b.operation,contribution),
    ]);
  }catch{throw new AdmissionError(409,'Research contribution changed. Review it and retry.');}
  const saved=await db.prepare('SELECT contribution FROM coach_research_links WHERE owner=? AND contribution=? AND epoch=?').bind(profile.id,contribution,choice.epoch).first();
  if(!saved)throw new AdmissionError(403,'Research consent changed. Nothing was contributed.');
  return json({ok:true,contribution,publicationAllowed:false,trainingAllowed:false});
}
