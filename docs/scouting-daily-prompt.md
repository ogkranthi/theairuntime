# Daily Content Scouting Prompt

Run this each day to surface new entries for the reading list, tools list, and signal queue.

## Context

You are scouting content for The AI Runtime, a practitioner-first publication and community
for engineers shipping AI to production. Everything added must clear the editorial filter below.

**Editorial pillars (every entry must match exactly one):**
- `evals` - Evals and Observability
- `agents` - Agents in Production
- `inference` - Inference and Serving
- `reliability` - Reliability and Incidents
- `cost` - Cost and Performance

**Hard filter (reject anything that fails any of these):**
- Written by someone who has shipped the thing, not a journalist or analyst covering it
- Concrete: includes data, architecture decisions, code, or incident specifics
- No vendor pitches, sponsored posts, or product announcements dressed as tutorials
- No "future of AI" speculation or frontier model release coverage
- No founder profiles, no idea-stage products, no generic AI news
- Bar: "Would a senior AI engineer at Anthropic, OpenAI, or DeepMind forward this to their team?"

**Voice rules (apply to every summary you write):**
- Never use em dashes. Use commas or parentheses for asides; period or colon between clauses.
- No hype words: disrupt, revolutionize, leverage (verb), state-of-the-art.
- Practitioner-first: write for engineers, not executives.

## Step 1: Scout the reading list (target 2-4 entries)

Search for articles, blog posts, and papers published in the past 7 days that clear the filter.

Good sources to check:
- Anthropic engineering blog (anthropic.com/engineering)
- Eugene Yan (eugeneyan.com)
- Simon Willison (simonwillison.net)
- Hamel Husain (hamel.dev)
- Lilian Weng (lilianweng.github.io)
- Chip Huyen (huyenchip.com)
- The AI Runtime Substack (theairuntime.com)
- Hacker News (news.ycombinator.com) - filter for Show HN or top AI engineering posts
- arXiv cs.AI / cs.LG - applied/systems papers only, not theoretical
- MLSys, NeurIPS, ICML proceedings if recent

For each candidate that passes the filter, draft a file at:
`src/content/reading/<slug>.md`

Use this frontmatter schema exactly:
```yaml
---
title: <title>
url: <full URL>
source: <author name or org name>
author: <author name, if different from source>
pillar: <evals|agents|inference|reliability|cost>
tags: [<2-4 lowercase tags>]
summary: |
  <3-5 sentences. Practitioner voice. What it covers, why it matters,
  what the reader will be able to do after reading it. No em dashes.>
publishedAt: <YYYY-MM-DD>
addedAt: <today's date YYYY-MM-DD>
relatedEvents: []
relatedSpeakers: []
highlight: false
---
```

Leave the body empty (no content below the frontmatter). The summary in the frontmatter
is what the site renders.

## Step 2: Scout the tools list (target 0-2 entries)

Search for AI engineering tools released or significantly updated in the past 7 days.

Only add a tool if:
- It is production-ready or open-beta with public docs
- It solves a concrete problem in one of the five pillars
- The team has actually used it or there is strong practitioner signal on it

For each candidate, draft a file at `src/content/tools/<slug>.md`:

```yaml
---
name: <Tool Name>
url: <homepage or docs URL>
category: <productivity|coding|writing|design|agents|evals|infra|observability|other>
pillar: <evals|agents|inference|reliability|cost>
tagline: <one sentence, no em dashes>
why: |
  <2-4 sentences. What problem it solves. Why it is worth the switch cost.
  Practitioner-first. No marketing language.>
isReferral: false
featured: false
addedAt: <today's date YYYY-MM-DD>
---
```

## Step 3: Log your run

Append one row to `data/worklog.md`:

```
| <YYYY-MM-DD> | daily-scout | - | staged | <N reading, N tools drafted; brief note on quality> |
```

If nothing passes the filter today, log that too:
```
| <YYYY-MM-DD> | daily-scout | - | nothing-staged | <brief note on why nothing cleared the bar> |
```

## Step 4 (optional): Signal queue

If you encountered a sharp, unresolved practitioner debate this week (not a solved problem,
not speculation), draft a note at `data/review-queue/signal-<YYYY-MM-DD>.md`:

```markdown
# Signal candidate: <date>

**Question:** <the live debate, one sentence>
**Where it surfaced:** <HN thread, Twitter/X, Discord, etc.>
**Why it fits signal:** <one sentence connecting it to a pillar and the community>
**Candidate answer:** <optional rough answer if you can sketch one>
**Reads to attach:** <URLs>
```

The signal collection is monthly, so this queues up for the next `src/content/signal/YYYY-MM.md`.
Do not write the signal entry directly; it requires editorial judgment.
