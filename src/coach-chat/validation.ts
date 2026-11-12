import { AdmissionError } from '../security/types';
import { GOALS, type ChatGoal, type HistoryTurn } from './types';
export function sensitive(text:string) { return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|-----BEGIN .*PRIVATE KEY-----|\b(?:sk-[a-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b|\beyJ[a-zA-Z0-9_-]{15,}\.[a-zA-Z0-9_-]+\./i.test(text); }
function fields(body:Record<string,unknown>,allowed:string[]) { if(Object.keys(body).some(k=>!allowed.includes(k)))throw new AdmissionError(400,'Invalid coaching request.'); }
export function validateChatStart(body:Record<string,unknown>):ChatGoal {
  fields(body,['goal']);
  if(!GOALS.includes(body.goal as ChatGoal))throw new AdmissionError(400,'Choose a coaching goal.');
  return body.goal as ChatGoal;
}
export function validateChatMessage(body:Record<string,unknown>) {
  fields(body,['token','message','history']);
  if(typeof body.token!=='string'||body.token.length>8000||typeof body.message!=='string'||!body.message.trim()||body.message.length>2000)throw new AdmissionError(400,'Use a message of 1-2000 characters.');
  if(!Array.isArray(body.history)||body.history.length>4||body.history.some(t=>!t||typeof t!=='object'||Object.keys(t).some(k=>!['role','text'].includes(k))||!['learner','coach'].includes(t.role)||typeof t.text!=='string'||t.text.length>700))throw new AdmissionError(400,'Conversation context is too large.');
  if(sensitive(body.message)||body.history.some(t=>sensitive(t.text)))throw new AdmissionError(400,'Remove contact details, credentials, and private material. Use a fictional example.');
  return { message:body.message.trim(),history:body.history as HistoryTurn[] };
}
