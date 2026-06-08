import { useState, useEffect, type FormEvent } from 'react';

/**
 * Soft subscribe popup for high-intent pages (e.g. conference talk pages).
 *
 * Fires once per visitor after they've engaged with the content. Two
 * triggers, both must hit: a minimum dwell time AND a scroll-depth
 * threshold. Sub-readers who blast through the page hit the scroll
 * trigger first; sub-skimmers hit the time trigger first. Either way
 * we wait until they've actually read enough to want what we're
 * offering.
 *
 * Honors the existing `tair_subscriber_unlocked` localStorage key,
 * so anyone who's already subscribed anywhere on the site never
 * sees the popup. Stores its own `tair_popup_dismissed_<source>`
 * key so dismissals stick.
 */

interface Props {
  source?: string;
  delayMs?: number;
  scrollPercent?: number;
  headline?: string;
  subhead?: string;
}

const SUBSCRIBED_KEY = 'tair_subscriber_unlocked';

export default function SubscribePopup({
  source = 'page-popup',
  delayMs = 18000,
  scrollPercent = 40,
  headline = 'Reading this? Get the next one.',
  subhead = 'The AI Runtime publishes weekly issues on agents, evals, and reliability, for engineers shipping AI to production.',
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const dismissKey = `tair_popup_dismissed_${source}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY) === '1') return;
      if (localStorage.getItem(dismissKey) === '1') return;
    } catch {
      /* localStorage unavailable, fall through and try anyway */
    }

    let timerFired = false;
    let scrollFired = false;
    let cleanedUp = false;
    const tryOpen = () => {
      if (timerFired && scrollFired && !cleanedUp) {
        setOpen(true);
        cleanedUp = true;
        window.removeEventListener('scroll', onScroll);
      }
    };
    const timer = setTimeout(() => {
      timerFired = true;
      tryOpen();
    }, delayMs);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) {
        scrollFired = true;
        tryOpen();
        return;
      }
      const pct = (window.scrollY / max) * 100;
      if (pct >= scrollPercent) {
        scrollFired = true;
        tryOpen();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [delayMs, scrollPercent, dismissKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function dismiss() {
    try {
      localStorage.setItem(dismissKey, '1');
    } catch {
      /* dismiss persistence is best-effort */
    }
    setOpen(false);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error('subscribe-failed');
      setState('ok');
      try {
        localStorage.setItem(SUBSCRIBED_KEY, '1');
        localStorage.setItem(dismissKey, '1');
      } catch {
        /* persistence is best-effort */
      }
      setTimeout(() => setOpen(false), 2400);
    } catch {
      setState('error');
      setErrMsg('Something went wrong. Try again, or email info@theairuntime.com');
    }
  }

  if (!open) return null;

  return (
    <div
      className="popup-back"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Subscribe to The AI Runtime"
    >
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close" onClick={dismiss} aria-label="Close">
          ×
        </button>
        {state === 'ok' ? (
          <div className="ok">
            <strong>✓ You're in.</strong>
            <p>Production lessons from AI practitioners. Your first issue lands soon.</p>
          </div>
        ) : (
          <>
            <h3>{headline}</h3>
            <p>{subhead}</p>
            <form onSubmit={submit}>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                disabled={state === 'submitting'}
                autoFocus
                aria-label="Email address"
              />
              <button type="submit" className="btn" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
            {state === 'error' && <p className="err">{errMsg}</p>}
            <p className="fine">Free. No spam. Unsubscribe in one click.</p>
          </>
        )}
        <style>{`
          .popup-back {
            position: fixed; inset: 0; background: rgba(20, 20, 22, 0.5);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; padding: 1.5rem; backdrop-filter: blur(2px);
            animation: fadein 200ms ease;
          }
          .popup {
            position: relative; background: var(--bg); border-radius: 12px;
            border: 1px solid var(--border); max-width: 32rem; width: 100%;
            padding: 2rem; box-shadow: 0 24px 64px rgba(0,0,0,0.2);
            animation: pop 220ms cubic-bezier(.16,1.1,.3,1.1);
          }
          .popup h3 { margin: 0 0 0.5rem; font-family: var(--font-mono); font-size: 1.15rem; }
          .popup > p { color: var(--text-2); margin: 0 0 1.25rem; font-size: 0.95rem; }
          .popup .close {
            position: absolute; top: 0.55rem; right: 0.7rem;
            background: none; border: none; color: var(--text-3);
            font-size: 1.6rem; cursor: pointer; line-height: 1;
            padding: 0.25rem 0.6rem;
          }
          .popup .close:hover { color: var(--text); }
          .popup form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
          .popup input {
            flex: 1; min-width: 14rem; padding: 0.85rem 1rem;
            border: 1px solid var(--border); border-radius: var(--radius-sm);
            font-family: var(--font-sans); font-size: 0.95rem;
            background: var(--bg); color: var(--text);
          }
          .popup input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
          .popup .btn {
            padding: 0.85rem 1.3rem; border-radius: var(--radius-sm);
            background: var(--accent); color: #FFFFFF;
            border: 1px solid var(--accent); font-family: var(--font-mono);
            font-weight: 700; font-size: 0.9rem; cursor: pointer;
          }
          .popup .btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
          .popup .btn[disabled] { opacity: 0.6; cursor: not-allowed; }
          .popup .fine {
            margin: 0.9rem 0 0; font-family: var(--font-mono);
            font-size: 0.78rem; color: var(--text-3);
          }
          .popup .err { color: #DC2626; font-size: 0.85rem; margin: 0.6rem 0 0; }
          .popup .ok strong { font-family: var(--font-mono); color: var(--accent); font-size: 1.1rem; }
          .popup .ok p { color: var(--text-2); margin: 0.5rem 0 0; }
          @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
          @keyframes pop { from { transform: scale(0.97); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
