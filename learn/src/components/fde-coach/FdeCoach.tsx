import { useEffect, useRef, useState, type CSSProperties } from "react";
import { readHealth, createCoachClient, CoachRequestError, type CoachReply, type CoachSummary, type StageMeta, type StageTurn } from "../coach/api";
import { goalLabel, guidanceFor, prompts, routeQuestion, starters, type Goal, type Guidance } from "./guidance";
import SystemIllustration from "./SystemIllustration";
import "./fde-coach.css";

type Turn = { id: number; role: "learner" | "coach"; text?: string; guidance?: Guidance; reply?: CoachReply };
type Pending = { kind: "start" } | { kind: "answer"; token: string; text: string; turns: StageTurn[] };
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : "The connection was interrupted. Your conversation is still here.";
function Arrow({ small = false }: { small?: boolean }) {
  return <svg width={small ? 16 : 20} height={small ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function GoalIcon({ kind }: { kind: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === "become" ? <><path d="m4 10 8-5 8 5-8 5-8-5Z"/><path d="M7 12v5c4 3 6 3 10 0v-5m3-2v7"/></> : kind === "interview" ? <><rect x="4" y="6" width="16" height="13" rx="3"/><path d="M9 6V4h6v2M4 12h16m-10 0v3h4v-3"/></> : <><path d="m13 3-9 11h7l-1 7 10-12h-7l1-6Z"/></>}</svg>;
}
function Summary({ summary }: { summary: CoachSummary }) {
  return <section className="fde-summary" aria-label="Your guided lesson recap"><p className="fde-kicker">LESSON COMPLETE</p><h2>You just designed your first agent system</h2>
    <p>The six decisions you made were:</p><dl>{summary.recap.map(line => <div key={line.label}><dt>{line.label}</dt><dd>{line.body}</dd></div>)}</dl>
    <h3>Your first agent design</h3><dl>{summary.design.map(line => <div key={line.label}><dt>{line.label}</dt><dd>{line.body}</dd></div>)}</dl>
    <p className="fde-takeaway">{summary.takeaway}</p><p>Your agent works when everything goes right. What happens when it runs for hours and fails halfway through?</p><a href="/coach/next/">Continue learning <span aria-hidden="true">→</span></a></section>;
}
export default function FdeCoach() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"guide" | "lesson">("guide");
  const [stage, setStage] = useState<StageMeta | null>(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<CoachSummary | null>(null);
  const [scripted, setScripted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [retryable, setRetryable] = useState(true);
  const client = useRef<ReturnType<typeof createCoachClient>>();
  client.current ??= createCoachClient();
  const [latest, setLatest] = useState(false);
  const [height, setHeight] = useState<number>();
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const token = useRef("");
  const stageTurns = useRef<StageTurn[]>([]);
  const stageNumber = useRef(0);
  const nextId = useRef(0);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController>();
  const composing = useRef(false);
  const nearBottom = useRef(true);
  const initialized = useRef(false);
  const active = turns.length > 0 || mode === "lesson";
  function append(turn: Omit<Turn, "id">) { setTurns(current => [...current, { ...turn, id: ++nextId.current }]); }
  function scrollLatest(force = false) {
    const target = log.current;
    if (target && (force || nearBottom.current)) { target.scrollTop = target.scrollHeight; setLatest(false); nearBottom.current = true; }
    else if (target) setLatest(true);
  }
  useEffect(() => {
    requestAnimationFrame(() => {
      const node = log.current;
      if (node && turns.at(-1)?.guidance) {
        const entries = node.querySelectorAll<HTMLElement>(".fde-turn");
        const question = entries[entries.length - 2];
        if (question) node.scrollTop += question.getBoundingClientRect().top - node.getBoundingClientRect().top - 12;
        setLatest(false);
      } else scrollLatest();
    });
  }, [turns.length, busy, summary]);
  useEffect(() => {
    const resize = () => setHeight(Math.max(180, (window.visualViewport?.height ?? window.innerHeight) - (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 72)));
    resize(); window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize); };
  }, []);
  useEffect(() => { const node = input.current; if (node) { node.style.height = "auto"; node.style.height = `${Math.min(node.scrollHeight, 160)}px`; } }, [draft, active]);
  useEffect(() => () => { controller.current?.abort(); client.current?.abandon(); }, []);
  useEffect(() => {
    if (initialized.current) return; initialized.current = true;
    if (new URLSearchParams(window.location.search).get("lesson") === "agent-system-design") void beginLesson();
  }, []);
  function choose(goal: Goal, text = goalLabel(goal)) {
    if (inFlight.current || mode === "lesson") return;
    nearBottom.current = true;
    append({ role: "learner", text }); append({ role: "coach", guidance: guidanceFor(goal) });
    setDraft(""); requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  }
  function apply(reply: CoachReply) {
    if (!reply.token || !reply.stage || !Array.isArray(reply.parts)) throw new Error("The lesson response could not be read. Please retry your last request.");
    token.current = reply.token;
    if (stageNumber.current !== reply.stage.number) stageTurns.current = [];
    stageNumber.current = reply.stage.number;
    for (const part of reply.parts) if (part.kind === "ask") stageTurns.current.push({ role: "coach", text: part.text });
    setStage(reply.stage); setDone(reply.done); setScripted(reply.degraded);
    if (reply.summary) setSummary(reply.summary);
    append({ role: "coach", reply });
  }
  async function run(request: Pending) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setRetryable(true); setPending(request);
    const attempt = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    const lessonClient = client.current!;
    try {
      if (request.kind === "start") {
        const health = await readHealth(abort.signal);
        if (!health) throw new Error("The guided lesson could not connect. Try again, or read the course while you’re offline.");
        if (attempt !== generation.current) return;
        if (!health.ok || !health.tokenConfigured || !health.countersConfigured || !health.securityConfigured) throw new Error("The guided lesson is not open right now. The written course is still available below.");
        const reply = await lessonClient.startLesson(abort.signal);
        if (attempt !== generation.current) return;
        apply(reply); lessonClient.acknowledge(reply);
      } else {
        const reply = await lessonClient.sendMessage(request.token, request.text, request.turns, abort.signal);
        if (attempt !== generation.current) return;
        apply(reply); lessonClient.acknowledge(reply);
      }
      setPending(null);
    } catch (cause) { if (attempt === generation.current) { setError(errorText(cause)); setRetryable(!(cause instanceof CoachRequestError) || cause.retryable); } }
    finally { if (attempt === generation.current) { inFlight.current = false; setBusy(false); } }
  }
  async function beginLesson() {
    if (inFlight.current || mode === "lesson") return;
    nearBottom.current = true; setMode("lesson"); setDraft("");
    append({ role: "learner", text: "Start the guided system-design lesson." });
    await run({ kind: "start" });
  }
  function submit() {
    const text = draft.trim();
    if (!text || inFlight.current || (mode === "lesson" && (done || pending))) return;
    if (mode === "guide") { choose(routeQuestion(text), text); return; }
    const history = stageTurns.current.slice(-6);
    nearBottom.current = true; append({ role: "learner", text });
    stageTurns.current.push({ role: "learner", text }); setDraft("");
    void run({ kind: "answer", token: token.current, text, turns: history });
  }
  function reset() {
    if (!window.confirm(pending ? "Start a new conversation and abandon the pending lesson request? Server work may still finish and reserved usage remains spent. Usage limits still apply." : "Start a new conversation? This chat is kept only in this tab.")) return;
    generation.current++; controller.current?.abort(); client.current?.abandon(); client.current = createCoachClient(); inFlight.current = false;
    token.current = ""; stageTurns.current = []; stageNumber.current = 0; nearBottom.current = true;
    setTurns([]); setMode("guide"); setStage(null); setDone(false); setSummary(null); setScripted(false);
    setBusy(false); setPending(null); setError(""); setDraft("");
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  }
  const last = [...turns].reverse().find(turn => turn.guidance)?.guidance;
  const style = height && active ? { "--coach-height": `${height}px` } as CSSProperties : undefined;
  return <section className={`fde-coach${active ? " fde-coach--active" : " fde-coach--welcome"}`} style={style} aria-label="FDE Coach">
    {!active ? <>
      <div className="fde-welcome"><div className="fde-welcome__copy"><p className="fde-kicker"><span className="fde-spark" aria-hidden="true">✳</span> YOUR NEXT CHAPTER STARTS HERE</p>
        <h1>Your AI Coach for <span>Forward Deployed</span> Engineering</h1>
        <p className="fde-intro">Learn system design, build real skills, and prepare for FDE roles. One conversation at a time.</p><p className="fde-mode-notice" id="fde-guidance-notice">Curated guidance, not personalized AI.</p></div><SystemIllustration/></div>
      <div className="fde-starters" aria-label="Choose your starting point">{starters.map(item => <button type="button" className={`fde-starter fde-starter--${item.tone}`} key={item.id} onClick={() => choose(item.id)}>
        <span className="fde-starter__icon"><GoalIcon kind={item.id}/></span><span><strong>{item.title}</strong><span className="fde-starter__description">{item.description}</span></span><span className="fde-starter__arrow"><Arrow small/></span></button>)}</div>
    </> : <>
      <header className="fde-context"><div><p className="fde-kicker">{mode === "lesson" ? "GUIDED SYSTEM-DESIGN LESSON" : "YOUR CONVERSATION"}</p><h1>{mode === "lesson" ? stage ? `Step ${stage.number} of ${stage.total}: ${stage.title}` : "Design your first AI agent" : "A useful next step starts here."}</h1></div>
        <button className="fde-reset" type="button" onClick={reset} aria-label="Start a new conversation"><span aria-hidden="true">＋</span><span>New chat</span></button></header>
      <div className="fde-transcript" ref={log} tabIndex={0} role="log" aria-live="polite" aria-relevant="additions" aria-label="FDE Coach conversation" aria-busy={busy}
        onScroll={() => { const node = log.current; if (node) { nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; if (nearBottom.current) setLatest(false); } }}>
        <div className="fde-transcript__inner">{turns.map(turn => <article className={`fde-turn fde-turn--${turn.role}`} key={turn.id}>
          <div className="fde-turn__avatar" aria-hidden="true">{turn.role === "coach" ? <GoalIcon kind="skills"/> : "Y"}</div><div className="fde-turn__body">
            <p className="fde-turn__who">{turn.role === "coach" ? "FDE Coach" : "You"}{turn.guidance ? <span>Curated guidance</span> : turn.reply ? <span>{turn.reply.degraded ? "Written lesson" : "Guided lesson"}</span> : null}</p>
            {turn.text ? <p className="fde-message-text">{turn.text}</p> : null}
            {turn.guidance ? <><h2>{turn.guidance.title}</h2>{turn.guidance.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              <ul className="fde-resource-list">{turn.guidance.resources.map(resource => <li key={resource.href}><a href={resource.href}>{resource.title}<Arrow small/></a><span>{resource.detail}</span></li>)}</ul>
              {turn.guidance.lesson ? <button className="fde-lesson-link" type="button" onClick={() => void beginLesson()} disabled={busy || mode === "lesson"}>Start the 10-minute guided lesson <Arrow small/></button> : null}</> : null}
            {turn.reply?.parts.map((part, index) => <div key={index} className={`fde-lesson-part fde-lesson-part--${part.kind}`}>{part.kind === "principle" ? <p className="fde-kicker">THE PRINCIPLE</p> : null}{part.text.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>)}
          </div></article>)}
          {summary ? <Summary summary={summary}/> : null}
        </div>
      </div>
    </>}
    <div className="fde-compose-area">
      {latest ? <button className="fde-latest" type="button" onClick={() => scrollLatest(true)}>Latest message <span aria-hidden="true">↓</span></button> : null}
      {busy ? <p className="fde-status" role="status">Connecting to the guided lesson<span aria-hidden="true">...</span></p> : null}
      {error ? <div className="fde-error" id="fde-request-error" role="alert"><p>{error}</p><div>{pending && retryable ? <button type="button" disabled={busy} onClick={() => pending && void run(pending)}>Retry last request</button> : null}<a href="/learn/courses/agentic-system-design/">Read the course</a></div></div> : null}
      {scripted && mode === "lesson" && !done ? <p className="fde-disclosure">The written lesson is active. Replies follow the authored material rather than your exact wording.</p> : null}
      {!done ? <form className="fde-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
        <label className="fde-sr-only" htmlFor="fde-message">{mode === "lesson" ? "Your answer to the lesson" : "Ask your FDE Coach"}</label>
        <textarea id="fde-message" ref={input} rows={2} maxLength={2000} value={draft} readOnly={busy || Boolean(pending)} aria-describedby={["fde-input-help", !active && "fde-guidance-notice", error && "fde-request-error"].filter(Boolean).join(" ")}
          placeholder={mode === "lesson" ? "Answer the current lesson question..." : "Ask your FDE Coach anything..."}
          onChange={event => setDraft(event.currentTarget.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
          onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); submit(); } }}/>
        <div className="fde-composer__bottom"><span className="fde-composer__label"><span aria-hidden="true">✳</span> FDE COACH <span className="fde-composer__mode">/ {mode === "lesson" ? "Guided lesson" : "Curated guidance"}</span></span>
          <button className="fde-send" type="submit" aria-label={mode === "lesson" ? "Send your answer" : "Send message"} disabled={busy || Boolean(pending) || !draft.trim()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div>
      </form> : <div className="fde-completed"><span>Guided lesson complete. Your recap is above.</span><button type="button" onClick={reset}>Explore another direction <Arrow small/></button></div>}
      {!active ? <div className="fde-prompts" aria-label="Try a question">{prompts.map(prompt => <button key={prompt.id} type="button" onClick={() => choose(prompt.id)}>{prompt.title}<Arrow small/></button>)}</div>
        : mode === "guide" && last ? <div className="fde-followups" aria-label="Suggested next steps">{last.followups.map(goal => <button key={goal} type="button" onClick={() => choose(goal)}>{goalLabel(goal)} <Arrow small/></button>)}</div> : null}
      <p className="fde-help" id="fde-input-help">{mode === "lesson" ? "Use fictional or non-sensitive examples. Enter sends; Shift+Enter adds a line." : "General questions receive curated guidance, not personalized AI."}{draft.length > 1800 ? ` ${draft.length}/2000 characters.` : ""}</p>
    </div>
    {!active ? <p className="fde-welcome__foot">A place to learn, practice, and build proof. <a href="/commons/">Explore the Commons <Arrow small/></a></p> : null}
  </section>;
}
