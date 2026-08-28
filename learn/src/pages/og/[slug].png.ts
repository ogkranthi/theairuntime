import fs from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { LEDGER_LABELS, getModules, pad } from "../../lib/course";
import { COURSE, getAsdModules, getAsdScenarios, REFERENCE_DOCS } from "../../lib/asd";

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

type LedgerRow = { label: string; state: "done" | "current" | "todo" };

type Page = {
  slug: string;
  eyebrow: string;
  title: string;
  /** Module number shown above the title, or null for non-module pages. */
  current: number | null;
  /** Five-row ledger under the rule. Each course supplies its own. */
  ledger: LedgerRow[];
};

/** Five rows centred on `current`, clamped to the available range. */
function window5(labels: string[], current: number | null): LedgerRow[] {
  const start = current === null ? 0 : Math.min(Math.max(current - 2, 0), Math.max(labels.length - 5, 0));
  return labels.slice(start, start + 5).map((label, i) => {
    const n = start + i;
    return {
      label,
      state: current === null ? "todo" : n === current ? "current" : n < current ? "done" : "todo",
    };
  });
}

export async function getStaticPaths() {
  const modules = await getModules();
  const asdModules = await getAsdModules();
  const asdScenarios = await getAsdScenarios();

  const c001Labels = modules.map((m) => `${pad(m.data.module)}  ${LEDGER_LABELS[m.data.module]}`);
  const asdLabels = asdModules.map((m) => `${m.data.id}  ${m.data.title}`);

  const asdPage = (slug: string, eyebrow: string, title: string): Page => ({
    slug,
    eyebrow,
    title,
    current: null,
    ledger: window5(asdLabels, null),
  });

  const c001 = (slug: string, eyebrow: string, title: string): Page => ({
    slug,
    eyebrow,
    title,
    current: null,
    ledger: window5(c001Labels, null),
  });

  const pages: Page[] = [
    c001("home", "FDE ENGINEERING", "Learn AI Engineering Like an FDE"),
    c001("courses", "FDE ENGINEERING · COURSES", "The catalog"),
    c001("long-running-agents", "COURSE 001 · FDE ENGINEERING", "Engineering Long-Running AI Agents"),
    c001("case-studies", "FDE ENGINEERING · CASE STUDIES", "Systems, not demos"),
    c001("skills", "FDE ENGINEERING · SKILLS MAP", "What an FDE actually knows"),
    c001("resources", "FDE ENGINEERING · RESOURCES", "Curated, not collected"),
    c001("labs", "COURSE 001 · FAILURE LABS", "Break it on purpose"),
    c001("stack", "COURSE 001 · TECHNOLOGIES", "Boring on purpose"),
    c001("sources", "COURSE 001 · PRIMARY SOURCES", "Read the originals"),
    c001("about", "FDE ENGINEERING · ABOUT", "Between the demo and production"),
    c001("404", "FDE ENGINEERING", "No checkpoint at that step"),
    c001("fde-gym", "FDE GYM", "Design it under interview pressure"),
    ...modules.map((m) => ({
      slug: m.id,
      eyebrow: `COURSE 001 · MODULE ${pad(m.data.module)}`,
      title: m.data.title,
      current: m.data.module,
      ledger: window5(c001Labels, m.data.module),
    })),

    // Course 002. Its ledger is the module list, so a shared lesson card shows
    // where in the Atlas build the reader has landed.
    asdPage("agentic-system-design", "COURSE 002 · FDE ENGINEERING", COURSE.title),
    asdPage("asd-canvas", "COURSE 002 · DESIGN CANVAS", "Twelve sections, no hand-waving"),
    asdPage("asd-capstone", "COURSE 002 · CAPSTONE", COURSE.canonical_project),
    asdPage("asd-glossary", "COURSE 002 · GLOSSARY", "Say what you mean in a design review"),
    asdPage("asd-sources", "COURSE 002 · PRIMARY SOURCES", "Cited to the docs, not the blog post"),
    asdPage("asd-practice", "COURSE 002 · PRACTICE", "Design it under a clock"),
    asdPage("asd-reference", "COURSE 002 · REFERENCE", "The artifacts a real review asks for"),
    ...asdModules.map((m, i) => ({
      slug: `asd-${m.data.slug}`,
      eyebrow: `COURSE 002 · MODULE ${m.data.id} · ${m.data.track.toUpperCase()}`,
      title: m.data.title,
      current: null,
      ledger: window5(asdLabels, i),
    })),
    ...asdScenarios.map((s) =>
      asdPage(`asd-practice-${s.data.slug}`, "COURSE 002 · PRACTICE SCENARIO", s.data.title),
    ),
    ...REFERENCE_DOCS.map((doc) =>
      asdPage(`asd-ref-${doc.slug}`, `COURSE 002 · ${doc.kind.toUpperCase()}`, doc.title),
    ),
  ];

  return pages.map((page) => ({ params: { slug: page.slug }, props: { page } }));
}

export async function GET({ props }: { props: { page: Page } }) {
  const { page } = props;
  const rows = page.ledger;

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
                  { type: "div", props: { style: { display: "flex" }, children: r.label } },
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
