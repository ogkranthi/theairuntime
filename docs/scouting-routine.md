# Scouting Routine: Speakers, Collaborators, and Reach

A repeatable routine for finding the right people across YouTube, LinkedIn,
Twitter/X, and Reddit, then turning them into speakers, collaborators, or
people who amplify what The AI Runtime is building.

This routine is run by an AI assistant (Claude) using the AIBMM Amplifiers
MCP tools. It is written so a human can also follow it by hand. It produces a
scored prospect list that maps directly onto `src/content/speakers/*.md`.

## 1. Who we are looking for

The AI Runtime is for engineers shipping AI to production. Every prospect is
scored against the same filter we use for content:

> Would a senior AI engineer at Anthropic, OpenAI, or DeepMind forward this
> person's work to their team?

Three tracks, one routine:

| Track | Definition | Primary outcome |
|---|---|---|
| **Speaker** | Practitioner with a concrete production story to tell | Boston meetup invite (in-person) if geo score = 2; podcast guest if geo score 0-1 |
| **Podcast** | Strong practitioner voice, not Boston-local, best served remote | Record a practitioner episode for the publication |
| **Collaborator** | Runs a community, newsletter, or event in the same space | Cross-promo, co-hosted event, guest swap |
| **Amplifier** | Has reach with our exact audience and would share us | Newsletter mention, repost, Luma cross-post |

A single person can fit more than one track. Tag all that apply. The geo score (see section 4) drives which speaker ask to make: Boston/Cambridge area gets a meetup invite; everyone else gets a podcast ask. Never send a meetup invite to someone outside the Boston area.

### Editorial fit (must pass)

Look for people whose public work is about one of the three pillars:

1. Model Reliability Engineering for AI
2. Vertical Agents
3. Lessons from the Trenches for AI

### Auto-reject signals

Skip anyone whose public output is mostly: vendor pitches, "future of AI"
speculation, frontier model release reactions, founder profiles, idea-stage
products, or generic AI news. These are the same exclusions as the editorial
filter in `BRAND.md`.

## 2. Search vocabulary

Reuse these phrase banks across every platform. Combine a pillar phrase with a
production-signal phrase for the highest-signal queries.

**Pillar phrases:** model reliability engineering, LLM reliability, agent
reliability, hallucination guardrails, LLM incident, agent postmortem, eval
harness, agent observability, LLM tracing, vertical AI agent, domain-specific
agent, agents in production, multi-agent systems, tool calling reliability,
context engineering, harness engineering, RAG in production, what we shipped,
lessons from the trenches.

**Production-signal phrases:** at scale, in production, postmortem, we
shipped, lessons learned, runbook, on-call, we migrated, cut our cost, p99
latency, war story, what broke.

**Negative filters (de-prioritize):** "ultimate guide", "10x", "the future
of", "is dead", "changes everything", course, cohort, waitlist.

## 3. Per-platform procedure

All tool calls go through the Amplifiers MCP server. Discover the exact tool
with `find_amplifiers({ intent, kind: 'tool' })`, then call it via `run_tool`.
Tool slugs below are the current catalog names.

### Seed with web search

Before hitting any platform, build a candidate name list with grounded search
so you are not guessing handles.

- `search_web_grounded` and `search_google` with `<pillar phrase> + <signal>`,
  e.g. `"agent observability" "in production"`.
- Use operators: `site:youtube.com`, `site:linkedin.com/in`,
  `site:reddit.com`, `filetype:pdf "postmortem" LLM`.
- Capture every named person or org into the prospect table as `status: lead`.

### YouTube

Goal: find practitioners giving real conference or meetup talks, not
explainer channels.

1. From seed search, collect talk URLs (KubeCon, Ray Summit, MLOps, AI
   Engineer, PyData, vendor user-conf talks).
2. `get_youtube_channel_details` (pass one of handle / channelId / url) to read
   subscriber count, linked socials, and country (Boston-area is a bonus for
   in-person).
3. `get_youtube_transcript` on their top talk. Skim for production specifics:
   numbers, incidents, architecture decisions. Generic = reject.
4. `get_youtube_comments` to gauge whether a technical audience engages
   (peers asking sharp questions is a strong speaker signal).

### LinkedIn

Goal: confirm role, employer, and that they post about real work. This is the
best track for booking speakers and for collaborator intros.

1. `get_linkedin_person_profile` on each seed name: read title, current
   company, recent posts, and articles. Confirm they are a practitioner
   (engineer, ML/infra/platform lead), not a pure evangelist.
2. `get_linkedin_company` on communities, dev-tool companies, and labs in our
   space to find their people and posting cadence.
3. `list_linkedin_company_posts` on peer communities and newsletters to spot
   active collaborators and what is resonating with our audience right now.
4. Pull the canonical LinkedIn URL into the prospect's `social.linkedin`.

### Twitter / X

Goal: judge reach and current relevance, and find amplifiers.

1. `get_twitter_profile` for bio, follower count, verified status, location.
2. `list_twitter_user_tweets` (returns ~100 most-popular tweets) to read what
   actually lands for them. Look for production threads and eval/agent/infra
   takes, not hot takes on model launches.
3. High followers + on-topic popular tweets = Amplifier track. Add to
   `social.twitter`.

### Reddit

Goal: find where the audience already gathers, and surface practitioners
answering hard questions.

1. `get_reddit_subreddit_details` on candidate subs: r/LocalLLaMA, r/MLOps,
   r/MachineLearning, r/LLMDevs, r/devops, r/ExperiencedDevs. Note subscriber
   and active counts and rules (some forbid promo).
