#!/usr/bin/env python3
"""F3 (Tier A): Detect convergence patterns across the talk spine."""

from __future__ import annotations

import json
import logging
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("F3")

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "shall", "this", "that",
    "these", "those", "it", "its", "not", "no", "nor", "so", "if", "then",
    "than", "too", "very", "just", "also", "how", "what", "when", "where",
    "who", "which", "why", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "into", "over", "after", "before",
    "between", "through", "about", "up", "out", "off", "down", "only",
    "own", "same", "while", "as", "we", "they", "them", "their", "our",
    "you", "your", "he", "she", "his", "her", "my", "me", "us",
}


def tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z]{3,}", text.lower())
    return [w for w in words if w not in STOPWORDS]


def run() -> dict:
    """Run F3 and return summary info."""
    spine_path = DATA / "spine.json"
    if not spine_path.exists():
        log.error("data/spine.json not found. Run F1 first.")
        return {"candidates": 0, "rejected": 0}

    records = json.loads(spine_path.read_text(encoding="utf-8"))

    # Group by pillar
    by_pillar = defaultdict(list)
    for rec in records:
        by_pillar[rec["pillar"]].append(rec)

    candidates = []
    rejected = 0

    for pillar, talks in by_pillar.items():
        if len(talks) < 2:
            log.info("Pillar '%s' has only %d talk(s), skipping", pillar, len(talks))
            continue

        # Count word frequency across abstracts
        word_to_talks = defaultdict(set)
        for talk in talks:
            tokens = set(tokenize(talk.get("talk_abstract", "")))
            for token in tokens:
                word_to_talks[token].add(talk["talk_title"])

        # Find terms appearing in 2+ talks
        shared_terms = {
            term: talk_titles
            for term, talk_titles in word_to_talks.items()
            if len(talk_titles) >= 2
        }

        if not shared_terms:
            continue

        # Cluster shared terms by the set of talks they appear in
        cluster_map = defaultdict(list)
        for term, talk_titles in shared_terms.items():
            key = tuple(sorted(talk_titles))
            cluster_map[key].append(term)

        for talk_titles_tuple, terms in cluster_map.items():
            talk_count = len(talk_titles_tuple)

            if talk_count < 2:
                log.info("Rejected single-source candidate in pillar '%s'", pillar)
                rejected += 1
                continue

            # Pick the top 5 most distinctive terms for naming
            top_terms = sorted(terms, key=lambda t: len(word_to_talks[t]), reverse=True)[:5]
            candidate_name = f"{pillar.title()}: {', '.join(top_terms[:3])}"

            evidence = []
            for talk in talks:
                if talk["talk_title"] in talk_titles_tuple:
                    evidence.append({
                        "event_slug": talk["event_slug"],
                        "talk_title": talk["talk_title"],
                    })

            pattern_desc = (
                f"Talks in the '{pillar}' pillar share themes around "
                f"{', '.join(top_terms[:5])}. "
                f"Supported by {talk_count} talks across events."
            )

            candidates.append({
                "candidate_name": candidate_name,
                "pillar": pillar,
                "pattern_description": pattern_desc,
                "evidence_talks": evidence,
                "talk_count": talk_count,
            })

    # Write output
    out_path = DATA / "framework-candidates.json"
    out_path.write_text(json.dumps(candidates, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log.info("Wrote %d candidates to %s (rejected %d)", len(candidates), out_path, rejected)

    # Build log
    log_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "feature": "F3",
        "tier": "A",
        "candidates_written": len(candidates),
        "rejected": rejected,
        "notes": f"{len(candidates)} framework candidates from {len(by_pillar)} pillars",
    }
    log_path = DATA / "build-log.jsonl"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {"candidates": len(candidates), "rejected": rejected}


if __name__ == "__main__":
    result = run()
    print(f"F3: {result['candidates']} candidates, {result['rejected']} rejected")
