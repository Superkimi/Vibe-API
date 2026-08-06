"use client";

import { useState } from "react";
import { Play, Pulse, ShieldCheck } from "@phosphor-icons/react";
import { getApiDefinition } from "@/lib/api-catalog";
import { formatPreviewValue, widgetValue } from "@/lib/preview";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";
import { useLocale } from "./LocaleProvider";

function Metric({ value, format }: { value: unknown; format: string }) {
  const text = formatPreviewValue(value);
  const suffix = format === "percent" ? "%" : format === "currency" ? " USD" : "";
  return <div className="metric-value">{text}<small>{suffix}</small></div>;
}

export function PreviewPanel() {
  const { t } = useLocale();
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const [runCount, setRunCount] = useState(0);
  const run = () => setRunCount((count) => count + 1);
  return (
    <section className="preview-panel" aria-label={t("workflowPreview")}>
      <header className="preview-header">
        <div><h2>{workflow.output.title}</h2><p>{workflow.description}</p></div>
        <button type="button" className="preview-run" onClick={run}><Play size={13} weight="fill" /> {t("runSample")}</button>
      </header>
      <div className="preview-source-strip">
        {workflow.nodes.map((node) => {
          const definition = getApiDefinition(node.data.apiId);
          return <span key={node.id}><b>{node.data.method}</b>{definition?.name ?? node.data.apiId}</span>;
        })}
        <span><ShieldCheck size={12} /> {t("sampleDataOnly")}</span>
      </div>
      <div className="widget-grid">
        {workflow.output.widgets.map((widget) => {
          const value = widgetValue(workflow, widget.id);
          const array = Array.isArray(value) ? value : null;
          const map = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
          const wide = widget.kind === "list" || widget.kind === "table" || widget.kind === "json";
          return (
            <article className={`preview-widget ${wide ? "wide" : ""}`} key={widget.id}>
              <header><strong>{widget.title}</strong><span>{widget.sourceNodeId}.{widget.field || "data"}</span></header>
              {widget.kind === "metric" ? <Metric value={value} format={widget.format} /> : null}
              {widget.kind === "list" ? <ul className="preview-list">{(array ?? [value]).slice(0, 5).map((item, index) => <li key={`${widget.id}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{typeof item === "object" ? String((item as Record<string, unknown>).title ?? JSON.stringify(item)) : String(item)}</span></li>)}</ul> : null}
              {widget.kind === "table" ? <div className="preview-table">{Object.entries(map ?? {}).slice(0, 8).map(([key, item]) => <div key={key}><strong>{key}</strong><span>{formatPreviewValue(item)}</span></div>)}</div> : null}
              {widget.kind === "json" ? <pre className="preview-json">{formatPreviewValue(value)}</pre> : null}
            </article>
          );
        })}
        <article className="preview-widget wide">
          <header><strong>{t("runContract")}</strong><span>{runCount ? t("sampleRun", { count: runCount }) : t("ready")}</span></header>
          <p className="preview-contract"><Pulse size={13} /> {t("widgetContract")}</p>
        </article>
      </div>
    </section>
  );
}
