---
title: "Securing CI/CD in an Agentic World: Claude Code GitHub Action Case"
url: https://www.microsoft.com/en-us/security/blog/2026/06/05/securing-ci-cd-in-agentic-world-claude-code-github-action-case/
source: Microsoft Defender Security Research
author: Dor Edry, Amit Eliahu
pillar: reliability
tags: [security, ci-cd, agents, prompt-injection]
summary: |
  Microsoft researchers found and disclosed a prompt injection attack against
  the Claude Code GitHub Action: an attacker controlling a PR comment can hide
  instructions in HTML comments that direct Claude to read /proc/self/environ
  and leak ANTHROPIC_API_KEY. The root cause was an inconsistent trust boundary:
  the Read tool lacked the Bubblewrap namespace isolation applied to the Bash
  tool. Anthropic patched it in Claude Code 2.1.128 by blocking direct access
  to sensitive /proc paths. The practical lesson for teams using agentic CI/CD:
  every tool surface the agent can reach is an attack surface, and isolation
  must be applied consistently across all of them, not just the shell.
publishedAt: 2026-06-05
addedAt: 2026-06-10
relatedEvents: []
relatedSpeakers: []
highlight: false
---
