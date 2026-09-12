const STEPS = [
  {
    id: "understand",
    label: "Understand the problem",
    body: "Sit with the people doing the work and find out what actually happens, not what the request said.",
  },
  {
    id: "shape",
    label: "Shape the solution",
    body: "Decide what the system should do, what it should not, and where a model earns its place.",
  },
  {
    id: "build",
    label: "Build and evaluate",
    body: "Make it work against real data and tools, then decide how you would know it is working.",
  },
  {
    id: "deploy",
    label: "Deploy and improve",
    body: "Get it in front of people, watch it, and stay responsible for it after the first good run.",
  },
];

const READS = [
  {
    id: "what",
    title: "What the work involves",
    body: [
      "An engagement usually starts with a request that is not quite the problem. Someone says they want a chatbot over their documents. Sitting with the team shows the real workflow: a support agent opens four systems, copies a customer id between them, and gives up on the fifth.",
      "The building is real engineering. You are integrating with a customer's data, their permissions, their existing tools, and their idea of what an acceptable answer looks like. Much of the work is deciding what should be deterministic code rather than a model call.",
      "Then you have to know whether it works. Not whether the demo went well, but whether the answers are supported by the documents, whether the permissions held, and whether anyone is still using it in six weeks. That last part, staying responsible for the system after launch, is the part most people have never done.",
    ],
  },
  {
    id: "connects",
    title: "How it connects to other roles",
    body: [
      "If you are a software engineer, the building will feel familiar and the discovery will not. The unfamiliar part is being in the room when the requirements are still wrong, and being the one who notices.",
      "If you are a solutions engineer or architect, the discovery will feel familiar and the implementation depth will not. The difference is that you own the thing that runs, not the recommendation about what should run.",
      "Responsibilities vary a lot by team. Some FDE roles are mostly implementation with occasional customer contact. Others are closer to consulting with real coding. Read the specific role rather than the title.",
    ],
  },
];

const FAQS = [
  {
    q: "How much coding is involved?",
    a: "Usually a lot, though it varies by team. Most FDE roles expect you to build and debug the system yourself rather than specify it for someone else. Some roles lean further toward architecture and customer work. The title alone does not tell you which one you are looking at.",
  },
  {
    q: "How is this different from a solutions architect?",
    a: "The usual difference is ownership of what runs in production. A solutions architect often advises on a design and hands it over. An FDE tends to stay with the system through deployment and the first weeks of real use. Plenty of roles sit between the two.",
  },
  {
    q: "Do I need to know everything before starting?",
    a: "No, and nobody does. The useful move early is contact with one real workflow rather than more reading. Most people arrive strong in one half of the work, either the building or the customer side, and grow the other half on the job.",
  },
];

/**
 * Stage 1, and the only stage that must read without JavaScript.
 *
 * Every expandable is a native details element on purpose: the reading works
 * with scripting off, with a screen reader, and before hydration. Understanding
 * the role should not require an account, personal data, or an AI call.
 */
export default function RoleGuide({ onReady }: { onReady?: () => void }) {
  return (
    <div className="path-role">
      <h1>What does an AI FDE actually do?</h1>
      <p className="path-lede">
        An AI Forward Deployed Engineer works closely with customers to understand
        a problem, build an AI solution, and help it succeed in production.
      </p>

      <div className="path-flow" role="list" aria-label="One customer engagement">
        {STEPS.map((step, index) => (
          <div className="path-flow__node" role="listitem" key={step.id}>
            <span className="path-flow__num">{String(index + 1).padStart(2, "0")}</span>
            <h2>{step.label}</h2>
            <p>{step.body}</p>
          </div>
        ))}
      </div>

      <div className="path-example">
        <p className="path-tag">AN EXAMPLE</p>
        <p>
          A support team cannot find reliable answers in their own internal
          documents. The FDE watches how they actually search today, connects the
          document store and the ticketing system, and works out which answers can
          be trusted and which need a citation a human can check. Permissions turn
          out to matter more than retrieval quality. Rollout is slow on purpose,
          one team first, and the measure of success is whether people stop
          opening the old system.
        </p>
        <p className="path-note">
          Illustrative, not a case study. Real engagements are messier and the
          constraint that bites is rarely the one you expected.
        </p>
      </div>

      <h2 className="path-h2">Read further</h2>
      <div className="path-reads">
        {READS.map((read) => (
          <details key={read.id}>
            <summary>{read.title}</summary>
            <div>
              {read.body.map((para, index) => (
                <p key={index}>{para}</p>
              ))}
            </div>
          </details>
        ))}
        <details>
          <summary>Read real role descriptions</summary>
          <div>
            <p>
              Two employers describing the same role family in their own words.
              Useful for the shape of the work, not as a list of requirements: the
              seniority and location on any one posting apply to that posting.
            </p>
            <ul className="path-links">
              <li>
                <a href="https://openai.com/careers/" rel="noopener">
                  OpenAI careers, Forward Deployed Engineer
                </a>
                <span>
                  Discovery, technical scoping, implementation, and production
                  rollout. Reviewed 2026-09-12.
                </span>
              </li>
              <li>
                <a href="https://www.palantir.com/careers/" rel="noopener">
                  Palantir careers, Forward Deployed Software Engineer
                </a>
                <span>
                  The longer running version of the role, with the emphasis on
                  customer stakeholders and owning the implementation. Reviewed
                  2026-09-12.
                </span>
              </li>
            </ul>
            <p className="path-note">
              Postings move. If a link is dead, the rest of this guide still works.
            </p>
          </div>
        </details>
      </div>

      <h2 className="path-h2">Common questions</h2>
      <div className="path-reads">
        {FAQS.map((faq) => (
          <details key={faq.q}>
            <summary>{faq.q}</summary>
            <div>
              <p>{faq.a}</p>
            </div>
          </details>
        ))}
      </div>

      {onReady ? (
        <div className="path-actions">
          <button type="button" className="path-btn path-btn--primary" onClick={onReady}>
            I am ready to explore my path
          </button>
          <p className="path-note">
            Next: four short questions about what you have done. Nothing is saved
            anywhere but this browser.
          </p>
        </div>
      ) : null}
    </div>
  );
}
