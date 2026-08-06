"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowsClockwise, Trash } from "@phosphor-icons/react";
import { getApiDefinition } from "@/lib/api-catalog";
import type { ApiParam } from "@/lib/api-schema";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";
import { useLocale } from "./LocaleProvider";

function coerce(value: string, param: ApiParam) {
  if (param.type === "number") return value === "" ? "" : Number(value);
  if (param.type === "boolean") return value === "true";
  return value;
}

export function WorkflowInspector() {
  const { t } = useLocale();
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
      <header className="properties-title"><div><strong>{t("configureApiNode")}</strong><small>{selected.id} · {selected.data.apiId}</small></div><button type="button" className="icon-button danger" onClick={removeNode} aria-label={t("deleteSelectedNode")}><Trash size={15} /></button></header>
      <div className="node-status"><ArrowsClockwise size={13} /> {definition?.provider ?? t("catalogSource")} · {selected.data.method} {selected.data.path}</div>
      <label className="property-field"><span>{t("nodeLabel")}</span><input value={selected.data.label} onChange={(event) => updateNode({ label: event.target.value })} /></label>
      <label className="property-field"><span>{t("purpose")}</span><textarea value={selected.data.subtitle} onChange={(event) => updateNode({ subtitle: event.target.value })} /></label>
      <label className="property-field"><span>{t("outputKey")}</span><input value={selected.data.outputKey} onChange={(event) => updateNode({ outputKey: event.target.value })} /></label>
      <section className="property-section"><div><h3>{t("inputs")}</h3><p>{t("secretsNote")}</p></div>{(definition?.params ?? []).map((param) => <label className="property-field" key={param.name}><span>{param.label}{param.required ? " *" : ""}</span><input type={param.type === "number" ? "number" : param.type === "boolean" ? "checkbox" : "text"} checked={param.type === "boolean" ? Boolean(selected.data.params[param.name]) : undefined} value={param.type === "boolean" ? undefined : String(selected.data.params[param.name] ?? "")} onChange={(event) => updateNode({ params: { ...selected.data.params, [param.name]: param.type === "boolean" ? event.target.checked : coerce(event.target.value, param) } })} placeholder={param.description} /></label>)}</section>
      <label className="property-field"><span>{t("transformNote")}</span><textarea value={selected.data.transform} onChange={(event) => updateNode({ transform: event.target.value })} placeholder={t("optionalMapping")} /></label>
    </div>;
  }

  if (selectedEdge) {
    return <div className="properties-panel"><header className="properties-title"><div><strong>{t("connectionMapping")}</strong><small>{selectedEdge.source} → {selectedEdge.target}</small></div><button type="button" className="icon-button danger" onClick={removeEdge} aria-label={t("deleteConnection")}><Trash size={15} /></button></header><label className="property-field"><span>{t("label")}</span><input value={selectedEdge.label} onChange={(event) => updateEdge({ label: event.target.value })} placeholder="context, normalize, enrich" /></label><label className="property-field"><span>{t("dataMapping")}</span><input value={selectedEdge.mapping} onChange={(event) => updateEdge({ mapping: event.target.value })} placeholder={t("dataMappingPlaceholder")} /></label><label className="property-field"><span>{t("lineStyle")}</span><select value={selectedEdge.type} onChange={(event) => updateEdge({ type: event.target.value as "smoothstep" | "straight" | "bezier" })}><option value="smoothstep">{t("smoothStep")}</option><option value="straight">{t("straight")}</option><option value="bezier">{t("bezier")}</option></select></label><label className="property-field"><span><input type="checkbox" checked={selectedEdge.animated} onChange={(event) => updateEdge({ animated: event.target.checked })} /> {t("animateDataFlow")}</span></label></div>;
  }

  return <div className="properties-panel"><header className="properties-title"><div><strong>{t("outputContract")}</strong><small>{t("workflowOutputs", { count: workflow.output.widgets.length })} · {t("workflowSources", { count: workflow.nodes.length })}</small></div><button type="button" className="icon-button" onClick={autoLayout} title={t("autoLayout")}><ArrowsClockwise size={15} /></button></header><label className="property-field"><span>{t("outputTitle")}</span><input value={workflow.output.title} onChange={(event) => updateOutput({ title: event.target.value })} /></label><label className="property-field"><span>{t("outputMode")}</span><select value={workflow.output.mode} onChange={(event) => updateOutput({ mode: event.target.value as "dashboard" | "json" })}><option value="dashboard">{t("dashboard")}</option><option value="json">{t("jsonResponse")}</option></select></label><section className="property-section"><div><h3>{t("widgets")}</h3><p>{t("widgetHint")}</p></div><div className="widget-editor">{workflow.output.widgets.map((widget) => <div className="widget-row" key={widget.id}><div><strong>{widget.title}</strong><small>{widget.sourceNodeId}.{widget.field || "data"}</small><select value={widget.kind} onChange={(event) => updateWidget(widget.id, { kind: event.target.value as typeof widget.kind })}><option value="metric">{t("metric")}</option><option value="list">{t("list")}</option><option value="table">{t("table")}</option><option value="json">{t("json")}</option></select></div><button type="button" onClick={() => removeWidget(widget.id)} aria-label={t("deleteWidget", { name: widget.title })}><Trash size={13} /></button></div>)}</div></section><div className="property-actions"><button type="button" onClick={autoLayout}><ArrowDown size={13} /> {t("autoLayout")}</button></div></div>;
}
