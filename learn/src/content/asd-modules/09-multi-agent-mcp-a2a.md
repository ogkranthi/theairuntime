---
id: "09"
slug: "multi-agent-mcp-a2a"
title: "Multi-Agent Design, MCP, and A2A"
track: "Interoperability"
duration_minutes: 120
difficulty: "Advanced"
build_milestone: "Expose one Atlas capability through MCP and evaluate whether an A2A boundary is justified."
objectives:
  - "Choose between one agent, agents as tools, handoffs, and independent agents"
  - "Explain MCP host, client, server, capability, and consent boundaries"
  - "Evaluate when an A2A boundary is justified and how to secure it"
prerequisites:
  - "orchestration-patterns"
  - "tool-contracts-and-side-effects"
---

# Multi-Agent Design, MCP, and A2A

## What you will design

You will decide when Atlas needs multiple agents, distinguish handoffs from agents-as-tools, expose a bounded capability through MCP, and evaluate whether a remote-agent boundary through A2A is justified.

## Multi-agent is a deployment decision

A multi-agent diagram can look sophisticated while hiding basic questions:

- Why can one agent not complete the task?
- What context is isolated?
- What authority differs?
- What can run independently?
- How are results verified?
- Who owns global state?
- What happens when agents disagree?
- How are cost and latency bounded?
- How is identity propagated?

Splitting a prompt into “researcher,” “critic,” and “writer” does not automatically create better architecture. It may only create more model calls.

## Reasons to split

A separate agent or service can be justified by:

### Context isolation

A subtask needs a large specialized context that should not pollute the coordinator.

### Tool or authority isolation

One component can read public data; another can access internal records; a privileged executor can perform side effects only after approval.

### Independent scaling

Document extraction, web research, and policy analysis have different workloads.

### Ownership boundary

Different teams or vendors operate components.

### Model specialization

A task has measurably different quality/cost needs.

### Long-running delegation

A remote capability accepts a task and returns status and artifacts asynchronously.

### Fault containment

Failure or compromise in one component should not grant access to all tools and data.

If the only reason is “agents collaborate better,” require evidence.

## Coordination patterns

### Agent as a tool

The coordinator invokes a specialist and receives a bounded result.

```text
Coordinator → document-analysis agent → structured findings
```

The coordinator retains control and user interaction.

Use when the specialist is a capability with a clear contract.

### Handoff

Control of the conversation or task moves to another agent.

```text
Intake agent → sanctions specialist
```

Use when the specialist should own the next interaction and state. Define how control returns.

### Shared supervisor

A supervisor delegates subtasks and synthesizes results.

Use when work can be decomposed and the supervisor can verify completion.

### Peer collaboration

Peers communicate and negotiate. This is harder to bound and debug. Use only when the domain truly requires decentralized coordination.

## Shared state vs exchanged artifacts

Avoid giving every agent mutable access to the same giant state object.

Prefer:

- immutable task input;
- bounded artifact output;
- versioned shared records;
- explicit ownership;
- deterministic merge;
- event-based status.

An artifact might contain:

```json
{
  "task_id": "task_media_123",
  "producer": "adverse-media-agent",
  "status": "completed",
  "claims": [],
  "source_refs": [],
  "unresolved_questions": [],
  "versions": {
    "agent": "media-agent-3",
    "model": "provider:model",
    "prompt": "media-research-12"
  }
}
```

## Disagreement

When specialists disagree:

1. preserve both outputs and provenance;
2. apply deterministic source hierarchy where available;
3. run a targeted adjudication step;
4. request more evidence;
5. escalate to a human.

Do not average two unsupported answers.

## MCP: agent-to-tool and context interface

The Model Context Protocol standardizes how AI applications connect to tools, resources, and prompts through a host/client/server architecture.

For system design, focus on the boundary:

- a host owns the user experience and security context;
- an MCP client connects to a server;
- the server advertises capabilities;
- tool calls use typed inputs;
- authorization and consent remain application responsibilities.

