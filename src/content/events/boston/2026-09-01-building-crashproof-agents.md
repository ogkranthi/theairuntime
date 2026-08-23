---
title: 'Building Crashproof Agents'
city: boston
date: 2026-09-01
doorsAt: '6:00 PM'
endsAt: '8:30 PM'
status: upcoming
lumaUrl: https://luma.com/2wxo5ndz
venue:
  name: Microsoft New England Research and Development Center
  address: 1 Memorial Dr, Cambridge, MA 02142
  mapUrl: https://maps.google.com/?q=Microsoft+New+England+Research+and+Development+Center+Cambridge+MA
speakers:
  - alex-poliakov
agenda:
  - { time: '6:00 PM', item: 'Networking and food' }
  - { time: '6:30 PM', item: 'Welcome, Kranthi Manchikanti' }
  - { time: '6:40 PM', item: 'Talk · Alex Poliakov, Building Crashproof Agents' }
  - { time: '7:40 PM', item: 'Q&A and open discussion' }
  - { time: '8:30 PM', item: 'Close' }
partners:
  - { name: 'DBOS', url: 'https://www.dbos.dev', role: 'Featured speaker' }
  - { name: 'HackerSquad', role: 'Supported by' }
  - { name: 'Builders Collective', role: 'Supported by' }
description: |
  An evening for people building, shipping, and scaling with AI. Agents are
  expected to run longer, hold approval logic, and take on more important work,
  which raises the cost of every failure. Alex Poliakov (DBOS) on Durable
  Execution: what it guarantees, what it does not, and how DBOS achieves
  durability using only Postgres. Supported by HackerSquad and Builders
  Collective.
---

Beyond accuracy and cost, AI agents are challenged by long-running execution,
human-in-the-loop approval logic, non-deterministic call paths, and upgrade
complexity. Alex Poliakov, Head of Customer Solutions at DBOS, introduces
Durable Execution: a set of techniques that originated in transactional
processing and is now growing in popularity with agent builders. The talk covers
the guarantees durability can and cannot provide, why it is becoming a key
pattern in AI agents, and how DBOS achieves it using only Postgres, including
queueing, upgrading long-running workflows, and forking.

For developers with experience in agentic development or a general interest in
reliable software. Postgres experience is a plus.
