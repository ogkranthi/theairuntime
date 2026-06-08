import { useState, type FormEvent } from 'react';
import { getRef, shareUrlForEmail } from '../lib/referral';

interface Props {
  source?: string;
  buttonLabel?: string;
  successTitle?: string;
  successBody?: string;
  /** If false, do not redirect to Substack on failure (use for non-newsletter capture). */
  fallbackToPublication?: boolean;
  /** Show a "refer a friend" share link in the success state. */
  showReferral?: boolean;
}

type State = 'idle' | 'submitting' | 'ok';

export default function SubscribeForm({
  source = 'site-subscribe',
  buttonLabel = 'Subscribe',
  successTitle = "You're on the list.",
  successBody = 'Production lessons from AI practitioners, your first issue lands soon.',
  fallbackToPublication = true,
  showReferral = false,
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [copied, setCopied] = useState(false);

  function fallbackToSubstack() {
    // If our Worker can't reach Substack for any reason, send the user
    // straight to theairuntime.com where they can subscribe natively.
    // Pre-fill the email if the publication supports it.
    const url = new URL('https://theairuntime.com/subscribe');
    if (email) url.searchParams.set('email', email);
    window.location.href = url.toString();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    // Capture in-place: POST to our Worker, which forwards to Substack server
    // side. Keeping the visitor on-page (no redirect) is the single biggest
    // conversion win. Substack is only a fallback if the Worker call fails.
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, ref: getRef() }),
      });
      if (!res.ok) {
        if (fallbackToPublication) fallbackToSubstack();
        else setState('ok');
        return;
      }
      setState('ok');
    } catch {
      if (fallbackToPublication) fallbackToSubstack();
      else setState('ok');
    }
  }

  if (state === 'ok') {
    const shareUrl = email ? shareUrlForEmail(email) : '';
    async function copyShare() {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      } catch {
        /* clipboard may be unavailable; the link is still selectable */
      }
    }
    return (
      <div className="sub-ok">
        <strong>✓ {successTitle}</strong>
        <p>{successBody}</p>
        {showReferral && shareUrl && (
          <div className="refer">
            <p className="refer-lbl">Know someone shipping AI? Send them in:</p>
            <div className="refer-row">
              <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Your referral link" />
              <button type="button" className="btn" onClick={copyShare}>{copied ? 'Copied' : 'Copy link'}</button>
            </div>
          </div>
        )}
        <style>{`
          .sub-ok strong { font-family: var(--font-mono); color: var(--accent); }
          .sub-ok p { margin: 0.5rem 0 0; color: var(--text-2); }
          .refer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
          .refer-lbl { margin: 0 0 0.5rem !important; font-size: 0.9rem; }
          .refer-row { display: flex; gap: 0.5rem; flex-wrap: wrap; max-width: 32rem; }
          .refer-row input {
            flex: 1 1 16rem; padding: 0.6rem 0.8rem; border-radius: 8px;
            border: 1px solid var(--border); background: var(--bg-2); color: var(--text-2);
            font-family: var(--font-mono); font-size: 0.8rem;
          }
          .refer-row .btn {
            padding: 0.6rem 1.1rem; border-radius: 8px; background: var(--accent); color: var(--bg);
            border: 1px solid var(--accent); font-family: var(--font-mono); font-weight: 700;
            font-size: 0.85rem; cursor: pointer;
          }
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
      `}</style>
    </form>
  );
}
