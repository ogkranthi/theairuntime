import { withSessionSecurity } from '../security/boundary';
import { LIMITS } from '../security/types';
import { openingQuestion, mentorTurn } from './engine';
import { signChatState, verifyChatState } from './token';
import { validateChatStart, validateChatMessage } from './validation';
import { PROMPT_VERSION } from './prompt';
import { RETRIEVAL_VERSION } from './retrieval';
import type { ChatEnv, ChatState, ChatReply } from './types';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export async function handleChatRequest(request:Request,env:ChatEnv):Promise<Response> {
  const action=new URL(request.url).pathname.split('/').pop();
  if(action==='health'&&request.method==='GET')return json({enabled:env.FDE_COACH_CHAT_ENABLED==='true',aiConfigured:Boolean(env.AI),securityConfigured:Boolean(env.AI_SECURITY&&env.FDE_GYM_SESSIONS&&env.COACH_TOKEN_SECRET),promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,turnLimit:LIMITS.chatTurns,captureEnabled:false});
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!['start','message'].includes(action??''))return json({error:'Not found'},404);
  if(env.FDE_COACH_CHAT_ENABLED!=='true')return json({error:'The AI coaching beta is not enabled. Existing learning resources remain available.'},503);
  return withSessionSecurity(request,env,'chat',async(forwarded,scoped)=>{
    const body=await forwarded.json() as Record<string,unknown>;
    const execution=scoped.securityExecution!;
    let state:ChatState;
    let reply:Omit<ChatReply,'token'>;
    if(action==='start') {
      const goal=validateChatStart(body),now=Date.now();
      state={version:1,sessionId:execution.sessionId,revision:0,issuedAt:now,expiresAt:execution.expiresAt,goal,turn:0,profile:{background:'',example:'',focus:''},lastTask:''};
      reply={goal,turn:0,remainingTurns:LIMITS.chatTurns,mode:'intake',answer:'Let’s work from your own experience. Use a fictional or non-sensitive example. I’ll ask one focused question at a time; you can ask for an explanation at any point.',question:openingQuestion(goal),gaps:[],nextStep:null,sources:[],done:false};
      execution.metadata={templateId:`intake-${goal}`,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,resourceIds:[],model:null,attempts:0,latencyMs:0,tokens:null,usageComplete:false,outcome:'intake',errorCategory:null};
    } else {
      const current=await verifyChatState(body.token,scoped.COACH_TOKEN_SECRET!,Date.now());
      if(!current)return json({error:'This chat is unavailable. Start again.'},403);
      const input=validateChatMessage(body),result=await mentorTurn(scoped,current,input.message,input.history);
      state={...current,turn:current.turn+1,profile:result.profile,lastTask:result.nextStep?.task??current.lastTask};
      reply={goal:state.goal,turn:state.turn,remainingTurns:Math.max(0,LIMITS.chatTurns-state.turn),mode:result.mode,answer:result.answer,question:state.turn>=LIMITS.chatTurns?'':result.question,gaps:result.gaps,nextStep:result.nextStep,sources:result.sources,done:state.turn>=LIMITS.chatTurns};
    }
    return json({...reply,token:await signChatState(state,scoped.COACH_TOKEN_SECRET!)});
  });
}
