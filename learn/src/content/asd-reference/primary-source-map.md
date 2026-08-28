# Primary Source Map

**Purpose:** Keep implementation-sensitive course claims tied to official documentation, standards, and original engineering publications.  
**Last reviewed:** 2026-08-26

SDKs, protocols, model behavior, pricing, and product features change. Re-check implementation details before publishing a dated code lab. The architectural principles in the lessons should remain useful even when adapters change.

## How to use this page

- Use the lesson as the conceptual source of truth for the course.
- Use these links to verify current API names and implementation behavior.
- Prefer primary sources over blog summaries.
- Record a new review date when changing framework-specific code.
- Do not infer production guarantees from a feature name. Test the behavior.

## Agent architecture and control patterns

| Source | Course use | Modules |
|---|---|---|
| [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) | Workflows versus agents; simple composable patterns; routing, parallelization, orchestrator-worker, evaluator-optimizer | 01, 02, 06, 09, 15 |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) | Agents, tools, handoffs, guardrails, sessions, tracing, and implementation adapter | 02, 03, 05, 08, 09, 12 |
| [OpenAI Agents SDK: Running Agents](https://openai.github.io/openai-agents-python/running_agents/) | Agent loop behavior, turns, execution, and integration boundaries | 02, 07 |
| [LangGraph: Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) | Explicit graph patterns and agent/workflow distinctions | 02, 06 |
| [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview) | Graph runtime, durable execution, human control, and memory adapter | 06, 07, 08 |

## Structured outputs and tool use

| Source | Course use | Modules |
|---|---|---|
| [OpenAI: Function Calling](https://developers.openai.com/api/docs/guides/function-calling) | Typed tool calling and application execution | 02, 03 |
| [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | Schema-constrained decisions and artifacts | 02, 03, 11 |
| [Anthropic: Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview) | Tool schemas and provider-specific adapter behavior | 02, 03 |
| [OpenAI Agents SDK: Tools](https://openai.github.io/openai-agents-python/tools/) | Tool wrappers, hosted tools, function tools, and adapter examples | 03 |
| [OpenAI Agents SDK: Guardrails](https://openai.github.io/openai-agents-python/guardrails/) | Input/output/tool guardrail adapter behavior | 02, 10 |

## Context engineering, retrieval, and memory

| Source | Course use | Modules |
|---|---|---|
| [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Context selection, compaction, tool-result handling, and long-horizon context | 04, 05, 13 |
| [LangChain: Short-Term Memory](https://docs.langchain.com/oss/python/langchain/short-term-memory) | Thread-scoped state and context management adapter | 05 |
| [LangChain: Long-Term Memory](https://docs.langchain.com/oss/python/langchain/long-term-memory) | Cross-thread memory concepts and implementation adapter | 05 |
| [LangChain: Memory Overview](https://docs.langchain.com/oss/python/concepts/memory) | Memory categories and framework vocabulary | 05 |
| [OpenAI Agents SDK: Sessions](https://openai.github.io/openai-agents-python/sessions/) | Session history adapter | 05 |

## Durable and long-running execution

| Source | Course use | Modules |
|---|---|---|
| [Temporal: Understanding Durable Execution](https://docs.temporal.io/evaluate/understanding-temporal) | Event history, recovery, replay, and durable workflow model | 07 |
| [Temporal: Workflows](https://docs.temporal.io/workflows) | Deterministic workflow code and lifecycle | 07 |
| [Temporal: Activities](https://docs.temporal.io/activities) | External work, retries, idempotency, and activity boundaries | 03, 07 |
| [Temporal: Activity Definition and Retry Policy](https://docs.temporal.io/activity-definition) | Timeouts, retries, heartbeats, and errors | 07, 13 |
| [Temporal: Event History](https://docs.temporal.io/encyclopedia/event-history/event-history-java) | Event-history model and replay explanation | 07 |
| [Temporal: Worker Versioning](https://docs.temporal.io/production-deployment/worker-deployments/worker-versioning) | Safe deployment of long-running workflows | 07, 14 |
| [LangGraph: Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) | Checkpoints, threads, and runtime persistence adapter | 05, 07 |
| [LangGraph: Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | Pause/resume and external input adapter | 07, 08 |

## Human-in-the-loop

| Source | Course use | Modules |
|---|---|---|
| [OpenAI Agents SDK: Human in the Loop](https://openai.github.io/openai-agents-python/human_in_the_loop/) | Approval and resumption adapter behavior | 08 |
| [LangChain: Human-in-the-Loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) | Middleware and interrupt patterns for tool review | 08 |
| [LangGraph: Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | Durable pause and resume | 07, 08 |

## Multi-agent and interoperability

| Source | Course use | Modules |
|---|---|---|
| [OpenAI Agents SDK: Handoffs](https://openai.github.io/openai-agents-python/handoffs/) | Handoffs versus agents-as-tools | 09 |
| [Model Context Protocol: Introduction](https://modelcontextprotocol.io/introduction) | MCP purpose and ecosystem vocabulary | 09 |
| [Model Context Protocol: Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture) | Host/client/server boundaries and capability negotiation | 09, 10 |
| [Model Context Protocol: Security Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices) | Authorization, confused-deputy, token, and trust-boundary guidance | 09, 10 |
| [Agent2Agent Protocol](https://github.com/a2aproject/a2a) | Current A2A specification and reference implementations | 09 |
| [Google: Announcing A2A](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) | Original protocol rationale and cross-vendor task model | 09 |

## Security, isolation, and governance

| Source | Course use | Modules |
|---|---|---|
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Agent-specific threat categories and mitigation review | 03, 05, 09, 10, 14 |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) | LLM application risks | 04, 10 |
| [OWASP: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | Direct and indirect injection | 04, 10 |
| [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) | Govern, map, measure, and manage risk | 00, 10, 14, 15 |
| [NIST AI RMF: Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) | Generative-AI risk considerations and controls | 10, 14 |
| [Docker Engine Security](https://docs.docker.com/engine/security/) | Container isolation limits and hardening context | 10 |
| [Docker AI Sandboxes: Isolation](https://docs.docker.com/ai/sandboxes/security/isolation/) | Sandbox isolation for agent-executed development tasks | 10 |

## Evaluation and testing

| Source | Course use | Modules |
|---|---|---|
| [OpenAI: Evaluate Agent Workflows](https://developers.openai.com/api/docs/guides/agent-evals) | Agent evaluation concepts and current platform adapter | 11 |
| [OpenAI: Trace Grading](https://developers.openai.com/api/docs/guides/trace-grading) | Trajectory and trace-level grading | 11, 12 |
| [OpenAI: Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Dataset and grader design | 11 |
| [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Agent-eval methodology and failure analysis | 11 |
| [OpenAI Agents SDK: Tracing](https://openai.github.io/openai-agents-python/tracing/) | Trace capture and processor adapter | 11, 12 |

## Observability and reliability

| Source | Course use | Modules |
|---|---|---|
| [OpenTelemetry: Generative AI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) | Current semantic-convention vocabulary; verify stability status before hard-coding | 12 |
| [OpenTelemetry: Observing Generative AI Systems](https://opentelemetry.io/blog/2024/otel-generative-ai/) | GenAI observability rationale and ecosystem context | 12 |
| [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) | SLIs, SLOs, and error budgets | 12 |
| [Google SRE Book: Handling Overload](https://sre.google/sre-book/handling-overload/) | Admission control, load shedding, and overload behavior | 13 |

## Latency, cost, and scale

| Source | Course use | Modules |
|---|---|---|
| [OpenAI: Latency Optimization](https://developers.openai.com/api/docs/guides/latency-optimization) | Current provider-specific latency techniques | 13 |
| [OpenAI: Prompt Caching](https://developers.openai.com/api/docs/guides/prompt-caching) | Prompt-cache behavior and constraints | 13 |
| [OpenAI: Batch API](https://developers.openai.com/api/docs/guides/batch) | Offline/batch processing adapter | 13 |
| [Anthropic: Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) | Provider-specific caching adapter | 13 |

## Deployment and production operations

| Source | Course use | Modules |
|---|---|---|
| [OpenAI: Production Best Practices](https://developers.openai.com/api/docs/guides/production-best-practices) | Current API production guidance | 13, 14 |
| [Temporal: Worker Versioning](https://docs.temporal.io/production-deployment/worker-deployments/worker-versioning) | Long-running workflow deployment | 07, 14 |
| [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) | Governance and operational lifecycle | 10, 14 |

## Role competency anchors

These sources should inform positioning and interview outcomes, not become a keyword checklist.

| Source | Why it matters |
|---|---|
| [OpenAI: Applied AI Engineer, Enterprise](https://openai.com/careers/applied-ai-engineer-enterprise-san-francisco/) | Illustrates the breadth expected across models, agents, retrieval, tools, reliability, observability, latency, cost, safety, security, and governance |
| [OpenAI: Forward Deployed Engineer](https://openai.com/careers/forward-deployed-engineer-sf/) | Illustrates end-to-end design, deployment, and customer-environment ownership |
| [Anthropic Careers](https://www.anthropic.com/careers) | Use current role pages when publishing role-specific guidance |
| [Google Careers](https://www.google.com/about/careers/applications/) | Use the current job description when tailoring interview modules to a specific opening |

## Review checklist for framework-specific labs

Before publishing or updating a lab, verify:

1. The linked page still exists.
2. The feature is stable enough for the lesson.
3. The code uses current package and API names.
4. Authentication and data-retention behavior are documented.
5. Tool approval and tracing behavior are tested, not assumed.
6. Durable execution semantics are demonstrated with a crash test.
7. Protocol security guidance is reflected in the example.
8. The lab preserves the architecture-first explanation.
9. Provider pricing or limits are dated and kept out of timeless lesson claims.
10. The page’s `last_reviewed` field is updated.
