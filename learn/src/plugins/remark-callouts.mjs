import { visit } from 'unist-util-visit';

// Callout types from CLAUDE.md. Authors write:
//
//   :::failure-lab{title="The Duplicate Report"}
//   body markdown
//   :::
//
// and get an <aside class="callout callout--failure-lab"> with a mono eyebrow.
// The module number is supplied by the page template, not the directive, so a
// module file stays portable if it is renumbered.
const EYEBROW = {
  'failure-lab': 'FAILURE LAB',
  deliverable: 'DELIVERABLE',
  takeaway: 'PRODUCTION TAKEAWAY',
  note: 'NOTE',
};

export function remarkCallouts() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      const eyebrow = EYEBROW[node.name];
      if (!eyebrow) return;

      const attrs = node.attributes ?? {};
      const header = [
        {
          type: 'paragraph',
          data: { hName: 'p', hProperties: { className: ['callout__eyebrow'] } },
          children: [{ type: 'text', value: eyebrow }],
        },
      ];
      if (attrs.title) {
        header.push({
          type: 'paragraph',
          data: { hName: 'p', hProperties: { className: ['callout__title'] } },
          children: [{ type: 'text', value: attrs.title }],
        });
      }

      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: {
          className: ['callout', `callout--${node.name}`],
        },
      };
      node.children = [...header, ...node.children];
    });
  };
}
