---
title: An Update on Recent Claude Code Quality Reports
url: https://www.anthropic.com/engineering/april-23-postmortem
source: Anthropic
pillar: reliability
tags: [reliability, evals, postmortem, quality-degradation]
summary: |
  Three independent changes to Claude Code compounded over six weeks to produce
  measurable quality degradation that Anthropic initially failed to catch because
  none of the three individually crossed an alert threshold. The first downgraded
  default reasoning effort to reduce UI-freezing latency. The second introduced a
  caching bug that cleared chain-of-thought context on every turn rather than only
  on idle sessions. The third added a verbosity constraint that Anthropic's own
  evals showed cut coding quality by 3%. All three were reverted by April 20 in
  v2.1.116. The post is notable for publishing the internal eval data and for the
  honest account of how the absence of correlated monitoring across product-layer
  changes let three small missteps compound into six weeks of complaints.
publishedAt: 2026-04-23
addedAt: 2026-06-10
relatedEvents: []
relatedSpeakers: []
highlight: false
---
