# CLAUDE.md

Guidance for Claude (and any AI/human contributor) working in this repo.

## Project

The AI Runtime, events + community platform on `events.theairuntime.com`.
Astro + content collections, deployed to Cloudflare Pages. The publication
itself lives on `theairuntime.com` (Substack). See `README.md` for structure
and `BRAND.md` for the full brand reference.

## Writing rules (apply to ALL copy, content, comments, and docs)

- **Never use em dashes (—).** This is a hard rule, no exceptions, anywhere:
  page copy, content markdown, code comments, commit messages, PR text, alt
  text, JSON-LD, SVG labels. Rewrite the sentence instead.
  - For a parenthetical aside, use commas or parentheses.
  - For a break between two independent clauses, use a period or a colon.
  - Do not substitute en dashes (–) as a workaround either; use a hyphen only
    for ranges (e.g. `2-3 sentences`) and compound modifiers.
- Match the brand voice in `BRAND.md`: confident, specific, sourced,
  anti-hype, practitioner-first.

## Conventions

- Keep the primary nav minimal (Events, Library, Subscribe). Secondary links
  live in the footer.
- Subscribe buttons/forms point to `https://theairuntime.com/subscribe`.
- Free PDFs live in `public/resources/`; resource entries set `status: free`
  with a `pdfUrl`.
- Run `npm run build` before committing; it must pass.
