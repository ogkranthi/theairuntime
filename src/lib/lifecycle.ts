// The 7-stage investigation lifecycle, defined once and reused by the content
// schema (stage enum) and the StageTimeline component, so the stages and their
// order live in a single place.
export const LIFECYCLE = [
  'Question',
  'Hypothesis',
  'Experiment',
  'Evaluation',
  'Reliability',
  'Production Trial',
  'Outcome',
] as const;

export type Stage = (typeof LIFECYCLE)[number];
export type StageState = 'done' | 'active' | 'todo';

export interface StageEntry {
  stage: Stage;
  state: StageState;
  note?: string;
}

/** Merge an investigation's authored stages against the canonical lifecycle so
 *  all 7 stages always render in order; any stage not authored defaults to
 *  todo. The current (active) stage index is returned for compact progress. */
export function resolveStages(authored: StageEntry[] = []) {
  const byName = new Map(authored.map((s) => [s.stage, s]));
  const stages = LIFECYCLE.map((stage) => {
    const a = byName.get(stage);
    return { stage, state: a?.state ?? ('todo' as StageState), note: a?.note };
  });
  const activeIndex = stages.findIndex((s) => s.state === 'active');
  const doneCount = stages.filter((s) => s.state === 'done').length;
  // If nothing is explicitly active, point at the first not-done stage.
  const currentIndex = activeIndex >= 0 ? activeIndex : Math.min(doneCount, LIFECYCLE.length - 1);
  return { stages, currentIndex, doneCount };
}
