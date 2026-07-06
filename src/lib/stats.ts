// One source of truth for community numbers and social proof. StatBand,
// CredibilityStrip, and /sponsors all import from here; update once.
export interface Stat {
  value: string;
  label: string;
}

export const COMMUNITY_STATS: Stat[] = [
  { value: '2,000+', label: 'newsletter subscribers' },
  { value: '200+', label: 'in-person attendees' },
];

// The sponsors page adds cadence to the same strip.
export const SPONSOR_STATS: Stat[] = [
  ...COMMUNITY_STATS,
  { value: '1', label: 'flagship event per month' },
];

export const READER_COMPANIES = [
  'IBM',
  'Amazon',
  'Meta',
  'Google',
  'NVIDIA',
  'OpenAI',
  'MIT',
  'Harvard',
];
