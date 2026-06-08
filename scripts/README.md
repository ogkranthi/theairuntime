# scripts/

Local build-time tooling for the AI Runtime events site. Nothing here runs
on Cloudflare Pages — these are scripts you run on your laptop to generate
content that you then commit.

## `notebooklm-overview.py`

Generates a NotebookLM "Deep Dive" audio overview for one piece of content
and saves the MP3 to `public/audio/`. Uses
[`notebooklm-py`](https://github.com/teng-lin/notebooklm-py), an
**unofficial** wrapper around Google NotebookLM. APIs can break without
notice — this is a personal-use / prototype tool, not a CI integration.

### Setup (one-time)

```bash
pip install -r scripts/requirements.txt
playwright install chromium
notebooklm login          # opens a browser, log in with your Google account
```

### Usage

```bash
# Past talk by a speaker (picks the speaker's first talk)
python scripts/notebooklm-overview.py speaker ray-liao

# Reading-list entry
python scripts/notebooklm-overview.py reading hamel-husain-field-guide

# Full event (city/slug)
python scripts/notebooklm-overview.py event boston/2026-05-11-agentic-architectures

# Substack issue
python scripts/notebooklm-overview.py substack https://theairuntime.com/p/some-issue --title "Some Issue"
```

The MP3 lands in `public/audio/`. The script prints the line to paste into
the matching content frontmatter so the site renders an `<audio>` player.
For Substack posts, the script prints a JSON entry to add to
`src/data/substack-overlays.json`.

### Shaping the audio (flags, all subcommands)

Every subcommand accepts the same audio-shaping flags. The defaults render
the branded AI Runtime Deep Dive, so you rarely need them:

```bash
# A short, opinionated take that pressure-tests the piece's claims
python scripts/notebooklm-overview.py reading some-slug --format critique --length short

# A long-form deep dive (good for a field guide)
python scripts/notebooklm-overview.py substack <url> --title "..." --length long

# Override the host instructions entirely for one run
python scripts/notebooklm-overview.py event boston/some-event --instructions "..."
```

- `--format`: `deep-dive` (default), `brief`, `critique`, `debate`.
  `critique` and `debate` pressure-test claims instead of two hosts agreeing,
  which fits an anti-hype brand for opinionated pieces.
- `--length`: `short`, `default`, `long`.
- `--instructions`: replace the branded host instructions for this run only.

### The AI Runtime voice

By default the script passes a branded `instructions` block (see
`DEFAULT_INSTRUCTIONS` in the script) that asks for The AI Runtime voice:
confident, specific, sourced, anti-hype, practitioner-first, framed around the
three editorial pillars (Vertical AI Agents, Model Reliability Engineering,
Lessons from the Trenches in AI), and closing with a pointer to
theairuntime.com. Edit that constant to evolve the house voice, or pass
`--instructions` for a one-off.
