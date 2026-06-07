import { useEffect, useState, type FormEvent } from 'react';

/**
 * A slim, dismissible subscribe bar that slides up after the visitor scrolls
 * past the hero. Captures email in-place via /api/subscribe (no redirect).
 * Dismissal and successful subscribes are remembered in localStorage so the
 * bar never nags a returning subscriber.
 */

const DISMISS_KEY = 'tair_subbar_dismissed';
const SHOW_AFTER_PX = 700;

type State = 'idle' | 'submitting' | 'ok';

export default function StickySubscribeBar() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const onScroll = () => {
      if (window.scrollY > SHOW_AFTER_PX) {
        setVisible(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function remember() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  function dismiss() {
    remember();
    setVisible(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'sticky-bar' }),
      });
    } catch {
      /* soft-fail: still show success, lead is best-effort */
    }
    setState('ok');
    remember();
    window.setTimeout(() => setVisible(false), 2600);
  }

  if (!visible) return null;

  return (
    <div className="subbar" role="region" aria-label="Subscribe to The AI Runtime">
      {state === 'ok' ? (
        <p className="done">✓ You're on the list. Production lessons, every week.</p>
      ) : (
        <>
          <p className="pitch">
            <strong>Production lessons from AI practitioners.</strong> Free, weekly, no hype.
          </p>
          <form onSubmit={onSubmit} className="sb-form">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'submitting'}
              aria-label="Email address"
            />
            <button type="submit" disabled={state === 'submitting'}>
              {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        </>
      )}
      <button className="close" onClick={dismiss} aria-label="Dismiss">×</button>
      <style>{`
        .subbar {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
          padding: 0.85rem 3rem 0.85rem 1.25rem;
          background: var(--bg);
          border-top: 1px solid var(--border);
          box-shadow: 0 -8px 24px rgba(0,0,0,0.06);
          animation: subbar-up 220ms ease;
        }
        @keyframes subbar-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .subbar .pitch { margin: 0; font-size: 0.92rem; color: var(--text-2); }
        .subbar .pitch strong { color: var(--text); }
        .subbar .done { margin: 0; font-family: var(--font-mono); color: var(--accent); font-size: 0.95rem; }
        .sb-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .sb-form input {
          padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px solid var(--border);
          background: var(--bg); color: var(--text); font-family: var(--font-sans);
          font-size: 0.92rem; min-width: 13rem;
        }
        .sb-form input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .sb-form button {
          padding: 0.6rem 1.1rem; border-radius: 8px; background: var(--accent);
          color: #fff; border: 1px solid var(--accent); font-family: var(--font-mono);
          font-weight: 700; font-size: 0.9rem; cursor: pointer; white-space: nowrap;
        }
        .sb-form button:hover { background: var(--accent-hover); }
        .sb-form button[disabled] { opacity: 0.6; cursor: not-allowed; }
        .subbar .close {
          position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 1.4rem; line-height: 1;
          color: var(--text-3); cursor: pointer; padding: 0.25rem 0.5rem;
        }
        .subbar .close:hover { color: var(--text); }
        @media (max-width: 560px) {
          .subbar { padding: 0.75rem 2.5rem 0.75rem 1rem; }
          .subbar .pitch { flex-basis: 100%; text-align: center; }
          .sb-form { width: 100%; justify-content: center; }
          .sb-form input { flex: 1 1 auto; }
        }
      `}</style>
    </div>
  );
}
