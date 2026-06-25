import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Content Layer glob loader (Astro 5). Unlike the legacy `type: "content"`
// collection, this does not reserve `slug`, so the frontmatter `slug` can be a
// real, schema-validated field that drives the URL independent of the filename.
const investigations = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/investigations" }),
  schema: z.object({
    id: z.string(),                 // "01"
    slug: z.string(),               // stable URL key, independent of filename
    title: z.string(),
    question: z.string(),           // the load-bearing engineering question (card headline)
    status: z.enum(["investigating", "in-eval", "published"]),
    customer: z.string(),           // one line
    problem: z.string(),            // one line
    summary: z.string(),            // 1-2 sentences, used as meta description
    pillar: z.enum(["MRE", "Vertical Agents", "Lessons from the Trenches"]).optional(),
    started: z.coerce.date(),
    updated: z.coerce.date(),
    // Evidence artifacts (render only when present):
    repo: z.string().url().optional(),        // code
    evalUrl: z.string().url().optional(),      // eval harness
    datasetUrl: z.string().url().optional(),   // dataset / labels
    reportUrl: z.string().url().optional(),    // final Substack report
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { investigations };
