import type { ApiWorkflow } from "./api-schema";
import { getApiDefinition } from "./api-catalog";

export function readPath(value: unknown, path: string): unknown {
  if (!path) return value;
  return path.split(".").filter(Boolean).reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, value);
}

export function sampleDataFor(workflow: ApiWorkflow, nodeId: string) {
  const node = workflow.nodes.find((candidate) => candidate.id === nodeId);
  return node ? getApiDefinition(node.data.apiId)?.sampleResponse : undefined;
}

export function widgetValue(workflow: ApiWorkflow, widgetId: string) {
  const widget = workflow.output.widgets.find((candidate) => candidate.id === widgetId);
  if (!widget) return undefined;
  return readPath(sampleDataFor(workflow, widget.sourceNodeId), widget.field);
}

export function formatPreviewValue(value: unknown) {
  if (value === undefined || value === null) return "No sample";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value;
  return JSON.stringify(value, null, 2);
}
