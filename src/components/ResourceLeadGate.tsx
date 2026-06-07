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

  async function subscribe(source: string) {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, resourceSlug, resourceTitle }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? 'Subscription failed');
    }
  }

  // Free resources: keep the no-friction direct download, AND offer an
  // "email it to me" path that also subscribes them. Best of both: the asset
  // stays free and evident, but every download becomes a conversion chance.
  if (status === 'free' && pdfUrl) {
    if (state === 'ok') {
      return (
        <div className="ok">
          <strong>✓ You're subscribed.</strong>
          <p>We sent the PDF to your inbox. It is also downloading now.</p>
          <a className="btn" href={pdfUrl} download>Download again</a>
          <style>{`.ok strong{font-family:var(--font-mono);color:var(--accent)} .ok p{margin:.4rem 0 .9rem;color:var(--text-2)}`}</style>
        </div>
      );
    }
    async function onFreeSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setState('submitting');
      setErrorMsg(null);
      try {
        await subscribe('resource-free');
        setState('ok');
        // Also start the download so they get the file immediately.
        if (pdfUrl) window.location.href = pdfUrl;
      } catch (err) {
        setState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      }
    }
    return (
      <div className="free">
        <a className="btn" href={pdfUrl} download>Download the PDF</a>
        <form onSubmit={onFreeSubmit} className="gate free-form">
          <label className="lbl muted">Or get it emailed and subscribe to the newsletter:</label>
          <div className="row">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'submitting'}
            />
            <button type="submit" className="btn btn-ghost" disabled={state === 'submitting'}>
              {state === 'submitting' ? 'Sending…' : 'Email me the PDF'}
            </button>
          </div>
          {state === 'error' && <p className="err">{errorMsg}</p>}
        </form>
        <style>{`
          .free { display: flex; flex-direction: column; gap: 1rem; }
          .free-form { display: flex; flex-direction: column; gap: 0.5rem; max-width: 30rem; align-items: stretch; }
          .free-form .lbl { font-size: 0.85rem; }
          .free-form .row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
          .free-form input {
            flex: 1 1 14rem; padding: 0.85rem 1rem; border-radius: 8px;
            border: 1px solid var(--border); background: var(--bg); color: var(--text);
            font-family: var(--font-sans); font-size: 0.95rem;
          }
          .free-form input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
          .err { color: #DC2626; font-size: 0.85rem; flex-basis: 100%; }
        `}</style>
      </div>
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
      await subscribe('resource');
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
        : 'Check your inbox, the download link is on the way.';
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
        .err { color: #DC2626; font-size: 0.85rem; flex-basis: 100%; }
        .ok { color: var(--text); }
      `}</style>
    </form>
  );
}
