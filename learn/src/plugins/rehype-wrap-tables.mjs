import { visit } from "unist-util-visit";

// Curriculum tables can be wider than the reading column on a phone. Wrap each
// one so it scrolls inside its own box and the page body never scrolls sideways.
export function rehypeWrapTables() {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || index === null) return;
      if (parent.type === "element" && parent.properties?.className?.includes?.("table-scroll")) return;

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"] },
        children: [node],
      };
    });
  };
}
