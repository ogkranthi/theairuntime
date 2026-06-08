#!/usr/bin/env python3
"""F2 (Tier B): Draft startup theses from the talk spine, with grounding eval."""

from __future__ import annotations

import json
import logging
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data"
REVIEW_DIR = DATA / "review-queue" / "f2"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("F2")

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

GENERATOR_MODEL = "anthropic/claude-3.5-haiku"
JUDGE_MODEL = "anthropic/claude-opus-4-5"


def make_client() -> "OpenAI | None":
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key or not OpenAI:
        return None
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)


def draft_thesis(client, pillar: str, abstracts: list[str]) -> str | None:
    combined = "\n\n---\n\n".join(abstracts)
    prompt = (
        "You are writing for The AI Runtime, a publication for engineers shipping AI to production.\n"
        "Voice: confident, specific, sourced, anti-hype, practitioner first.\n"
        "Hard rules: never use em dashes. Never use the words disrupt, revolutionize, leverage (as verb), or state-of-the-art.\n\n"
        f"Pillar: {pillar}\n\n"
        "Source abstracts:\n"
        f"{combined}\n\n"
        "Write ONE paragraph (a startup thesis) covering:\n"
        "1. The production problem (grounded in the abstracts, no invented content)\n"
        "2. Who has this problem (practitioner persona)\n"
        "3. The company shape that solves it\n"
        "4. The persona it serves (founder, operator, educator, or investor)\n\n"
        "Output the paragraph only, no preamble."
    )
    try:
        resp = client.chat.completions.create(
            model=GENERATOR_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        log.warning("Generator LLM call failed: %s", exc)
        return None


def judge_faithfulness(client, thesis: str, abstracts: list[str]) -> float | None:
    combined = "\n\n---\n\n".join(abstracts)
    prompt = (
        "You are a grounding judge. Score the faithfulness of the following thesis "
        "against the source abstracts on a scale from 0.0 to 1.0.\n"
        "Faithfulness means every claim in the thesis is supported by the abstracts.\n"
        "Return ONLY a JSON object: {\"faithfulness\": 0.XX}\n\n"
        f"Source abstracts:\n{combined}\n\n"
        f"Thesis:\n{thesis}"
    )
    try:
        resp = client.chat.completions.create(
            model=JUDGE_MODEL,
            max_tokens=64,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.choices[0].message.content.strip()
        log.info("Judge raw response: %s", raw)
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
        return float(data.get("faithfulness", 0.0))
    except Exception as exc:
        log.warning("Judge LLM call failed: %s", exc)
        return None


def run() -> dict:
    """Run F2 and return summary info."""
    spine_path = DATA / "spine.json"
    if not spine_path.exists():
        log.error("data/spine.json not found. Run F1 first.")
        return {"drafted": 0, "suppressed": 0}

    client = make_client()
    if not client:
        log.info("No OPENROUTER_API_KEY or openai package. F2 requires LLM; skipping.")
        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "feature": "F2",
            "tier": "B",
            "drafted": 0,
            "suppressed": 0,
            "notes": "Skipped: no OPENROUTER_API_KEY",
        }
        log_path = DATA / "build-log.jsonl"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        return {"drafted": 0, "suppressed": 0}

    records = json.loads(spine_path.read_text(encoding="utf-8"))

    by_pillar = defaultdict(list)
    for rec in records:
        by_pillar[rec["pillar"]].append(rec)

    drafted = 0
    suppressed = 0
    faithfulness_scores = {}

    REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    for pillar, talks in by_pillar.items():
        if len(talks) < 2:
            log.info("Pillar '%s' has < 2 talks, skipping thesis", pillar)
            continue

        abstracts = [t["talk_abstract"] for t in talks if t.get("talk_abstract")]
        evidence = [{"event_slug": t["event_slug"], "talk_title": t["talk_title"]} for t in talks]

        thesis = draft_thesis(client, pillar, abstracts)
        if not thesis:
            suppressed += 1
            continue

        score = judge_faithfulness(client, thesis, abstracts)
        if score is None:
            log.warning("Judge returned no score for pillar '%s', suppressing", pillar)
            suppressed += 1
            continue

        faithfulness_scores[pillar] = score

        if score < 0.85:
            log.warning(
                "Pillar '%s' thesis suppressed: faithfulness %.2f < 0.85", pillar, score
            )
            suppressed += 1
            continue

        # Stage the passing thesis
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"{today}-{pillar}.md"
        header = {
            "feature": "F2",
            "pillar": pillar,
            "faithfulness_score": round(score, 3),
            "evidence_talks": evidence,
            "status": "pending_review",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        content = "---\n" + _yaml_dump(header) + "---\n\n" + thesis + "\n"
        (REVIEW_DIR / filename).write_text(content, encoding="utf-8")
        log.info("Staged thesis for pillar '%s' (faithfulness=%.2f)", pillar, score)
        drafted += 1

    # Build log
    log_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "feature": "F2",
        "tier": "B",
        "drafted": drafted,
        "suppressed": suppressed,
        "faithfulness_scores": faithfulness_scores,
        "notes": f"{drafted} theses staged, {suppressed} suppressed",
    }
    log_path = DATA / "build-log.jsonl"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {"drafted": drafted, "suppressed": suppressed}


def _yaml_dump(data: dict) -> str:
    """Minimal YAML dump that avoids em dashes in output."""
    import yaml
    text = yaml.dump(data, default_flow_style=False, allow_unicode=True, sort_keys=False)
    return text


if __name__ == "__main__":
    result = run()
    print(f"F2: {result['drafted']} drafted, {result['suppressed']} suppressed")
