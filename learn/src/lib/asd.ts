import { getCollection, type CollectionEntry } from "astro:content";
import { z } from "astro:content";
import manifestJson from "../data/asd/manifest.json";
import quizJson from "../data/asd/quiz-bank.json";
import scenarioJson from "../data/asd/scenario-manifest.json";

/**
 * Course 002: Agentic AI System Design.
 *
 * The upstream package ships a manifest, a quiz bank and a scenario manifest
 * alongside the markdown. This module validates all three at build time and
 * re-checks the structural invariants from the upstream validator
 * (scripts/validate_content.py), so bad content fails `astro build` with a
 * readable message instead of rendering a broken page.
 */

export const ASD_BASE = "/learn/courses/agentic-system-design";

export const ASD_TRACKS = [
  "Orientation",
  "Foundations",
  "Context & Data",
  "Orchestration",
  "Runtime",
  "Interoperability",
  "Trust",
  "Evaluation",
  "Operations",
  "Interview",
  "Capstone",
] as const;

// --- schemas ---------------------------------------------------------------

const manifestSchema = z.object({
  course: z.object({
    slug: z.string(),
    title: z.string(),
    short_title: z.string(),
    description: z.string(),
    audience: z.array(z.string()),
    estimated_hours: z.string(),
    canonical_project: z.string(),
    version: z.string(),
    last_reviewed: z.string(),
    modules: z.array(
      z.object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        track: z.string(),
        duration_minutes: z.number(),
        difficulty: z.enum(["Core", "Advanced", "Capstone"]),
        build: z.string(),
      }),
    ),
  }),
});

const quizSchema = z.object({
  version: z.number(),
  course: z.string(),
  question_count: z.number(),
  questions: z.array(
    z.object({
      id: z.string(),
      module: z.string(),
      type: z.enum(["single", "multi"]),
      prompt: z.string(),
      options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
      correct_option_ids: z.array(z.string()).min(1),
      explanation: z.string(),
    }),
  ),
});

const scenarioSchema = z.object({
  version: z.number(),
  scenarios: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      difficulty: z.string(),
      estimated_minutes: z.number(),
      focus: z.array(z.string()),
      file: z.string(),
    }),
  ),
});

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `[agentic-system-design] ${what} failed validation:\n${JSON.stringify(result.error.issues, null, 2)}`,
    );
  }
  return result.data;
}

export const MANIFEST = parseOrThrow(manifestSchema, manifestJson, "course-manifest.json").course;
export const QUIZ = parseOrThrow(quizSchema, quizJson, "quiz-bank.json");
export const SCENARIOS = parseOrThrow(scenarioSchema, scenarioJson, "scenario-manifest.json").scenarios;

export const COURSE = MANIFEST;
export type AsdModule = CollectionEntry<"asdModules">;
export type AsdScenario = CollectionEntry<"asdPractice">;
export type QuizQuestion = (typeof QUIZ.questions)[number];

// --- invariants ------------------------------------------------------------

/**
 * The structural checks the upstream validator enforces. Called by every page
 * that lists modules, so a content mistake breaks the build, not the site.
 */
