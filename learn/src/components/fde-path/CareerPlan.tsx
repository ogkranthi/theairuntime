import type { StoredPlan } from "./store";

interface Props {
  plan: StoredPlan;
  onChoose: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  busy: boolean;
}

/**
 * Stage 4. A structured plan rather than a wall of generated prose.
 *
 * Every priority answers "why this, given what I told you". No schedule is
 * invented: the learner was never asked for a time budget, so the plan does not
 * pretend to know one, and the only time figure anywhere is labelled an
 * estimate on the step that carries it.
 */
export default function CareerPlan({ plan, onChoose, onEdit, onRegenerate, busy }: Props) {
  return (
    <div className="path-stage">
      <h1>A starting plan for your next move.</h1>

      <div className="path-direction">
        <p className="path-tag">DIRECTION</p>
        <h2>{plan.direction}</h2>
        <p>{plan.reason}</p>
      </div>

      <ol className="path-priorities">
        {plan.priorities.map((priority, index) => (
          <li key={priority.id}>
            <span className="path-priorities__num">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{priority.title}</h3>
              <p className="path-why">
                <strong>Why this, for you.</strong> {priority.why}
              </p>
              <dl className="path-detail">
                <div>
                  <dt>Do</dt>
                  <dd>{priority.action}</dd>
                </div>
                <div>
                  <dt>You will have</dt>
                  <dd>{priority.output}</dd>
                </div>
              </dl>
              {priority.resources.length ? (
                <ul className="path-resources">
                  {priority.resources.map((item) => (
                    <li key={item.id}>
                      <a href={item.href} rel={item.external ? "noopener" : undefined}>
                        {item.title}
                      </a>
                      <span>{item.why}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {plan.milestone ? (
        <div className="path-milestone">
          <p className="path-tag">LATER</p>
          <p>{plan.milestone}</p>
        </div>
      ) : null}

      <div className="path-confirm">
        <div className="path-row">
          <button
            type="button"
            className="path-btn path-btn--primary"
            onClick={onChoose}
            disabled={busy}
          >
            Choose my first step
          </button>
          <button type="button" className="path-btn" onClick={onEdit} disabled={busy}>
            Edit my answers
          </button>
          <button type="button" className="path-link" onClick={onRegenerate} disabled={busy}>
            {busy ? "Drafting..." : "Draft this again"}
          </button>
        </div>
        <p className="path-note">
          A starting point, not a syllabus. It is built from what you told us and
          it is meant to be changed once you know more.
          {plan.selfGuided ? " Built without AI guidance, from the guide's own catalog." : ""}
        </p>
      </div>
    </div>
  );
}
