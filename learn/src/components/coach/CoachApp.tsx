import { useCallback, useEffect, useRef, useState } from "react";
import {
  readHealth,
  sendMessage,
  startLesson,
  type CoachPart,
  type CoachReply,
  type CoachSummary,
  type StageMeta,
  type StageTurn,
} from "./api";
import "./coach.css";

interface Entry {
  id: number;
  role: "coach" | "learner";
  kind: CoachPart["kind"] | "learner";
  text: string;
}

export default function CoachApp() {
  const [started, setStarted] = useState(false);
  const [token, setToken] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stage, setStage] = useState<StageMeta | null>(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<CoachSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scripted, setScripted] = useState(false);
  const [open, setOpen] = useState<boolean | null>(null);

  const nextId = useRef(0);
  const stageTurns = useRef<StageTurn[]>([]);
  const retry = useRef<{ text: string; turns: StageTurn[] } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tail = useRef<HTMLDivElement>(null);

  const append = useCallback((role: Entry["role"], kind: Entry["kind"], text: string) => {
    setEntries((current) => [...current, { id: (nextId.current += 1), role, kind, text }]);
  }, []);

  const apply = useCallback(
    (reply: CoachReply) => {
      setToken(reply.token);
      // A new stage starts a fresh exchange. The model is only ever shown the
      // current stage, so nothing carries across the boundary.
      if (stage && reply.stage.number !== stage.number) stageTurns.current = [];
      setStage(reply.stage);
      setScripted(reply.degraded);
      for (const part of reply.parts) {
        append("coach", part.kind, part.text);
        // Only the question carries forward. A reply and a principle are about
        // the stage that just closed, and sending them would frame the next
        // stage with the answer to the last one.
        if (part.kind === "ask") stageTurns.current.push({ role: "coach", text: part.text });
      }
      if (reply.summary) setSummary(reply.summary);
      if (reply.done) setDone(true);
    },
    [append, stage],
  );

  useEffect(() => {
    // Ask before offering. The lesson needs a signing secret, and a start button
    // that answers with an error is worse than a page that says it is not open.
    void readHealth().then((health) => setOpen(health ? health.tokenConfigured : true));
  }, []);

  useEffect(() => {
    if (!started || done) return;
    // Focus lands on the input after the coach speaks, so a keyboard user is
    // never hunting for where to answer.
    inputRef.current?.focus();
  }, [entries.length, started, done]);

  useEffect(() => {
    tail.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries.length, done]);

  async function begin() {
    setBusy(true);
    setError("");
    try {
      const reply = await startLesson();
      setStarted(true);
      apply(reply);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The lesson could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string, turns: StageTurn[]) {
    setBusy(true);
    setError("");
    retry.current = { text, turns };
    try {
      const reply = await sendMessage(token, text, turns);
      retry.current = null;
      apply(reply);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "I could not continue the lesson just now.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const text = draft.trim();
    if (!text || busy) return;
    // Snapshot the history before adding this message: the server appends it as
    // the final user turn, and sending it twice reads as the learner repeating
    // themselves.
    const turns = stageTurns.current.slice(-6);
    append("learner", "learner", text);
    stageTurns.current.push({ role: "learner", text });
    setDraft("");
    void send(text, turns);
  }

  if (!started) {
    return (
      <section className="coach coach--intro">
        <p className="coach__eyebrow">AGENT SYSTEM DESIGN COACH</p>
        <h1>Design your first AI agent</h1>
        <p className="coach__lede">
          Most agent tutorials start with frameworks. This one starts with the
          decisions that make an agent useful in production.
        </p>
        <p className="coach__lede">
          You will work through one scenario with an AI architect, answering in
          your own words.
        </p>
        <p className="coach__meta">About 10 minutes. No prior agent experience required.</p>
        {open === false ? (
          <p className="coach__note">
            The lesson is not open yet. The reading it is drawn from is, in{" "}
            <a href="/learn/courses/agentic-system-design/">Course 002</a>.
          </p>
        ) : (
          <button
            type="button"
            className="coach__primary"
            onClick={() => void begin()}
            disabled={busy || open === null}
          >
            {busy ? "Starting..." : "Start lesson"}
          </button>
        )}
        {error ? (
          <p className="coach__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="coach__aside">
          Already experienced? <a href="/fde-gym/">Try FDE Gym</a>
        </p>
      </section>
    );
  }

  return (
    <section className="coach">
      <header className="coach__head">
        <div>
          <p className="coach__eyebrow">AGENT SYSTEM DESIGN COACH</p>
          <h1>Design your first AI agent</h1>
        </div>
        {stage && !done ? (
          <p className="coach__step">
            Step {stage.number} of {stage.total}
            <span>{stage.title}</span>
          </p>
        ) : null}
      </header>

      <div
        className="coach__log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Lesson conversation"
      >
        {entries.map((entry) => (
          <article key={entry.id} className={`coach__turn coach__turn--${entry.kind}`}>
            <p className="coach__who">{entry.role === "coach" ? "Coach" : "You"}</p>
            {entry.kind === "principle" ? <p className="coach__label">THE PRINCIPLE</p> : null}
            {entry.text.split("\n\n").map((para, index) => (
              <p key={index}>{para}</p>
            ))}
          </article>
        ))}
        {busy ? (
          <p className="coach__thinking">Thinking...</p>
        ) : null}
        <div ref={tail} />
      </div>

      {done && summary ? (
        <div className="coach__summary">
          <h2>You just designed your first agent system</h2>
          <p className="coach__lede">The six decisions you made were:</p>
          <dl>
            {summary.recap.map((line) => (
              <div key={line.label}>
                <dt>{line.label}</dt>
                <dd>{line.body}</dd>
              </div>
            ))}
          </dl>

          <h2>Your first agent design</h2>
          <dl>
            {summary.design.map((line) => (
              <div key={line.label}>
                <dt>{line.label}</dt>
                <dd>{line.body}</dd>
              </div>
            ))}
          </dl>

          <p className="coach__takeaway">{summary.takeaway}</p>

          <div className="coach__next">
            <p>
              Your agent works when everything goes right. What happens when it
              runs for hours and fails halfway through?
            </p>
            <a className="coach__primary" href="/coach/next/">
              Continue learning
            </a>
          </div>
        </div>
      ) : null}

      {!done ? (
        <form
          className="coach__composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="coach-answer">Your answer</label>
          <textarea
            id="coach-answer"
            ref={inputRef}
            rows={3}
            value={draft}
            disabled={busy}
            placeholder="Answer in your own words."
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <div className="coach__actions">
            <p className="coach__fineprint">
              Use fictional or non-sensitive examples. Enter sends, Shift and Enter
              adds a line.
            </p>
            <button type="submit" className="coach__primary" disabled={busy || !draft.trim()}>
              Send
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="coach__error" role="alert">
          <p>{error}</p>
          {retry.current ? (
            <button
              type="button"
              className="coach__secondary"
              onClick={() => {
                const pending = retry.current;
                if (pending) void send(pending.text, pending.turns);
              }}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {scripted && !done ? (
        <p className="coach__note">
          The coach is running from its written lesson right now, so replies will
          not respond to your exact wording. The six steps still work.
        </p>
      ) : null}
    </section>
  );
}
