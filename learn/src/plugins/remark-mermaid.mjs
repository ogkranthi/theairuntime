import { visit } from "unist-util-visit";

/**
 * Replace ```mermaid fences with a diagram shell before Shiki sees them.
 *
 * The graph source lives in exactly one place: the <pre> inside the <details>
 * fallback. That fallback is the accessible text description when JavaScript,
 * the network, or the renderer fails, it is what a screen reader gets, and the
 * client renderer reads its textContent to draw the diagram. Keeping a second
 * escaped copy in a <script> would be a source of truth that can drift, and
 * <script> is a raw-text element where HTML entities are never decoded.
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function remarkMermaid() {
  return (tree) => {
    let counter = 0;
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === null) return;
      counter += 1;
      const id = `mmd-${counter}`;
      const source = node.value;

      parent.children[index] = {
        type: "html",
        value: `<figure class="mermaid-figure" data-mermaid-figure>
  <div class="mermaid-figure__canvas" data-mermaid-canvas id="${id}" role="img" aria-label="Architecture diagram; the text definition follows below">
    <p class="mermaid-figure__pending">Diagram loading. The text definition is below.</p>
  </div>
  <div class="mermaid-figure__bar">
    <button type="button" class="mermaid-figure__btn" data-mermaid-expand hidden>Expand</button>
  </div>
  <details class="mermaid-figure__fallback">
    <summary>Text definition of this diagram</summary>
    <pre><code data-mermaid-source>${escapeHtml(source)}</code></pre>
  </details>
</figure>`,
      };
    });
  };
}
