import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Course 001 modules. One markdown file per module in src/content/course/.
// The Content Layer glob loader keys entries by filename, so the slug
// convention (00-mental-model .. 12-production-gauntlet) is the URL.
const course = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/course" }),
  schema: z.object({
    module: z.number().min(0).max(12),
    title: z.string(),
    subtitle: z.string().optional(),
    duration: z.string(),                    // "45-60 min"
    goal: z.string(),
    lab: z.string().optional(),              // Failure Lab title
    deliverable: z.string().optional(),
    youtube: z.string().url().optional(),    // filled in as videos ship
    substack: z.string().url().optional(),   // canonical longform for this module
    status: z.enum(["draft", "published"]).default("published"),
  }),
});

export const collections = { course };
