import { useState } from "react";
import { requestReport, sendFeedback } from "./api";
import type {
  InterviewSession,
  ResultSummary,
} from "./types";

interface Props {
  session: InterviewSession;
  summary: ResultSummary;
  onRestart: () => void;
}

const levelLabel = (value: string) =>
  value === "senior" ? "Senior FDE" : value === "fde" ? "FDE" : "Foundations";

export default function ResultScreen({
  session,
  summary,
  onRestart,
}: Props) {
  const [email, setEmail] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  const [reportState, setReportState] = useState<
    "idle" | "sending" | "sent"
  >("idle");
  const [error, setError] = useState("");
  const [realism, setRealism] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [returnTomorrow, setReturnTomorrow] = useState(true);
  const [comments, setComments] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const sendReport = async () => {
    setError("");
    setReportState("sending");
    try {
      await requestReport({
        session,
        email,
        subscribe,
      });
      setReportState("sent");
    } catch (cause) {
      setReportState("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : "The report could not be sent.",
      );
    }
  };

  const submitFeedback = async () => {
    setError("");
    try {
      await sendFeedback({
        sessionId: session.id,
        realismComparedToChatGPT: realism,
        wouldReturnTomorrow: returnTomorrow,
        comments: comments.trim() || undefined,
      });
      setFeedbackSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Feedback could not be saved.",
      );
    }
  };

  return (
    <section className="fg-result" aria-labelledby="fg-result-title">
      <div className="fg-result__summary">
        <p className="fg-eyebrow">
          TARGET: {levelLabel(summary.targetLevel).toUpperCase()}
        </p>
        <h1 id="fg-result-title">{summary.verdict}</h1>
        <p className="fg-result__score">{summary.score}/100</p>

        {summary.degraded ? (
          <p className="fg-notice">
            The model evaluator was unavailable, so this result used the
            deterministic fallback. Use it to test the product flow, not to
            calibrate Cohort 0 scoring.
          </p>
        ) : null}

        <div className="fg-bars" aria-label="Performance by target bar">
          <div>
            <span>Foundations</span>
            <strong>{summary.barRelative.foundations}</strong>
          </div>
          <div>
            <span>FDE</span>
            <strong>{summary.barRelative.fde}</strong>
          </div>
          <div>
            <span>Senior FDE</span>
            <strong>{summary.barRelative.senior}</strong>
          </div>
        </div>

        <div className="fg-result__signals">
          <article>
            <p className="fg-eyebrow">STRONGEST</p>
            <h2>{summary.strongest.label}</h2>
            <p>{summary.strongest.reason}</p>
          </article>
          <article>
            <p className="fg-eyebrow">BIGGEST GAP</p>
            <h2>{summary.biggestGap.label}</h2>
            <p>{summary.biggestGap.reason}</p>
          </article>
        </div>

        <blockquote className="fg-interviewer-note">
          <p className="fg-eyebrow">INTERVIEWER NOTE</p>
          <p>{summary.interviewerNote}</p>
        </blockquote>

        {!summary.criticalCoverage.sufficient ? (
          <div className="fg-notice">
            <strong>Why this is incomplete</strong>
            <p>
              The session did not generate enough evidence in:{" "}
              {summary.criticalCoverage.missingGroups.join(", ")}.
            </p>
          </div>
        ) : null}
      </div>

      <div className="fg-report-gate">
        {reportState === "sent" ? (
          <div className="fg-report-sent">
            <p className="fg-eyebrow">REPORT SENT</p>
            <h2>Check your inbox</h2>
            <p>
              The report includes competency evidence, a personalized
              mini-lesson, three defensible architectures, and your prescribed
              next drill.
            </p>
          </div>
        ) : (
          <>
            <p className="fg-eyebrow">GET THE FULL REPORT</p>
            <h2>See exactly what moved the decision</h2>
            <p>
              Your email report includes the detailed competency breakdown,
              evidence from this attempt, what you missed, stronger reasoning,
              architecture alternatives, and the next AIR drill.
            </p>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.currentTarget.value)}
              />
            </label>
            <label className="fg-check">
              <input
                type="checkbox"
                checked={subscribe}
                onChange={(event) =>
                  setSubscribe(event.currentTarget.checked)
                }
              />
              <span>
                Subscribe me to The AI Runtime and send this personalized
                report.
              </span>
            </label>
            <button
              type="button"
              className="fg-primary"
              disabled={
                reportState === "sending" ||
                !email.trim() ||
                !subscribe
              }
              onClick={() => void sendReport()}
            >
              {reportState === "sending"
                ? "Sending..."
                : "Subscribe and send my report"}
            </button>
          </>
        )}

        {error ? (
          <p className="fg-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="fg-feedback">
        {feedbackSent ? (
          <div>
            <p className="fg-eyebrow">COHORT 0</p>
            <h2>Feedback received</h2>
            <p>
              Everyone in Cohort 0 completed the same benchmark so AIR can
              calibrate interviewer realism and scoring consistently.
            </p>
          </div>
        ) : (
          <>
            <p className="fg-eyebrow">COHORT 0 FEEDBACK</p>
            <h2>Two signals decide whether we keep building</h2>

            <label>
              Was this more realistic than practicing with generic ChatGPT?
              <select
                value={realism}
                onChange={(event) =>
                  setRealism(Number(event.currentTarget.value) as 1 | 2 | 3 | 4 | 5)
                }
              >
                <option value={1}>1 - much less realistic</option>
                <option value={2}>2 - less realistic</option>
                <option value={3}>3 - about the same</option>
                <option value={4}>4 - more realistic</option>
                <option value={5}>5 - much more realistic</option>
              </select>
            </label>

            <fieldset>
              <legend>Would you do another 15-minute scenario tomorrow?</legend>
              <label className="fg-check">
                <input
                  type="radio"
                  name="return-tomorrow"
                  checked={returnTomorrow}
                  onChange={() => setReturnTomorrow(true)}
                />
                Yes
              </label>
              <label className="fg-check">
                <input
                  type="radio"
                  name="return-tomorrow"
                  checked={!returnTomorrow}
                  onChange={() => setReturnTomorrow(false)}
                />
                No
              </label>
            </fieldset>

            <label>
              What felt realistic, unfair, weak, or missing?
              <textarea
                rows={4}
                value={comments}
                onChange={(event) => setComments(event.currentTarget.value)}
              />
            </label>
            <button
              type="button"
              className="fg-secondary"
              onClick={() => void submitFeedback()}
            >
              Send feedback
            </button>
          </>
        )}
      </div>

      <div className="fg-result__footer">
        <button type="button" className="fg-secondary" onClick={onRestart}>
          Start another attempt
        </button>
        <p>
          This evaluates one practice interview. It is not a certification or
          hiring guarantee.
        </p>
      </div>
    </section>
  );
}
