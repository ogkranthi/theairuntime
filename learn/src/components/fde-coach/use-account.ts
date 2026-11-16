import { useEffect, useRef, useState } from 'react';
import { accountRequest, type AccountInfo } from './account-api';
import type { Clerk } from '@clerk/clerk-js';
export function useAccount(enabled: boolean, publishableKey: string) {
  const clerk = useRef<Clerk>();
  const [sessionId, setSessionId] = useState('');
  const [info, setInfo] = useState<AccountInfo>();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const tokenFor = async (expected: string | undefined) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const session=clerk.current?.session;
      if(!session||session.id!==expected)throw new Error('Your account changed. Retry from the current account.');
      const value = await Promise.race([session.getToken(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Sign-in timed out. Try again.')), 5000); })]);
      if (!value||clerk.current?.session?.id!==expected) throw new Error('Sign in to continue.');
      return value;
    } finally { clearTimeout(timer); }
  };
  const token = () => tokenFor(sessionId);
  const refresh = async () => {
    const current = clerk.current?.session?.id;
    if (!current) return;
    try { const result = await accountRequest<AccountInfo>(()=>tokenFor(current), 'me'); if (clerk.current?.session?.id === current) { setInfo(result); setError(''); } }
    catch (cause) { if (clerk.current?.session?.id === current) setError(cause instanceof Error ? cause.message : 'Account unavailable.'); }
  };
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, remove: (() => void) | undefined;
    if (!publishableKey) { setError('Account sign-in is not configured. The written learning resources are still open.'); return; }
    void (async () => {
      try {
        const { Clerk } = await import('@clerk/clerk-js');
        const instance = new Clerk(publishableKey);
        await instance.load({ telemetry: { disabled: true } });
        if (disposed) return;
        clerk.current = instance; setReady(true);
        remove = instance.addListener(({ session }) => { setSessionId(session?.id ?? ''); setInfo(undefined); if (session) void refresh(); });
      } catch { if (!disposed) setError('Sign-in could not load. Try again later.'); }
    })();
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => { disposed = true; remove?.(); window.removeEventListener('focus', focus); };
  }, [enabled, publishableKey]);
  return { sessionId, info, error, ready, token, refresh, isCurrent:()=>clerk.current?.session?.id===sessionId, signIn: () => clerk.current?.openSignIn(), signOut: () => clerk.current?.session?.id===sessionId?clerk.current?.signOut():undefined, request: <T,>(action: string, body?: unknown) => accountRequest<T>(token, action, body) };
}
