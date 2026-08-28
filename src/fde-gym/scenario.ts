import rawScenario from "./scenarios/counterparty-due-diligence.json";
import type { FdeLevel, InterviewSession, ScenarioFact, ScenarioSpec } from "./types";

export const COUNTERPARTY_DUE_DILIGENCE = rawScenario as ScenarioSpec;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function candidateOpening(
  scenario: ScenarioSpec,
  level: FdeLevel,
  drillId: string | null,
): string {
  if (drillId) {
    const drill = scenario.drills.find((item) => item.id === drillId);
    if (drill) return drill.opening;
  }
  return scenario.openings[level];
}

export function matchFacts(
  candidateMessage: string,
  scenario: ScenarioSpec,
): ScenarioFact[] {
  const normalized = normalize(candidateMessage);
  if (!normalized) return [];

  const matches = scenario.facts.filter((fact) =>
    fact.triggers.some((trigger) => normalized.includes(normalize(trigger))),
  );

  // Keep discovery responses focused. A candidate can ask another question.
  return matches.slice(0, 3);
}

export function revealedFactsForPrompt(
  session: InterviewSession,
  scenario: ScenarioSpec,
): ScenarioFact[] {
  const ids = new Set(session.revealedFactIds);
  return scenario.facts.filter((fact) => ids.has(fact.id));
}

export function minimumLevelRank(level: FdeLevel): number {
  if (level === "foundations") return 0;
  if (level === "fde") return 1;
  return 2;
}
