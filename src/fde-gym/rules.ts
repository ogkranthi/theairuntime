import type {
  ArchitectureEdge,
  ArchitectureGraph,
  ArchitectureNode,
  CompetencyId,
  InterviewSession,
  RuleFinding,
  SemanticRevision,
} from "./types";

const kindCount = (graph: ArchitectureGraph, kind: ArchitectureNode["kind"]) =>
  graph.nodes.filter((node) => node.kind === kind).length;

const nodeById = (graph: ArchitectureGraph) =>
  new Map(graph.nodes.map((node) => [node.id, node]));

const edgeKey = (edge: ArchitectureEdge) =>
  `${edge.source}->${edge.target}:${edge.label ?? ""}`;

const normalizedLabel = (node: ArchitectureNode) =>
  `${node.label} ${node.technology ?? ""}`.toLowerCase();

const SIDE_EFFECT_WORDS = [
  "approve",
  "reject",
  "onboard",
  "payment",
  "transfer",
  "update",
  "write",
  "submit",
  "file",
  "case system",
  "regulatory",
];

const isPotentialSideEffect = (node: ArchitectureNode) => {
  const label = normalizedLabel(node);
  return SIDE_EFFECT_WORDS.some((word) => label.includes(word));
};

const hasAnyKind = (
  graph: ArchitectureGraph,
  kinds: ArchitectureNode["kind"][],
) => graph.nodes.some((node) => kinds.includes(node.kind));

function finding(
  id: string,
  severity: RuleFinding["severity"],
  competencies: CompetencyId[],
  message: string,
  nodeRefs: string[] = [],
  edgeRefs: string[] = [],
): RuleFinding {
  return { id, severity, competencies, message, nodeRefs, edgeRefs };
}

export function analyzeGraph(
  graph: ArchitectureGraph,
  session: InterviewSession,
): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const byId = nodeById(graph);
  const revealed = new Set(session.revealedFactIds);

  if (kindCount(graph, "agent") + kindCount(graph, "orchestrator") >= 4) {
    const refs = graph.nodes
      .filter((node) => node.kind === "agent" || node.kind === "orchestrator")
      .map((node) => node.id);
    findings.push(
      finding(
        "agent-proliferation",
        "warning",
        ["architecture_decomposition", "fde_judgment"],
        "The graph contains several agentic components. Each one must justify independent context, authority, lifecycle, or ownership.",
        refs,
      ),
    );
  }

  if (
    hasAnyKind(graph, ["vector-store"]) &&
    !hasAnyKind(graph, ["database", "object-store"])
  ) {
    const refs = graph.nodes
      .filter((node) => node.kind === "vector-store")
      .map((node) => node.id);
    findings.push(
      finding(
        "index-without-authority",
        "warning",
        ["state_data_architecture", "context_engineering"],
        "A vector index is present without an obvious authoritative evidence or domain store.",
        refs,
      ),
    );
  }

  if (
    revealed.has("duration") &&
    !hasAnyKind(graph, ["workflow", "queue", "database"])
  ) {
    findings.push(
      finding(
        "long-running-without-durability",
        "critical",
        ["execution_reliability", "state_data_architecture"],
        "The work can run for days, but the graph does not show a persisted execution boundary that survives a crash or a deploy.",
      ),
    );
  }

  if (
    revealed.has("authority") &&
    !hasAnyKind(graph, ["human", "policy"])
  ) {
    findings.push(
      finding(
        "authority-without-boundary",
        "critical",
        ["human_system_interaction", "agent_authority_safety"],
        "Consequential decisions are in scope, but the graph has no visible human or policy boundary in front of them.",
      ),
    );
  }

  const riskyEdges = graph.edges.filter((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return false;
    const sourceIsModel =
      source.kind === "agent" ||
      source.kind === "orchestrator" ||
      source.kind === "llm";
    const targetIsAction =
      target.kind === "tool" ||
      target.kind === "api" ||
      target.kind === "application" ||
      target.kind === "custom";
    return sourceIsModel && targetIsAction && isPotentialSideEffect(target);
  });

  if (riskyEdges.length > 0 && !hasAnyKind(graph, ["policy", "human", "workflow"])) {
    findings.push(
      finding(
        "direct-model-side-effect",
        "critical",
        ["action_safety", "agent_authority_safety", "tool_boundaries"],
        "A model-controlled component connects directly to a likely side-effecting system without an obvious policy, workflow, or human boundary.",
        riskyEdges.flatMap((edge) => [edge.source, edge.target]),
        riskyEdges.map((edge) => edge.id),
      ),
    );
  }

  if (!hasAnyKind(graph, ["identity", "policy"]) && graph.nodes.length >= 5) {
    findings.push(
      finding(
        "identity-not-visible",
        "warning",
        ["data_identity_security", "agent_authority_safety"],
        "The graph does not show where identity, permission checks, or policy enforcement enter data and tool paths.",
      ),
    );
  }

  if (!hasAnyKind(graph, ["evaluator"]) && graph.nodes.length >= 5) {
    findings.push(
      finding(
        "evaluation-not-visible",
        "info",
        ["ai_quality_evaluation", "system_operational_validation"],
        "Evaluation is not visible in the graph. The transcript may still establish an adequate evaluation and release strategy.",
      ),
    );
  }

  if (!hasAnyKind(graph, ["observability"]) && graph.nodes.length >= 5) {
    findings.push(
      finding(
        "operations-not-visible",
        "info",
        ["operational_visibility", "trust_explainability"],
        "The graph does not show how operators or auditors reconstruct an incorrect outcome.",
      ),
    );
  }

  if (
    hasAnyKind(graph, ["agent", "orchestrator"]) &&
    !hasAnyKind(graph, ["workflow"]) &&
    graph.nodes.length >= 6
  ) {
    findings.push(
      finding(
        "agent-owned-lifecycle",
        "warning",
        ["architecture_decomposition", "planning_orchestration"],
        "The graph appears to place lifecycle control primarily inside agentic components. The candidate should defend where deterministic control lives.",
      ),
    );
  }

  return dedupeFindings(findings);
}

