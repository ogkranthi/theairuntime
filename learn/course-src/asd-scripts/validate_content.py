#!/usr/bin/env python3
"""Validate the Agentic System Design course content pack.

Usage:
    python scripts/validate_content.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []
WARNINGS: list[str] = []


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception as exc:  # noqa: BLE001
        ERRORS.append(f"{path}: invalid JSON: {exc}")
        return {}


def frontmatter(path: Path) -> tuple[dict[str, Any], str]:
    text = path.read_text()
    if not text.startswith("---\n"):
        ERRORS.append(f"{path}: missing frontmatter start")
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        ERRORS.append(f"{path}: malformed frontmatter")
        return {}, text
    try:
        data = yaml.safe_load(parts[1]) or {}
    except Exception as exc:  # noqa: BLE001
        ERRORS.append(f"{path}: invalid YAML: {exc}")
        return {}, parts[2]
    return data, parts[2]


def validate() -> None:
    manifest_data = load_json(ROOT / "course-manifest.json")
    quiz = load_json(ROOT / "content/assessments/quiz-bank.json")
    scenarios = load_json(ROOT / "content/practice/scenario-manifest.json")
    manifest = manifest_data.get("course", {})

    modules: list[dict[str, Any]] = []
    module_paths = sorted((ROOT / "content/modules").glob("*.md"))
    required_fields = {
        "id",
        "slug",
        "title",
        "track",
        "duration_minutes",
        "difficulty",
        "build_milestone",
        "objectives",
        "prerequisites",
    }
    required_headings = [
        "## What you will design",
        "## Failure injection",
        "## SHIP:",
        "## RUN:",
        "## DESIGN:",
        "## Check your understanding",
        "## Primary references",
    ]

    for path in module_paths:
        data, body = frontmatter(path)
        data["_file"] = path.name
        modules.append(data)
        for key in sorted(required_fields - data.keys()):
            ERRORS.append(f"{path}: missing required frontmatter field {key}")
        if len(data.get("objectives") or []) < 3:
            ERRORS.append(f"{path}: fewer than three objectives")
        for heading in required_headings:
            if heading not in body:
                ERRORS.append(f"{path}: missing heading pattern {heading}")
        if body.count("```") % 2:
            ERRORS.append(f"{path}: unbalanced code fences")

    ids = [str(m.get("id", "")).zfill(2) for m in modules]
    slugs = [m.get("slug") for m in modules]
    if len(modules) != 17:
        ERRORS.append(f"expected 17 modules, found {len(modules)}")
    if len(set(ids)) != len(ids):
        ERRORS.append("duplicate module IDs")
    if len(set(slugs)) != len(slugs):
        ERRORS.append("duplicate module slugs")
    expected_ids = [f"{index:02d}" for index in range(17)]
    if ids != expected_ids:
        ERRORS.append(f"module IDs/order must be {expected_ids}; found {ids}")

    manifest_modules = manifest.get("modules", [])
    if [m.get("slug") for m in manifest_modules] != slugs:
        ERRORS.append("course-manifest module order differs from module files")
    for manifest_module, module in zip(manifest_modules, modules, strict=False):
        for key in ["slug", "title", "track", "duration_minutes", "difficulty"]:
            if manifest_module.get(key) != module.get(key):
                ERRORS.append(
                    f"manifest mismatch for {manifest_module.get('slug')} field {key}: "
                    f"{manifest_module.get(key)!r} != {module.get(key)!r}"
                )

    slug_set = set(slugs)
    for module in modules:
        for prerequisite in module.get("prerequisites") or []:
            if prerequisite not in slug_set:
                ERRORS.append(f"{module.get('slug')}: unknown prerequisite {prerequisite}")
            elif slugs.index(prerequisite) >= slugs.index(module.get("slug")):
                ERRORS.append(f"{module.get('slug')}: prerequisite must precede module: {prerequisite}")

    questions = quiz.get("questions", [])
    question_ids = [q.get("id") for q in questions]
    if len(question_ids) != len(set(question_ids)):
        ERRORS.append("duplicate quiz question IDs")
    question_counts = Counter(q.get("module") for q in questions)
    for slug in slugs:
        if question_counts[slug] < 3:
            ERRORS.append(f"{slug}: fewer than three quiz questions")
    for question in questions:
        if question.get("module") not in slug_set:
            ERRORS.append(f"quiz {question.get('id')}: unknown module {question.get('module')}")
        option_ids = {option.get("id") for option in question.get("options", [])}
        correct = set(question.get("correct_option_ids", []))
        if not correct <= option_ids:
            ERRORS.append(f"quiz {question.get('id')}: correct answer references missing option")
        if question.get("type") == "single" and len(correct) != 1:
            ERRORS.append(f"quiz {question.get('id')}: single-select must have one answer")
        if question.get("type") == "multi" and len(correct) < 2:
            WARNINGS.append(f"quiz {question.get('id')}: multi-select has fewer than two answers")

    scenario_items = scenarios.get("scenarios", [])
    if len(scenario_items) != 12:
        ERRORS.append(f"expected 12 scenarios, found {len(scenario_items)}")
    if len({s.get("slug") for s in scenario_items}) != len(scenario_items):
        ERRORS.append("duplicate practice scenario slugs")
    scenario_headings = [
        "## Candidate prompt",
        "## Staged constraint reveals",
        "## Strong answer signals",
        "## Failure follow-ups",
        "## Scoring emphasis",
        "## Model outline",
    ]
    for scenario in scenario_items:
        path = ROOT / "content/practice" / scenario.get("file", "")
        if not path.exists():
            ERRORS.append(f"missing scenario file {path}")
            continue
        body = path.read_text()
        for heading in scenario_headings:
            if heading not in body:
                ERRORS.append(f"{path}: missing heading {heading}")
        if body.count("```") % 2:
            ERRORS.append(f"{path}: unbalanced code fences")

    link_pattern = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
    for path in ROOT.rglob("*.md"):
        if path.name == "COURSE_CONTENT_SINGLE_FILE.md":
            # Generated compilation preserves links relative to each source file.
            continue
        for target in link_pattern.findall(path.read_text()):
            target = target.strip()
            if target.startswith(("http://", "https://", "mailto:", "#", "`")):
                continue
            clean_target = target.split("#", 1)[0]
            if not clean_target:
                continue
            destination = (path.parent / clean_target).resolve()
            try:
                destination.relative_to(ROOT.resolve())
            except ValueError:
                WARNINGS.append(f"{path}: relative link escapes course root: {target}")
                continue
            if not destination.exists():
                ERRORS.append(f"{path}: broken internal link {target}")

    required_files = [
        "README.md",
        "COURSE_MASTER.md",
        "AGENTS.md",
        "CLAUDE.md",
        "site/SITE_BUILD_SPEC.md",
        "site/BUILD_WITH_CLAUDE_CODE_OR_CODEX.md",
        "content/reference/glossary.md",
        "content/reference/primary-source-map.md",
    ]
    for relative_path in required_files:
        if not (ROOT / relative_path).exists():
            ERRORS.append(f"missing key file {relative_path}")

    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix in {".md", ".json"}:
            if "2026-08-27" in path.read_text(errors="ignore"):
                WARNINGS.append(f"{path}: contains future review date 2026-08-27")

    print(f"Modules: {len(modules)}")
    print(f"Quiz questions: {len(questions)}")
    print(f"Practice scenarios: {len(scenario_items)}")
    print(f"Errors: {len(ERRORS)}")
    for error in ERRORS:
        print(f"ERROR: {error}")
    print(f"Warnings: {len(WARNINGS)}")
    for warning in WARNINGS:
        print(f"WARN: {warning}")


if __name__ == "__main__":
    validate()
    sys.exit(1 if ERRORS else 0)
