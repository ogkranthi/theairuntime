// Free reads featured alongside the Field Guide on the homepage and the
// resources page. Defined once here so the title, link, and blurb stay in sync
// across both surfaces. These are free to read, no email required.

export interface FeaturedRead {
  title: string;
  url: string;
  pillar: 'evals' | 'agents' | 'inference' | 'reliability' | 'cost';
  description: string;
  // Short label for the cover tile, kept to two lines.
  coverTitle: string;
}

export const selfImprovingAi: FeaturedRead = {
  title: 'The Self-Improving AI Myth',
  url: 'https://theairuntime.com/p/the-self-improving-ai-myth-and-what',
  pillar: 'agents',
  description:
    "Self-improving agents are the headline of the moment. This essay separates what actually compounds when you ship AI to production from what only sounds like it does, and where the real reliability gains come from.",
  coverTitle: 'Self-Improving AI',
};
