import { getCollection, type CollectionEntry } from "astro:content";

export type Module = CollectionEntry<"course">;

/** Short ledger labels, lowercase on purpose. The ledger is a machine view. */
export const LEDGER_LABELS: Record<number, string> = {
  0: "mental model",
  1: "naive agent",
  2: "state",
  3: "durable execution",
  4: "idempotency",
  5: "failure handling",
  6: "human in the loop",
  7: "context engineering",
  8: "observability",
  9: "evaluation",
  10: "industry architectures",
  11: "deploy",
  12: "production gauntlet",
};

/** Slug convention from SITE-SPEC.md. The filename in src/content/course/ must match. */
export const MODULE_SLUGS: Record<number, string> = {
  0: "00-mental-model",
  1: "01-naive-agent",
  2: "02-state",
  3: "03-durable-execution",
  4: "04-idempotency",
  5: "05-failure-handling",
  6: "06-human-in-the-loop",
  7: "07-context-engineering",
  8: "08-observability",
  9: "09-evaluation",
  10: "10-industry-architectures",
  11: "11-deploy",
  12: "12-production-gauntlet",
};

export const CHANNELS = {
  substack: "https://theairuntime.com/subscribe",
  youtube: "https://www.youtube.com/@theairuntime",
  podcast: "https://theairuntime.com/s/fde-talks",
  repo: "https://github.com/ogkranthi/air-course-001",
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
  5: "Get the failure-injection profiles for the fixture server.",
  7: "Get the compaction A/B trace bundle.",
  9: "Get the 50-trace labeled set, the binary rubric, and the judge-agreement notebook.",
  10: "Each case study is a podcast episode. Subscribe for the written companion.",
  11: "Get the Render + Neon deploy checklist and env template.",
  12: "Get the Field Report template and submit your gauntlet results.",
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
  return `/course/${entry.id}/`;
}

export function neighbors(modules: Module[], current: Module) {
  const i = modules.findIndex((m) => m.id === current.id);
  return {
    prev: i > 0 ? modules[i - 1] : undefined,
    next: i > -1 && i < modules.length - 1 ? modules[i + 1] : undefined,
  };
}
