/**
 * The three editorial pillars of The AI Runtime.
 *
 * This is the single source of truth. Content collections validate their
 * `pillar` field against these keys (see `src/content/config.ts`), pages render
 * labels and descriptions from here, and `/topics/<key>` builds one landing
 * page per pillar. Add or rename a pillar here and the rest of the site follows.
 */

export const PILLAR_KEYS = [
  'reliability-engineering',
  'vertical-agents',
  'lessons-trenches',
] as const;

export type PillarKey = (typeof PILLAR_KEYS)[number];

export interface Pillar {
  key: PillarKey;
  /** Full editorial name, used in headings and prose. */
  label: string;
  /** Short label for chips and tags where space is tight. */
  short: string;
  /** One-line promise of the pillar. */
  tagline: string;
  /** Two to three sentences for the pillar landing page hero. */
  description: string;
}

export const PILLARS: Pillar[] = [
  {
    key: 'reliability-engineering',
    label: 'AI Model Reliability Engineering',
    short: 'Reliability Engineering',
    tagline: 'Evals, observability, and keeping models dependable in production.',
    description:
      'The discipline of knowing whether an AI system works, and keeping it working. Evals, observability, regression testing, drift, and the serving and cost decisions that hold up under real traffic.',
  },
  {
    key: 'vertical-agents',
    label: 'Vertical Agents',
    short: 'Vertical Agents',
    tagline: 'Domain-specific agents that survive contact with real users.',
    description:
      'Agents built for a job, not a demo. Architecture, identity and trust, tool use, and the context engineering that separates an agent that ships from one that stalls in a notebook.',
  },
  {
    key: 'lessons-trenches',
    label: 'Lessons from the Trenches',
    short: 'Lessons from the Trenches',
    tagline: 'Hard-won patterns from people shipping AI inside real organizations.',
    description:
      'War stories and field notes from practitioners. The gap between a weekend demo and production inside a real organization, told by the people who closed it.',
  },
];

const BY_KEY: Record<PillarKey, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.key, p]),
) as Record<PillarKey, Pillar>;

/** Look up a pillar by key. Returns undefined for unknown keys. */
export function getPillar(key: string | undefined): Pillar | undefined {
  return key ? BY_KEY[key as PillarKey] : undefined;
}

/** Human label for a pillar key, falling back to the raw key if unknown. */
export function pillarLabel(key: string | undefined): string {
  return getPillar(key)?.short ?? key ?? '';
}
