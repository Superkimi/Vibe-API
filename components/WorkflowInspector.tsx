"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowsClockwise, Trash } from "@phosphor-icons/react";
import { getApiDefinition } from "@/lib/api-catalog";
import type { ApiParam } from "@/lib/api-schema";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";

function coerce(value: string, param: ApiParam) {
  if (param.type === "number") return value === "" ? "" : Number(value);
  if (param.type === "boolean") return value === "true";
  return value;
}

export function WorkflowInspector() {
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const selectedNodeId = useVibeApiStore((state) => state.selectedNodeId);
  const selectedEdgeId = useVibeApiStore((state) => state.selectedEdgeId);
  const selected = workflow.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = workflow.edges.find((edge) => edge.id === selectedEdgeId);
  const updateNode = useVibeApiStore((state) => state.updateSelectedNode);
  const updateEdge = useVibeApiStore((state) => state.updateSelectedEdge);
  const removeNode = useVibeApiStore((state) => state.removeSelectedNode);
  const removeEdge = useVibeApiStore((state) => state.removeSelectedEdge);
  const updateOutput = useVibeApiStore((state) => state.updateOutput);
  const updateWidget = useVibeApiStore((state) => state.updateWidget);
  const removeWidget = useVibeApiStore((state) => state.removeWidget);
  const autoLayout = useVibeApiStore((state) => state.autoLayout);
  const definition = useMemo(() => selected ? getApiDefinition(selected.data.apiId) : undefined, [selected]);

  if (selected) {
    return <div className="properties-panel">
      <header className="properties-title"><div><strong>Configure API node</strong><small>{selected.id} · {selected.data.apiId}</small></div><button type="button" className="icon-button danger" onClick={removeNode} aria-label="Delete selected node"><Trash size={15} /></button></header>
      <div className="node-status"><ArrowsClockwise size={13} /> {definition?.provider ?? "Catalog source"} · {selected.data.method} {selected.data.path}</div>
      <label className="property-field"><span>Node label</span><input value={selected.data.label} onChange={(event) => updateNode({ label: event.target.value })} /></label>
      <label className="property-field"><span>Purpose</span><textarea value={selected.data.subtitle} onChange={(event) => updateNode({ subtitle: event.target.value })} /></label>
      <label className="property-field"><span>Output key</span><input value={selected.data.outputKey} onChange={(event) => updateNode({ outputKey: event.target.value })} /></label>
      <section className="property-section"><div><h3>Inputs</h3><p>These values are stored in the workflow. Secrets stay out of exports.</p></div>{(definition?.params ?? []).map((param) => <label className="property-field" key={param.name}><span>{param.label}{param.required ? " *" : ""}</span><input type={param.type === "number" ? "number" : param.type === "boolean" ? "checkbox" : "text"} checked={param.type === "boolean" ? Boolean(selected.data.params[param.name]) : undefined} value={param.type === "boolean" ? undefined : String(selected.data.params[param.name] ?? "")} onChange={(event) => updateNode({ params: { ...selected.data.params, [param.name]: param.type === "boolean" ? event.target.checked : coerce(event.target.value, param) } })} placeholder={param.description} /></label>)}</section>
      <label className="property-field"><span>Transform note</span><textarea value={selected.data.transform} onChange={(event) => updateNode({ transform: event.target.value })} placeholder="Optional mapping note, e.g. rates.CNY -> cny" /></label>
    </div>;
  }

  if (selectedEdge) {
    return <div className="properties-panel"><header className="properties-title"><div><strong>Connection mapping</strong><small>{selectedEdge.source} → {selectedEdge.target}</small></div><button type="button" className="icon-button danger" onClick={removeEdge} aria-label="Delete selected connection"><Trash size={15} /></button></header><label className="property-field"><span>Label</span><input value={selectedEdge.label} onChange={(event) => updateEdge({ label: event.target.value })} placeholder="context, normalize, enrich" /></label><label className="property-field"><span>Data mapping</span><input value={selectedEdge.mapping} onChange={(event) => updateEdge({ mapping: event.target.value })} placeholder="source.field -> target.input" /></label><label className="property-field"><span>Line style</span><select value={selectedEdge.type} onChange={(event) => updateEdge({ type: event.target.value as "smoothstep" | "straight" | "bezier" })}><option value="smoothstep">Smooth step</option><option value="straight">Straight</option><option value="bezier">Bezier</option></select></label><label className="property-field"><span><input type="checkbox" checked={selectedEdge.animated} onChange={(event) => updateEdge({ animated: event.target.checked })} /> Animate data flow</span></label></div>;
  }

  return <div className="properties-panel"><header className="properties-title"><div><strong>Output contract</strong><small>{workflow.output.widgets.length} widgets · {workflow.nodes.length} sources</small></div><button type="button" className="icon-button" onClick={autoLayout} title="Auto layout"><ArrowsClockwise size={15} /></button></header><label className="property-field"><span>Output title</span><input value={workflow.output.title} onChange={(event) => updateOutput({ title: event.target.value })} /></label><label className="property-field"><span>Output mode</span><select value={workflow.output.mode} onChange={(event) => updateOutput({ mode: event.target.value as "dashboard" | "json" })}><option value="dashboard">Dashboard</option><option value="json">JSON response</option></select></label><section className="property-section"><div><h3>Widgets</h3><p>Choose the fields your final API should expose.</p></div><div className="widget-editor">{workflow.output.widgets.map((widget) => <div className="widget-row" key={widget.id}><div><strong>{widget.title}</strong><small>{widget.sourceNodeId}.{widget.field || "data"}</small><select value={widget.kind} onChange={(event) => updateWidget(widget.id, { kind: event.target.value as typeof widget.kind })}><option value="metric">Metric</option><option value="list">List</option><option value="table">Table</option><option value="json">JSON</option></select></div><button type="button" onClick={() => removeWidget(widget.id)} aria-label={`Delete ${widget.title}`}><Trash size={13} /></button></div>)}</div></section><div className="property-actions"><button type="button" onClick={autoLayout}><ArrowDown size={13} /> Auto layout</button></div></div>;
}