export function summarizeGraph(graph: ArchitectureGraph): string {
  if (graph.nodes.length === 0) return "No architecture components yet.";

  const byId = nodeById(graph);
  const nodes = graph.nodes
    .map((node) => {
      const tech = node.technology ? `, technology: ${node.technology}` : "";
      return `${node.id}: ${node.label} [${node.kind}${tech}]`;
    })
    .join("\n");

  const edges = graph.edges.length
    ? graph.edges
        .map((edge) => {
          const source = byId.get(edge.source)?.label ?? edge.source;
          const target = byId.get(edge.target)?.label ?? edge.target;
          const label = edge.label ? ` (${edge.label})` : "";
          return `${edge.id}: ${source} -> ${target}${label}`;
        })
        .join("\n")
    : "No connections yet.";

  return `Nodes:\n${nodes}\n\nConnections:\n${edges}`;
}

export function semanticGraphRevisions(
  previous: ArchitectureGraph,
  next: ArchitectureGraph,
  atSeconds: number,
): SemanticRevision[] {
  const revisions: SemanticRevision[] = [];
  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]));
  const nextNodes = new Map(next.nodes.map((node) => [node.id, node]));
  const previousEdges = new Map(previous.edges.map((edge) => [edgeKey(edge), edge]));
  const nextEdges = new Map(next.edges.map((edge) => [edgeKey(edge), edge]));

  const addedNodes = next.nodes.filter((node) => !previousNodes.has(node.id));
  const removedNodes = previous.nodes.filter((node) => !nextNodes.has(node.id));
  const changedNodes = next.nodes.filter((node) => {
    const old = previousNodes.get(node.id);
    if (!old) return false;
    return (
      old.kind !== node.kind ||
      old.label !== node.label ||
      (old.technology ?? "") !== (node.technology ?? "")
    );
  });

  const addedEdges = next.edges.filter((edge) => !previousEdges.has(edgeKey(edge)));
  const removedEdges = previous.edges.filter((edge) => !nextEdges.has(edgeKey(edge)));

  const push = (
    summary: string,
    nodeRefs: string[],
    edgeRefs: string[],
  ) => {
    revisions.push({
      id: `revision-${next.revision}-${revisions.length + 1}`,
      atSeconds,
      summary,
      nodeRefs,
      edgeRefs,
    });
  };

  if (addedNodes.length) {
    push(
      `Added ${addedNodes.map((node) => node.label).join(", ")}.`,
      addedNodes.map((node) => node.id),
      [],
    );
  }
  if (removedNodes.length) {
    push(
      `Removed ${removedNodes.map((node) => node.label).join(", ")}.`,
      removedNodes.map((node) => node.id),
      [],
    );
  }
  if (changedNodes.length) {
    push(
      `Changed ${changedNodes.map((node) => node.label).join(", ")}.`,
      changedNodes.map((node) => node.id),
      [],
    );
  }
  if (addedEdges.length) {
    push(
      `Added ${addedEdges.length} architecture connection${addedEdges.length === 1 ? "" : "s"}.`,
      addedEdges.flatMap((edge) => [edge.source, edge.target]),
      addedEdges.map((edge) => edge.id),
    );
  }
  if (removedEdges.length) {
    push(
      `Removed ${removedEdges.length} architecture connection${removedEdges.length === 1 ? "" : "s"}.`,
      removedEdges.flatMap((edge) => [edge.source, edge.target]),
      removedEdges.map((edge) => edge.id),
    );
  }

  return revisions;
}

function dedupeFindings(findings: RuleFinding[]): RuleFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
