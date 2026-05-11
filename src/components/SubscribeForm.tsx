import { useState, type FormEvent } from 'react';

interface Props {
  source?: string;
  buttonLabel?: string;
}

type State = 'idle' | 'submitting' | 'ok' | 'error';

export default function SubscribeForm({
  source = 'site-subscribe',
  buttonLabel = 'Subscribe',
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Subscription failed');
      }
      setState('ok');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (state === 'ok') {
    return (
      <div className="sub-ok">
        <strong>✓ You're on the list.</strong>
        <p>Production lessons from engineers shipping AI — your first issue lands soon.</p>
        <style>{`
          .sub-ok strong { font-family: var(--font-mono); color: var(--accent); }
          .sub-ok p { margin: 0.5rem 0 0; color: var(--text-2); }
        `}</style>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="sub-form">
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === 'submitting'}
        aria-label="Email address"
      />
      <button type="submit" className="btn" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Subscribing…' : buttonLabel}
      </button>
      {state === 'error' && <p className="sub-err">{errorMsg}</p>}
      <style>{`
        .sub-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; max-width: 32rem; }
        .sub-form input {
          flex: 1 1 14rem;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-sans);
          font-size: 0.95rem;
        }
        .sub-form input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .sub-form .btn {
          padding: 0.85rem 1.4rem;
          border-radius: 8px;
          background: var(--accent);
          color: var(--bg);
          border: 1px solid var(--accent);
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .sub-form .btn:hover { filter: brightness(1.08); }
        .sub-form .btn[disabled] { opacity: 0.6; cursor: not-allowed; }
        .sub-err { color: #f87171; font-size: 0.85rem; flex-basis: 100%; margin: 0; }
      `}</style>
    </form>
  );
}
