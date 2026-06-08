#!/usr/bin/env python3
"""F1 (Tier A): Build the talk spine from event and speaker content files."""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

ROOT = Path(__file__).resolve().parent.parent.parent
CONTENT = ROOT / "src" / "content"
DATA = ROOT / "data"

FRONTMATTER_RE = re.compile(r"^---\n(.*?\n)---\n", re.DOTALL)

ALLOWED_PILLARS = ["agents", "inference", "reliability", "evals", "cost"]

PILLAR_KEYWORDS = {
    "agents": ["agent", "agents", "agentic", "autonomous", "self-signup", "self-register",
               "orchestrat", "tool use", "function call"],
    "inference": ["inference", "latency", "throughput", "token", "model serving",
                  "prompt", "llm", "context window", "generation"],
    "reliability": ["reliability", "production", "deploy", "failure", "monitor",
                    "observ", "guardrail", "safety", "robust", "quality"],
    "evals": ["eval", "evaluation", "benchmark", "metric", "score", "test",
              "accuracy", "faithfulness", "grounding"],
    "cost": ["cost", "budget", "pricing", "efficient", "optim", "cheap",
             "expensive", "spend", "resource"],
}

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("F1")


def load_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    return yaml.safe_load(match.group(1)) or {}


def heuristic_pillar(abstract: str) -> str:
    lower = abstract.lower()
    scores = {}
    for pillar, keywords in PILLAR_KEYWORDS.items():
        scores[pillar] = sum(1 for kw in keywords if kw in lower)
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "agents"  # default fallback
    return best


def llm_assign(client, abstract: str) -> dict | None:
    """Call LLM to assign pillar and extract problem_statement."""
    prompt = (
        "You are classifying a conference talk abstract.\n"
        "Pick exactly ONE pillar from this list: agents, inference, reliability, evals, cost.\n"
        "Also extract a single sentence (the problem_statement) from the abstract.\n"
        "Hard rule: never use em dashes in your output. Use commas or periods instead.\n\n"
        f"Abstract:\n{abstract}\n\n"
        "Respond in JSON only, no markdown fences:\n"
        '{"pillar": "...", "problem_statement": "..."}'
    )
    try:
        resp = client.chat.completions.create(
            model="anthropic/claude-3.5-haiku",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.choices[0].message.content.strip()
        log.info("LLM raw response: %s", raw)
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
        return data
    except Exception as exc:
        log.warning("LLM call failed: %s", exc)
        return None


def eval_gate_llm(result: dict, abstract: str) -> tuple[dict, str]:
    """Validate LLM output. Returns (record_update, gate_status)."""
    pillar = result.get("pillar", "").lower().strip()
    problem = result.get("problem_statement", "")

    if pillar not in ALLOWED_PILLARS:
        log.warning("LLM returned invalid pillar '%s', falling back to heuristic", pillar)
        return {"pillar": heuristic_pillar(abstract), "problem_statement": None}, "fail"

    # Check for em dashes in problem_statement
    if "\u2014" in problem:
        log.warning("Em dash found in problem_statement, stripping it")
        problem = problem.replace("\u2014", ", ")

    if "\u2013" in problem:
        log.warning("En dash found in problem_statement, stripping it")
        problem = problem.replace("\u2013", "-")

    return {"pillar": pillar, "problem_statement": problem}, "pass"


def build_spine() -> list[dict]:
    events_dir = CONTENT / "events"
    speakers_dir = CONTENT / "speakers"

    # Load all events
    events = {}
    for md in sorted(events_dir.rglob("*.md")):
        fm = load_frontmatter(md)
        if not fm:
            continue
        slug = md.stem
        events[slug] = {
            "data": fm,
            "path": str(md.relative_to(ROOT)),
        }

    # Load all speakers
    speakers = {}
    for md in sorted(speakers_dir.glob("*.md")):
        fm = load_frontmatter(md)
        if not fm:
            continue
        slug = md.stem
        speakers[slug] = {
            "data": fm,
            "path": str(md.relative_to(ROOT)),
        }

    # Set up LLM client if key is available
    api_key = os.environ.get("OPENROUTER_API_KEY")
    client = None
    if api_key and OpenAI:
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
        log.info("OpenRouter client initialized; LLM gates enabled")
    else:
        log.info("No OPENROUTER_API_KEY or openai package; using heuristics only")

    records = []
    eval_gate_status = "skip"

    for speaker_slug, sp in speakers.items():
        sp_data = sp["data"]
        talks = sp_data.get("talks", [])
        for talk in talks:
            event_slug = talk.get("eventSlug", "")
            event_info = events.get(event_slug, {}).get("data", {})

            abstract = talk.get("abstract", "").strip()

            # Determine pillar
            pillar = heuristic_pillar(abstract)
            problem_statement = None

            if client and abstract:
                llm_result = llm_assign(client, abstract)
                if llm_result:
                    update, gate = eval_gate_llm(llm_result, abstract)
                    pillar = update["pillar"]
                    problem_statement = update["problem_statement"]
                    eval_gate_status = gate
                    log.info("Eval gate: %s (pillar=%s)", gate, pillar)

            record = {
                "event_slug": event_slug,
                "event_title": event_info.get("title", ""),
                "event_date": str(event_info.get("date", "")),
                "city": event_info.get("city", ""),
                "speaker_slug": speaker_slug,
                "speaker_name": sp_data.get("name", ""),
                "speaker_title": sp_data.get("title", ""),
                "speaker_company": sp_data.get("company", ""),
                "talk_title": talk.get("title", ""),
                "talk_abstract": abstract,
                "pillar": pillar,
                "problem_statement": problem_statement,
                "rsvp_count": None,
                "source_event_file": events.get(event_slug, {}).get("path", ""),
                "source_speaker_file": sp["path"],
            }
            records.append(record)

    return records, eval_gate_status


def run() -> dict:
    """Run F1 and return summary info for the orchestrator."""
    records, eval_gate_status = build_spine()

    DATA.mkdir(parents=True, exist_ok=True)
    spine_path = DATA / "spine.json"
    spine_path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log.info("Wrote %d records to %s", len(records), spine_path)

    # Append to build log
    log_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "feature": "F1",
        "tier": "A",
        "records_written": len(records),
        "eval_gate": eval_gate_status,
        "notes": f"{len(records)} talk records extracted from content files",
    }
    log_path = DATA / "build-log.jsonl"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {"records": len(records), "eval_gate": eval_gate_status}


if __name__ == "__main__":
    result = run()
    print(f"F1: {result['records']} records, eval_gate={result['eval_gate']}")
