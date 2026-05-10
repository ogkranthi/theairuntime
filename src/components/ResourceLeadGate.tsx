import { useState, type FormEvent } from 'react';

interface Props {
  resourceSlug: string;
  resourceTitle: string;
  status: 'coming-soon' | 'free' | 'lead-gated' | 'paid';
  pdfUrl?: string;
  paymentLinkUrl?: string;
  priceUsd?: number;
}

type State = 'idle' | 'submitting' | 'ok' | 'error';

export default function ResourceLeadGate({
  resourceSlug,
  resourceTitle,
  status,
  pdfUrl,
  paymentLinkUrl,
  priceUsd,
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (status === 'free' && pdfUrl) {
    return (
      <a className="btn" href={pdfUrl} download>
        Download PDF
      </a>
    );
  }

  if (status === 'paid' && paymentLinkUrl) {
    return (
      <a className="btn" href={paymentLinkUrl} target="_blank" rel="noopener">
        {priceUsd ? `Buy · $${priceUsd}` : 'Buy'}
      </a>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'resource',
          resourceSlug,
          resourceTitle,
        }),
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
    const ctaCopy =
      status === 'coming-soon'
        ? "You're on the list. We'll email you the day it drops."
        : 'Check your inbox — the download link is on the way.';
    return (
      <div className="ok">
        <strong>✓ Got it.</strong>
        <p>{ctaCopy}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="gate">
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === 'submitting'}
      />
      <button type="submit" className="btn" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Submitting…' : status === 'coming-soon' ? 'Notify me' : 'Get the PDF'}
      </button>
      {state === 'error' && <p className="err">{errorMsg}</p>}
      <style>{`
        .gate { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; max-width: 28rem; }
        .gate input {
          flex: 1 1 14rem;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-sans);
          font-size: 0.95rem;
        }
        .gate input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .err { color: #f87171; font-size: 0.85rem; flex-basis: 100%; }
        .ok { color: var(--text); }
      `}</style>
    </form>
  );
}
