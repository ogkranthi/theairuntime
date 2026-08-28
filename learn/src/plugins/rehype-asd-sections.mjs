import { visit } from "unist-util-visit";

/**
 * The Agentic System Design lessons carry their pedagogy in heading text:
 * "SHIP: ...", "RUN: ...", "DESIGN: ...", "Failure injection: ...".
 * Tag those headings so CSS can badge them, and mark the section wrappers the
 * lesson layout styles. Headings are left readable; only the label moves into
 * a data attribute.
 */
const PREFIXED = /^(SHIP|RUN|DESIGN|LEARN|Failure injection|Tradeoffs?|Interview drill)\s*:\s*(.*)$/;

const EXACT = new Map([
  ["What you will design", "design-brief"],
  ["Check your understanding", "check"],
  ["Primary references", "sources"],
  ["Failure injection", "failure"],
  ["Interview drill", "interview"],
]);

const LABEL_KIND = new Map([
  ["SHIP", "ship"],
  ["RUN", "run"],
  ["DESIGN", "design"],
  ["LEARN", "learn"],
  ["Failure injection", "failure"],
  ["Tradeoff", "tradeoff"],
  ["Tradeoffs", "tradeoff"],
  ["Interview drill", "interview"],
]);

function textOf(node) {
  let out = "";
  visit(node, "text", (t) => {
    out += t.value;
  });
  return out;
}

export function rehypeAsdSections() {
  return (tree) => {
    // Upstream files open with an <h1> that repeats the frontmatter title, and
    // every page here renders its own heading. Drop that duplicate, and demote
    // any later h1 to h2: a second top-level heading inside a document is a
    // section, and a page must have exactly one h1. Course 001 markdown has no
    // h1 at all, so this is a no-op there.
    const firstElement = tree.children.findIndex((child) => child.type === "element");
    if (firstElement > -1 && tree.children[firstElement].tagName === "h1") {
      tree.children.splice(firstElement, 1);
    }
    visit(tree, "element", (node) => {
      if (node.tagName === "h1") node.tagName = "h2";
    });

    visit(tree, "element", (node) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const text = textOf(node).trim();

      const match = text.match(PREFIXED);
      if (match) {
        const kind = LABEL_KIND.get(match[1]) ?? "learn";
        node.properties = {
          ...node.properties,
          className: [...(node.properties?.className ?? []), "asd-h", `asd-h--${kind}`],
          "data-label": match[1].toUpperCase(),
        };
        // The label stays inside the heading rather than moving to a ::before,
        // so the table of contents reads "SHIP add a durable workflow adapter"
        // instead of a bare, contextless "add a durable workflow adapter".
        // The trailing space separates the two in text extraction only; the
        // label renders as a block badge above the heading.
        node.children = [
          {
            type: "element",
            tagName: "span",
            properties: { className: ["asd-h__label"] },
            children: [{ type: "text", value: `${match[1].toUpperCase()} ` }],
          },
          { type: "text", value: match[2] || text },
        ];
        return;
      }

      const exact = EXACT.get(text);
      if (exact) {
        node.properties = {
          ...node.properties,
          className: [...(node.properties?.className ?? []), "asd-h", `asd-h--${exact}`],
        };
      }
    });
  };
}
