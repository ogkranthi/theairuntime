import { useEffect, useState } from 'react';

/**
 * Soft gate for the subscriber-only channel.
 *
 * The gated content is server-rendered inside `#subscriber-content` (with the
 * `locked` class). This island reveals it once the visitor subscribes via
 * `/api/subscribe`, or if they've unlocked before (remembered in localStorage).
 * Not a hard paywall, the same lead-gate model the rest of the site uses.
 */

const STORAGE_KEY = 'tair_subscriber_unlocked';

function reveal() {
  document.getElementById('subscriber-content')?.classList.remove('locked');
}

interface Props {
  source?: string;
}

export default function SubscriberGate({ source = 'subscriber-only' }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Returning subscribers skip the gate.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        reveal();
        setUnlocked(true);
      }
    } catch {
      /* localStorage unavailable, leave gated */
    }
  }, []);

  function unlock() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    reveal();
    setUnlocked(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error('Request failed');
      unlock();
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (unlocked) return null;

  return (
    <div class="gate-card">
      <span class="lock" aria-hidden="true">🔒</span>
      <h3>Subscriber-only channel</h3>
      <p>
        Talk recordings, slide decks, event archives, and downloadable playbooks, free for subscribers.
        Drop your email to unlock the full channel.
      </p>
      <form onSubmit={handleSubmit} class="gate-form">
        <input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          disabled={status === 'loading'}
        />
        <button type="submit" class="btn" disabled={status === 'loading'}>
          {status === 'loading' ? 'Unlocking…' : 'Unlock access'}
        </button>
      </form>
      {status === 'error' && <p class="err">{message}</p>}
      <p class="already">
        Already subscribed?{' '}
        <button type="button" class="link" onClick={unlock}>
          Unlock it →
        </button>
      </p>
      <p class="fine">Free. No spam. Unsubscribe in one click.</p>
    </div>
  );
}
