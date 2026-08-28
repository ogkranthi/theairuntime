import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createId } from "./id";
import type {
  ArchitectureGraph,
  ComponentKind,
} from "./types";

interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  kind: ComponentKind;
  technology?: string;
}

type CanvasNode = Node<CanvasNodeData, "architecture">;
type CanvasEdge = Edge<Record<string, unknown>>;

interface Props {
  graph: ArchitectureGraph;
  onChange: (graph: ArchitectureGraph) => void;
  disabled?: boolean;
}


function ArchitectureNodeCard({ data }: NodeProps<CanvasNode>) {
  return (
    <div className="fg-node-card">
      <Handle type="target" position={Position.Left} />
      <span className="fg-node-card__kind">{data.kind}</span>
      <strong>{data.label}</strong>
      {data.technology ? <small>{data.technology}</small> : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const PALETTE: Array<{
  kind: ComponentKind;
  label: string;
}> = [
  { kind: "user", label: "User or operator" },
  { kind: "application", label: "Application" },
  { kind: "agent", label: "Agent" },
  { kind: "llm", label: "LLM" },
  { kind: "orchestrator", label: "Orchestrator" },
  { kind: "workflow", label: "Workflow engine" },
  { kind: "tool", label: "Tool" },
  { kind: "api", label: "Service or API" },
  { kind: "retriever", label: "Retriever" },
  { kind: "vector-store", label: "Vector store" },
  { kind: "database", label: "Database" },
  { kind: "object-store", label: "Object store" },
  { kind: "queue", label: "Queue" },
  { kind: "cache", label: "Cache" },
  { kind: "human", label: "Human review" },
  { kind: "policy", label: "Policy boundary" },
  { kind: "identity", label: "Identity and access" },
  { kind: "evaluator", label: "Evaluator" },
  { kind: "observability", label: "Operational visibility" },
  { kind: "custom", label: "Custom component" },
];

const nodeClass = (kind: ComponentKind) =>
  `fg-node fg-node--${kind.replace(/[^a-z]/g, "-")}`;

function toFlowNodes(graph: ArchitectureGraph): CanvasNode[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: {
      label: node.label,
      kind: node.kind,
      technology: node.technology,
    },
    type: "architecture",
    className: nodeClass(node.kind),
  }));
}

function toFlowEdges(graph: ArchitectureGraph): CanvasEdge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

function fromFlow(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  revision: number,
): ArchitectureGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data.kind,
      label: String(node.data.label || "Component"),
      technology: node.data.technology
        ? String(node.data.technology)
        : undefined,
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label:
        typeof edge.label === "string" && edge.label.trim()
          ? edge.label.trim()
          : undefined,
    })),
    revision,
  };
}

