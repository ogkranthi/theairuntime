"""
Shared brand voice for The AI Runtime build-time scripts.

Both the NotebookLM audio script and the AI text-enrichment script pull their
voice from here so audio overviews and drafted summaries stay in one voice.
See BRAND.md for the canonical reference. Hard rule: no em dashes anywhere.
"""

from __future__ import annotations

# The three editorial pillars.
PILLARS = [
    "Vertical AI Agents",
    "Model Reliability Engineering",
    "Lessons from the Trenches in AI",
]

AUDIENCE = "senior AI engineers and architects"
VOICE = "confident, specific, sourced, anti-hype, practitioner first"
BANNED_WORDS = ["disrupt", "revolutionize", "leverage", "state of the art"]
PUBLICATION_URL = "theairuntime.com"


def _pillars_phrase() -> str:
    return ", ".join(PILLARS[:-1]) + ", and " + PILLARS[-1]


def _banned_phrase() -> str:
    return ", ".join(BANNED_WORDS[:-1]) + ", or " + BANNED_WORDS[-1]


def audio_instructions() -> str:
    """Host instructions for a NotebookLM two-host audio overview."""
    return (
        "This is The AI Runtime Deep Dive, the audio companion to The AI Runtime, "
        "a publication for engineers shipping AI to production. "
        f"Audience: {AUDIENCE}. Assume they already know "
        "what an eval, an agent, and a token are, so do not explain the basics. "
        f"Voice: {VOICE}. "
        "Where the material fits, frame the discussion around the three editorial "
        f"pillars: {_pillars_phrase()}. "
        "Pull out the concrete, reproducible lessons a practitioner could apply on "
        "Monday: architecture decisions, failure modes, evals, reliability, cost "
        "and latency tradeoffs, what broke in production and why. "
        "Quote specific numbers and techniques from the source. "
        f"Skip hype, vendor pitches, and future of AI speculation. Never use the "
        f"words {_banned_phrase()}. "
        f"Close by pointing listeners to {PUBLICATION_URL} for the full issue."
    )


def summary_system_prompt() -> str:
    """System prompt for drafting a one-paragraph reading-list summary."""
    return (
        "You write summaries for The AI Runtime, a publication for engineers "
        f"shipping AI to production. Audience: {AUDIENCE}. "
        f"Voice: {VOICE}. "
        "Write a single tight paragraph (2 to 4 sentences) that tells a "
        "practitioner exactly what they will learn and why it matters for "
        "production work. Lead with the specific, concrete claim or technique, "
        "not a generic framing. Do not editorialize, do not hype, do not start "
        f"with 'In this article'. Never use the words {_banned_phrase()}. "
        "Hard rule: never use em dashes. Use commas or parentheses for asides "
        "and a period or colon to break clauses. Output only the summary text, "
        "no preamble, no quotes, no markdown."
    )
