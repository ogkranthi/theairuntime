# Scouting Daily Prompt

Run this workflow each day to surface new reading-list entries, speaker candidates, and topic signals for The AI Runtime.

## 0. Setup

- Today's date: read from `currentDate` in the system context.
- Upcoming events: read `data/spine.json` for the next scheduled event and its pillars.
- Existing reading: scan `src/content/reading/` slugs to avoid duplicates.
- Existing speakers: scan `src/content/speakers/` slugs.

## 1. Reading Candidates

Search for recently published (last 30 days) practitioner-written content on each editorial pillar:

| Pillar | Representative search queries |
|---|---|
| Agents in Production | "AI agents production 2026" OR "agentic workflow shipped" OR "multi-agent system production" |
| Evals and Observability | "LLM evaluation production" OR "AI observability engineering" OR "evals framework shipped" |
| Inference and Serving | "LLM inference optimization" OR "model serving latency" OR "speculative decoding production" |
| Reliability and Incidents | "LLM reliability production" OR "AI incident post-mortem" OR "guardrails production" |
| Cost and Performance | "LLM cost optimization 2026" OR "AI inference cost reduction" OR "token efficiency production" |

Run at least two queries per pillar. Scan titles and skim abstracts or introductions.

### Editorial filter (apply before adding any entry)

Require ALL of:
- Written by a practitioner (engineer, researcher) not a vendor marketing team
- Grounded in production experience: actual numbers, incidents, or architecture decisions
- Specific and concrete (not "AI will change everything")
- Passes the senior-engineer forward test: "Would a senior AI engineer at Anthropic, OpenAI, or DeepMind forward this to their team?"

Reject any of:
- Vendor pitches or product announcements
- "Future of AI" speculation
- Frontier model release coverage (new GPT-X, Claude Y, etc.)
- Founder profiles without technical depth
- Idea-stage product coverage
- Content already in `src/content/reading/`

## 2. Speaker Candidates

Search for engineers who:
- Work at a company shipping AI to production (not idea-stage)
- Have presented at a conference (NeurIPS, MLSys, Ray Summit, QCon AI, Strange Loop, AI Engineer Summit) or written a detailed technical blog post in the last 12 months
- Are based in or willing to travel to an AI Runtime city (Boston first; NYC and SF later)

Good signal sources: conference talk abstracts, GitHub bios and READMEs, detailed LinkedIn posts about production AI, Hacker News "Show HN" for production AI tools.

### Speaker filter

Require ALL of:
- Specific technical content, not a pitch
- Production deployment in the last 12 months
- Matches at least one editorial pillar

Reject: C-suite "thought leaders", pure researchers with no production work, vendor developer advocates.

## 3. Topic Signals

Note topics that appear in 2 or more independent sources this session. Record them as topic signals. They feed into the F3 patterns loop.

Strong signal topics are: specific techniques or failure modes that multiple practitioners are independently solving, not vendor-driven narratives.

## 4. Output

### Reading entries

Write one file per approved candidate to `data/review-queue/scouting/YYYY-MM-DD-<slug>.md`:

```
---
type: reading_candidate
title: <title>
url: <url>
author: <author name>
source: <publication or company blog>
pillar: <agents|evals|inference|reliability|cost>
tags: [tag1, tag2]
why_it_fits: <one sentence, practitioner angle, no em dashes>
status: pending_review
scouted_at: <YYYY-MM-DD>
---
```

If approved later, the entry moves to `src/content/reading/<slug>.md` with the full schema (title, url, source, author, pillar, tags, summary, publishedAt, addedAt).

### Speaker candidates

Append one JSON line per candidate to `data/review-queue/scouting/speaker-candidates.jsonl`:

```json
{"name": "Full Name", "title": "Role", "company": "Company", "city": "City", "pillar": "pillar-slug", "signal_url": "https://...", "why": "One sentence, no em dashes", "scouted_at": "YYYY-MM-DD"}
```

### Topic signals

Append one JSON line per topic to `data/review-queue/scouting/topic-signals.jsonl`:

```json
{"topic": "Short topic label", "pillar": "pillar-slug", "source_urls": ["https://...", "https://..."], "observation": "One sentence, no em dashes", "scouted_at": "YYYY-MM-DD"}
```

## 5. Commit and push

After writing all outputs:

```bash
git add docs/scouting-daily-prompt.md data/review-queue/scouting/
git commit -m "scout: YYYY-MM-DD reading and speaker candidates"
git push -u origin <branch>
```

## Anti-hype checklist

Run before writing any output entry:

- [ ] Practitioner-written, not marketing copy
- [ ] Specific claims backed by numbers or concrete examples
- [ ] No em dashes (—) anywhere in the output; no en dashes (–) either
- [ ] No banned words: disrupt, revolutionize, leverage (verb), state-of-the-art, "in this article we will explore"
- [ ] Not a vendor pitch or product launch announcement
- [ ] Not already in `src/content/reading/` or `src/content/speakers/`
