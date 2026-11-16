import { useState } from 'react';
import type { useAccount } from './use-account';
export default function ResponseFeedback({ account, operation, hasStep }: { account: ReturnType<typeof useAccount>; operation: string; hasStep: boolean }) {
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  async function report(body:Record<string,unknown>){setBusy(true);try{await account.request('feedback',{operation,...body});setStatus(body.completed?'Next step marked complete.':'Feedback saved. Thank you.');}catch(e){setStatus(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
  return <div className="fde-response-feedback" aria-label="Response feedback"><p>Was this useful?</p><div>{['helpful','unhelpful','incorrect'].map(r=><button type="button" key={r} disabled={busy} onClick={()=>void report({rating:r})}>{r[0].toUpperCase()+r.slice(1)}</button>)}{hasStep?<button type="button" disabled={busy} onClick={()=>void report({completed:true})}>I completed this next step</button>:null}</div><p role="status">{status}</p></div>;
}
