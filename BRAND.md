# The AI Runtime, Brand Reference

A reference for anyone (human or AI) working on The AI Runtime. Covers palette, voice, mascot, architecture, and the multi-city expansion playbook. Inlined from the canonical brand doc.

## Quick facts

- **Brand:** The AI Runtime, publication and community for engineers shipping AI to production
- **Tagline:** LEARN. SHIP. RUN.
- **Domain:** theairuntime.com (Substack publication) · events.theairuntime.com (this site)
- **Mascot:** Blink (running cursor character, orange rectangle, two eyes, smile, running legs)
- **Founder:** Kranthi Manchikanti (AI Architect at Microsoft, Boston)
- **Newsletter:** Substack at theairuntime.substack.com (root `/` redirects there)
- **In-person:** The AI Runtime Boston, monthly in Cambridge

## Editorial pillars

1. Evals & Observability
2. Agents in Production
3. Inference & Serving
4. Reliability & Incidents
5. Cost & Performance

**Test for every piece:** "Would a senior AI engineer at Anthropic, OpenAI, or DeepMind forward this to their team?"

**What we don't cover:** vendor pitches, "future of AI" speculation, frontier model release coverage, founder profiles, idea-stage products, generic AI news.

## Voice

- Confident, specific, sourced, anti-hype
- Practitioner-first (engineers shipping, not "users")
- Words to use: practitioner, production, ship, eval, agent, runtime
- Words to avoid: disrupt, revolutionize, leverage (verb), state-of-the-art, "in this article we will explore"
- **Punctuation: never use em dashes (—), anywhere.** Use commas or
  parentheses for asides, and a period or colon to break clauses. Do not use
  en dashes (–) as a substitute; hyphens are only for ranges and compounds.

## Visual identity

The site theme is **light/minimalist** (Medium/Substack-style, easier on the eyes for long reads). Blink and the brand orange are unchanged; the UI accent is a darker shade of the same orange for WCAG-AA contrast on white.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | primary background |
| `--bg-2` | `#FAFAF9` | cards, surfaces (subtle warm off-white) |
| `--border` | `#E5E7EB` | dividers |
| `--text` | `#18181B` | headlines |
| `--text-2` | `#3F3F46` | body |
| `--text-3` | `#71717A` | captions, muted |
| `--accent` | `#EA580C` | UI accent, links, CTAs, tag borders (AA on white) |
| `--brand-orange` | `#FB923C` | Blink mascot (hardcoded in SVG); never use for UI text on white |

**Typography:** IBM Plex Mono for headers/brand/tags, Inter for body. Wordmark "the AI runtime" is lowercase except "AI", intentional.

**Color rule:** White + warm orange. No blue (too generic), no green (too "matrix"), no pastels (too consumer). Orange is used sparingly, links, CTAs, the Blink mascot. Most of the page is black-on-white.

## Blink rules

- Always capitalized: "Blink"
- Pronouns: "they" (default) or "he" (casual)
- Used liberally in social/community copy, sparingly in editorial pieces
- Never make Blink chat as a persona inside the publication
- Never call Blink "Blinky", softens the brand

## Architecture

The brand uses a **domain split**:

- `theairuntime.com` → **Substack Custom Domain.** The publication: `/`, `/p/*`, `/feed`, `/archive`, `/subscribe`. Substack serves all of this natively. SEO authority compounds on the publication.
- `events.theairuntime.com` → **Cloudflare Pages site (this repo).** The platform layer: meetups, speaker archive, resources library.

The Pages site is Astro + Cloudflare Pages. Content lives in `src/content/` as typed markdown (Zod schemas in `src/content/config.ts`). Routes are file-based in `src/pages/`:

- `/` → 302 to `/boston` (until the city list grows)
- `/boston`, `/<city>` → meetup hubs (one per city, easy to add)
- `/speakers`, `/speakers/<slug>` → cross-city speaker directory
- `/resources`, `/resources/<slug>` → ebooks/checklists/playbooks with lead-gate or paid CTAs
- `/about`, `/speak`, `/404` → static
- `functions/api/subscribe.ts` → Cloudflare Pages Function, capture leads, forward to Substack

## Multi-city expansion

When adding a new city, copy `src/pages/boston/` to `src/pages/<city>/`, change the city filter, and add `src/content/cities/<city>.md`. Speakers are already cross-city. ~30 minute task.

## Monetization slot

The `resources` collection already supports `status: 'coming-soon' | 'free' | 'lead-gated' | 'paid'` with `priceUsd` and `paymentLinkUrl`. Free PDFs live in `public/resources/`. Paid PDFs should go behind a Stripe/Gumroad/Lemon Squeezy payment link, with the actual file in private R2 storage (URL only emailed after purchase).

## What lives where

- **Boston meetup co-host:** Adam Chan (Luma co-host, not a publication co-founder)
- **Mentor:** Nitya (advisor, not co-founder)
- **Platform partner (current):** Hackersquad
- **Public Luma calendar (subscribe to all events):** https://luma.com/tair
- **Founder LinkedIn:** https://www.linkedin.com/in/kranthimanchikanti/
- **Contact:** info@theairuntime.com

## Things that NEVER change

- The name (The AI Runtime)
- The tagline (LEARN. SHIP. RUN.)
- Blink and the visual identity
- The editorial filter
- The audience (engineers shipping AI to production)
