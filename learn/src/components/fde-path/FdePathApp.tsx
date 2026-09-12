import { useEffect, useReducer, useRef, useState } from "react";
import { buildMapping, buildPlan } from "./api";
import CareerPlan from "./CareerPlan";
import ExperienceIntake from "./ExperienceIntake";
import FirstStep from "./FirstStep";
import RoleGuide from "./RoleGuide";
import TransferableSkills from "./TransferableSkills";
import { downloadMarkdown } from "./markdown";
import {
  empty,
  hasJourney,
  isAvailable,
  read,
  write,
  type PathState,
  type ProcessingChoice,
  type StageNumber,
  type StoredAnswers,
  type StoredMapping,
  type StoredPlan,
  type StoredStep,
} from "./store";
import "./fde-path.css";

const STAGES = [
  "The role",
  "Your experience",
  "What carries over",
  "Your plan",
  "First step",
];

type Action =
  | { type: "hydrate"; state: PathState }
  | { type: "answers"; answers: StoredAnswers }
  | { type: "consent"; choice: ProcessingChoice; noticeVersion: string }
  | { type: "mapping"; mapping: StoredMapping }
  | { type: "remove"; id: string }
  | { type: "plan"; plan: StoredPlan; steps: StoredStep[] }
  | { type: "choose"; id: string }
  | { type: "complete"; note: string }
  | { type: "reopen" }
  | { type: "stage"; stage: StageNumber }
  | { type: "reset" };

/**
 * The journey, as one explicit reducer.
 *
 * The learner's actions are the only thing that moves a stage. No model reply,
 * no fetch result, and no timer advances the journey, which is what keeps
 * "confirm your experience" from being something the app can skip on their
 * behalf.
 */
function reducer(state: PathState, action: Action): PathState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "answers":
      return { ...state, answers: action.answers };
    case "consent":
      return {
        ...state,
        consent: {
          choice: action.choice,
          at: new Date().toISOString(),
          noticeVersion: action.noticeVersion,
        },
      };
    case "mapping":
      return { ...state, mapping: action.mapping, removedIds: [], confirmed: false };
    case "remove":
      // Removed items stay removed. Regenerating must not quietly bring back
      // something the learner has already said is wrong about them.
      return state.removedIds.includes(action.id)
        ? state
        : { ...state, removedIds: [...state.removedIds, action.id] };
    case "plan":
      return {
        ...state,
        confirmed: true,
        previousPlan: state.plan ?? state.previousPlan,
        plan: action.plan,
        steps: action.steps,
        stage: 4,
      };
    case "choose":
      return { ...state, chosenStepId: action.id, chosenAt: new Date().toISOString(), stage: 5 };
    case "complete":
      return { ...state, completedAt: new Date().toISOString(), completionNote: action.note };
    case "reopen":
      return { ...state, completedAt: null };
    case "stage":
      return { ...state, stage: action.stage };
    case "reset":
      return empty();
    default:
      return state;
  }
}

