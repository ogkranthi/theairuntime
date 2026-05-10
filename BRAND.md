# The AI Runtime — Brand Reference

A reference for anyone (human or AI) working on The AI Runtime. Covers palette, voice, mascot, architecture, and the multi-city expansion playbook. Inlined from the canonical brand doc.

## Quick facts

- **Brand:** The AI Runtime — publication and community for engineers shipping AI to production
- **Tagline:** LEARN. SHIP. RUN.
- **Domain:** theairuntime.com
- **Mascot:** Blink (running cursor character — orange rectangle, two eyes, smile, running legs)
- **Founder:** Kranthi Manchikanti (AI Architect at Microsoft, Boston)
- **Newsletter:** Substack at theairuntime.substack.com (root `/` redirects there)
- **In-person:** The AI Runtime — Boston, monthly in Cambridge

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

## Visual identity

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0A0A0B` | primary background |
| `--bg-2` | `#111113` | cards, surfaces |
| `--border` | `#27272A` | dividers |
| `--text` | `#FAFAFA` | headlines |
| `--text-2` | `#A1A1AA` | body |
| `--text-3` | `#71717A` | captions |
| `--accent` | `#FB923C` | Blink orange — CTAs, highlights |

**Typography:** IBM Plex Mono for headers/brand, Inter for body. Wordmark "the AI runtime" is lowercase except "AI" — intentional.

**Color rule:** Black + warm orange. No blue (too generic), no green (too "matrix"), no pastels (too consumer).

## Blink rules

- Always capitalized: "Blink"
- Pronouns: "they" (default) or "he" (casual)
- Used liberally in social/community copy, sparingly in editorial pieces
- Never make Blink chat as a persona inside the publication
- Never call Blink "Blinky" — softens the brand

## Architecture

This is an Astro + Cloudflare Pages site. Content lives in `src/content/` as typed markdown (Zod schemas in `src/content/config.ts`). Routes are file-based in `src/pages/`.

- Root `/` → 302 redirect to Substack via `public/_redirects` and `astro.config.mjs` redirects
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
