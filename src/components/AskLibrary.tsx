import { useState, type FormEvent } from 'react';

/**
 * "Ask the Library": a question box over The AI Runtime reading list.
 *
 * Posts to /api/ask, which retrieves the most relevant reads and (when the
 * Cloudflare Workers AI binding is enabled) returns a grounded answer. Always
 * shows the source reads, so it is useful even before AI is turned on. After an
 * answer, it nudges the visitor to subscribe.
 */

interface Source {
  title: string;
  url: string;
  source: string;
  pillar: string;
}

type State = 'idle' | 'loading' | 'done' | 'error';

const EXAMPLES = [
  'How do I evaluate an agent in production?',
  'What should I read about context engineering?',
  'Patterns for reliable LLM inference?',
];

export default function AskLibrary() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<State>('idle');
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  async function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 4) return;
    setState('loading');
    setAnswer(null);
    setNote(null);
    setSources([]);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as {
        answer?: string | null;
        sources?: Source[];
        note?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setAnswer(data.answer ?? null);
      setNote(data.note ?? null);
      setSources(data.sources ?? []);
      setState('done');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ask(q);
  }

  return (
    <div className="ask">
      <form onSubmit={onSubmit} className="ask-form">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about evals, agents, inference, reliability, cost…"
          aria-label="Ask the library a question"
          disabled={state === 'loading'}
        />
        <button type="submit" className="btn" disabled={state === 'loading'}>
          {state === 'loading' ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {state === 'idle' && (
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="ex" onClick={() => { setQ(ex); ask(ex); }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {state === 'error' && <p className="err">{errorMsg}</p>}

      {state === 'done' && (
        <div className="result">
          {answer && <p className="answer">{answer}</p>}
          {!answer && note && <p className="note dim">{note}</p>}
          {sources.length > 0 && (
            <div className="sources">
              <p className="src-label">From the library</p>
              <ul>
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener">{s.title}</a>
                    <span className="src-meta"> · {s.source} · {s.pillar}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="nudge">
            Want answers like this in your inbox?{' '}
            <a href="/subscribe">Subscribe to The AI Runtime</a>. New reads every week.
          </p>
          <p className="disclaimer muted">Answers are grounded in our reading list. Always check the source.</p>
        </div>
      )}

      <style>{`
        .ask { max-width: 42rem; }
        .ask-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .ask-form input {
          flex: 1 1 18rem; padding: 0.85rem 1rem; border-radius: 8px;
          border: 1px solid var(--border); background: var(--bg); color: var(--text);
          font-family: var(--font-sans); font-size: 0.95rem;
        }
        .ask-form input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .examples { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.85rem; }
        .ex {
          padding: 0.4rem 0.85rem; border-radius: 999px; border: 1px solid var(--border);
          background: var(--bg-2); color: var(--text-2); font-size: 0.85rem; cursor: pointer;
          font-family: var(--font-mono);
        }
        .ex:hover { border-color: var(--accent); color: var(--text); }
        .err { color: #DC2626; font-size: 0.9rem; margin-top: 0.85rem; }
        .result { margin-top: 1.25rem; }
        .answer { font-size: 1.05rem; line-height: 1.7; color: var(--text); white-space: pre-wrap; }
        .note { font-size: 0.95rem; }
        .sources { margin-top: 1rem; }
        .src-label {
          font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--text-3); margin: 0 0 0.4rem;
        }
        .sources ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
        .sources a { color: var(--accent); font-weight: 600; }
        .src-meta { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-3); }
        .nudge {
          margin-top: 1.25rem; padding: 0.9rem 1.1rem; border-left: 2px solid var(--accent);
          background: var(--bg-2); border-radius: 0 8px 8px 0; font-size: 0.95rem;
        }
        .disclaimer { font-size: 0.78rem; margin-top: 0.75rem; font-family: var(--font-mono); }
      `}</style>
    </div>
  );
}
