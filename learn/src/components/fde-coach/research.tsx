import { useEffect, useRef, useState } from 'react';
import type { useAccount } from './use-account';
import { requestJson } from '../coach/api';
type Account=ReturnType<typeof useAccount>;
const VERSION='coach-private-research-v1';
type ResearchState={available:boolean;consent:{enabled:boolean;version:string};contributions:{id:string}[];contributionCount?:number};
export function useResearch(account:Account,enabled:boolean){
  const [saved,setSaved]=useState<{session:string;value:ResearchState}>(),[error,setError]=useState('');
  const current=useRef(account.sessionId);current.current=account.sessionId;
  const state=saved?.session===account.sessionId?saved.value:undefined;
  async function refresh(){const session=account.sessionId;try{const value=await account.request<ResearchState>('research');if(current.current===session){setSaved({session,value});setError('');}}catch(e){if(current.current===session)setError(e instanceof Error?e.message:'Research settings unavailable.');}}
  useEffect(()=>{setSaved(undefined);setError('');if(enabled&&account.sessionId&&account.info)void refresh();},[enabled,account.sessionId,Boolean(account.info)]);
  return {state,error,refresh,change:async(value:boolean)=>{await account.request('research-consent',{enabled:value,version:VERSION});await refresh();}};
}
type Research=ReturnType<typeof useResearch>;
export function ResearchControls({research}:{research:Research}){
  const [checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  useEffect(()=>{setChecked(false);setStatus('');},[research.state?.consent.enabled]);
  async function change(value:boolean){setBusy(true);try{await research.change(value);setStatus(value?'Research choice saved. Nothing is copied until you select an exchange.':'Research consent withdrawn. Private contributions and their reviews were deleted.');}catch(e){setStatus(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
  return <details className="fde-research"><summary>Optional coaching research</summary>
    <p>Your account already saves your profile, goals, messages and next steps so you can resume learning. Operational metrics exclude conversation content and do not depend on research participation.</p>
    <p>If you opt in, you can review and contribute selected exchanges for private coaching research and evaluation. Copies include your question, necessary recent context, the original response with privacy redactions, learning goal, curriculum references, model and prompt versions, feedback, timestamps and any explicitly reported outcome.</p>
    <p>Records use a pseudonymous reference. They are not anonymous. Automated redaction can miss personal or confidential details; review each preview and use fictional examples. Unreviewed copies expire after 30 days. Human-reviewed copies can be retained for up to 180 days. Withdraw below or delete your Coach data to remove private copies, reviews and dataset memberships. Operator-controlled temporary exports must also be removed under the private export procedure.</p>
    <p>This is separate from newsletter subscriptions, Gym research, permission to publish and permission to train models. We do not automatically publish your conversations or train models on them. Those uses need separate permission. Research does not affect your free coaching allowance.</p>
    {research.error?<p role="alert">{research.error}</p>:research.state?.consent.enabled?<><p>{research.state.contributionCount??research.state.contributions.length} selected contributions. You can review an exchange below before contributing.</p><button type="button" disabled={busy} onClick={()=>void change(false)}>Withdraw research consent and delete contributions</button></>:<><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I choose to enable selected contributions for private research.</label><button type="button" disabled={!checked||busy||!research.state?.available} onClick={()=>void change(true)}>Enable selected research contributions</button></>}
    <p role="status">{status}</p>
  </details>;
}
type Preview={question:string;context:{role:string;text:string}[];originalResponse:string;learningGoal:string;redactions:number};
export function ResearchContribution({account,research,operation}:{account:Account;research:Research;operation:string}){
  const [preview,setPreview]=useState<Preview>(),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[key]=useState(()=>crypto.randomUUID());
  async function review(){setBusy(true);try{setPreview(await account.request<Preview>(`research-preview?operation=${encodeURIComponent(operation)}`));}catch(e){setStatus(e instanceof Error?e.message:'Preview unavailable.');}finally{setBusy(false);}}
  async function contribute(){setBusy(true);try{await requestJson('/api/coach-account/research-contribute',{method:'POST',headers:{authorization:`Bearer ${await account.token()}`,'content-type':'application/json','idempotency-key':key},body:JSON.stringify({operation})},v=>v);setStatus('Selected exchange contributed privately. It is not published or approved for training.');setPreview(undefined);await research.refresh();}catch(e){setStatus(e instanceof Error?e.message:'Could not contribute.');}finally{setBusy(false);}}
  return <div className="fde-research-contribution"><button type="button" disabled={busy} onClick={()=>void review()}>Review research contribution</button>
    {preview?<section aria-label="Research contribution preview"><h3>Review this selected exchange</h3><p>Only this exchange and the context shown here will be copied. Versions, curriculum sources, feedback and timestamps are also included.</p><dl><dt>Your question</dt><dd>{preview.question}</dd><dt>Original coaching response (privacy redactions only)</dt><dd>{preview.originalResponse}</dd><dt>Learning goal at contribution</dt><dd>{preview.learningGoal||'No saved goal'}</dd></dl><details><summary>Necessary recent context</summary>{preview.context.map((t,i)=><p key={i}><strong>{t.role}:</strong> {t.text}</p>)}</details><p>{preview.redactions} automated redactions. Review for remaining identifiers before contributing.</p><button type="button" disabled={busy} onClick={()=>void contribute()}>Contribute this selected exchange</button> <button type="button" onClick={()=>setPreview(undefined)}>Cancel contribution</button></section>:null}
    <p role="status">{status}</p>
  </div>;
}
