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

// Field Briefs: the Field Lab problem library. Enforces the Field Brief
// Standard v1.0. One brief format for curated and failure-derived problems.
// `draft` and `verified_at` are site extensions beyond the standard.
const problems = defineCollection({
  type: 'data',
  schema: z
    .object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string(),
      one_line: z.string(),
      vertical: z.string(),
      difficulty: z.enum(['Starter', 'Intermediate', 'Advanced']),
      build_type: z.string(),
      status: z.enum(['Open', 'Claimed', 'Shipped', 'Featured']),
      run_level: z.enum(['R0', 'R1', 'R2', 'R3', 'R4']),
      reliability_focus: z.array(z.string()).min(2),
      provenance: z.enum([
        'curated',
        'operator-sourced',
        'failure-derived',
        'company-submitted',
        'partner-contributed',
      ]),
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
      inputs: z.array(z.string()).min(1),
      outputs: z.array(z.string()).min(1),
      definition_of_done: z.string(),
      example_input: z.string(),
      example_output: z.string(),
      data_plan: z.enum(['synthetic', 'public', 'sanitized']),
      non_goals: z.array(z.string()),
      evaluation_ideas: z.array(z.string()).min(1),
      suggested_tools: z.array(z.string()),
      thesis_questions: z.array(z.string()).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      failure_story: z
        .object({
          what_happened: z.string(),
          root_cause_read: z.string(),
          engineering_lesson: z.string(),
        })
        .optional(),
      sources: z.array(z.string().url()).optional(),
      primary_source_note: z.string().optional(),
      field_signals: z.array(z.string()).optional(),
      // Site extensions, not part of the standard.
      // Fixed-frame signature line: "Build a production-ready AI system that
      // [outcome] while satisfying explicit [constraint, constraint, and
      // constraint] constraints." The shape is constant across briefs; the
      // constraints individuate each one.
      system_signature: z.string().optional(),
      verified_at: z.string().optional(), // e.g. "R3" on a Shipped brief
      draft: z.boolean().default(false), // flip to false after editorial review
    })
    .superRefine((b, ctx) => {
      if (b.provenance === 'failure-derived') {
        for (const f of ['failure_story', 'sources', 'primary_source_note', 'failure_family'] as const) {
          if (!b[f]) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `failure-derived requires ${f}`, path: [f] });
          }
        }
      }
      if (b.provenance === 'operator-sourced' && !b.sources) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'operator-sourced requires sources', path: ['sources'] });
      }
    }),
});

export const collections = { cities, speakers, events, resources, signal, problems };
