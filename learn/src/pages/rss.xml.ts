import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getModules, moduleHref, pad } from "../lib/course";

export async function GET(context: APIContext) {
  const modules = await getModules();

  return rss({
    title: "AIR Course 001: Engineering Long-Running AI Agents",
    description:
      "Thirteen modules from a simple agent loop to a durable production system. State, checkpoints, idempotency, failure taxonomies, human-in-the-loop, context engineering, observability and evals.",
    site: context.site ?? "https://learn.theairuntime.com",
    items: modules.map((m) => ({
      title: `Module ${pad(m.data.module)}: ${m.data.title}`,
      description: m.data.goal,
      link: moduleHref(m),
      // Modules are a fixed, ordered syllabus rather than dated posts, so the
      // feed carries no pubDate and readers keep the course order.
      categories: m.data.lab ? [`Failure Lab ${pad(m.data.module)}: ${m.data.lab}`] : undefined,
    })),
    customData: "<language>en-us</language>",
  });
}