export default function ArchitectureCanvas({
  graph,
  onChange,
  disabled = false,
}: Props) {
  const nodeTypes = useMemo(
    () => ({ architecture: ArchitectureNodeCard }),
    [],
  );
  const nodes = useMemo(() => toFlowNodes(graph), [graph]);
  const edges = useMemo(() => toFlowEdges(graph), [graph]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectTargetId, setConnectTargetId] = useState<string>("");

  const commit = (nextNodes: CanvasNode[], nextEdges: CanvasEdge[]) => {
    onChange(fromFlow(nextNodes, nextEdges, graph.revision + 1));
  };

  const onNodesChange = (changes: NodeChange<CanvasNode>[]) => {
    const next = applyNodeChanges(changes, nodes);
    commit(next, edges);
  };

  const onEdgesChange = (changes: EdgeChange<CanvasEdge>[]) => {
    const next = applyEdgeChanges(changes, edges);
    commit(nodes, next);
  };

  const onConnect = (connection: Connection) => {
    const next = addEdge(
      {
        ...connection,
        id: `edge-${createId()}`,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      edges,
    );
    commit(nodes, next);
  };

  /**
   * Dragging between handles is the fast path, but it is pointer only. This is
   * the same operation for a keyboard or screen reader user: pick a target from
   * the inspector and connect. Without it the canvas cannot be completed
   * without a mouse.
   */
  const connectSelectedTo = (targetId: string) => {
    if (!selectedNodeId || !targetId || targetId === selectedNodeId) return;
    const exists = edges.some(
      (edge) => edge.source === selectedNodeId && edge.target === targetId,
    );
    if (exists) {
      setConnectTargetId("");
      return;
    }
    commit(nodes, [
      ...edges,
      {
        id: `edge-${createId()}`,
        source: selectedNodeId,
        target: targetId,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ]);
    setConnectTargetId("");
  };

  const addComponent = (kind: ComponentKind, defaultLabel: string) => {
    const sequence = graph.nodes.length;
    const node: CanvasNode = {
      id: `node-${createId()}`,
      position: {
        x: 60 + (sequence % 4) * 180,
        y: 60 + Math.floor(sequence / 4) * 120,
      },
      data: {
        kind,
        label: defaultLabel,
      },
      type: "architecture",
      className: nodeClass(kind),
    };
    commit([...nodes, node], edges);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);

  const updateNode = (
    patch: Partial<Pick<CanvasNodeData, "label" | "kind" | "technology">>,
  ) => {
    if (!selectedNode) return;
    const next = nodes.map((node) =>
      node.id === selectedNode.id
        ? {
            ...node,
            data: { ...node.data, ...patch },
            className: nodeClass(patch.kind ?? node.data.kind),
          }
        : node,
    );
    commit(next, edges);
  };

  const updateEdgeLabel = (label: string) => {
    if (!selectedEdge) return;
    const next = edges.map((edge) =>
      edge.id === selectedEdge.id ? { ...edge, label } : edge,
    );
    commit(nodes, next);
  };

  const deleteSelected = () => {
    if (selectedNode) {
      const nextNodes = nodes.filter((node) => node.id !== selectedNode.id);
      const nextEdges = edges.filter(
        (edge) =>
          edge.source !== selectedNode.id && edge.target !== selectedNode.id,
      );
      commit(nextNodes, nextEdges);
      setSelectedNodeId(null);
      return;
    }
    if (selectedEdge) {
      commit(
        nodes,
        edges.filter((edge) => edge.id !== selectedEdge.id),
      );
      setSelectedEdgeId(null);
    }
  };

  return (
    <section className="fg-canvas" aria-label="Architecture canvas">
      <div className="fg-canvas__palette">
        <div className="fg-panel-title">
          <div>
            <p className="fg-eyebrow">ARCHITECTURE</p>
            <h2>Structured canvas</h2>
          </div>
          <span>{graph.nodes.length} components</span>
        </div>

        <details open>
          <summary>Add component</summary>
          <div className="fg-palette-grid">
            {PALETTE.map((item) => (
              <button
                key={`${item.kind}-${item.label}`}
                type="button"
                disabled={disabled}
                onClick={() => addComponent(item.kind, item.label)}
              >
                <span className={nodeClass(item.kind)} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </details>

        {selectedNode ? (
          <div className="fg-inspector" aria-label="Selected component">
            <h3>Edit component</h3>
            <label>
              Label
              <input
                value={String(selectedNode.data.label)}
                onChange={(event) =>
                  updateNode({ label: event.currentTarget.value })
                }
                disabled={disabled}
              />
            </label>
            <label>
              Architectural type
              <select
                value={selectedNode.data.kind}
                onChange={(event) =>
                  updateNode({
                    kind: event.currentTarget.value as ComponentKind,
                  })
                }
                disabled={disabled}
              >
                {PALETTE.map((item) => (
                  <option key={item.kind} value={item.kind}>
                    {item.kind}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Optional technology
              <input
                value={String(selectedNode.data.technology ?? "")}
                placeholder="Temporal, Postgres, pgvector..."
                onChange={(event) =>
                  updateNode({ technology: event.currentTarget.value })
                }
                disabled={disabled}
              />
            </label>
            <label>
              Connect to
              <select
                value={connectTargetId}
                onChange={(event) => setConnectTargetId(event.currentTarget.value)}
                disabled={disabled || nodes.length < 2}
              >
                <option value="">Choose a component...</option>
                {nodes
                  .filter((node) => node.id !== selectedNode.id)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {String(node.data.label)}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => connectSelectedTo(connectTargetId)}
              disabled={disabled || !connectTargetId}
            >
              Connect
            </button>
            <button
              type="button"
              className="fg-inspector__danger"
              onClick={deleteSelected}
              disabled={disabled}
            >
              Delete component
            </button>
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="fg-inspector" aria-label="Selected connection">
            <h3>Edit connection</h3>
            <label>
              Optional label
              <input
                value={
                  typeof selectedEdge.label === "string"
                    ? selectedEdge.label
                    : ""
                }
                placeholder="async job, retrieve, approve..."
                onChange={(event) =>
                  updateEdgeLabel(event.currentTarget.value)
                }
                disabled={disabled}
              />
            </label>
            <button
              type="button"
              className="fg-inspector__danger"
              onClick={deleteSelected}
              disabled={disabled}
            >
              Delete connection
            </button>
          </div>
        ) : null}

        <p className="fg-canvas__help">
          Add components, drag to arrange, and connect handles. Explain the
          semantics in chat. Technology labels are optional.
        </p>
      </div>

      <div className="fg-canvas__stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={disabled ? undefined : onNodesChange}
          onEdgesChange={disabled ? undefined : onEdgesChange}
          onConnect={disabled ? undefined : onConnect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          fitView
          minZoom={0.25}
          maxZoom={1.8}
          deleteKeyCode={disabled ? null : ["Backspace", "Delete"]}
          nodesConnectable={!disabled}
          nodesDraggable={!disabled}
          elementsSelectable
          aria-label="Build the agentic system architecture"
        >
          <Background gap={22} size={1} />
          <Controls showInteractive={!disabled} />
        </ReactFlow>
      </div>
    </section>
  );
}
