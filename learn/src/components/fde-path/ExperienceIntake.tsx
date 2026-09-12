import { useState } from "react";
import { askFollowUps } from "./api";
import { NOTICE_VERSION, type ProcessingChoice, type StoredAnswers } from "./store";

const CONTEXTS = [
  { id: "student", label: "Student" },
  { id: "software-developer", label: "Software developer" },
  { id: "solutions", label: "Solutions engineer or architect" },
  { id: "other", label: "Another role" },
];

const OWNED = [
  { id: "discovery", label: "Working out what was needed" },
  { id: "design", label: "Designing how it would work" },
  { id: "coding", label: "Writing the code" },
  { id: "testing", label: "Testing it" },
  { id: "deployment", label: "Deploying it" },
  { id: "support", label: "Supporting it afterwards" },
  { id: "unsure", label: "Not sure yet" },
];

const DIRECTIONS = [
  { id: "building-systems", label: "Building systems" },
  { id: "working-with-customers", label: "Working with customers" },
  { id: "owning-delivery", label: "Owning delivery end to end" },
  { id: "exploring", label: "I am still exploring" },
];

interface Props {
  answers: StoredAnswers;
  consent: ProcessingChoice | null;
  onChange: (answers: StoredAnswers) => void;
  onConsent: (choice: ProcessingChoice, noticeVersion: string) => void;
  onDone: () => void;
}

type Step = "context" | "example" | "owned" | "direction" | "note" | "consent" | "followups";

const ORDER: Step[] = ["context", "example", "owned", "direction", "note", "consent", "followups"];

