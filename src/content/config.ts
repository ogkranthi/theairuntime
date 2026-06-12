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
          audioOverviewUrl: z.string().optional(), // NotebookLM Deep Dive MP3
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
    audioOverviewUrl: z.string().optional(), // NotebookLM Deep Dive MP3
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
    // Recap fields, populated after the event runs.
    // `recap` is rendered from the markdown body; these are structured extras.
    recapTakeaways: z
      .array(
        z.object({
          speaker: z.string().optional(),
          point: z.string(),
        }),
      )
      .default([]),
    recapPhotos: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string().default(''),
        }),
      )
      .default([]),
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
    // Free resources can require a social share to reveal the download, turning
    // each reader into a referrer. Only meaningful with status: free + pdfUrl.
    shareToUnlock: z.boolean().default(false),
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
    audioOverviewUrl: z.string().optional(), // NotebookLM Deep Dive MP3
  }),
});

// Tools we use and recommend, distinct from `reading` (content) and
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

const signal = defineCollection({
  type: 'content',
  schema: z.object({
    month: z.string(),
    year: z.number(),
    problem: z.string(),
    context: z.string(),
    question: z.string(),
    answer: z.string(),
    answeredBy: z.string(),
    reads: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        why: z.string(),
      }),
    ),
    featured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
  }),
});

// Field Briefs: the Field Lab problem library. One brief format for both
// curated and failure-derived problems. JSON data files in content/problems/.
const problems = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    one_line: z.string(),
    vertical: z.string(),
    difficulty: z.enum(['Starter', 'Intermediate', 'Advanced']),
    build_type: z.string(),
    status: z.enum(['Open', 'Claimed', 'Shipped', 'Featured']),
    run_level: z.enum(['R0', 'R1', 'R2', 'R3', 'R4']),
    provenance: z.enum(['curated', 'failure-derived']).default('curated'),
    reliability_focus: z.array(z.string()).default([]),
    failure_family: z
      .enum([
        'destructive auto-shipping',
        'reward hacking',
        'delegated identity',
        'prompt injection',
        'cost runaway',
        'eval-production gap',
        'supply chain',
      ])
      .optional(),
    why_it_matters: z.string(),
    persona: z.string(),
    current_workflow: z.string(),
    ai_workflow: z.string(),
    inputs: z.array(z.string()).default([]),
    outputs: z.array(z.string()).default([]),
    definition_of_done: z.string(),
    example_input: z.string().optional(),
    example_output: z.string().optional(),
    data_plan: z.enum(['public', 'synthetic', 'sanitized']),
    non_goals: z.array(z.string()).default([]),
    evaluation_ideas: z.array(z.string()).default([]),
    suggested_tools: z.array(z.string()).default([]),
    thesis_questions: z.array(z.string()).default([]),
    // Shipped briefs may carry a verification record, e.g. "R3".
    verified_at: z.string().optional(),
    // Drafted by Claude Code from summaries; flip to false after editorial review.
    draft: z.boolean().default(false),
    // Failure-derived briefs use the same record with these optional fields.
    failure_story: z
      .object({
        what_happened: z.string(),
        root_cause_read: z.string(),
        engineering_lesson: z.string(),
      })
      .optional(),
    field_signals: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
    primary_source_note: z.string().optional(),
    month: z.string().optional(), // YYYY-MM, drives the featured slot
  }),
});

export const collections = { cities, speakers, events, resources, reading, tools, signal, problems };
