import { useEffect, useState } from "react";
import ArchitectureCanvas from "./ArchitectureCanvas";
import InterviewPanel from "./InterviewPanel";
import ResultScreen from "./ResultScreen";
import SetupScreen from "./SetupScreen";
import {
  finishInterview,
  sendInterviewMessage,
  startInterview,
} from "./api";
import type {
  ArchitectureGraph,
  InterviewSession,
  ResultSummary,
  StartOptions,
} from "./types";
import "./fde-gym.css";

const EMPTY_GRAPH: ArchitectureGraph = {
  nodes: [],
  edges: [],
  revision: 0,
};

const INITIAL_OPTIONS: StartOptions = {
  mode: "mock",
  durationMinutes: 30,
  level: "fde",
  researchConsent: false,
  confidentialityAcknowledged: false,
};

type View = "setup" | "interview" | "result";

export default function FdeGymApp() {
  const [view, setView] = useState<View>("setup");
  const [options, setOptions] = useState<StartOptions>(INITIAL_OPTIONS);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [charter, setCharter] = useState("");
  const [graph, setGraph] = useState<ArchitectureGraph>(EMPTY_GRAPH);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shouldEnd, setShouldEnd] = useState(false);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (view !== "interview" || !running) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, view]);

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      const response = await startInterview(options);
      setSession(response.session);
      setCharter(response.charter);
      setGraph(response.session.graph);
      setElapsedSeconds(0);
      setRunning(true);
      setShouldEnd(false);
      setDegraded(response.degraded);
      setSummary(null);
      setView("interview");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The interview could not start.",
      );
    } finally {
      setBusy(false);
    }
  };

  const send = async (message: string, requestHint = false) => {
    if (!session) return false;
    setError("");
    setBusy(true);
    try {
      const response = await sendInterviewMessage({
        session,
        candidateMessage: message,
        graph,
        elapsedSeconds,
        requestHint,
      });
      setSession(response.session);
      setGraph(response.session.graph);
      setShouldEnd(response.shouldEnd);
      setDegraded((current) => current || response.degraded);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The interviewer could not respond.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!session) return;
    setError("");
    setBusy(true);
    setRunning(false);
    try {
      const response = await finishInterview({
        session,
        graph,
        elapsedSeconds,
      });
      setSession(response.session);
      setSummary(response.summary);
      setView("result");
    } catch (cause) {
      setRunning(true);
      setError(
        cause instanceof Error
          ? cause.message
          : "The interview could not be evaluated.",
      );
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setView("setup");
    setSession(null);
    setCharter("");
    setGraph(EMPTY_GRAPH);
    setSummary(null);
    setElapsedSeconds(0);
    setRunning(false);
    setBusy(false);
    setError("");
    setShouldEnd(false);
    setDegraded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (view === "setup") {
    return (
      <SetupScreen
        value={options}
        onChange={setOptions}
        onStart={() => void start()}
        busy={busy}
        error={error}
      />
    );
  }

  if (view === "result" && session && summary) {
    return (
      <ResultScreen
        session={session}
        summary={summary}
        onRestart={restart}
      />
    );
  }

  if (!session) {
    return (
      <p className="fg-error" role="alert">
        The session could not be restored. Start a new attempt.
      </p>
    );
  }

  return (
    <div className="fg-app">
      <div className="fg-workspace">
        <ArchitectureCanvas
          graph={graph}
          onChange={setGraph}
          disabled={busy}
        />
        <InterviewPanel
          session={{ ...session, phase: session.phase }}
          charter={charter}
          elapsedSeconds={elapsedSeconds}
          running={running}
          busy={busy}
          error={error}
          shouldEnd={shouldEnd}
          degraded={degraded}
          onToggleRunning={() => {
            if (session.mode === "practice") setRunning((value) => !value);
          }}
          onSend={send}
          onFinish={finish}
        />
      </div>
    </div>
  );
}
