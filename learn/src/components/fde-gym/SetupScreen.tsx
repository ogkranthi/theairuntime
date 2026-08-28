import type {
  FdeDuration,
  FdeLevel,
  FdeMode,
  StartOptions,
} from "./types";

interface Props {
  value: StartOptions;
  onChange: (next: StartOptions) => void;
  onStart: () => void;
  busy: boolean;
  error: string;
}

const levelCopy: Record<FdeLevel, string> = {
  foundations: "More context up front. Tests sound production fundamentals.",
  fde: "Sparse prompt. You must discover requirements and defend a production design.",
  senior: "Ambiguous customer premise. Tests simplification, risk, and judgment.",
};

export default function SetupScreen({
  value,
  onChange,
  onStart,
  busy,
  error,
}: Props) {
  const set = <K extends keyof StartOptions>(
    key: K,
    next: StartOptions[K],
  ) => onChange({ ...value, [key]: next });

  const canStart =
    value.researchConsent &&
    value.confidentialityAcknowledged &&
    !busy;

  return (
    <section className="fg-setup" aria-labelledby="fg-title">
      <div className="fg-setup__hero">
        <p className="fg-eyebrow">FDE GYM BY THE AI RUNTIME</p>
        <h1 id="fg-title">Practice the Agentic System Design interview</h1>
        <p className="fg-lede">
          Ask the right questions, build the architecture, defend the
          tradeoffs, and get an evidence-backed result.
        </p>
        <div className="fg-value-grid" aria-label="How it works">
          <div>
            <span>01</span>
            <strong>Discover</strong>
            <p>Turn an ambiguous customer request into architecture-defining requirements.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Design</strong>
            <p>Build a structured system while explaining why each boundary exists.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Defend</strong>
            <p>Handle failure cases, pushback, changing constraints, and a final review.</p>
          </div>
        </div>
      </div>

      <div className="fg-setup__panel">
        <fieldset className="fg-choice">
          <legend>Mode</legend>
          <div className="fg-segmented">
            {(["practice", "mock"] as FdeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={value.mode === mode ? "is-active" : ""}
                aria-pressed={value.mode === mode}
                onClick={() => set("mode", mode)}
              >
                <strong>{mode === "practice" ? "Practice" : "Mock"}</strong>
                <span>
                  {mode === "practice"
                    ? "References, timer, and optional nudges"
                    : "Hidden rubric, no hints, realistic pressure"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="fg-choice">
          <legend>Duration</legend>
          <div className="fg-segmented fg-segmented--two">
            {([15, 30] as FdeDuration[]).map((duration) => (
              <button
                key={duration}
                type="button"
                className={value.durationMinutes === duration ? "is-active" : ""}
                aria-pressed={value.durationMinutes === duration}
                onClick={() => set("durationMinutes", duration)}
              >
                <strong>{duration} minutes</strong>
                <span>
                  {duration === 15
                    ? "Focused reliability and action-safety drill"
                    : "Complete Counterparty Due Diligence mock"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="fg-choice">
          <legend>Target bar</legend>
          <div className="fg-levels">
            {(["foundations", "fde", "senior"] as FdeLevel[]).map((level) => (
              <label
                key={level}
                className={value.level === level ? "is-active" : ""}
              >
                <input
                  type="radio"
                  name="level"
                  value={level}
                  checked={value.level === level}
                  onChange={() => set("level", level)}
                />
                <span>
                  <strong>
                    {level === "foundations"
                      ? "Foundations"
                      : level === "fde"
                        ? "FDE"
                        : "Senior FDE"}
                  </strong>
                  <small>{levelCopy[level]}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="fg-consent" aria-labelledby="fg-consent-title">
          <h2 id="fg-consent-title">Cohort 0 research consent</h2>
          <p>
            This early beta may retain and review your conversation,
            architecture, score, and feedback to improve the simulator.
          </p>
          <label>
            <input
              type="checkbox"
              checked={value.researchConsent}
              onChange={(event) =>
                set("researchConsent", event.currentTarget.checked)
              }
            />
            <span>
              I consent to temporary retention and review of this session for
              Cohort 0.
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.confidentialityAcknowledged}
              onChange={(event) =>
                set(
                  "confidentialityAcknowledged",
                  event.currentTarget.checked,
                )
              }
            />
            <span>
              I will not enter confidential employer, customer, personal,
              regulated, or proprietary information.
            </span>
          </label>
        </div>

        {error ? (
          <p className="fg-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="fg-primary fg-start"
          disabled={!canStart}
          onClick={onStart}
        >
          {busy
            ? "Starting..."
            : `Start ${value.durationMinutes}-minute ${
                value.durationMinutes === 15 ? "drill" : "mock"
              }`}
        </button>
        <p className="fg-fineprint">
          No account is required. Your detailed report is offered only after
          you complete the interview.
        </p>
      </div>
    </section>
  );
}
