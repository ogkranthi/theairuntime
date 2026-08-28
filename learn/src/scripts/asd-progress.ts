/**
 * Local-only progress for the Agentic System Design course.
 *
 * Everything lives in this browser: no account, no server, no analytics of
 * learner text. Every accessor is failure-tolerant, because storage can be
 * unavailable (private mode, blocked cookies, quota) and the course must stay
 * fully usable when it is.
 */

export const STORAGE_KEY = "air-asd-progress";
export const SCHEMA_VERSION = 1;

export type QuizAttempt = {
  at: string;
  correct: number;
  total: number;
};

export type CanvasData = Record<string, string>;

export type InterviewAttempt = {
  at: string;
  elapsedSeconds: number;
  revealsOpened: number;
  scores: Record<string, number>;
  notes: string;
};

export type CourseProgress = {
  schemaVersion: number;
  completedModules: string[];
  quizAttempts: Record<string, QuizAttempt[]>;
  canvasDrafts: Record<string, CanvasData>;
  interviewAttempts: Record<string, InterviewAttempt[]>;
  lastVisitedModule?: string;
};

function empty(): CourseProgress {
  return {
    schemaVersion: SCHEMA_VERSION,
    completedModules: [],
    quizAttempts: {},
    canvasDrafts: {},
    interviewAttempts: {},
  };
}

/**
 * Bring any stored shape up to the current schema. Unknown or older versions
 * are migrated field by field rather than discarded, so a future version can
 * add keys without wiping a learner's work.
 */
export function migrate(raw: unknown): CourseProgress {
  const base = empty();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<CourseProgress>;
  return {
    schemaVersion: SCHEMA_VERSION,
    completedModules: Array.isArray(value.completedModules) ? value.completedModules.filter((m) => typeof m === "string") : [],
    quizAttempts: typeof value.quizAttempts === "object" && value.quizAttempts ? value.quizAttempts : {},
    canvasDrafts: typeof value.canvasDrafts === "object" && value.canvasDrafts ? value.canvasDrafts : {},
    interviewAttempts:
      typeof value.interviewAttempts === "object" && value.interviewAttempts ? value.interviewAttempts : {},
    lastVisitedModule: typeof value.lastVisitedModule === "string" ? value.lastVisitedModule : undefined,
  };
}

export function isAvailable(): boolean {
  try {
    const probe = "__air_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function read(): CourseProgress {
  try {
    return migrate(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return empty();
  }
}

export function write(progress: CourseProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable: the page keeps working, nothing persists */
  }
}

export function update(mutate: (progress: CourseProgress) => void): CourseProgress {
  const progress = read();
  mutate(progress);
  write(progress);
  return progress;
}

export function setModuleComplete(slug: string, complete: boolean): CourseProgress {
  return update((progress) => {
    const set = new Set(progress.completedModules);
    if (complete) set.add(slug);
    else set.delete(slug);
    progress.completedModules = [...set];
  });
}

export function recordQuizAttempt(moduleSlug: string, attempt: QuizAttempt): CourseProgress {
  return update((progress) => {
    const attempts = progress.quizAttempts[moduleSlug] ?? [];
    attempts.push(attempt);
    progress.quizAttempts[moduleSlug] = attempts.slice(-10);
  });
}

export function saveCanvas(scenarioKey: string, data: CanvasData): CourseProgress {
  return update((progress) => {
    progress.canvasDrafts[scenarioKey] = data;
  });
}

export function readCanvas(scenarioKey: string): CanvasData {
  return read().canvasDrafts[scenarioKey] ?? {};
}

export function recordInterviewAttempt(slug: string, attempt: InterviewAttempt): CourseProgress {
  return update((progress) => {
    const attempts = progress.interviewAttempts[slug] ?? [];
    attempts.push(attempt);
    progress.interviewAttempts[slug] = attempts.slice(-10);
  });
}

export function setLastVisited(slug: string): void {
  update((progress) => {
    progress.lastVisitedModule = slug;
  });
}

export function reset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
