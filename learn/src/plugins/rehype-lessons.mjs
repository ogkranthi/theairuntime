import { visit } from "unist-util-visit";

/**
 * Turn "## Lesson 05.1: Title" and "## Exercise 05: Title" headings into
 * chip-labelled headings: the number moves to a data attribute rendered as a
 * styled chip, and the visible text becomes just the title. Also tags the four
 * v2 rhythm headings (Diagnose, Prove it, Exit criteria, Checkpoint) with a
 * stage attribute so CSS can badge them.
 */
const LESSON = /^(Lesson|Exercise)\s+(\d{2}(?:\.\d+)?):\s*(.*)$/;
const STAGE = new Map([
  ["Diagnose", "diagnose"],
  ["Prove it", "prove"],
  ["Exit criteria", "exit"],
  ["Checkpoint", "checkpoint"],
]);

function textOf(node) {
  let out = "";
  visit(node, "text", (t) => {
    out += t.value;
  });
  return out;
}

export function rehypeLessons() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const text = textOf(node).trim();

      const m = text.match(LESSON);
      if (m) {
        node.properties = {
          ...node.properties,
          className: [...(node.properties?.className ?? []), "lesson-h"],
          "data-lesson": m[2],
        };
        node.children = [{ type: "text", value: m[3] || text }];
        return;
      }

      const stage = STAGE.get(text);
      if (stage) {
        node.properties = {
          ...node.properties,
          className: [...(node.properties?.className ?? []), "stage-h", `stage-h--${stage}`],
        };
      }
    });
  };
}