export default function ExperienceIntake({
  answers,
  consent,
  onChange,
  onConsent,
  onDone,
}: Props) {
  const [step, setStep] = useState<Step>(consent ? "followups" : "context");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<StoredAnswers>) => onChange({ ...answers, ...patch });
  const goto = (next: Step) => {
    setError("");
    setStep(next);
  };
  const advance = () => goto(ORDER[Math.min(ORDER.indexOf(step) + 1, ORDER.length - 1)]);

  function toggleOwned(id: string) {
    // "Not sure yet" is an answer, not an absence of one, so it clears the rest
    // rather than sitting alongside them.
    if (id === "unsure") {
      set({ owned: answers.owned.includes("unsure") ? [] : ["unsure"] });
      return;
    }
    const without = answers.owned.filter((item) => item !== "unsure");
    set({
      owned: without.includes(id) ? without.filter((item) => item !== id) : [...without, id],
    });
  }

  async function choose(choice: ProcessingChoice) {
    onConsent(choice, NOTICE_VERSION);
    if (choice === "self") {
      onDone();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await askFollowUps(answers);
      if (!result.questions.length) {
        onDone();
        return;
      }
      onChange({
        ...answers,
        followUps: result.questions.map((question) => ({ question, answer: "" })),
      });
      goto("followups");
    } catch (cause) {
      // A failed follow-up is not a blocked journey. The intake already has
      // enough to build a plan, so this moves on rather than trapping them.
      setError(
        cause instanceof Error
          ? `${cause.message} Continuing without follow-up questions.`
          : "Continuing without follow-up questions.",
      );
      setTimeout(onDone, 1200);
    } finally {
      setBusy(false);
    }
  }

  const answered = (
    <div className="path-answered">
      {answers.context && step !== "context" ? (
        <button type="button" onClick={() => goto("context")}>
          <span>Current context</span>
          <strong>{CONTEXTS.find((item) => item.id === answers.context)?.label}</strong>
          <em>Edit</em>
        </button>
      ) : null}
      {answers.example && step !== "example" ? (
        <button type="button" onClick={() => goto("example")}>
          <span>What you built</span>
          <strong>{answers.example.slice(0, 90)}{answers.example.length > 90 ? "..." : ""}</strong>
          <em>Edit</em>
        </button>
      ) : null}
      {answers.owned.length && step !== "owned" ? (
        <button type="button" onClick={() => goto("owned")}>
          <span>You owned</span>
          <strong>
            {answers.owned
              .map((id) => OWNED.find((item) => item.id === id)?.label)
              .filter(Boolean)
              .join(", ")}
          </strong>
          <em>Edit</em>
        </button>
      ) : null}
      {answers.direction && step !== "direction" ? (
        <button type="button" onClick={() => goto("direction")}>
          <span>You want more of</span>
          <strong>{DIRECTIONS.find((item) => item.id === answers.direction)?.label}</strong>
          <em>Edit</em>
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="path-stage">
      <h1>Let us understand what you have done.</h1>
      <p className="path-lede">
        Four questions. Company names and job titles are optional, and they do not
        change the guidance.
      </p>

      {answered}

      <div className="path-card">
        {step === "context" ? (
          <fieldset>
            <legend>Where are you right now?</legend>
            <div className="path-choices">
              {CONTEXTS.map((item) => (
                <label key={item.id} className="path-choice">
                  <input
                    type="radio"
                    name="context"
                    checked={answers.context === item.id}
                    onChange={() => set({ context: item.id })}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <label className="path-field">
              <span>Anything to add (optional)</span>
              <input
                type="text"
                value={answers.contextNote}
                maxLength={200}
                onChange={(event) => set({ contextNote: event.currentTarget.value })}
              />
            </label>
            <button
              type="button"
              className="path-btn path-btn--primary"
              onClick={advance}
              disabled={!answers.context}
            >
              Next
            </button>
          </fieldset>
        ) : null}

        {step === "example" ? (
          <div>
            <h2>Tell me about something you built or helped deliver.</h2>
            <p className="path-why">
              What problem did it address? Coursework, a personal project, or
              volunteering all count.
            </p>
            <label className="path-field">
              <span>Your answer</span>
              <textarea
                rows={5}
                value={answers.example}
                maxLength={1500}
                placeholder="A few sentences is plenty."
                onChange={(event) => set({ example: event.currentTarget.value })}
              />
            </label>
            <div className="path-row">
              <button type="button" className="path-btn path-btn--primary" onClick={advance}>
                Next
              </button>
              <button type="button" className="path-link" onClick={advance}>
                I have not built a project yet
              </button>
            </div>
          </div>
        ) : null}

        {step === "owned" ? (
          <fieldset>
            <legend>Which parts did you personally own?</legend>
            <p className="path-why">
              Not what the team did. What landed on you.
            </p>
            <div className="path-choices">
              {OWNED.map((item) => (
                <label key={item.id} className="path-choice">
                  <input
                    type="checkbox"
                    checked={answers.owned.includes(item.id)}
                    onChange={() => toggleOwned(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <button type="button" className="path-btn path-btn--primary" onClick={advance}>
              Next
            </button>
          </fieldset>
        ) : null}

        {step === "direction" ? (
          <fieldset>
            <legend>What would you like to do more of?</legend>
            <div className="path-choices">
              {DIRECTIONS.map((item) => (
                <label key={item.id} className="path-choice">
                  <input
                    type="radio"
                    name="direction"
                    checked={answers.direction === item.id}
                    onChange={() => set({ direction: item.id })}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="path-btn path-btn--primary"
              onClick={advance}
              disabled={!answers.direction}
            >
              Next
            </button>
          </fieldset>
        ) : null}

        {step === "note" ? (
          <div>
            <h2>Anything else worth knowing?</h2>
            <p className="path-why">
              Time you have, constraints, anything the plan should account for.
              Leave it blank if you do not know yet.
            </p>
            <label className="path-field">
              <span>Optional</span>
              <textarea
                rows={3}
                value={answers.note}
                maxLength={600}
                onChange={(event) => set({ note: event.currentTarget.value })}
              />
            </label>
            <button type="button" className="path-btn path-btn--primary" onClick={advance}>
              Next
            </button>
          </div>
        ) : null}

        {step === "consent" ? (
          <div>
            <h2>Before the guide reads your answers</h2>
            <p className="path-notice">
              Your answers will be sent to the AI service to draft guidance. Your
              plan is saved in this browser. Use examples you can share.
            </p>
            <p className="path-why">
              The self-guided option never sends your answers anywhere. It builds
              the same plan from the guide's own catalog instead, so the whole
              journey still works.
            </p>
            <div className="path-row">
              <button
                type="button"
                className="path-btn path-btn--primary"
                onClick={() => void choose("ai")}
                disabled={busy}
              >
                {busy ? "Reading your answers..." : "Use AI guidance"}
              </button>
              <button
                type="button"
                className="path-btn"
                onClick={() => void choose("self")}
                disabled={busy}
              >
                Continue with self-guided planning
              </button>
            </div>
            {error ? (
              <p className="path-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === "followups" ? (
          <div>
            {answers.followUps.length ? (
              <>
                <h2>
                  {answers.followUps.length === 1 ? "One more question." : "Two more questions."}
                </h2>
                <p className="path-why">
                  Only asked because the answer would change the guidance. Skip any
                  you would rather not answer.
                </p>
                {answers.followUps.map((followUp, index) => (
                  <label className="path-field" key={followUp.question}>
                    <span>{followUp.question}</span>
                    <textarea
                      rows={3}
                      value={followUp.answer}
                      maxLength={1500}
                      onChange={(event) => {
                        const next = [...answers.followUps];
                        next[index] = { ...followUp, answer: event.currentTarget.value };
                        set({ followUps: next });
                      }}
                    />
                  </label>
                ))}
              </>
            ) : (
              <>
                <h2>That is enough to work with.</h2>
                <p className="path-why">
                  Your answers cover what the guide needs. Nothing further to ask.
                </p>
              </>
            )}
            <button type="button" className="path-btn path-btn--primary" onClick={onDone}>
              See how my experience connects
            </button>
          </div>
        ) : null}
      </div>

      {step !== "context" && step !== "followups" ? (
        <button
          type="button"
          className="path-link"
          onClick={() => goto(ORDER[Math.max(ORDER.indexOf(step) - 1, 0)])}
        >
          Back
        </button>
      ) : null}
    </div>
  );
}
