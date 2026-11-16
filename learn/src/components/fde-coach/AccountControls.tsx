import { useEffect, useRef, useState } from 'react';
import type { useAccount } from './use-account';
export default function AccountControls({ account, busy, resume }: { account: ReturnType<typeof useAccount>; busy: boolean; resume: (id: string) => void }) {
  const [background, setBackground] = useState(''), [goal, setGoal] = useState(''), [status, setStatus] = useState('');
  const activeExport=useRef<AbortController>();
  const session=useRef(account.sessionId);session.current=account.sessionId;
  useEffect(()=>()=>activeExport.current?.abort(),[account.sessionId]);
  useEffect(() => { setBackground(account.info?.profile.background ?? ''); setGoal(account.info?.profile.goal ?? ''); }, [account.info?.profile.background, account.info?.profile.goal]);
  async function save() { try { await account.request('profile', { background, goal }); await account.refresh(); setStatus('Experience and goal saved.'); } catch (e) { setStatus(e instanceof Error ? e.message : 'Could not save.'); } }
  async function exportData() {
    if(activeExport.current)return;
    const sourceSession=account.sessionId;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60_000);
    activeExport.current=controller;
    try { const response=await fetch('/api/coach-account/export',{headers:{authorization:`Bearer ${await account.token()}`},signal:controller.signal});if(!response.ok)throw new Error('Your export could not be prepared. Sign in again or retry.');const data=await response.blob();if(!account.isCurrent()||session.current!==sourceSession||controller.signal.aborted)return;const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = 'fde-coach-data.json';a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); setStatus('Your Coach export is ready.'); }
    catch (e) { if(account.isCurrent()&&session.current===sourceSession)setStatus(e instanceof Error ? e.message : 'Could not export.'); }
    finally {clearTimeout(timer);if(activeExport.current===controller)activeExport.current=undefined;}
  }
  async function deleteData() {
    if (!confirm('Delete your Coach profile, conversations and progress? This cannot be undone. Your Google/GitHub and Clerk identity accounts remain. Usage limits do not reset.')) return;
    try { await account.request('delete', { confirm: 'DELETE' }); await account.signOut(); setStatus('Coach data deleted.'); }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Could not delete.'); }
  }
  return <div className="fde-account" aria-label="Coach account">
    {account.error ? <p role="alert">{account.error}</p> : null}
    {!account.sessionId ? <p><button type="button" disabled={!account.ready} onClick={account.signIn}>Sign in with Google or GitHub</button> <span>Save your learning. Free coaching, no card required.</span></p> : <>
      <p role="status">{account.info?.usage.available===false ? "Usage is temporarily unavailable. Your saved data controls remain available." : account.info ? `${account.info.usage.remaining} of ${account.info.usage.limit} free AI replies available today` : 'Loading your allowance…'} <span>Resets at 00:00 UTC. Authored fallbacks are free.</span></p>
      <details><summary>Your learning and data</summary>
        <form onSubmit={e => { e.preventDefault(); void save(); }}><label>Your experience <textarea value={background} maxLength={180} onChange={e => setBackground(e.target.value)} placeholder="For example: I build .NET APIs"/></label><label>Your learning goal <textarea value={goal} maxLength={400} onChange={e => setGoal(e.target.value)} placeholder="For example: explain architecture tradeoffs to customers"/></label><button disabled={busy} type="submit">Save experience and goal</button></form>
        <p>Your profile and conversations are saved for ordinary account functionality, independently of research consent. Inactive conversations expire after 90 days. Use fictional examples and exclude confidential information.</p>
        {account.info?.conversations.length ? <ul aria-label="Recent conversations">{account.info.conversations.map(c => <li key={c.id}><button type="button" disabled={busy} onClick={() => resume(c.id)}>Resume {c.goal} conversation ({c.revision} replies)</button></li>)}</ul> : null}
        <p><button type="button" disabled={busy} onClick={() => void exportData()}>Export my Coach data</button> <button type="button" disabled={busy} onClick={() => void deleteData()}>Delete my Coach data</button> <button type="button" disabled={busy} onClick={() => void account.signOut()}>Sign out</button></p>
        <p role="status">{status}</p>
      </details>
    </>}
  </div>;
}
