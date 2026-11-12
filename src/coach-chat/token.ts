import { GOALS, type ChatState } from './types';
const bytes = new TextEncoder();
function encode(value: Uint8Array) { return btoa(Array.from(value,c=>String.fromCharCode(c)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function decode(value: string) { return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0)); }
async function key(secret:string) { return crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']); }
export async function signChatState(state:ChatState,secret:string) {
  const payload=encode(bytes.encode(JSON.stringify(state)));
  const signature=await crypto.subtle.sign('HMAC',await key(secret),bytes.encode(`fde-chat/v1:${payload}`));
  return `chat1.${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyChatState(token:unknown,secret:string,now:number):Promise<ChatState|null> {
  try {
    if(typeof token!=='string'||token.length>8000)return null;
    const [prefix,payload,signature,...extra]=token.split('.');
    if(prefix!=='chat1'||!payload||!signature||extra.length)return null;
    if(!await crypto.subtle.verify('HMAC',await key(secret),decode(signature),bytes.encode(`fde-chat/v1:${payload}`)))return null;
    const state=JSON.parse(new TextDecoder().decode(decode(payload))) as ChatState;
    if(state.version!==1||typeof state.sessionId!=='string'||state.sessionId.length>100||!Number.isInteger(state.revision)||state.revision<0
      ||!Number.isInteger(state.turn)||state.turn<0||state.turn>10||!GOALS.includes(state.goal)
      ||!Number.isFinite(state.issuedAt)||state.issuedAt>now||!Number.isFinite(state.expiresAt)||state.expiresAt<=now||state.expiresAt-state.issuedAt>3_600_000
      ||!state.profile||!['background','example','focus'].every(k=>typeof state.profile[k as keyof ChatState['profile']]==='string'&&state.profile[k as keyof ChatState['profile']].length<=180)
      ||typeof state.lastTask!=='string'||state.lastTask.length>240)return null;
    return state;
  } catch { return null; }
}