function assertInvariants(modules: AsdModule[]): void {
  const problems: string[] = [];
  const manifestModules = MANIFEST.modules;

  if (modules.length !== manifestModules.length) {
    problems.push(
      `manifest lists ${manifestModules.length} modules but ${modules.length} lesson files were found`,
    );
  }

  const ids = modules.map((m) => m.data.id);
  const slugs = modules.map((m) => m.data.slug);
  if (new Set(ids).size !== ids.length) problems.push("duplicate module IDs");
  if (new Set(slugs).size !== slugs.length) problems.push("duplicate module slugs");

  modules.forEach((m, i) => {
    const expected = manifestModules[i];
    if (!expected) return;
    if (expected.id !== m.data.id || expected.slug !== m.data.slug) {
      problems.push(
        `position ${i}: manifest expects ${expected.id}/${expected.slug}, file has ${m.data.id}/${m.data.slug}`,
      );
    }
    // The filename must begin with the zero-padded module id, so the directory
    // listing and the manifest cannot drift apart. (The entry id comes from the
    // `slug` frontmatter, so check the file path itself.)
    const filename = (m.filePath ?? "").split("/").pop() ?? "";
    if (!filename.startsWith(`${m.data.id}-`)) {
      problems.push(`${filename || m.id}: filename does not start with module id ${m.data.id}`);
    }
  });

  const seen = new Set<string>();
  for (const m of modules) {
    for (const prerequisite of m.data.prerequisites) {
      if (!slugs.includes(prerequisite)) {
        problems.push(`${m.data.slug}: unknown prerequisite "${prerequisite}"`);
      } else if (!seen.has(prerequisite)) {
        problems.push(`${m.data.slug}: prerequisite "${prerequisite}" does not precede it`);
      }
    }
    seen.add(m.data.slug);
  }

  const moduleSlugs = new Set(slugs);
  for (const q of QUIZ.questions) {
    if (!moduleSlugs.has(q.module)) {
      problems.push(`quiz question ${q.id}: unknown module "${q.module}"`);
    }
    const optionIds = new Set(q.options.map((o) => o.id));
    for (const correct of q.correct_option_ids) {
      if (!optionIds.has(correct)) {
        problems.push(`quiz question ${q.id}: correct option "${correct}" is not an option`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`[agentic-system-design] content invariants failed:\n- ${problems.join("\n- ")}`);
  }
}

// --- accessors -------------------------------------------------------------

/** Modules in manifest order, with invariants enforced. */
export async function getAsdModules(): Promise<AsdModule[]> {
  const modules = (await getCollection("asdModules")).sort((a, b) =>
    a.data.id.localeCompare(b.data.id),
  );
  assertInvariants(modules);
  return modules;
}

/** Practice scenarios in manifest order. */
export async function getAsdScenarios(): Promise<AsdScenario[]> {
  const entries = await getCollection("asdPractice");
  const order = new Map(SCENARIOS.map((s, i) => [s.slug, i]));
  return entries.sort(
    (a, b) => (order.get(a.data.slug) ?? 99) - (order.get(b.data.slug) ?? 99),
  );
}

export function moduleHref(module: AsdModule): string {
  return `${ASD_BASE}/modules/${module.data.slug}/`;
}

export function scenarioHref(scenario: AsdScenario): string {
  return `${ASD_BASE}/practice/${scenario.data.slug}/`;
}

export function quizFor(moduleSlug: string): QuizQuestion[] {
  return QUIZ.questions.filter((q) => q.module === moduleSlug);
}

/** Modules grouped into tracks, in manifest order. */
export function groupByTrack(modules: AsdModule[]): { track: string; modules: AsdModule[] }[] {
  const groups: { track: string; modules: AsdModule[] }[] = [];
  for (const m of modules) {
    const last = groups[groups.length - 1];
    if (last && last.track === m.data.track) last.modules.push(m);
    else groups.push({ track: m.data.track, modules: [m] });
  }
  return groups;
}

export function neighbors(modules: AsdModule[], current: AsdModule) {
  const i = modules.findIndex((m) => m.id === current.id);
  return {
    prev: i > 0 ? modules[i - 1] : undefined,
    next: i > -1 && i < modules.length - 1 ? modules[i + 1] : undefined,
  };
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/**
 * Reference docs that reach a learner through a dedicated top-level route
 * rather than /reference/<slug>/. They are excluded from the reference index's
 * generated pages so the same prose never publishes at two URLs.
 */
export const PROMOTED_REFERENCE: Record<string, string> = {
  "capstone-atlas": `${ASD_BASE}/capstone/`,
  glossary: `${ASD_BASE}/glossary/`,
  "primary-source-map": `${ASD_BASE}/sources/`,
};

/** Reference docs that get their own page, with display titles. */
export const REFERENCE_DOCS: { slug: string; title: string; kind: string; blurb: string }[] = [
  { slug: "runtime-design-method", title: "The RUNTIME design method", kind: "Method", blurb: "The seven-step method the whole course applies to every system." },
  { slug: "agentic-system-design-canvas", title: "Agentic System Design Canvas", kind: "Canvas", blurb: "Twelve sections that turn a vague agent idea into a defensible design." },
  { slug: "failure-taxonomy", title: "Failure taxonomy", kind: "Reference", blurb: "The failure classes an agentic system must route deliberately." },
  { slug: "tool-contract-template", title: "Tool contract template", kind: "Template", blurb: "The typed, risk-rated contract every tool needs before it ships." },
  { slug: "threat-model-template", title: "Threat model template", kind: "Template", blurb: "Assets, threats, boundaries, prevention, detection." },
  { slug: "eval-plan-template", title: "Eval plan template", kind: "Template", blurb: "What to measure, on which data, with which release gate, across components, trajectories, and outcomes." },
  { slug: "slo-incident-runbook-template", title: "SLO and incident runbook", kind: "Template", blurb: "Indicators, objectives, alerts, and the runbook an operator uses at 3am." },
  { slug: "architecture-decision-record-template", title: "Architecture decision record", kind: "Template", blurb: "One decision, its options, the choice, and what it costs." },
  { slug: "atlas-reference-implementation-spec", title: "Atlas reference implementation spec", kind: "Capstone", blurb: "The full specification of the canonical course system." },
  { slug: "capstone-atlas", title: "Capstone brief", kind: "Capstone", blurb: "What to build, submit, and defend for the Atlas capstone." },
  { slug: "concept-coverage-matrix", title: "Concept coverage matrix", kind: "Reference", blurb: "Every concept in the course, mapped to the module that teaches it." },
  { slug: "course-rubric", title: "Course rubric", kind: "Assessment", blurb: "How a finished capstone is judged, dimension by dimension." },
  { slug: "interview-scorecard", title: "Interview scorecard", kind: "Assessment", blurb: "The scorecard to self-score a 45-minute design interview." },
  { slug: "answer-key", title: "Quiz answer key", kind: "Assessment", blurb: "Every quiz answer with the reasoning behind it, so a wrong pick becomes a lesson rather than a guess." },
  { slug: "primary-source-map", title: "Primary source map", kind: "Reference", blurb: "Every implementation-sensitive claim, mapped to its official source." },
  { slug: "glossary", title: "Glossary", kind: "Reference", blurb: "Production-oriented definitions for the whole vocabulary." },
];

/** The href a reference doc lives at, honoring promoted routes. */
export function referenceHref(slug: string): string {
  return PROMOTED_REFERENCE[slug] ?? `${ASD_BASE}/reference/${slug}/`;
}

/** Reference entries in REFERENCE_DOCS order, with their metadata attached. */
export async function getAsdReference() {
  const entries = await getCollection("asdReference");
  const byId = new Map(entries.map((e) => [e.id, e]));
  const missing = REFERENCE_DOCS.filter((doc) => !byId.has(doc.slug)).map((doc) => doc.slug);
  if (missing.length > 0) {
    throw new Error(`[agentic-system-design] reference files missing: ${missing.join(", ")}`);
  }
  return REFERENCE_DOCS.map((doc) => ({ ...doc, entry: byId.get(doc.slug)! }));
}
