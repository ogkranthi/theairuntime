import { getCollection, type CollectionEntry } from "astro:content";

export type Module = CollectionEntry<"course">;

/** Short ledger labels, lowercase on purpose. The ledger is a machine view. */
export const LEDGER_LABELS: Record<number, string> = {
  0: "mental model",
  1: "naive agent",
  2: "state",
  3: "durable execution",
  4: "side effects",
  5: "work ownership",
  6: "failure handling",
  7: "human control",
  8: "context",
  9: "observability",
  10: "security",
  11: "evaluation",
  12: "deep agents",
  13: "industry architectures",
  14: "deploy",
  15: "production gauntlet",
};

/** Slug convention from SITE-SPEC.md. The filename in src/content/course/ must match. */
export const MODULE_SLUGS: Record<number, string> = {
  0: "00-mental-model",
  1: "01-naive-agent",
  2: "02-state",
  3: "03-durable-execution",
  4: "04-side-effects",
  5: "05-work-ownership",
  6: "06-failure-handling",
  7: "07-human-control",
  8: "08-context",
  9: "09-observability",
  10: "10-security",
  11: "11-evaluation",
  12: "12-deep-agents",
  13: "13-industry-architectures",
  14: "14-deploy",
  15: "15-production-gauntlet",
};

export const COURSE_BASE = "/learn/courses/long-running-agents";

export const CHANNELS = {
  substack: "https://theairuntime.com/subscribe",
  youtube: "https://www.youtube.com/@theairuntime",
  podcast: "https://theairuntime.com/s/fde-talks",
  repo: "https://github.com/ogkranthi/air-course-long",
  publication: "https://theairuntime.com",
  lab: "https://lab.theairuntime.com",
  events: "https://events.theairuntime.com",
  linkedin: "https://www.linkedin.com/in/kranthimanchikanti/",
  email: "mailto:info@theairuntime.com",
} as const;

/**
 * Every outbound link carries the campaign tag from DISTRIBUTION.md:
 * ?utm_source=learn&utm_medium=site&utm_campaign=course001&utm_content=<slug>-<cta>
 */
export function utm(url: string, pageSlug: string, cta: string): string {
  const target = new URL(url);
  target.searchParams.set("utm_source", "learn");
  target.searchParams.set("utm_medium", "site");
  target.searchParams.set("utm_campaign", "course001");
  target.searchParams.set("utm_content", `${pageSlug}-${cta}`);
  return target.href;
}

/** First-column CTA copy varies by module. DISTRIBUTION.md, "Channel mapping". */
const SUBSCRIBE_COPY: Record<number, string> = {
  1: "Get the fixture server and the naive agent starter.",
  3: "Get the Postgres checkpointer schema and Lab 03 trace bundle.",
  5: "Get the lease/scheduler migration and the two-workers chaos script.",
  6: "Get the failure-injection profiles for the fixture server.",
  8: "Get the compaction A/B trace bundle.",
  10: "Get the hostile-vendor fixture pages and the injection eval cases.",
  11: "Get the 50-trace labeled set, the binary rubric, and the judge-agreement notebook.",
  12: "Get the harness comparison matrix and the Deep Agents port.",
  13: "Each case study is a podcast episode. Subscribe for the written companion.",
  14: "Get the Render + Neon deploy checklist and env template.",
  15: "Get the gauntlet profile, chaos script and reliability report layout.",
};

export const DEFAULT_SUBSCRIBE_COPY =
  "Get the fixture server, golden sets and trace bundles for each module.";

export function subscribeCopy(moduleNumber?: number): string {
  if (moduleNumber === undefined) return DEFAULT_SUBSCRIBE_COPY;
  return SUBSCRIBE_COPY[moduleNumber] ?? DEFAULT_SUBSCRIBE_COPY;
}

/** The one reach-out line. Appears once per page, never twice. */
export const REACH_OUT =
  "For production reviews, custom eval systems, failure post-mortems, or private cohorts, reach out. Quality over noise is the filter.";

/** Modules in course order, drafts excluded. */
export async function getModules(): Promise<Module[]> {
  const modules = await getCollection("course", ({ data }) => data.status !== "draft");
  return modules.sort((a, b) => a.data.module - b.data.module);
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function moduleHref(entry: Module): string {
  return `${COURSE_BASE}/${entry.id}/`;
}

export function neighbors(modules: Module[], current: Module) {
  const i = modules.findIndex((m) => m.id === current.id);
  return {
    prev: i > 0 ? modules[i - 1] : undefined,
    next: i > -1 && i < modules.length - 1 ? modules[i + 1] : undefined,
  };
}