2. `list_reddit_subreddit_posts` sorted `top` over `month`/`year`, filtered to
   our pillar phrases. Identify recurring expert authors.
3. Authors who consistently give detailed, sourced production answers are
   Speaker or Collaborator leads. Reddit handles rarely map to real names, so
   cross-reference back through web search before outreach.

## 4. Scoring

Score every prospect 0-2 on each axis, total out of 10. Work the list in
descending order.

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| **Pillar fit** | Off-topic | Adjacent | Dead-center on a pillar |
| **Production proof** | Theory only | Some real work | Concrete shipped story with numbers |
| **Reach** | Tiny | Modest | Large, on-audience following |
| **Reachability** | No public contact | Indirect | Open DMs or public contact |
| **Geo (in-person bonus)** | Remote-only fit | Travels | Boston / Cambridge area |

- **8-10:** prioritize now. Speaker invite (Boston meetup if geo = 2, podcast if geo 0-1) or direct collab ask.
- **5-7:** nurture. Engage publicly first, then reach out.
- **<5:** archive unless a specific event theme needs them.

Geo score also sets the outreach template: score 2 = meetup invite; score 0-1 = podcast guest ask.

## 5. Output format

Append results to `docs/prospects.csv` (create on first run). One row per
person. Columns:

```
name,track,pillar,role,company,score,linkedin,twitter,youtube,reddit,source_url,notes,status
```

`track` is one or more of `speaker|podcast|collaborator|amplifier`. `status` moves
through `lead -> verified -> contacted -> responded -> booked|passed`.

When a prospect reaches `booked` as a speaker, create
`src/content/speakers/<slug>.md` from the row (name, title, company, the
`social` block) following `README.md`.

## 6. Outreach templates

Brand voice: confident, specific, sourced, anti-hype. No em dashes. Reference
the person's actual work in the first line. Subscribe link is always
`https://theairuntime.com/subscribe`. Public Luma calendar:
`https://luma.com/tair`.

### Speaker invite (Boston/Cambridge area only, geo score = 2)

> Hi {name}, your {talk/post on <specific topic>} is exactly the kind of
> production story The AI Runtime exists for. We run a monthly Boston meetup
> for engineers shipping AI to production (pillars: evals, agents, inference,
> reliability, cost). Would you give a 20-25 minute talk on {topic}? Happy to
> work around your schedule. Calendar: https://luma.com/tair

### Podcast guest (non-Boston, geo score 0-1)

> Hi {name}, your {talk/post on <specific topic>} is exactly the kind of
> production story The AI Runtime exists for. We publish practitioner-first
> content for engineers shipping AI to production. Would you be up for a
> recorded conversation on {topic}? We keep it specific and grounded: what you
> built, what broke, and what you would do differently. No hype, no slides.
> Subscribe link if you want context first: https://theairuntime.com/subscribe

### Collaborator

> Hi {name}, we both serve engineers shipping AI to production. The AI Runtime
> is a publication plus a Boston meetup ({pillars}). I would love to explore a
> cross-post or a co-hosted session with {their community/newsletter}. Open to
> a quick call?

### Amplifier

> Hi {name}, I read your {tweet/post} on {topic}. We just published {asset} at
> The AI Runtime, written for the same practitioner audience you reach. If it
> is useful to your readers, a share would mean a lot. Either way, keep up the
> {specific} work.

## 7. Cadence and hygiene (never repeat content)

- Start every run by reading `docs/prospects.csv` and the existing
  `src/content/speakers/*.md`. Build a seen-set of normalized names (lowercase,
  trimmed) and of every `source_url`. Anyone in that set is off limits: do not
  re-add them and do not re-draft outreach for them.
- Dedupe key is name OR source_url. If either already exists, skip the hit.
- For recurring runs, bias toward fresh material: set `freshness=week` (web),
  `date_posted=last-week` (Google), `uploadDate=this_week` (YouTube), and
  rotate the search vocabulary so you are not re-mining the same queries.
- Cap outreach drafts at the top 3 NEW rows per run. Never auto-send. The
  routine drafts; a human reviews and sends.
- Respect each platform's rules (some subreddits forbid promotion). When a
  source is community-run, lead with value, not a pitch.
- Log each run as a `# Run <date>` comment above its appended rows.

## 8. Running it on demand

Ask Claude: "Run the scouting routine for the {pillar} pillar." Claude seeds
with web search, works each platform with the tools above, scores, and appends
net-new rows to `docs/prospects.csv` with drafted outreach for the top
prospects. Narrow by pillar, city, or track to keep runs focused.

## 9. Scheduling (daily at 7 AM)

The exact prompt for an unattended run lives in `docs/scouting-daily-prompt.md`.
It runs all three pillars, dedupes against the ledger, and appends only
net-new prospects.

Web sessions run in an ephemeral container that is reclaimed after inactivity,
so an in-session loop will not survive until the next morning. Use a scheduled
trigger instead:

1. In the Claude Code web app, open this repo's environment and create a
   Scheduled session (trigger). Docs:
   https://code.claude.com/docs/en/claude-code-on-the-web
2. Cadence: daily at 07:00 America/New_York (Boston). Adjust the timezone if
   the operator is elsewhere.
3. Branch: `claude/elegant-noether-Qhlxg`.
4. Prompt: paste the body of `docs/scouting-daily-prompt.md` (or simply
   "Follow docs/scouting-daily-prompt.md").

The scheduled run commits and pushes its additions and posts a summary with the
top 3 drafts. Because every run reads the ledger first and dedupes on name and
source_url, content never repeats across days.