MCP does not make a tool safe. You still need:

- authentication;
- token audience validation;
- least privilege;
- tenant scoping;
- output handling;
- rate limits;
- audit;
- prompt-injection defenses;
- approval for side effects.

A useful Atlas exercise is to expose `get_corporate_registry_record` through an MCP server with a narrow contract.

## A2A: agent-to-agent task delegation

Agent2Agent defines a protocol for opaque agentic applications to discover capabilities, exchange tasks, send status, and return artifacts.

Think of the distinction:

```text
MCP: an agent/application accesses tools, data, and workflows
A2A: one agentic application delegates work to another agentic application
```

They can complement each other. An A2A remote agent may internally use MCP tools.

A2A is more appropriate when the remote party:

- owns its own execution loop;
- may work asynchronously;
- exposes task status;
- returns artifacts;
- should not expose internal tools or reasoning;
- belongs to another service, team, vendor, or security domain.

Do not use A2A for an ordinary function call inside one process.

## Remote-agent contract

Specify:

- agent identity and capability;
- task schema;
- authentication;
- tenant and purpose;
- status lifecycle;
- artifact schema;
- cancellation;
- timeout and SLA;
- idempotency;
- data retention;
- trust and verification;
- version compatibility.

The caller must validate remote artifacts. Protocol interoperability is not semantic correctness.

## Multi-agent cost model

Total latency may include:

```text
coordination + parallel critical path + synthesis + retries
```

Total cost includes:

```text
planner calls + worker calls + duplicated context + synthesis + eval/verification
```

Track cost per successful subtask, not only total tokens.

## Security boundaries

A strong multi-agent design may intentionally separate:

- browsing agent: untrusted internet, no secrets, restricted egress;
- internal evidence agent: private read access, no external network;
- synthesis agent: receives sanitized artifacts, no direct side effects;
- executor: deterministic, approved effects only.

This is more valuable than naming each agent after a job title.

## Failure injection: context laundering

A browsing agent returns a “finding” that contains malicious instructions. The coordinator treats the specialist output as trusted because it came from another internal agent.

Controls:

- artifacts distinguish data from instructions;
- source provenance survives delegation;
- specialist output remains untrusted unless verified;
- coordinator cannot gain new authority from text;
- executor ignores natural-language requests and accepts typed approved intents;
- traces link all contributing tasks.

## SHIP: add an interoperability boundary

1. Expose one read-only Atlas tool through MCP.
2. Document authorization and tenant behavior.
3. Create a specialist contract for adverse-media research.
4. Compare three implementations:
   - local function;
   - agent-as-tool;
   - remote A2A agent.
5. Choose one and write the decision.

Do not add A2A unless the remote-agent properties justify it.

## RUN: break delegation

Test:

1. remote agent returns malformed artifact;
2. remote task finishes after caller timeout;
3. duplicate task delivery;
4. remote agent claims completion with missing mandatory evidence;
5. source injection survives into the artifact;
6. tenant identity is absent;
7. remote agent version changes output semantics.

## DESIGN: interview drill

**Prompt:** Design a travel-planning system that coordinates flight, hotel, policy, expense, and calendar agents.

Explain:

- which capabilities are tools;
- which are remote agents;
- who owns user interaction;
- shared state;
- identity;
- side effects;
- cancellation;
- consistency;
- conflict resolution;
- why the design is not simply one agent with every credential.

## Check your understanding

1. Name three valid reasons to split agents.
2. What is the difference between a handoff and an agent-as-tool?
3. What does MCP standardize, and what does it not guarantee?
4. When is A2A more appropriate than a function call?
5. Why must provenance survive agent delegation?

## Primary references

- [MCP Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [Agent2Agent Protocol](https://github.com/a2aproject/a2a)
- [Google: Announcing A2A](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [OpenAI Agents SDK: Agents as Tools and Handoffs](https://openai.github.io/openai-agents-python/)
