// Shared helpers for Field Briefs. Kept portable: relative URLs only, so the
// pages lift to lab.theairuntime.com later without breaking links.

// The Field Lab now lives on its own subdomain. Pages served under lab use
// relative links (same origin), but main-site links into the Field Lab use
// this absolute origin to land directly on lab without a redirect hop.
export const LAB_URL = 'https://lab.theairuntime.com';

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

// All Field Lab CTAs route to one on-ramp: /field-lab/intake. The branch is
// preselected via ?branch=, and the failure family via ?family=. Relative URL
// only, so this lifts to lab.theairuntime.com later without changes.
const INTAKE_PAGE = '/field-lab/intake';

export function intakeUrl(family?: string): string {
  const base = `${INTAKE_PAGE}?branch=problem`;
  return family ? `${base}&family=${familySlug(family)}` : base;
}

export function builderUrl(): string {
  return `${INTAKE_PAGE}?branch=build`;
}
