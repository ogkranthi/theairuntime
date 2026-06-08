#!/usr/bin/env python3
"""
Draft AI Runtime content fields with the Claude API, in the house voice.

Right now this drafts the `summary` for a reading-list entry from its source
URL. It mirrors notebooklm-overview.py: it does NOT write the file. It prints
the frontmatter line for you to review and paste, so a human stays in the loop.

This is a *build-time* tool. It runs on your laptop, not on Cloudflare Pages.

USAGE
    # one-time setup
    pip install -r scripts/requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...

    # draft a reading-list summary from the entry's source URL
    python scripts/ai-enrich.py reading hamel-husain-field-guide

    # use a cheaper/faster model, or a different one
    python scripts/ai-enrich.py reading some-slug --model claude-sonnet-4-6
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Sequence

import yaml

try:
    import httpx
    from anthropic import Anthropic
except ImportError:
    sys.stderr.write(
        "Missing dependencies.\n"
        "Run:  pip install -r scripts/requirements.txt\n"
    )
    sys.exit(1)

from brand import summary_system_prompt

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src" / "content"

# Default to the most capable model. Override per run with --model. Note:
# Opus 4.8 rejects temperature/top_p/budget_tokens, so we pass none of them.
DEFAULT_MODEL = "claude-opus-4-8"

# Cap the article text we send, both for cost and to stay well under context.
MAX_SOURCE_CHARS = 40_000


# ---------- frontmatter ----------

FRONTMATTER_RE = re.compile(r"^---\n(.*?\n)---\n", re.DOTALL)


def load_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise SystemExit(f"No frontmatter found in {path}")
    return yaml.safe_load(match.group(1)) or {}


# ---------- source fetching ----------

def fetch_text(url: str) -> str:
    """Fetch a URL and return a rough plain-text rendering of the body."""
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=20.0,
                         headers={"user-agent": "theairuntime-ai-enrich/1.0"})
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise SystemExit(f"Could not fetch {url}: {exc}")

    html = resp.text
    # Drop script/style blocks, then strip tags and collapse whitespace.
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        raise SystemExit(f"No readable text found at {url}")
    return text[:MAX_SOURCE_CHARS]


# ---------- drafting ----------

def draft_summary(client: Anthropic, model: str, *, title: str, source: str,
                  url: str, body: str) -> str:
    user = (
        f"Draft the summary for this reading-list entry.\n"
        f"Title: {title}\n"
        f"Source: {source}\n"
        f"URL: {url}\n\n"
        f"Article text follows:\n\n{body}"
    )
    message = client.messages.create(
        model=model,
        max_tokens=512,
        system=summary_system_prompt(),
        messages=[{"role": "user", "content": user}],
    )
    parts = [b.text for b in message.content if b.type == "text"]
    summary = " ".join(parts).strip()
    if not summary:
        raise SystemExit("Model returned no text. Try again or use --model.")
    return summary


# ---------- commands ----------

def cmd_reading(client: Anthropic, model: str, slug: str) -> None:
    path = CONTENT / "reading" / f"{slug}.md"
    if not path.exists():
        raise SystemExit(f"Reading entry not found: {path}")
    data = load_frontmatter(path)
    url = data.get("url")
    if not url:
        raise SystemExit(f"Reading entry {slug} has no `url` to summarize")

    print(f"→ Entry : {slug}")
    print(f"→ Source: {url}")
    print("→ Fetching source and drafting summary in The AI Runtime voice…")

    body = fetch_text(url)
    summary = draft_summary(
        client, model,
        title=data.get("title", slug),
        source=data.get("source", ""),
        url=url,
        body=body,
    )

    if "—" in summary:
        # Brand hard rule: no em dashes. Flag rather than silently rewrite.
        print("! Warning: draft contains an em dash. Edit it out before pasting.")

    print()
    print("Draft summary (review, then paste into the frontmatter):")
    print(f"  file : {path.relative_to(ROOT)}")
    print()
    # Emit a ready-to-paste YAML block scalar so quoting never bites.
    print("  summary: >-")
    for line in _wrap(summary, 76):
        print(f"    {line}")


def _wrap(text: str, width: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


# ---------- CLI ----------

def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model", default=DEFAULT_MODEL,
                   help=f"Claude model id (default: {DEFAULT_MODEL})")
    sub = p.add_subparsers(dest="kind", required=True)
    rd = sub.add_parser("reading", help="Draft a reading-list entry summary")
    rd.add_argument("slug", help="Reading slug, e.g. hamel-husain-field-guide")
    return p.parse_args(argv)


def main() -> None:
    args = parse_args()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("Set ANTHROPIC_API_KEY first:  export ANTHROPIC_API_KEY=sk-ant-...")
    client = Anthropic()
    if args.kind == "reading":
        cmd_reading(client, args.model, args.slug)
    else:
        raise SystemExit(f"Unknown command: {args.kind}")


if __name__ == "__main__":
    main()
