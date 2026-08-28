#!/usr/bin/env python3
"""Build a single Markdown document containing the complete course pack."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "COURSE_CONTENT_SINGLE_FILE.md"

sections: list[tuple[str, Path]] = []

sections.extend([
    ("Course README", ROOT / "README.md"),
    ("Course Master", ROOT / "COURSE_MASTER.md"),
])
for path in sorted((ROOT / "content/modules").glob("*.md")):
    sections.append((f"Module file: {path.name}", path))
sections.append(("Practice Bank Guide", ROOT / "content/practice/README.md"))
for path in sorted((ROOT / "content/practice").glob("[0-9][0-9]-*.md")):
    sections.append((f"Practice scenario: {path.name}", path))
for path in sorted((ROOT / "content/reference").glob("*.md")):
    sections.append((f"Reference: {path.name}", path))
for path in sorted((ROOT / "content/assessments").glob("*.md")):
    sections.append((f"Assessment: {path.name}", path))
sections.extend([
    ("Site Build Specification", ROOT / "site/SITE_BUILD_SPEC.md"),
    ("Site Content Model", ROOT / "site/CONTENT_MODEL.md"),
    ("Claude Code / Codex Build Prompt", ROOT / "site/BUILD_WITH_CLAUDE_CODE_OR_CODEX.md"),
])

parts = [
    "# Complete Course Pack — Agentic AI System Design: From Prompt to Production",
    "",
    "> Generated from the structured course folder. The individual files remain the source of truth for implementation.",
    "",
    "---",
    "",
]
for label, path in sections:
    parts.extend([
        f"# File: `{path.relative_to(ROOT)}`",
        "",
        f"_Section label: {label}_",
        "",
        path.read_text().rstrip(),
        "",
        "---",
        "",
    ])

OUTPUT.write_text("\n".join(parts))
print(OUTPUT)
