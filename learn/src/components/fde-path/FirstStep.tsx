import { useState } from "react";
import type { StoredStep } from "./store";

interface Props {
  steps: StoredStep[];
  chosenId: string | null;
  onChoose: (id: string) => void;
  onBack: () => void;
}

/**
 * Stage 5. One action, chosen on purpose.
 *
 * The first option is recommended and says why, but it is a plain radio group:
 * picking another one is a click, not a negotiation. Choosing a step is not the
 * same as finishing it, and the screen never implies otherwise.
 */
export default function FirstStep({ steps, chosenId, onChoose, onBack }: Props) {
  const [selected, setSelected] = useState<string>(chosenId ?? steps[0]?.id ?? "");

  return (
    <div className="path-stage">
      <h1>Choose one useful first step.</h1>
      <p className="path-lede">
        One is enough. The first option is the one we would start with, and the
        reason is underneath it.
      </p>

      <fieldset className="path-steps">
        <legend className="path-visually-hidden">Available first steps</legend>
        {steps.map((step, index) => (
          <label
            key={step.id}
            className={`path-step ${selected === step.id ? "path-step--on" : ""}`}
          >
            <input
              type="radio"
              name="first-step"
              value={step.id}
              checked={selected === step.id}
              onChange={() => setSelected(step.id)}
            />
            <div>
              {index === 0 ? <p className="path-tag">RECOMMENDED</p> : null}
              <h2>{step.task}</h2>
              {index === 0 ? (
                <p className="path-why">
                  It is the first priority in your plan, and it produces something
                  you can bring back and talk about.
                </p>
              ) : null}
              <dl className="path-detail">
                <div>
                  <dt>You will produce</dt>
                  <dd>{step.output}</dd>
                </div>
                <div>
                  <dt>Done when</dt>
                  <dd>{step.doneWhen}</dd>
                </div>
                <div>
                  <dt>Rough effort</dt>
                  <dd>{step.estimate}, an estimate rather than a deadline</dd>
                </div>
                <div>
                  <dt>Bring back</dt>
                  <dd>{step.bringBack}</dd>
                </div>
              </dl>
            </div>
          </label>
        ))}
      </fieldset>

      <div className="path-row">
        <button
          type="button"
          className="path-btn path-btn--primary"
          onClick={() => onChoose(selected)}
          disabled={!selected}
        >
          Choose this step
        </button>
        <button type="button" className="path-btn" onClick={onBack}>
          Back to my plan
        </button>
      </div>
      <p className="path-note">
        Reading or writing counts. The useful first move is not always to open an
        editor.
      </p>
    </div>
  );
}
