import { createRequestClient, requestJson } from '../coach/api';
import { GOALS, type ChatGoal, type ChatReply, type HistoryTurn } from '../../../../src/coach-chat/types';
import catalog from '../../../../src/coach-chat/catalog.generated.json';
export type { ChatReply, ChatGoal, HistoryTurn };
const record=(v:unknown):v is Record<string,any>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
export function validateChatReply(v:unknown):ChatReply {
  if(!record(v)||typeof v.token!=='string'||!v.token.startsWith('chat1.')||!GOALS.includes(v.goal)||!Number.isInteger(v.turn)||v.turn<0||v.turn>10
    ||v.remainingTurns!==10-v.turn||v.done!==(v.turn===10)||!['intake','ai','fallback'].includes(v.mode)
    ||typeof v.answer!=='string'||v.answer.length>2400||typeof v.question!=='string'||v.question.length>240
    ||!Array.isArray(v.gaps)||v.gaps.length>2||v.gaps.some((gap:unknown)=>!record(gap)||typeof gap.gap!=='string'||typeof gap.evidence!=='string')
    ||(v.nextStep!==null&&(!record(v.nextStep)||typeof v.nextStep.task!=='string'||typeof v.nextStep.definitionOfDone!=='string'))
    ||!Array.isArray(v.sources)||v.sources.length>3||v.sources.some((s:unknown)=>!record(s)||!catalog.resources.some(approved=>s.id===approved.id&&s.href===approved.href&&s.excerpt===approved.excerpt&&s.contentHash===approved.contentHash)))throw new Error('The coaching response could not be read. Retry the original request or restart.');
  return v as ChatReply;
}
export function createChatClient() {
  const transport=createRequestClient(validateChatReply);
  return {...transport,
    start:(goal:ChatGoal,signal?:AbortSignal)=>transport.post('/api/coach-chat/start',{goal},signal),
    message:(token:string,message:string,history:HistoryTurn[],signal?:AbortSignal)=>transport.post('/api/coach-chat/message',{token,message,history},signal),
  };
}
export async function readChatHealth(signal?:AbortSignal) {
  return requestJson('/api/coach-chat/health',{},value=>{
    if(!record(value)||typeof value.enabled!=='boolean'||typeof value.aiConfigured!=='boolean'||typeof value.securityConfigured!=='boolean'||value.captureEnabled!==false)throw new Error('Coaching is unavailable.');
    return {enabled:value.enabled as boolean,aiConfigured:value.aiConfigured as boolean,securityConfigured:value.securityConfigured as boolean};
  },signal);
}
