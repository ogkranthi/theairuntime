---
title: 'Crashproof Agents and Agentic Memory'
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
  - alex-seriy
agenda:
  - { time: '6:00 PM', item: 'Networking and food' }
  - { time: '6:30 PM', item: 'Welcome, Kranthi Manchikanti' }
  - { time: '6:35 PM', item: 'Talk 1 · Alex Poliakov, Building Crashproof Agents' }
  - { time: '7:15 PM', item: 'Talk 2 · Alex Seriy, Agentic Memory: The Final Frontier' }
  - { time: '7:55 PM', item: 'Open discussion · networking' }
  - { time: '8:30 PM', item: 'Close' }
partners:
  - { name: 'DBOS', url: 'https://www.dbos.dev', role: 'Featured speaker' }
  - { name: 'Cockroach Labs', url: 'https://www.cockroachlabs.com', role: 'Featured speaker' }
  - { name: 'HackerSquad', role: 'Supported by' }
  - { name: 'Builders Collective', role: 'Supported by' }
description: |
  An evening for people building, shipping, and scaling with AI. Two talks on
  what it takes to keep agents running once they hold real state. Alex Poliakov
  (DBOS) on Durable Execution: what it guarantees, what it does not, and how DBOS
  achieves durability using only Postgres. Alex Seriy (Cockroach Labs) on the
  data tier underneath agent memory: surviving node, zone, and region failures,
  scaling by adding nodes, and reading data exactly as it was hours ago.
  Supported by HackerSquad and Builders Collective.
---

Two practitioners on the unglamorous half of agent engineering: what happens to
your agent when the process dies, the database node goes down, or the fleet
grows 100x.

Alex Poliakov, Head of Customer Solutions at DBOS, introduces Durable Execution,
a set of techniques that originated in transactional processing and is now
growing in popularity with agent builders. The talk covers the guarantees
durability can and cannot provide, why it is becoming a key pattern in AI
agents, and how DBOS achieves it using only Postgres, including queueing,
upgrading long-running workflows, and forking.

Alex Seriy, Senior Staff Sales Engineer at Cockroach Labs, takes it one layer
down, to where agent and workflow state actually lives. He covers how a
distributed SQL database that speaks Postgres survives node, zone, and region
failures with no manual intervention and no data loss, how it scales by adding
nodes instead of sharding or re-architecting, and how reading data exactly as it
was in the past helps with both debugging non-deterministic systems and
answering auditors. He closes on keeping transactional data, workflow state, and
vector embeddings in one place instead of three.

For developers with experience in agentic development or a general interest in
reliable software. Postgres experience is a plus.
