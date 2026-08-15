import fs from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { LEDGER_LABELS, getModules, pad } from "../../lib/course";

const require = createRequire(import.meta.url);

function font(file: string): Buffer {
  // Satori needs ttf/otf/woff. @fontsource ships a .woff next to every .woff2.
  return fs.readFileSync(require.resolve(`@fontsource/ibm-plex-mono/files/${file}`));
}

// Light theme, matching tokens.css. #EA580C is safe here: OG art is imagery,
// not text subject to contrast audits, so the brighter brand orange carries.
const BG = "#FFFFFF";
const FG = "#18181B";
const MUTED = "#71717A";
const ACCENT = "#EA580C";
const LINE = "#E5E7EB";

type Page = {
  slug: string;
  eyebrow: string;
  title: string;
  /** Module number to mark with the arrow, or null for non-module pages. */
  current: number | null;
};

export async function getStaticPaths() {
  const modules = await getModules();

  const pages: Page[] = [
    { slug: "home", eyebrow: "FDE ENGINEERING", title: "Learn AI Engineering Like an FDE", current: null },
    { slug: "courses", eyebrow: "FDE ENGINEERING · COURSES", title: "The catalog", current: null },
    { slug: "long-running-agents", eyebrow: "COURSE 001 · FDE ENGINEERING", title: "Engineering Long-Running AI Agents", current: null },
    { slug: "case-studies", eyebrow: "FDE ENGINEERING · CASE STUDIES", title: "Systems, not demos", current: null },
    { slug: "skills", eyebrow: "FDE ENGINEERING · SKILLS MAP", title: "What an FDE actually knows", current: null },
    { slug: "resources", eyebrow: "FDE ENGINEERING · RESOURCES", title: "Curated, not collected", current: null },
    { slug: "labs", eyebrow: "COURSE 001 · FAILURE LABS", title: "Break it on purpose", current: null },
    { slug: "stack", eyebrow: "COURSE 001 · TECHNOLOGIES", title: "Boring on purpose", current: null },
    { slug: "sources", eyebrow: "COURSE 001 · PRIMARY SOURCES", title: "Read the originals", current: null },
    { slug: "about", eyebrow: "FDE ENGINEERING · ABOUT", title: "Between the demo and production", current: null },
    { slug: "404", eyebrow: "FDE ENGINEERING", title: "No checkpoint at that step", current: null },
    ...modules.map((m) => ({
      slug: m.id,
      eyebrow: `COURSE 001 · MODULE ${pad(m.data.module)}`,
      title: m.data.title,
      current: m.data.module,
    })),
  ];

  return pages.map((page) => ({ params: { slug: page.slug }, props: { page } }));
}

/** Five ledger rows centred on the current module, clamped to the real range. */
function ledgerRows(current: number | null) {
  const start = current === null ? 0 : Math.min(Math.max(current - 2, 0), 15 - 4);
  return Array.from({ length: 5 }, (_, i) => start + i).map((n) => ({
    n,
    label: LEDGER_LABELS[n] as string,
    state: current === null ? "todo" : n === current ? "current" : n < current ? "done" : "todo",
  }));
}

export async function GET({ props }: { props: { page: Page } }) {
  const { page } = props;
  const rows = ledgerRows(page.current);

  const tree = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "1200px",
        height: "630px",
        backgroundColor: BG,
        padding: "64px 72px",
        fontFamily: "Plex",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 22, letterSpacing: "0.14em", color: ACCENT },
            children: `THE AI RUNTIME · ${page.eyebrow}`,
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", maxWidth: "980px" },
            children: [
              ...(page.current === null
                ? []
                : [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", fontSize: 30, color: MUTED, marginBottom: "14px" },
                        children: `MODULE ${pad(page.current)}`,
                      },
                    },
                  ]),
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 64, lineHeight: 1.15, color: FG },
                  children: page.title,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              borderTop: `1px solid ${LINE}`,
              paddingTop: "26px",
            },
            // The ledger markers are drawn as shapes, not glyphs: the Latin
            // subset of Plex Mono has no arrow, check or circle, and satori has
            // no system font to fall back to the way the browser does.
            children: rows.map((r) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  fontSize: 22,
                  lineHeight: 1.6,
                  color: r.state === "current" ? ACCENT : r.state === "done" ? FG : MUTED,
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        width: "26px",
                        height: "26px",
                        alignItems: "center",
                        justifyContent: "flex-start",
                      },
                      children: {
                        type: "div",
                        props: {
                          style:
                            r.state === "current"
                              ? { display: "flex", width: "14px", height: "14px", backgroundColor: ACCENT, borderRadius: "2px" }
                              : r.state === "done"
                                ? { display: "flex", width: "12px", height: "12px", backgroundColor: FG, borderRadius: "2px" }
                                : { display: "flex", width: "11px", height: "11px", border: `2px solid ${MUTED}`, borderRadius: "50%" },
                          children: "",
                        },
                      },
                    },
                  },
                  { type: "div", props: { style: { display: "flex" }, children: `${pad(r.n)}  ${r.label}` } },
                ],
              },
            })),
          },
        },
      ],
    },
  };

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Plex", data: font("ibm-plex-mono-latin-400-normal.woff"), weight: 400, style: "normal" },
      { name: "Plex", data: font("ibm-plex-mono-latin-500-normal.woff"), weight: 500, style: "normal" },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
