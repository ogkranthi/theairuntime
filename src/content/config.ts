import { defineCollection, reference, z } from 'astro:content';

const cities = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    cohost: z.string().optional(),
    venueName: z.string().optional(),
    cadence: z.string().default('Monthly'),
    joinUrl: z.string().url().optional(),
    currentEventSlug: z.string().optional(),
    intro: z.string().optional(),
  }),
});

const speakers = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    title: z.string(),
    company: z.string(),
    photo: z.string().optional(),
    social: z
      .object({
        linkedin: z.string().url().optional(),
        twitter: z.string().url().optional(),
        github: z.string().url().optional(),
        website: z.string().url().optional(),
      })
      .default({}),
    talks: z
      .array(
        z.object({
          eventSlug: z.string(),
          title: z.string(),
          abstract: z.string(),
          slidesUrl: z.string().optional(),     // absolute URL or repo-relative path
          recordingUrl: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

const events = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    city: reference('cities'),
    date: z.coerce.date(),
    doorsAt: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    venue: z
      .object({
        name: z.string(),
        address: z.string().optional(),
        mapUrl: z.string().url().optional(),
      })
      .optional(),
    speakers: z.array(reference('speakers')).default([]),
    agenda: z
      .array(
        z.object({
          time: z.string().optional(),
          item: z.string(),
        }),
      )
      .default([]),
    status: z.enum(['upcoming', 'past']).default('upcoming'),
    lumaUrl: z.string().url().optional(),
    recordingUrl: z.string().url().optional(),
    slidesUrl: z.string().url().optional(),
    cohosts: z.array(z.string()).default([]),
    partners: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url().optional(),
          logo: z.string().optional(),
          role: z.string().default('Partner'),
        }),
      )
      .default([]),
    description: z.string().optional(),
  }),
});

const resources = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(['ebook', 'checklist', 'playbook', 'template']),
    pillar: z.enum(['evals', 'agents', 'inference', 'reliability', 'cost']),
    cover: z.string().optional(),
    description: z.string(),
    length: z.string().optional(),
    version: z.string().default('v1'),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    status: z.enum(['coming-soon', 'free', 'lead-gated', 'paid']),
    priceUsd: z.number().optional(),
    pdfUrl: z.string().optional(),
    previewUrl: z.string().optional(),
    paymentLinkUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
  }),
});

// Curated reading list: pointers to external posts/papers + our own Substack issues.
// Free attribution-out content. Distinct from `resources` which is owned content
// (lead-gated or paid).
const reading = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    source: z.string(), // e.g. "Anthropic", "Eugene Yan", "The AI Runtime"
    author: z.string().optional(),
    pillar: z.enum(['evals', 'agents', 'inference', 'reliability', 'cost']),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    publishedAt: z.coerce.date().optional(),
    addedAt: z.coerce.date(),
    relatedEvents: z.array(z.string()).default([]),
    relatedSpeakers: z.array(reference('speakers')).default([]),
    byKranthi: z.boolean().default(false), // surfaces on his profile + on /about
    highlight: z.boolean().default(false), // pin to top of /library
  }),
});

// Tools we use and recommend — distinct from `reading` (content) and
// `resources` (owned content we sell). Some entries are referral links;
// `isReferral: true` flags them so the UI can disclose this transparently.
const tools = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.enum([
      'productivity',
      'coding',
      'writing',
      'design',
      'agents',
      'evals',
      'infra',
      'observability',
      'other',
    ]),
    pillar: z.enum(['evals', 'agents', 'inference', 'reliability', 'cost']).optional(),
    tagline: z.string(),
    why: z.string().optional(),
    isReferral: z.boolean().default(false),
    featured: z.boolean().default(false),
    addedAt: z.coerce.date(),
  }),
});

export const collections = { cities, speakers, events, resources, reading, tools };
