import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

// Course 001 lessons. One markdown file per module in src/content/course/.
// The Content Layer glob loader keys entries by filename, so the slug
// convention (00-mental-model .. 15-production-gauntlet) is the URL.
const course = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/course" }),
  schema: z.object({
    module: z.number().min(0).max(15),
    title: z.string(),
    subtitle: z.string().optional(),
    duration: z.string(),                    // "45-60 min"
    goal: z.string(),
    /** The production question an engineer can answer after the module. */
    question: z.string(),
    /** One-line narrative hook for the lesson hero ("Your worker disappeared. Did the job?"). */
    hook: z.string().optional(),
    /** 2-3 sentence scenario grounding the hook in the mapped case study. */
    scenario: z.string().optional(),
    /** Case study slug this module's concepts map onto (src/content/case-studies). */
    caseStudy: z.string().optional(),
    /** Skills taught, shown on module cards and the lesson hero. */
    skills: z.array(z.string()).default([]),
    /** Technologies used in this module. */
    technologies: z.array(z.string()).default([]),
    /** Path inside the reference repo for "Explore implementation". */
    repoPath: z.string().optional(),
    /** Sequential Failure Lab number (independent of module number). */
    labNumber: z.number().min(1).max(14).optional(),
    /** The invariant this module establishes; rendered as a badge. */
    invariant: z.string().optional(),
    lab: z.string().optional(),              // Failure Lab title
    deliverable: z.string().optional(),
    youtube: z.string().url().optional(),    // filled in as videos ship
    substack: z.string().url().optional(),   // canonical longform for this module
    status: z.enum(["draft", "published"]).default("published"),
  }),
});

// Industry case studies, reusable across courses. Markdown body is the study.
const caseStudies = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/case-studies" }),
  schema: z.object({
    title: z.string(),
    category: z.enum([
      "Financial Services",
      "Healthcare",
      "SaaS",
      "Developer Tools",
      "Enterprise Operations",
    ]),
    summary: z.string(),                      // card + meta description
    concepts: z.array(z.string()),            // chips on the card
    /** Customer ask, verbatim-style quote for the FDE Lens block. */
    customerAsk: z.string(),
    /** What the ask actually requires, engineering-wise. */
    realRequirement: z.string(),
    /** Courses that draw on this case (course ids from courses.json). */
    courses: z.array(z.string()).default([]),
    /** Modules in Course 001 that map to this case (module numbers). */
    modules: z.array(z.number()).default([]),
    status: z.enum(["draft", "published"]).default("published"),
  }),
});

// The course catalog. Data-only: adding a course is one entry here plus
// content files when it ships.
const courses = defineCollection({
  loader: file("./src/data/courses.json"),
  schema: z.object({
    id: z.string(),                            // "course-001"
    number: z.string(),                        // "001"
    slug: z.string().optional(),               // route under /learn/courses/, when live
    title: z.string(),
    description: z.string(),
    status: z.enum(["live", "coming-next", "planned"]),
    caseStudyTags: z.array(z.string()).default([]),  // display names on the card
    skills: z.array(z.string()).default([]),
    stats: z
      .object({ modules: z.number(), cases: z.number(), labs: z.number(), hours: z.string() })
      .optional(),
    repo: z.string().url().optional(),
  }),
});

// Skills map taxonomy. Links are optional now, fillable as content grows.
const skills = defineCollection({
  loader: file("./src/data/skills.json"),
  schema: z.object({
    id: z.string(),                            // domain id, e.g. "fde-discovery"
    domain: z.string(),                        // "FDE Discovery"
    blurb: z.string(),
    skills: z.array(
      z.object({
        name: z.string(),
        // All optional link targets; empty arrays render nothing.
        lessons: z.array(z.string()).default([]),      // lesson hrefs
        courses: z.array(z.string()).default([]),      // course ids
        caseStudies: z.array(z.string()).default([]),  // case study slugs
        labs: z.array(z.string()).default([]),         // lab hrefs (FDE Lab or course labs)
        external: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
      }),
    ),
  }),
});

// Curated resources. Not a link dump: every entry says why AIR recommends it.
const resources = defineCollection({
  loader: file("./src/data/resources.json"),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    organization: z.string(),
    category: z.enum([
      "Frameworks",
      "Agent runtimes",
      "Evaluation",
      "Observability",
      "Context/RAG",
      "Coding agents",
      "Distributed systems",
      "Deployment",
    ]),
    type: z.string(),                          // "docs" | "guide" | "paper" | "post" | "reference"
    why: z.string(),                           // why AIR recommends it
    skills: z.array(z.string()).default([]),
    course: z.string().optional(),             // related course id
    module: z.number().optional(),             // related Course 001 module
    url: z.string().url(),
  }),
});

export const collections = { course, caseStudies, courses, skills, resources };
