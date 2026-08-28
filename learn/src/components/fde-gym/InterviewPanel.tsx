import { useEffect, useRef, useState } from "react";
import { PRACTICE_REFERENCE } from "./reference";
import type { InterviewSession } from "./types";

interface Props {
  session: InterviewSession;
  charter: string;
  elapsedSeconds: number;
  running: boolean;
  busy: boolean;
  error: string;
  shouldEnd: boolean;
  degraded: boolean;
  onToggleRunning: () => void;
  onSend: (message: string, requestHint?: boolean) => Promise<boolean>;
  onFinish: () => Promise<void>;
}

const pad = (value: number) => String(value).padStart(2, "0");

function clockLabel(session: InterviewSession, elapsedSeconds: number) {
  const total = session.durationMinutes * 60;
  const remaining = Math.max(0, total - elapsedSeconds);
  return `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
}

function relativeTime(seconds: number) {
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return `${minute}:${pad(second)}`;
}

export default function InterviewPanel({
  session,
  charter,
  elapsedSeconds,
  running,
  busy,
  error,
  shouldEnd,
  degraded,
  onToggleRunning,
  onSend,
  onFinish,
}: Props) {
  const [message, setMessage] = useState("");
  const historyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    historyRef.current?.scrollTo({
      top: historyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [session.transcript.length]);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    const sent = await onSend(trimmed);
    if (sent) {
      setMessage("");
      inputRef.current?.focus();
    }
  };

  return (
    <section className="fg-interview" aria-label="Staff FDE interview">
      <header className="fg-interview__head">
        <div>
          <p className="fg-eyebrow">STAFF FDE INTERVIEWER</p>
          <h2>
            {session.durationMinutes === 15
              ? "Reliability and action-safety drill"
              : "Counterparty Due Diligence"}
          </h2>
          <p>{charter}</p>
        </div>
        <div className="fg-session-meta">
          <span>{session.mode}</span>
          <span>{session.level}</span>
          <span>{session.durationMinutes} min</span>
          {degraded ? <span className="fg-warning-chip">degraded model mode</span> : null}
        </div>
      </header>

      <div className="fg-clock-row">
        {session.mode === "practice" ? (
          <>
            <div className="fg-clock" aria-label="Time remaining">
              {clockLabel(session, elapsedSeconds)}
            </div>
            <button
              type="button"
              className="fg-secondary"
              onClick={onToggleRunning}
              disabled={busy}
            >
              {running ? "Pause" : "Resume"}
            </button>
          </>
        ) : (
          <p>
            The exact clock is hidden. The Staff FDE will give natural time
            cues.
          </p>
        )}
        <span className="fg-phase">Phase: {session.phase}</span>
      </div>

      {session.mode === "practice" ? (
        <details className="fg-reference">
          <summary>Open practice reference</summary>
          <p>
            These notes define production properties. They do not solve the
            scenario for you.
          </p>
          <div className="fg-reference__grid">
            {PRACTICE_REFERENCE.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <div className="fg-chat-history" ref={historyRef} aria-live="polite">
        {session.transcript.map((turn) => (
          <article
            key={turn.id}
            className={`fg-turn fg-turn--${turn.role}`}
          >
            <header>
              <strong>
                {turn.role === "candidate" ? "You" : "Staff FDE"}
              </strong>
              <span>{relativeTime(turn.atSeconds)}</span>
              {turn.hint ? <span className="fg-hint-chip">hint</span> : null}
            </header>
            <p>{turn.content}</p>
          </article>
        ))}
        {busy ? (
          <article className="fg-turn fg-turn--interviewer">
            <header>
              <strong>Staff FDE</strong>
            </header>
            <p className="fg-thinking">Reviewing your answer and architecture...</p>
          </article>
        ) : null}
      </div>

      {shouldEnd ? (
        <p className="fg-notice" role="status">
          The interviewer has enough evidence to close. Give a final defense or
          finish the session.
        </p>
      ) : null}

      {error ? (
        <p className="fg-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="fg-composer">
        <label htmlFor="fg-answer">
          Explain what you are asking, assuming, designing, or changing.
        </label>
        <textarea
          ref={inputRef}
          id="fg-answer"
          rows={4}
          value={message}
          disabled={busy || !running}
          placeholder={
            running
              ? "Ask a discovery question or explain the next architecture decision..."
              : "Resume the practice timer to continue."
          }
          onChange={(event) => setMessage(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey)
            ) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <div className="fg-composer__actions">
          <span>Cmd/Ctrl + Enter to send</span>
          <div>
            {session.mode === "practice" ? (
              <button
                type="button"
                className="fg-secondary"
                disabled={busy || !running}
                onClick={() =>
                  void onSend(
                    "I need the smallest useful nudge on the next architectural decision.",
                    true,
                  )
                }
              >
                Ask for a nudge
              </button>
            ) : null}
            <button
              type="button"
              className="fg-primary"
              disabled={busy || !running || !message.trim()}
              onClick={() => void submit()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="fg-finish-row">
        <p>
          Finish when you have defended the final design. A 30-minute mock
          should end with a concise architecture summary.
        </p>
        <button
          type="button"
          className="fg-danger"
          disabled={busy}
          onClick={() => void onFinish()}
        >
          Finish interview
        </button>
      </div>
    </section>
  );
}
