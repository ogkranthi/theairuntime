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
    bio: z.string().optional(), // one or two sentences, shown on presenter cards
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
    cover: z.string().optional(), // hero cover image path, e.g. /events/2026-06-16/full-room.jpg
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

// The converged Field Lab model. One pipeline, three nouns:
//   Brief  = the problem (fields on a Lab, not a separate collection)
//   Lab    = the numbered build, one page per Lab (this collection)
//   Report = a builder's teardown, which they own (the reports collection)
const labs = defineCollection({
  type: 'content',
  schema: z.object({
    number: z.number(), // 1, 2, 3
    title: z.string(),
    status: z.enum(['scheduled', 'past', 'draft']),
    date: z.coerce.date().optional(),
    location: z.string().optional(), // "Boston"
    partner: z.string().optional(), // "Apify"
    // Brief (the problem) lives on the Lab:
    brief_summary: z.string(), // one or two sentences, used on cards
    fit_profile: z.string().optional(),
    the_bar: z.string().optional(), // the public reliability bar, e.g. the Dirty Thirty
    // Investigation framing, shown on /investigations and the home feature:
    question: z.string().optional(), // the load-bearing engineering question
    artifact: z.string().optional(), // the reusable thing the Lab produces
    pass_bar: z.array(z.string()).default([]), // the public bar, one line per criterion
    luma_url: z.string().url().optional(),
    subscribe_url: z.string().url(),
    og_image: z.string().optional(),
    report_slugs: z.array(z.string()).default([]), // links to its Reports
  }),
});

const reports = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    builder_name: z.string(),
    builder_link: z.string().url().optional(), // GitHub or LinkedIn, builder owns the proof
    lab_number: z.number(), // which Field Lab produced it
    summary: z.string(), // one or two sentences
    result: z.string().optional(), // e.g. "recall 0.91, precision 0.86 on the Dirty Thirty"
    repo_url: z.string().url().optional(),
    writeup_url: z.string().url().optional(),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
    og_image: z.string().optional(),
  }),
});

// Field Notes: async interviews with people doing FDE-shaped work (forward
// deployed engineers, applied AI architects, customer engineers, operators).
// Planned notes appear on the index without a detail page; published notes get
// a page rendered from the markdown body.
const fieldNotes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    guest_name: z.string().optional(), // omitted when anonymous
    anonymous: z.boolean().default(false),
    role: z.string(), // "Forward Deployed Engineer", "Applied AI Architect"
    company_type: z.string(), // "model company", "AI infra", "B2B SaaS startup"
    themes: z.array(z.string()).default([]),
    status: z.enum(['planned', 'published']).default('published'),
    date: z.coerce.date(),
    excerpt: z.string(), // one or two sentences, used on cards and meta
  }),
});

// Artifacts: reusable checklists, rubrics, templates, evals, and runbooks that
// come out of investigations. Available artifacts get a detail page rendered
// from the markdown body; in-progress ones are listed without a link.
const artifacts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    artifact_type: z.enum(['checklist', 'rubric', 'template', 'eval', 'runbook']),
    related_lab: z.number().optional(), // Field Lab number it came from
    use_case: z.string(), // one line: when to reach for it
    problem_solved: z.string(), // one line: what failure it prevents
    status: z.enum(['available', 'in-progress']).default('available'),
    download_url: z.string().optional(),
    date: z.coerce.date(),
  }),
});

// The Problem Bank: anonymized production-shaped AI problems from founders,
// operators, and engineers. Cards only, no detail pages; the body holds
// private editor notes and is never rendered.
const problems = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    source_type: z.enum(['founder', 'operator', 'engineer', 'partner']),
    workflow: z.string(), // "growth/sales", "support", "research"
    system_type: z.string(), // "web-grounded agent", "RAG pipeline"
    risk_types: z.array(z.string()).default([]),
    status: z.enum([
      'submitted',
      'under-review',
      'selected',
      'in-progress',
      'report-published',
      'needs-partner',
      'needs-reviewer',
    ]),
    selected_for: z.number().optional(), // Field Lab number when selected
    date: z.coerce.date(),
  }),
});

export const collections = {
  cities,
  speakers,
  events,
  resources,
  signal,
  labs,
  reports,
  'field-notes': fieldNotes,
  artifacts,
  problems,
};
