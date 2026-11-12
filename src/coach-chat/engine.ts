import { callModel, parseJsonObject } from '../fde-gym/model';
import { AdmissionError } from '../security/types';
import { sensitive } from './validation';
import { approvedSources, retrieve, RETRIEVAL_VERSION } from './retrieval';
import { buildChatPrompt, PROMPT_VERSION } from './prompt';
import type { ChatEnv, ChatState, ChatReply, ChatGoal, HistoryTurn, Profile } from './types';
export const CHAT_MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const MODEL_TIMEOUT_MS=4500;
export const MAX_OUTPUT_TOKENS=900;
const introductions:Record<ChatGoal,string>={
  become:'What have you personally built or operated that you would like to bring into FDE work?',
  interview:'Which project decision from your own work would you like to practice explaining in an FDE interview?',
  skills:'Which engineering skill would most improve a system you are building now?',
  design:'What customer outcome should the system you are designing achieve?',
  review:'Which architecture decision would you like to examine, using a fictional or non-sensitive example?',
  plan:'What have you built so far that your next learning task should build on?',
  story:'Which customer problem did your project solve?',
  general:'What engineering question or practical goal would you like to work through?',
};
export const openingQuestion=(goal:ChatGoal)=>introductions[goal];
function safeText(value:unknown,max:number,allowQuestion=false):value is string {
  return typeof value==='string'&&value.length<=max&&!/<\/?(?:script|iframe|img|a|style|form|svg|object)\b[^>]*>|https?:|www\.|javascript:|\]\(/i.test(value)&&!sensitive(value)
    && (allowQuestion||(value.replace(/```[\s\S]*?```/g,'').replace(/`[^`]*`/g,'').match(/\?/g)??[]).length===0)
    && !/job.ready\s*\d|\d+\s*%\s*(?:job|ready)|guarantee.{0,20}(?:job|hired)|I (?:ran|executed|deployed|emailed|subscribed|accessed your)|mock.{0,12}score|system prompt is/i.test(value);
}
function normalize(text:string){return text.replace(/[\u2013\u2014]/g,',');}
export function parseMentorResponse(value:unknown,state:ChatState,message:string,history:HistoryTurn[],retrieved:ChatReply['sources']) {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const v=value as Record<string,any>;
  const sources=approvedSources(v.sourceIds,retrieved);
  if(!safeText(v.answer,1800)||!v.answer.trim()||!safeText(v.question,240,true)||(v.question.match(/\?/g)??[]).length>1||(v.question&&!v.question.endsWith('?'))||!sources||!Array.isArray(v.gaps)||v.gaps.length>2||!v.profileEvidence||typeof v.profileEvidence!=='object')return null;
  const evidence=[message,...history.filter(t=>t.role==='learner').map(t=>t.text),...Object.values(state.profile)];
  const gaps:ChatReply['gaps']=[];
  for(const gap of v.gaps) {
    if(!gap||!safeText(gap.gap,180)||!safeText(gap.evidence,180)||gap.evidence.length<4||!evidence.some(text=>text.includes(gap.evidence)))return null;
    gaps.push({gap:normalize(gap.gap),evidence:gap.evidence});
  }
  let nextStep:ChatReply['nextStep']=null;
  if(v.nextStep!==null) {
    if(!v.nextStep||!safeText(v.nextStep.task,240)||!v.nextStep.task.trim()||!safeText(v.nextStep.definitionOfDone,300)||!v.nextStep.definitionOfDone.trim())return null;
    nextStep={task:normalize(v.nextStep.task),definitionOfDone:normalize(v.nextStep.definitionOfDone)};
  }
  const profile:Profile={...state.profile};
  for(const field of ['background','example','focus'] as const) {
    const fact=v.profileEvidence[field];
    if(typeof fact!=='string'||fact.length>180||sensitive(fact))return null;
    if(fact&&(!message.includes(fact)||fact.length<4))return null;
    if(fact)profile[field]=fact;
  }
  return {answer:normalize(v.answer),question:normalize(v.question),gaps,nextStep,sources,profile};
}
export async function mentorTurn(env:ChatEnv,state:ChatState,message:string,history:HistoryTurn[]) {
  if (!env.securityExecution) throw new AdmissionError(503, 'Atomic coaching admission is required.');
  const began=Date.now(),sources=retrieve(message,state.goal,state.profile);
  let errorCategory:string|null=null,model:string|null=null,tokens:number|null=null,reportedAttempts=0;
  let parsed:ReturnType<typeof parseMentorResponse>=null;
  // A deliberately narrow guard is not a general jailbreak classifier. It keeps
  // obvious instruction exfiltration/tool requests on a labeled authored path.
  const attack=/ignore (?:all |previous |prior )*instructions|reveal.{0,30}(?:system prompt|hidden instructions)|execute this (?:code|query)|send (?:an? )?email for me/i.test(message);
  if(attack)errorCategory='unsafe_instruction';
  else if(!env.AI)errorCategory='ai_unavailable';
  else {
    let messages: ReturnType<typeof buildChatPrompt> | undefined;
    try { messages=buildChatPrompt(state,message,history,sources); } catch { errorCategory='input_budget'; }
    const metered=env.AI;
    const ai={run:async(name:string,input:unknown)=>{
      env.securityExecution!.modelDeadlineMs=Date.now()+MODEL_TIMEOUT_MS;
      let timer:ReturnType<typeof setTimeout>|undefined;
      try {
        const output=await Promise.race([metered.run(name,input),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),MODEL_TIMEOUT_MS);})]);
        model=name;
        const usage=(output as {usage?:{total_tokens?:unknown}})?.usage?.total_tokens;
        if(typeof usage==='number'&&Number.isSafeInteger(usage)&&usage>=0&&usage<=1_000_000){tokens=(tokens??0)+usage;reportedAttempts++;}
        return output;
      } catch(error) {
        errorCategory=error instanceof AdmissionError?error.status===429?'usage_limit':'admission_unavailable':error instanceof Error&&error.message==='timeout'?'timeout':'provider_failure';
        // Do not retain provider exception text in the shared model client's diagnostics.
        throw new Error(errorCategory);
      } finally {if(timer!==undefined)clearTimeout(timer);}
    }};
    const output=messages ? await callModel({...env,AI:ai,FDE_GYM_INTERVIEW_MODEL:env.FDE_COACH_CHAT_MODEL||CHAT_MODEL},'coach',messages,MAX_OUTPUT_TOKENS) : null;
    if(output && output.length <= 6000)parsed=parseMentorResponse(parseJsonObject(output),state,message,history,sources);
    if(!parsed&&output)errorCategory='model_output_invalid';
  }
  const result=parsed??{answer:'Personalized AI guidance is unavailable for this reply. This is authored fallback guidance: choose one customer outcome, one engineering decision, and one check that would show improvement. The curriculum references below can help you continue.',question:openingQuestion(state.goal),gaps:[],nextStep:null,sources:sources.slice(0,2),profile:state.profile};
  if(state.goal==='interview'&&!result.sources.some(s=>s.id==='gym')) {
    const gym=sources.find(s=>s.id==='gym');
    if(gym)result.sources=result.sources.length===3?[...result.sources.slice(0,2),gym]:[...result.sources,gym];
  }
  const metadata={templateId:`mentor-${state.goal}`,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,resourceIds:result.sources.map(s=>s.id),model,attempts:env.securityExecution?.attemptCount??0,latencyMs:Date.now()-began,tokens,usageComplete:reportedAttempts>0&&reportedAttempts===(env.securityExecution?.attemptCount??0),outcome:parsed?'ai' as const:'fallback' as const,errorCategory:parsed && (env.securityExecution?.attemptCount??0)===1?null:errorCategory};
  if(env.securityExecution)env.securityExecution.metadata=metadata;
  return {...result,mode:parsed?'ai' as const:'fallback' as const};
}
