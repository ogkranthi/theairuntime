#!/usr/bin/env python3
"""F4 (Tier B scaffold): Post-event recap, notes bundle, and field-note outline."""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("F4")

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

GENERATOR_MODEL = "anthropic/claude-3.5-haiku"
BANNED_WORDS = ["disrupt", "revolutionize", "leverage", "state-of-the-art"]
SUBSCRIBE_CTA = "theairuntime.com/subscribe"


def make_client() -> "OpenAI | None":
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key or not OpenAI:
        return None
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)


def draft_recap(client, transcript: str) -> dict | None:
    prompt = (
        "You are writing for The AI Runtime, a publication for engineers shipping AI to production.\n"
        "Voice: confident, specific, sourced, anti-hype, practitioner first.\n"
        "Hard rules:\n"
        "- Never use em dashes. Use commas, parentheses, periods, or colons instead.\n"
        "- Never use the words: disrupt, revolutionize, leverage (as verb), state-of-the-art.\n\n"
        f"Transcript:\n{transcript[:15000]}\n\n"
        "Produce three outputs, each separated by the marker '---SECTION---':\n\n"
        "1. RECAP POST (400-600 words, practitioner voice). End with this exact CTA:\n"
        f"   'Subscribe at {SUBSCRIBE_CTA} for more practitioner-first AI content.'\n\n"
        "2. NOTES BUNDLE: 3-5 bullet takeaways per talk mentioned.\n\n"
        "3. FIELD-NOTE OUTLINE: section headers with key points (no full prose).\n\n"
        "Output only the three sections separated by ---SECTION---."
    )
    try:
        resp = client.chat.completions.create(
            model=GENERATOR_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.choices[0].message.content.strip()
        sections = raw.split("---SECTION---")
        if len(sections) < 3:
            log.warning("LLM returned fewer than 3 sections (%d)", len(sections))
            return None
        return {
            "recap": sections[0].strip(),
            "notes": sections[1].strip(),
            "fieldnote_outline": sections[2].strip(),
        }
    except Exception as exc:
        log.warning("LLM call failed: %s", exc)
        return None


def brand_audit(drafts: dict) -> tuple[bool, list[str]]:
    """Check brand rules. Returns (pass, list_of_issues)."""
    issues = []
    all_text = "\n".join(drafts.values())

    # Em dash check
    if "\u2014" in all_text:
        issues.append("SUPPRESS: em dash found in draft output")
        return False, issues

    if "\u2013" in all_text:
        issues.append("FLAG: en dash found in draft output")

    # Banned words
    lower = all_text.lower()
    for word in BANNED_WORDS:
        if word in lower:
            issues.append(f"FLAG: banned word '{word}' found")

    # Subscribe CTA
    if SUBSCRIBE_CTA not in all_text:
        issues.append("SUPPRESS: subscribe CTA missing")
        return False, issues

    suppressed = any(i.startswith("SUPPRESS") for i in issues)
    return not suppressed, issues


def run(transcript_path: str | None = None) -> dict:
    """Run F4. Returns summary info."""
    if not transcript_path or not Path(transcript_path).exists():
        msg = "F4: No transcript provided. Pass --transcript <path> after the event."
        print(msg)
        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "feature": "F4",
            "tier": "B",
            "status": "scaffold_only",
            "notes": msg,
        }
        log_path = DATA / "build-log.jsonl"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        return {"status": "scaffold_only", "staged": 0}

    client = make_client()
    if not client:
        log.info("No OPENROUTER_API_KEY. F4 requires LLM; skipping.")
        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "feature": "F4",
            "tier": "B",
            "status": "skipped",
            "notes": "No OPENROUTER_API_KEY",
        }
        log_path = DATA / "build-log.jsonl"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        return {"status": "skipped", "staged": 0}

    transcript = Path(transcript_path).read_text(encoding="utf-8")

    # Derive slug from filename
    slug = Path(transcript_path).stem

    drafts = draft_recap(client, transcript)
    if not drafts:
        log.error("Failed to generate drafts")
        return {"status": "fail", "staged": 0}

    audit_pass, issues = brand_audit(drafts)
    for issue in issues:
        log.warning("Brand audit: %s", issue)

    staged = 0
    if audit_pass:
        out_dir = DATA / "review-queue" / "f4" / slug
        out_dir.mkdir(parents=True, exist_ok=True)

        now_iso = datetime.now(timezone.utc).isoformat()
        for name, content in [
            ("recap.md", drafts["recap"]),
            ("notes.md", drafts["notes"]),
            ("fieldnote-outline.md", drafts["fieldnote_outline"]),
        ]:
            header = {
                "feature": "F4",
                "event_slug": slug,
                "status": "pending_review",
                "generated_at": now_iso,
            }
            full = "---\n" + yaml.dump(header, default_flow_style=False, sort_keys=False) + "---\n\n" + content + "\n"
            (out_dir / name).write_text(full, encoding="utf-8")
            staged += 1

        log.info("Staged %d drafts to %s", staged, out_dir)
    else:
        log.warning("Brand audit failed; drafts suppressed")

    log_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "feature": "F4",
        "tier": "B",
        "status": "pass" if audit_pass else "suppressed",
        "staged": staged,
        "audit_issues": issues,
        "notes": f"{staged} drafts staged" if audit_pass else "Suppressed by brand audit",
    }
    log_path = DATA / "build-log.jsonl"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {"status": "pass" if audit_pass else "suppressed", "staged": staged}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="F4: Post-event recap scaffold")
    parser.add_argument("--transcript", help="Path to transcript .txt or .md file")
    args = parser.parse_args()
    result = run(args.transcript)
    print(f"F4: status={result['status']}, staged={result['staged']}")
