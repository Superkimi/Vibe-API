"use client";

import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiDefinition } from "./api-schema";
import { apiWorkflowSchema, type ApiEdge, type ApiNodeData, type ApiWorkflow, type WorkflowOutput, type WorkflowWidget } from "./api-schema";
import { blankWorkflow, starterWorkflows } from "./templates";

type Snapshot = { workflows: ApiWorkflow[]; activeId: string };
type State = Snapshot & {
  past: Snapshot[];
  future: Snapshot[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setActive: (id: string) => void;
  addWorkflow: () => void;
  duplicateWorkflow: (id: string) => void;
  deleteWorkflow: (id: string) => void;
  renameWorkflow: (title: string) => void;
  replaceActive: (workflow: ApiWorkflow) => void;
  replaceIfUnchanged: (id: string, revision: number, workflow: ApiWorkflow) => "applied" | "stale" | "missing";
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  beginNodeDrag: () => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  addApiNode: (api: ApiDefinition) => void;
  updateSelectedNode: (patch: Partial<ApiNodeData>) => void;
  updateSelectedEdge: (patch: Partial<Pick<ApiEdge, "label" | "mapping" | "type" | "animated">>) => void;
  removeSelectedNode: () => void;
  removeSelectedEdge: () => void;
  updateOutput: (patch: Partial<WorkflowOutput>) => void;
  addWidget: (widget: WorkflowWidget) => void;
  updateWidget: (id: string, patch: Partial<WorkflowWidget>) => void;
  removeWidget: (id: string) => void;
  autoLayout: () => void;
  undo: () => void;
  redo: () => void;
};

const MAX_HISTORY = 50;
const snapshot = (state: State): Snapshot => ({ workflows: state.workflows, activeId: state.activeId });
const active = (state: State) => state.workflows.find((workflow) => workflow.id === state.activeId) ?? state.workflows[0];

const mutateActive = (state: State, update: (workflow: ApiWorkflow) => ApiWorkflow) => {
  const before = snapshot(state);
  return {
    workflows: state.workflows.map((workflow) => workflow.id === state.activeId ? { ...update(workflow), revision: workflow.revision + 1, updatedAt: new Date().toISOString() } : workflow),
    past: [...state.past, before].slice(-MAX_HISTORY),
    future: [],
  };
};

const withoutHistory = (state: State, update: (workflow: ApiWorkflow) => ApiWorkflow, bumpRevision = false) => ({
  workflows: state.workflows.map((workflow) => workflow.id === state.activeId ? { ...update(workflow), revision: bumpRevision ? workflow.revision + 1 : workflow.revision, updatedAt: bumpRevision ? new Date().toISOString() : workflow.updatedAt } : workflow),
});

export const useVibeApiStore = create<State>()(persist((set) => ({
  workflows: starterWorkflows,
  activeId: starterWorkflows[0].id,
  past: [],
  future: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),
  setActive: (activeId) => set({ activeId, selectedNodeId: null, selectedEdgeId: null }),
  addWorkflow: () => set((state) => {
    const workflow = blankWorkflow();
    return { workflows: [workflow, ...state.workflows], activeId: workflow.id, selectedNodeId: null, selectedEdgeId: null, past: [...state.past, snapshot(state)].slice(-MAX_HISTORY), future: [] };
  }),
  duplicateWorkflow: (id) => set((state) => {
    const source = state.workflows.find((workflow) => workflow.id === id);
    if (!source) return state;
    const copy = { ...structuredClone(source), id: `${source.id}-copy-${Date.now()}`, title: `${source.title} copy`, updatedAt: new Date().toISOString() };
    return { workflows: [copy, ...state.workflows], activeId: copy.id, selectedNodeId: null, selectedEdgeId: null, past: [...state.past, snapshot(state)].slice(-MAX_HISTORY), future: [] };
  }),
  deleteWorkflow: (id) => set((state) => {
    if (state.workflows.length === 1) return state;
    const workflows = state.workflows.filter((workflow) => workflow.id !== id);
    return { workflows, activeId: state.activeId === id ? workflows[0].id : state.activeId, selectedNodeId: null, selectedEdgeId: null, past: [...state.past, snapshot(state)].slice(-MAX_HISTORY), future: [] };
  }),
  renameWorkflow: (title) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, title }))),
  replaceActive: (workflow) => set((state) => mutateActive(state, () => ({ ...workflow, id: state.activeId }))),
  replaceIfUnchanged: (id, revision, workflow) => {
    let outcome: "applied" | "stale" | "missing" = "missing";
    set((state) => {
      const current = state.workflows.find((candidate) => candidate.id === id);
      if (!current) return state;
      if (current.revision !== revision) { outcome = "stale"; return state; }
      outcome = "applied";
      return { workflows: state.workflows.map((candidate) => candidate.id === id ? { ...workflow, id, revision: current.revision + 1, updatedAt: new Date().toISOString() } : candidate), past: [...state.past, snapshot(state)].slice(-MAX_HISTORY), future: [] };
    });
    return outcome;
  },
  onNodesChange: (changes) => set((state) => {
    const modelChange = changes.some((change) => change.type !== "select" && change.type !== "dimensions" && change.type !== "position");
    const positionChange = changes.some((change) => change.type === "position");
    const update = (workflow: ApiWorkflow) => ({ ...workflow, nodes: applyNodeChanges(changes, workflow.nodes) as ApiWorkflow["nodes"] });
    return modelChange ? mutateActive(state, update) : withoutHistory(state, update, positionChange);
  }),
  onEdgesChange: (changes) => set((state) => {
    const modelChange = changes.some((change) => change.type !== "select");
    const update = (workflow: ApiWorkflow) => ({ ...workflow, edges: applyEdgeChanges(changes, workflow.edges) as ApiWorkflow["edges"] });
    return modelChange ? mutateActive(state, update) : withoutHistory(state, update);
  }),
  onConnect: (connection) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, edges: addEdge({ ...connection, id: `edge-${connection.source}-${connection.target}-${Date.now()}`, type: "smoothstep", label: "", mapping: "", animated: false }, workflow.edges) as ApiWorkflow["edges"] }))),
  beginNodeDrag: () => set((state) => ({ past: [...state.past, snapshot(state)].slice(-MAX_HISTORY), future: [] })),
  selectNode: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  selectEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  addApiNode: (api) => set((state) => mutateActive(state, (workflow) => {
    const sourceSlug = api.id.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "api";
    const id = `node-${sourceSlug}-${workflow.nodes.length + 1}`;
    const params = Object.fromEntries(api.params.map((param) => [param.name, param.defaultValue ?? ""]));
    const node = { id, type: "apiNode" as const, position: { x: 120 + (workflow.nodes.length % 3) * 290, y: 100 + Math.floor(workflow.nodes.length / 3) * 190 }, data: { apiId: api.id, label: api.name, subtitle: api.description, method: api.method, path: api.path, params, outputKey: id, transform: "", tone: api.category === "Weather" ? "cyan" as const : api.category === "Finance" ? "amber" as const : "lilac" as const } };
    const widget = { id: `widget-${sourceSlug}-${workflow.nodes.length + 1}`, kind: "json" as const, title: `${api.name} output`, sourceNodeId: id, field: "", format: "text" as const };
    return { ...workflow, nodes: [...workflow.nodes, node], output: { ...workflow.output, widgets: [...workflow.output.widgets, widget] } };
  })),
  updateSelectedNode: (patch) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, nodes: workflow.nodes.map((node) => node.id === state.selectedNodeId ? { ...node, data: { ...node.data, ...patch } } : node) }))),
  updateSelectedEdge: (patch) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, edges: workflow.edges.map((edge) => edge.id === state.selectedEdgeId ? { ...edge, ...patch } : edge) }))),
  removeSelectedNode: () => set((state) => state.selectedNodeId ? { ...mutateActive(state, (workflow) => ({ ...workflow, nodes: workflow.nodes.filter((node) => node.id !== state.selectedNodeId), edges: workflow.edges.filter((edge) => edge.source !== state.selectedNodeId && edge.target !== state.selectedNodeId), output: { ...workflow.output, widgets: workflow.output.widgets.filter((widget) => widget.sourceNodeId !== state.selectedNodeId) } })), selectedNodeId: null } : state),
  removeSelectedEdge: () => set((state) => state.selectedEdgeId ? { ...mutateActive(state, (workflow) => ({ ...workflow, edges: workflow.edges.filter((edge) => edge.id !== state.selectedEdgeId) })), selectedEdgeId: null } : state),
  updateOutput: (patch) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, output: { ...workflow.output, ...patch } }))),
  addWidget: (widget) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, output: { ...workflow.output, widgets: [...workflow.output.widgets, widget] } }))),
  updateWidget: (id, patch) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, output: { ...workflow.output, widgets: workflow.output.widgets.map((widget) => widget.id === id ? { ...widget, ...patch } : widget) } }))),
  removeWidget: (id) => set((state) => mutateActive(state, (workflow) => ({ ...workflow, output: { ...workflow.output, widgets: workflow.output.widgets.filter((widget) => widget.id !== id) } }))),
  autoLayout: () => set((state) => mutateActive(state, (workflow) => ({ ...workflow, nodes: workflow.nodes.map((node, index) => ({ ...node, position: { x: 80 + (index % 3) * 300, y: 110 + Math.floor(index / 3) * 210 } })) }))),
  undo: () => set((state) => {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return { ...previous, past: state.past.slice(0, -1), future: [snapshot(state), ...state.future].slice(0, MAX_HISTORY), selectedNodeId: null, selectedEdgeId: null };
  }),
  redo: () => set((state) => {
    const next = state.future[0];
    if (!next) return state;
    return { ...next, past: [...state.past, snapshot(state)].slice(-MAX_HISTORY), future: state.future.slice(1), selectedNodeId: null, selectedEdgeId: null };
  }),
}), { name: "vibe-api-workspace", partialize: (state) => ({ workflows: state.workflows, activeId: state.activeId }) }));

export function selectActiveWorkflow(state: State) {
  return active(state);
}

export function normalizeWorkflow(workflow: ApiWorkflow) {
  return apiWorkflowSchema.parse(workflow);
}
