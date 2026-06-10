---
title: How We Contain Claude Across Products
url: https://www.anthropic.com/engineering/how-we-contain-claude
source: Anthropic
author: Max McGuinness, Mikaela Grace, Jiri De Jonghe, Jake Eaton, Abel Ribbink
pillar: reliability
tags: [reliability, security, agents, sandboxing]
summary: |
  Anthropic describes the three containment strategies used across claude.ai,
  Claude Code, and Claude Cowork, and explains why each product warranted a
  different isolation boundary. Claude Code uses OS-level sandboxing via
  Seatbelt and Bubblewrap. Cowork originally ran the full agent loop inside
  a VM, but crashes froze the UI entirely. Moving orchestration outside the VM
  while keeping code execution inside traded theoretical isolation for practical
  reliability. The sharpest finding: across every deployment, off-the-shelf
  primitives held while Anthropic's own custom proxy code was where real
  vulnerabilities appeared, including a prompt injection that exposed API keys
  via /proc/self/environ before v2.1.128.
publishedAt: 2026-05-28
addedAt: 2026-06-10
relatedEvents: []
relatedSpeakers: []
highlight: false
---
