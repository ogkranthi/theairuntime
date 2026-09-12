import type { StoredMapping } from "./store";

interface Props {
  mapping: StoredMapping;
  removedIds: string[];
  selfGuided: boolean;
  onRemove: (id: string) => void;
  onConfirm: () => void;
  onEdit: () => void;
  busy: boolean;
}

/**
 * Stage 3, where the guide shows its working.
 *
 * Three sections that are deliberately not the same kind of claim. What you
 * described is the learner's own account. What to develop is an opportunity
 * next to it. What is still unknown is a statement about the conversation, not
 * about the person, and it is kept visually separate so silence never reads as
 * a weakness.
 *
 * Nothing here is scored. There is no percentage, no verdict, and no estimate
 * of anyone's chances, because none of that could be honest from four answers.
 */
export default function TransferableSkills({
  mapping,
  removedIds,
  selfGuided,
  onRemove,
  onConfirm,
  onEdit,
  busy,
}: Props) {
  const connections = mapping.connections.filter((item) => !removedIds.includes(item.id));
  const develop = mapping.develop.filter((item) => !removedIds.includes(item.id));

  return (
    <div className="path-stage">
      <h1>Here is what you can build on.</h1>
      <p className="path-lede">
        A first reading of what you told us. Correct anything that does not fit
        before it reaches your plan.
      </p>
      {selfGuided ? (
        <p className="path-note">
          Built from the guide's own catalog. Your answers were not sent anywhere.
        </p>
      ) : null}

      <section className="path-section path-section--carry">
        <h2>Experience to build on</h2>
        {connections.length ? (
          <ul className="path-items">
            {connections.map((item) => (
              <li key={item.id}>
                <div className="path-bridge">
                  <p className="path-bridge__from">{item.described}</p>
                  <span className="path-bridge__arrow" aria-hidden="true" />
                  <p className="path-bridge__to">{item.capabilityLabel}</p>
                </div>
                <p>{item.because}</p>
                {item.quote ? (
                  <details className="path-evidence">
                    <summary>Based on your answer</summary>
                    <blockquote>{item.quote}</blockquote>
                  </details>
                ) : null}
                <button type="button" className="path-link" onClick={() => onRemove(item.id)}>
                  This does not fit
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="path-empty">
            Nothing here yet, which usually means the intake was brief rather than
            that you have nothing to build on. Editing your answers will help.
          </p>
        )}
      </section>

      <section className="path-section path-section--develop">
        <h2>Areas to develop</h2>
        {develop.length ? (
          <ul className="path-items">
            {develop.map((item) => (
              <li key={item.id}>
                <p className="path-cap">{item.capabilityLabel}</p>
                <p>{item.because}</p>
                <button type="button" className="path-link" onClick={() => onRemove(item.id)}>
                  This does not fit
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="path-empty">Nothing flagged from what you described.</p>
        )}
      </section>

      {mapping.unknowns.length ? (
        <section className="path-section path-section--unknown">
          <h2>Still to understand</h2>
          <p className="path-why">
            Questions the guide does not have answers to. These are unanswered,
            not gaps in your experience.
          </p>
          <ul className="path-items path-items--plain">
            {mapping.unknowns.map((item) => (
              <li key={item.id}>{item.question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="path-confirm">
        <h2>Does this reflect your experience?</h2>
        <div className="path-row">
          <button
            type="button"
            className="path-btn path-btn--primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Drafting your starting plan..." : "Yes, use this for my plan"}
          </button>
          <button type="button" className="path-btn" onClick={onEdit} disabled={busy}>
            Edit my answers
          </button>
        </div>
        <p className="path-note">
          This confirms how you described your experience. It is not an assessment
          of your skill, and nothing here has been verified independently.
        </p>
      </div>
    </div>
  );
}
