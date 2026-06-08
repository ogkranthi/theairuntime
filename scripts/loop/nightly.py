#!/usr/bin/env python3
"""Nightly orchestrator: runs F1, F3, F2, F4 in sequence."""

from __future__ import annotations

import argparse
import os
import sys
import traceback


def main() -> None:
    parser = argparse.ArgumentParser(description="Nightly sensing-layer orchestrator")
    parser.add_argument("--transcript", help="Path to transcript for F4")
    args = parser.parse_args()

    # Check for API key
    if not os.environ.get("OPENROUTER_API_KEY"):
        print(
            "OPENROUTER_API_KEY not set. LLM gates will be skipped; "
            "pillar assignment and grounding will use heuristics only."
        )

    results = {}

    # F1: Spine
    try:
        from scripts.loop.spine import run as f1_run
        r = f1_run()
        results["F1"] = f"pass, {r['records']} records"
    except Exception:
        traceback.print_exc()
        results["F1"] = "fail"

    # F3: Patterns
    try:
        from scripts.loop.patterns import run as f3_run
        r = f3_run()
        results["F3"] = f"pass, {r['candidates']} candidates"
    except Exception:
        traceback.print_exc()
        results["F3"] = "fail"

    # F2: Theses
    try:
        from scripts.loop.f2_theses import run as f2_run
        r = f2_run()
        results["F2"] = f"{r['drafted']} drafted, {r['suppressed']} suppressed"
    except Exception:
        traceback.print_exc()
        results["F2"] = "fail"

    # F4: Recap
    try:
        from scripts.loop.f4_recap import run as f4_run
        r = f4_run(args.transcript)
        if r["status"] == "scaffold_only":
            results["F4"] = "scaffold_only"
        else:
            results["F4"] = f"{r['staged']} staged"
    except Exception:
        traceback.print_exc()
        results["F4"] = "fail"

    # Summary
    print("\n=== Nightly Summary ===")
    for feature, status in results.items():
        print(f"  {feature}: {status}")


if __name__ == "__main__":
    # Ensure the repo root is on sys.path so `from scripts.loop...` works
    from pathlib import Path
    root = str(Path(__file__).resolve().parent.parent.parent)
    if root not in sys.path:
        sys.path.insert(0, root)

    main()
