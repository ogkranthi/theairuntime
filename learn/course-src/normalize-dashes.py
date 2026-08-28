#!/usr/bin/env python3
"""Bring the upstream Agentic System Design package into AIR house style.

The repo forbids em dashes and en dashes in every artifact (see CLAUDE.md). The
upstream package uses both. This rewrites them without touching meaning:

* en dashes are always ranges or compound pattern names here, so they become
  hyphens;
* em dashes are one of five shapes, each with an unambiguous replacement.

Run from the repo root:  python3 learn/course-src/normalize-dashes.py
Re-running is safe: the script is idempotent.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "src" / "content" / "asd-modules",
    ROOT / "src" / "content" / "asd-practice",
    ROOT / "src" / "content" / "asd-reference",
]

EM = "—"
EN = "–"

# Rubric band lines carry a colon inside the bold run already, so the generic
# heading and definition rules would produce a double colon. Handle them first.
BAND_A = re.compile(rf"^(\s*[-*] \*\*[\d]+(?:-|\+)?[\d]*\*?\*?[^*]*?) {EM} ([^*]+?):\*\*")
BAND_B = re.compile(rf"^(\s*[-*] \*\*[^*]+\*\*) {EM} ")

RULES: list[tuple[re.Pattern[str], str]] = [
    # "publishes artifacts—not paperwork"  ->  "publishes artifacts, not paperwork"
    (re.compile(rf"{EM}not "), ", not "),
    # "## R — Requirements and risk"  ->  "## R: Requirements and risk"
    (re.compile(rf"^(#+ .+?) {EM} ", re.M), r"\1: "),
    # "[Temporal — Workflows](url)"  ->  "[Temporal: Workflows](url)"
    (re.compile(rf"\[([^\]\n]+?) {EM} ([^\]\n]+?)\]"), r"[\1: \2]"),
    # "1. **LEARN** — passes the check"  ->  "1. **LEARN**: passes the check"
    # "**Agent loop** — The bounded sequence"  ->  "**Agent loop**: The bounded sequence"
    (re.compile(rf"^(\s*(?:\d+\.|[-*])?\s*\*\*[^*\n]+\*\*) {EM} ", re.M), r"\1: "),
]


def fix_bands(text: str) -> str:
    out = []
    for line in text.split("\n"):
        # "- **20-29 — Demo level:** flow works"  ->  "- **20-29, Demo level:** flow works"
        line = BAND_A.sub(r"\1, \2:**", line)
        # "- **20-29: Demo level** — flow works"  ->  "- **20-29: Demo level**, flow works"
        line = BAND_B.sub(r"\1, ", line)
        out.append(line)
    return "\n".join(out)


def normalize(text: str) -> str:
    text = text.replace(EN, "-")
    text = fix_bands(text)
    for pattern, replacement in RULES:
        text = pattern.sub(replacement, text)
    return text


def main() -> int:
    changed = 0
    leftovers: list[str] = []

    for target in TARGETS:
        for path in sorted(target.glob("*.md")):
            original = path.read_text(encoding="utf-8")
            updated = normalize(original)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
            for n, line in enumerate(updated.split("\n"), 1):
                if EM in line or EN in line:
                    leftovers.append(f"{path.relative_to(ROOT)}:{n}: {line.strip()}")

    print(f"rewrote {changed} files")
    if leftovers:
        print(f"\n{len(leftovers)} lines still contain a dash that needs a hand edit:")
        for line in leftovers:
            print(f"  {line}")
        return 1
    print("no em dashes or en dashes remain")
    return 0


if __name__ == "__main__":
    sys.exit(main())