export default function FdePathApp() {
  const [state, dispatch] = useReducer(reducer, empty());
  const [hydrated, setHydrated] = useState(false);
  const [storable, setStorable] = useState(true);
  const [busy, setBusy] = useState<"" | "mapping" | "plan">("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"" | "saved" | "failed">("");
  const [note, setNote] = useState("");
  const heading = useRef<HTMLDivElement>(null);

  // Storage is read after mount, never during render, so the server and the
  // first client paint agree and the role guide is identical either way.
  useEffect(() => {
    const available = isAvailable();
    setStorable(available);
    if (available) dispatch({ type: "hydrate", state: read() });
    setHydrated(true);
  }, []);

  // Autosave. Writing is the only thing that happens on a state change: there
  // is deliberately no model call on load, on save, or on selection.
  useEffect(() => {
    if (!hydrated || !storable) return;
    if (!hasJourney(state)) return;
    setSaved(write(state) ? "saved" : "failed");
  }, [state, hydrated, storable]);

  useEffect(() => {
    if (!hydrated) return;
    heading.current?.focus();
  }, [state.stage, hydrated]);

  const selfGuided = state.consent?.choice === "self";

  async function toMapping() {
    setBusy("mapping");
    setError("");
    try {
      const result = await buildMapping(state.answers, selfGuided);
      dispatch({ type: "mapping", mapping: result.mapping });
      dispatch({ type: "stage", stage: 3 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work just now.");
    } finally {
      setBusy("");
    }
  }

  async function toPlan() {
    if (!state.mapping) return;
    setBusy("plan");
    setError("");
    try {
      const keepIds = [
        ...state.mapping.connections.map((item) => item.id),
        ...state.mapping.develop.map((item) => item.id),
      ].filter((id) => !state.removedIds.includes(id));
      const result = await buildPlan(state.answers, state.mapping, keepIds, selfGuided);
      dispatch({ type: "plan", plan: result.plan, steps: result.steps });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work just now.");
    } finally {
      setBusy("");
    }
  }

  const reachable = (stage: StageNumber): boolean => {
    if (stage <= state.stage) return true;
    if (stage === 2) return true;
    if (stage === 3) return Boolean(state.mapping);
    // Stage 4 and beyond stay closed until the learner has confirmed the
    // reading of their own experience. That confirmation is the point.
    if (stage === 4) return state.confirmed && Boolean(state.plan);
    return Boolean(state.chosenStepId);
  };

  const chosen = state.steps.find((item) => item.id === state.chosenStepId);

  return (
    <div className="fde-path">
      <nav className="path-progress" aria-label="Progress">
        <p className="path-progress__mobile">
          Step {state.stage} of {STAGES.length}: {STAGES[state.stage - 1]}
        </p>
        <ol>
          {STAGES.map((label, index) => {
            const stage = (index + 1) as StageNumber;
            const current = stage === state.stage;
            return (
              <li key={label} className={current ? "is-current" : reachable(stage) ? "is-open" : ""}>
                {reachable(stage) && !current ? (
                  <button type="button" onClick={() => dispatch({ type: "stage", stage })}>
                    <span>{String(stage).padStart(2, "0")}</span>
                    {label}
                  </button>
                ) : (
                  <span aria-current={current ? "step" : undefined}>
                    <span>{String(stage).padStart(2, "0")}</span>
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="path-main" ref={heading} tabIndex={-1}>
        {state.stage === 1 ? (
          <RoleGuide onReady={hydrated ? () => dispatch({ type: "stage", stage: 2 }) : undefined} />
        ) : null}

        {state.stage === 2 ? (
          <ExperienceIntake
            answers={state.answers}
            consent={state.consent?.choice ?? null}
            onChange={(answers) => dispatch({ type: "answers", answers })}
            onConsent={(choice, noticeVersion) =>
              dispatch({ type: "consent", choice, noticeVersion })
            }
            onDone={() => void toMapping()}
          />
        ) : null}

        {state.stage === 3 && state.mapping ? (
          <TransferableSkills
            mapping={state.mapping}
            removedIds={state.removedIds}
            selfGuided={selfGuided}
            onRemove={(id) => dispatch({ type: "remove", id })}
            onConfirm={() => void toPlan()}
            onEdit={() => dispatch({ type: "stage", stage: 2 })}
            busy={busy === "plan"}
          />
        ) : null}

        {state.stage === 4 && state.plan ? (
          <CareerPlan
            plan={state.plan}
            onChoose={() => dispatch({ type: "stage", stage: 5 })}
            onEdit={() => dispatch({ type: "stage", stage: 2 })}
            onRegenerate={() => void toPlan()}
            busy={busy === "plan"}
          />
        ) : null}

        {state.stage === 5 ? (
          chosen ? (
            <div className="path-stage">
              <h1>Your next step</h1>
              <div className="path-nextstep">
                <h2>{chosen.task}</h2>
                <dl className="path-detail">
                  <div>
                    <dt>Done when</dt>
                    <dd>{chosen.doneWhen}</dd>
                  </div>
                  <div>
                    <dt>Bring back</dt>
                    <dd>{chosen.bringBack}</dd>
                  </div>
                </dl>
                {state.completedAt ? (
                  <p className="path-done">
                    Marked complete on {state.completedAt.slice(0, 10)}.{" "}
                    <button type="button" className="path-link" onClick={() => dispatch({ type: "reopen" })}>
                      Reopen
                    </button>
                  </p>
                ) : (
                  <>
                    <label className="path-field">
                      <span>Notes (optional)</span>
                      <textarea
                        rows={3}
                        value={note}
                        maxLength={800}
                        onChange={(event) => setNote(event.currentTarget.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="path-btn path-btn--primary"
                      onClick={() => dispatch({ type: "complete", note })}
                    >
                      Mark complete
                    </button>
                  </>
                )}
              </div>
              <div className="path-row">
                <button type="button" className="path-btn" onClick={() => dispatch({ type: "stage", stage: 4 })}>
                  Review my plan
                </button>
                <button
                  type="button"
                  className="path-btn"
                  onClick={() => dispatch({ type: "choose", id: "" })}
                >
                  Change my first step
                </button>
                <button
                  type="button"
                  className="path-link"
                  onClick={() => {
                    if (!downloadMarkdown(state)) setError("This browser would not save the file.");
                  }}
                >
                  Download my plan
                </button>
              </div>
            </div>
          ) : (
            <FirstStep
              steps={state.steps}
              chosenId={state.chosenStepId}
              onChoose={(id) => dispatch({ type: "choose", id })}
              onBack={() => dispatch({ type: "stage", stage: 4 })}
            />
          )
        ) : null}

        {busy ? (
          <p className="path-loading" role="status">
            {busy === "mapping" ? "Connecting your experience..." : "Drafting your starting plan..."}
          </p>
        ) : null}

        {error ? (
          <div className="path-error" role="alert">
            <p>{error}</p>
            <p className="path-note">Your answers are still here. Nothing was lost.</p>
          </div>
        ) : null}
      </div>

      <footer className="path-foot">
        {!storable ? (
          <p>This browser is not letting the guide save anything, so your work will not survive a reload.</p>
        ) : saved === "failed" ? (
          <p>Could not save to this browser.</p>
        ) : saved === "saved" ? (
          <p>Saved in this browser.</p>
        ) : null}
        {hasJourney(state) ? (
          <button
            type="button"
            className="path-link"
            onClick={() => {
              if (confirm("Clear everything the guide has saved in this browser?")) {
                dispatch({ type: "reset" });
                try {
                  localStorage.removeItem("air-fde-path");
                } catch {
                  // Nothing to do. The in memory reset already happened.
                }
              }
            }}
          >
            Start over
          </button>
        ) : null}
        <p className="path-sig">
          <a href="https://theairuntime.com">theairuntime.com</a>
        </p>
      </footer>
    </div>
  );
}
