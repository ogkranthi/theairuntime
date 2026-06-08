#!/usr/bin/env python3
"""
Generate a NotebookLM "Deep Dive" audio overview for one piece of AI Runtime
content (a past talk, a reading-list entry, or a Substack issue) and save the
MP3 to public/audio/.

The site renders an <audio> player wherever an audio overview URL is set on
the corresponding content entry. After running this script you paste the
printed `audioOverviewUrl: ...` line into the matching frontmatter.

This script is a *build-time* tool. It runs on your laptop, not on
Cloudflare Pages, and depends on `notebooklm-py` which uses a logged-in
Google session under the hood. NotebookLM is unofficial; APIs can change.

USAGE
    # one-time setup
    pip install -r scripts/requirements.txt
    playwright install chromium
    notebooklm login

    # generate
    python scripts/notebooklm-overview.py speaker ray-liao
    python scripts/notebooklm-overview.py reading hamel-husain-field-guide
    python scripts/notebooklm-overview.py event boston/2026-05-11-agentic-architectures
    python scripts/notebooklm-overview.py substack https://theairuntime.com/p/some-issue --title "Some Issue"
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import yaml

try:
    from notebooklm import (
        NotebookLMClient,
        ArtifactTimeoutError,
        ArtifactDownloadError,
        AudioFormat,
        AudioLength,
    )
except ImportError:
    sys.stderr.write(
        "notebooklm-py is not installed.\n"
        "Run:  pip install -r scripts/requirements.txt && playwright install chromium && notebooklm login\n"
    )
    sys.exit(1)


ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src" / "content"
PUBLIC_AUDIO = ROOT / "public" / "audio"


# ---------- AI Runtime house voice ----------

# Default host instructions come from the shared brand module so audio and text
# enrichment stay in one voice (see scripts/brand.py and BRAND.md). Override per
# run with --instructions.
from brand import audio_instructions

DEFAULT_INSTRUCTIONS = audio_instructions()

# CLI value -> NotebookLM enum. NotebookLM offers four conversational formats;
# CRITIQUE and DEBATE pressure-test claims instead of two hosts agreeing,
# which suits an anti-hype brand for opinionated pieces.
AUDIO_FORMATS = {
    "deep-dive": AudioFormat.DEEP_DIVE,
    "brief": AudioFormat.BRIEF,
    "critique": AudioFormat.CRITIQUE,
    "debate": AudioFormat.DEBATE,
}
AUDIO_LENGTHS = {
    "short": AudioLength.SHORT,
    "default": AudioLength.DEFAULT,
    "long": AudioLength.LONG,
}


# ---------- frontmatter loading ----------

FRONTMATTER_RE = re.compile(r"^---\n(.*?\n)---\n", re.DOTALL)


def load_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise ValueError(f"No frontmatter found in {path}")
    return yaml.safe_load(match.group(1)) or {}


# ---------- source resolution ----------

@dataclass
class Job:
    notebook_name: str
    output_path: Path
    url_sources: list[str]
    text_sources: list[tuple[str, str]]  # (title, body)
    suggested_frontmatter_path: Path | None
    suggested_frontmatter_field: str  # e.g. "audioOverviewUrl" or "talks[0].audioOverviewUrl"


def resolve_speaker(slug: str) -> Job:
    """Generate one overview per (speaker, talk). Pick the first talk by default."""
    path = CONTENT / "speakers" / f"{slug}.md"
    if not path.exists():
        raise SystemExit(f"Speaker not found: {path}")
    data = load_frontmatter(path)
    talks = data.get("talks") or []
    if not talks:
        raise SystemExit(f"Speaker {slug} has no talks to summarize")

    talk = talks[0]
    event_slug = talk["eventSlug"]
    title = talk["title"]
    abstract = talk.get("abstract", "")

    url_sources: list[str] = []
    if talk.get("slidesUrl") and talk["slidesUrl"].startswith("http"):
        url_sources.append(talk["slidesUrl"])
    if talk.get("recordingUrl"):
        url_sources.append(talk["recordingUrl"])

    text_sources = [(f"{title} — abstract", abstract)] if abstract else []

    return Job(
        notebook_name=f"The AI Runtime · {data['name']} — {title}",
        output_path=PUBLIC_AUDIO / f"talk-{event_slug}-{slug}.mp3",
        url_sources=url_sources,
        text_sources=text_sources,
        suggested_frontmatter_path=path,
        suggested_frontmatter_field=f"talks[0].audioOverviewUrl",
    )


def resolve_reading(slug: str) -> Job:
    path = CONTENT / "reading" / f"{slug}.md"
    if not path.exists():
        raise SystemExit(f"Reading entry not found: {path}")
    data = load_frontmatter(path)
    url = data["url"]
    return Job(
        notebook_name=f"The AI Runtime · {data['title']}",
        output_path=PUBLIC_AUDIO / f"reading-{slug}.mp3",
        url_sources=[url],
        text_sources=[],
        suggested_frontmatter_path=path,
        suggested_frontmatter_field="audioOverviewUrl",
    )


def resolve_event(rel_slug: str) -> Job:
    """rel_slug is e.g. 'boston/2026-05-11-agentic-architectures'."""
    path = CONTENT / "events" / f"{rel_slug}.md"
    if not path.exists():
        raise SystemExit(f"Event not found: {path}")
    data = load_frontmatter(path)
    title = data["title"]
    description = data.get("description", "")

    url_sources: list[str] = []
    if data.get("slidesUrl"):
        url_sources.append(data["slidesUrl"])
    if data.get("recordingUrl"):
        url_sources.append(data["recordingUrl"])

    text_sources = [(f"{title} — description", description)] if description else []

    flat_slug = rel_slug.replace("/", "-")
    return Job(
        notebook_name=f"The AI Runtime · {title}",
        output_path=PUBLIC_AUDIO / f"event-{flat_slug}.mp3",
        url_sources=url_sources,
        text_sources=text_sources,
        suggested_frontmatter_path=path,
        suggested_frontmatter_field="audioOverviewUrl",
    )


def resolve_substack(url: str, title: str | None) -> Job:
    # Derive a slug from the URL (last path segment of /p/<slug>).
    m = re.search(r"/p/([^/?#]+)", url)
    if not m:
        raise SystemExit(f"Could not derive a slug from Substack URL: {url}")
    slug = m.group(1)
    return Job(
        notebook_name=f"The AI Runtime · {title or slug}",
        output_path=PUBLIC_AUDIO / f"substack-{slug}.mp3",
        url_sources=[url],
        text_sources=[],
        suggested_frontmatter_path=ROOT / "src" / "data" / "substack-overlays.json",
        suggested_frontmatter_field=f'"{url}": {{ "audioOverviewUrl": "/audio/substack-{slug}.mp3" }}',
    )


# ---------- generation ----------

async def generate(
    job: Job,
    *,
    instructions: str,
    audio_format: AudioFormat,
    audio_length: AudioLength,
) -> None:
    print(f"→ Notebook: {job.notebook_name}")
    print(f"→ Sources : {len(job.url_sources)} URL(s), {len(job.text_sources)} text snippet(s)")
    print(f"→ Format  : {audio_format.name} / {audio_length.name}")
    print(f"→ Output  : {job.output_path.relative_to(ROOT)}")

    async with NotebookLMClient.from_storage() as client:
        nb = await client.notebooks.create(job.notebook_name)

        for url in job.url_sources:
            print(f"   + URL: {url}")
            await client.sources.add_url(nb.id, url, wait=True)

        for title, body in job.text_sources:
            print(f"   + Text: {title}")
            # add_text(notebook_id, title, content, *, wait=...) in notebooklm-py 0.7.x
            await client.sources.add_text(nb.id, title, body, wait=True)

        print("→ Generating audio overview in The AI Runtime voice…")
        status = await client.artifacts.generate_audio(
            nb.id,
            instructions=instructions,
            audio_format=audio_format,
            audio_length=audio_length,
        )

        try:
            await client.artifacts.wait_for_completion(nb.id, status.task_id, timeout=900)
        except ArtifactTimeoutError:
            raise SystemExit("NotebookLM took longer than 15 minutes. Try again later.")

        job.output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            await client.artifacts.download_audio(nb.id, str(job.output_path))
        except ArtifactDownloadError as exc:
            raise SystemExit(f"Download failed: {exc}")

    print(f"✓ Saved {job.output_path.relative_to(ROOT)}")

    rel_url = "/" + str(job.output_path.relative_to(ROOT / "public")).replace("\\", "/")
    print()
    print("Next step: add the audio URL to your content.")
    print(f"  file : {job.suggested_frontmatter_path.relative_to(ROOT)}")
    if job.suggested_frontmatter_path.suffix == ".json":
        # The substack overlays file takes a full JSON entry (already includes
        # the URL), so print it as-is rather than as a `field: value` line.
        print(f"  entry: {job.suggested_frontmatter_field}")
    else:
        print(f"  field: {job.suggested_frontmatter_field}: {rel_url}")


# ---------- CLI ----------

def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)

    # Audio-shaping flags shared by every subcommand. Defaults render the
    # branded AI Runtime Deep Dive; override per run as needed.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--format", dest="audio_format", choices=list(AUDIO_FORMATS), default="deep-dive",
        help="NotebookLM audio format (default: deep-dive). critique/debate pressure-test claims.",
    )
    common.add_argument(
        "--length", dest="audio_length", choices=list(AUDIO_LENGTHS), default="default",
        help="Audio length (default: default). short suits a newsletter issue, long a field guide.",
    )
    common.add_argument(
        "--instructions", default=None,
        help="Override the branded host instructions with custom text for this run.",
    )

    sub = p.add_subparsers(dest="kind", required=True)

    sp = sub.add_parser("speaker", parents=[common], help="Generate overview for a past talk")
    sp.add_argument("slug", help="Speaker slug, e.g. ray-liao")

    rd = sub.add_parser("reading", parents=[common], help="Generate overview for a reading-list entry")
    rd.add_argument("slug", help="Reading slug, e.g. hamel-husain-field-guide")

    ev = sub.add_parser("event", parents=[common], help="Generate overview for an event (city/slug)")
    ev.add_argument("rel_slug", help="e.g. boston/2026-05-11-agentic-architectures")

    ss = sub.add_parser("substack", parents=[common], help="Generate overview for a Substack issue URL")
    ss.add_argument("url")
    ss.add_argument("--title", default=None)

    return p.parse_args(argv)


def main() -> None:
    args = parse_args()
    if args.kind == "speaker":
        job = resolve_speaker(args.slug)
    elif args.kind == "reading":
        job = resolve_reading(args.slug)
    elif args.kind == "event":
        job = resolve_event(args.rel_slug)
    elif args.kind == "substack":
        job = resolve_substack(args.url, args.title)
    else:
        raise SystemExit(f"Unknown kind: {args.kind}")

    if not job.url_sources and not job.text_sources:
        raise SystemExit(
            "No usable sources found on this entry. Add a slidesUrl, "
            "recordingUrl, abstract, or description and retry."
        )

    asyncio.run(
        generate(
            job,
            instructions=args.instructions or DEFAULT_INSTRUCTIONS,
            audio_format=AUDIO_FORMATS[args.audio_format],
            audio_length=AUDIO_LENGTHS[args.audio_length],
        )
    )


if __name__ == "__main__":
    main()
