"use client";

import { useMemo } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ApiNode } from "./ApiNode";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";

export function ApiCanvas() {
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const onNodesChange = useVibeApiStore((state) => state.onNodesChange);
  const onEdgesChange = useVibeApiStore((state) => state.onEdgesChange);
  const onConnect = useVibeApiStore((state) => state.onConnect);
  const beginNodeDrag = useVibeApiStore((state) => state.beginNodeDrag);
  const selectNode = useVibeApiStore((state) => state.selectNode);
  const selectEdge = useVibeApiStore((state) => state.selectEdge);
  const nodeTypes = useMemo<NodeTypes>(() => ({ apiNode: ApiNode }), []);
  const displayEdges = useMemo(() => workflow.edges.map((edge) => ({
    ...edge,
    label: edge.label || edge.mapping,
    style: { stroke: "var(--text-soft)", strokeWidth: 1.5 },
    labelStyle: { fill: "var(--text-soft)", fontFamily: "Geist Mono Variable", fontSize: 9 },
    labelBgStyle: { fill: "var(--canvas)", fillOpacity: .95 },
  })), [workflow.edges]);

  return (
    <div className="canvas-surface" id="api-flow-canvas">
      <ReactFlow
        nodes={workflow.nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={beginNodeDrag}
        onNodeClick={(_, node) => selectNode(node.id)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => { selectNode(null); selectEdge(null); }}
        fitView
        fitViewOptions={{ padding: .22, maxZoom: 1.1 }}
        minZoom={.2}
        maxZoom={2}
        snapToGrid
        snapGrid={[12, 12]}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="var(--canvas-dot)" gap={20} size={1} />
        <MiniMap pannable zoomable bgColor="var(--panel-strong)" nodeColor="var(--accent-muted)" maskColor="var(--minimap-mask)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
