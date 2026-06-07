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

### What "Deep Dive" means

NotebookLM generates a two-host conversational audio overview. The script
passes a fixed `instructions` block that asks for a practitioner-aimed
discussion — concrete lessons, anti-hype. Edit the script if you want a
different voice.
