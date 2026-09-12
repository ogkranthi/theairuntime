import type { PathState } from "./store";

/**
 * The plan, as a file the learner keeps.
 *
 * Everything is in this browser, so an export is the only way the work leaves
 * the machine it was made on. It is written to be readable on its own, without
 * the site, because that is where it will be read.
 */
export function planMarkdown(state: PathState): string {
  const lines: string[] = ["# My FDE path", ""];

  if (state.plan) {
    lines.push(`**Direction.** ${state.plan.direction}`, "", state.plan.reason, "");
    if (state.plan.selfGuided) {
      lines.push("_Built from the guide's own catalog, without AI guidance._", "");
    }
  }

  const step = state.steps.find((item) => item.id === state.chosenStepId);
  if (step) {
    lines.push(
      "## My first step",
      "",
      step.task,
      "",
      `- Output: ${step.output}`,
      `- Done when: ${step.doneWhen}`,
      `- Estimate: ${step.estimate} (an estimate, not a deadline)`,
      `- Bring back: ${step.bringBack}`,
      "",
    );
    if (state.completedAt) {
      lines.push(`Marked complete ${state.completedAt.slice(0, 10)}.`, "");
      if (state.completionNote.trim()) lines.push(`Notes: ${state.completionNote.trim()}`, "");
    }
  }

  if (state.plan?.priorities.length) {
    lines.push("## Priorities", "");
    state.plan.priorities.forEach((priority, index) => {
      lines.push(
        `### ${index + 1}. ${priority.title}`,
        "",
        `Why this, for me: ${priority.why}`,
        "",
        `Action: ${priority.action}`,
        "",
        `Output: ${priority.output}`,
        "",
      );
      if (priority.resources.length) {
        lines.push("Resources:");
        for (const item of priority.resources) {
          lines.push(`- [${item.title}](https://learn.theairuntime.com${item.href}): ${item.why}`);
        }
        lines.push("");
      }
    });
  }

  if (state.plan?.milestone) lines.push("## Later", "", state.plan.milestone, "");

  const kept = (state.mapping?.connections ?? []).filter(
    (item) => !state.removedIds.includes(item.id),
  );
  if (kept.length) {
    lines.push("## What carries over", "");
    for (const item of kept) {
      lines.push(
        `### ${item.capabilityLabel}`,
        "",
        item.described,
        "",
        item.because,
        "",
        `> ${item.quote}`,
        "",
      );
    }
  }

  const develop = (state.mapping?.develop ?? []).filter(
    (item) => !state.removedIds.includes(item.id),
  );
  if (develop.length) {
    lines.push("## Areas to develop", "");
    for (const item of develop) lines.push(`- **${item.capabilityLabel}.** ${item.because}`);
    lines.push("");
  }

  if (state.mapping?.unknowns.length) {
    lines.push(
      "## Still to work out",
      "",
      "Questions the guide did not have answers to. These are unanswered, not weaknesses.",
      "",
    );
    for (const item of state.mapping.unknowns) lines.push(`- ${item.question}`);
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "This plan is a starting point built from my own account of my experience. It is not an assessment of my skill.",
    "",
    "theairuntime.com",
  );

  return lines.join("\n");
}

/** Hand the file to the browser. Returns false when the browser refuses. */
export function downloadMarkdown(state: PathState): boolean {
  try {
    const blob = new Blob([planMarkdown(state)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-fde-path.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
