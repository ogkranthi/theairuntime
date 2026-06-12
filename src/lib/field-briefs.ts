// Shared helpers for Field Briefs. Kept portable: relative URLs only, so the
// pages lift to lab.theairuntime.com later without breaking links.

export const RUN_LEVELS: Record<string, string> = {
  R0: 'Demo',
  R1: 'Bounded',
  R2: 'Visible',
  R3: 'Reliable',
  R4: 'Self-correcting',
};

/** Plain translation for non-technical visitors. R0 to R4 only. */
export function plainRunLevel(rl: string): string {
  if (rl === 'R0' || rl === 'R1') return 'works in a demo';
  if (rl === 'R2' || rl === 'R3') return 'handles real cases';
  return 'safe in front of customers';
}

/** The scope envelope, stated on every detail page. */
export const SCOPE_ENVELOPE =
  'Buildable by one solo builder in 20 to 30 focused hours, on public, synthetic, or sanitized data, with a demo path that requires no production access.';

/** Slug a failure family for the intake ?family= param. */
export function familySlug(family: string): string {
  return family.trim().toLowerCase().replace(/\s+/g, '-');
}

const FALLBACK_INTAKE = 'mailto:info@theairuntime.com?subject=Field%20Briefs%20problem';
const FALLBACK_BUILDER = 'mailto:info@theairuntime.com?subject=Field%20Briefs%20builder%20list';

export function intakeUrl(family?: string): string {
  const base = import.meta.env.PUBLIC_PROBLEM_INTAKE_URL || FALLBACK_INTAKE;
  if (!family) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}family=${familySlug(family)}`;
}

export function builderUrl(): string {
  return import.meta.env.PUBLIC_BUILDER_INTEREST_URL || FALLBACK_BUILDER;
}
