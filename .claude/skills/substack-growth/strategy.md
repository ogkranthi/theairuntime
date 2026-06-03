# Strategy reference: Network Overlap and what converts

Reference material for the `substack-growth` skill. Read before Phase 1 and
Phase 2.

## Network Overlap, in practice

The algorithm rewards connection density, not raw posting volume. Your job is to
become a well-connected node, not a loud one.

- A restack tells the algorithm "my audience might like this writer too." When
  the writer engages back, both audiences get cross-pollinated.
- The triangulation effect: if you engage account A, and A engages authoritative
  account B, the algorithm infers you belong near B and starts showing your work
  to B's followers. So the highest-value targets are accounts that *themselves*
  engage other authorities. They are bridges, not dead ends.
- Depth beats breadth. A substantive comment that the author replies to creates
  a stronger edge than ten drive-by restacks.

## Engagement target rubric (Phase 1)

Score each candidate account or note on:

1. **Authority.** Do practitioners in production AI take them seriously?
   Independent voice over vendor marketing.
2. **Bridge value.** Do they actively engage *other* authoritative accounts?
   High bridge value is the whole point of overlap.
3. **Audience fit.** Do their readers match The AI Runtime reader (engineers
   shipping AI to production)? Overlap with the wrong audience is noise.
4. **Reciprocity odds.** Small enough or engaged enough that a thoughtful
   comment might actually get a reply.

Rank by (bridge value + reciprocity odds) first, then audience fit. Output the
top 5. For each, write a one-line comment angle in the user's voice: specific,
sourced, adds a load-bearing point, never flattery.

## What converts vs vanity (Phase 4 classification)

For each published note, compare reach to outcomes:

- **Subscriber-driving:** meaningful `totalFreeSubscriptions` or
  `totalPaidSubscriptions`, or high `totalProfileVisits` relative to
  `totalImpressions`. The note pulled people toward the publication.
- **Vanity:** high `totalImpressions` and reactions but near-zero subscriptions
  and few profile visits. It entertained the feed and moved no one.

Rule of thumb: a note with fewer impressions but a healthy
profile-visit-to-impression ratio beats a viral note that converted nobody.
Bias future drafts toward the formats in the subscriber-driving column.

## Voice rubric (Phase 2 drafting)

Pulled from the user's `get_writing_style` profile. A good draft:

- Opens with a bold claim, a provocative question, or a precise field-note TL;DR.
- Is declarative and unhedged. Functional metaphors, no decoration.
- Either a dense, link-bearing resource drop or a pithy hard-won insight. Pick
  one per note, do not blend.
- Names and standardizes things (taxonomies, component counts, spectrums): MRE,
  Vertical Agent Anatomy, context vs prompt engineering, the harness as moat.
- Promotes The AI Runtime by framing it as the next step for practitioners, not
  as an ad. Subscribe CTA, when used, points to
  https://theairuntime.com/subscribe.
- Contains no em dashes and no en dashes. Hyphens only for ranges and compound
  modifiers.
