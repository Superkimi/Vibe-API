import type { ApiWorkflow } from "./api-schema";
import { apiWorkflowSchema, safeApiId, validateWorkflow } from "./api-schema";

const stripFence = (source: string) => source.replace(/^```(?:json|typescript|ts)?\s*/i, "").replace(/\s*```$/i, "").trim();

export function toWorkflowCode(workflow: ApiWorkflow) {
  // React Flow adds view-only fields such as `measured` while rendering. The
  // exported contract must stay portable and contain only schema fields.
  return JSON.stringify({ schema: "vibe-api/1", workflow: validateWorkflow(workflow) }, null, 2);
}

export function fromWorkflowCode(source: string, current: ApiWorkflow) {
  const raw = stripFence(source);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Schema code must contain a JSON object.");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { schema?: string; workflow?: unknown };
  const candidate = parsed.workflow ?? parsed;
  const next = apiWorkflowSchema.parse(candidate);
  return validateWorkflow({ ...next, id: current.id, revision: current.revision, updatedAt: new Date().toISOString() });
}

function responseSchema(workflow: ApiWorkflow) {
  return Object.fromEntries(workflow.output.widgets.map((widget) => [widget.id, { type: widget.kind === "metric" ? "number" : widget.kind === "json" ? "object" : "array", description: `${widget.title} from ${widget.sourceNodeId}.${widget.field || "data"}` }]));
}

export function toOpenApi(workflow: ApiWorkflow) {
  const path = `/v1/${safeApiId(workflow.title).toLowerCase()}/run`;
  return {
    openapi: "3.1.0",
    info: { title: workflow.title, version: "0.1.0", description: workflow.description },
    paths: { [path]: { post: { summary: `Run ${workflow.title}`, operationId: `run_${safeApiId(workflow.id)}`, requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "Composed API response", content: { "application/json": { schema: { type: "object", properties: responseSchema(workflow) } } } } } } } },
    "x-vibe-api": { workflowId: workflow.id, nodes: workflow.nodes.map((node) => ({ id: node.id, apiId: node.data.apiId, method: node.data.method, path: node.data.path })), edges: workflow.edges },
  };
}

export function toSkillMarkdown(workflow: ApiWorkflow) {
  const nodes = workflow.nodes.map((node) => `- ${node.data.label}: ${node.data.method} ${node.data.path} (${node.data.apiId})`).join("\n");
  const widgets = workflow.output.widgets.map((widget) => `- ${widget.title}: \`${widget.sourceNodeId}.${widget.field || "data"}\``).join("\n");
  return `---\nname: ${safeApiId(workflow.title).toLowerCase()}\ndescription: ${workflow.description || `Run ${workflow.title}`}\n---\n\n# ${workflow.title}\n\nUse this skill to assemble a portable API response from the configured sources. Keep credentials out of the exported file and inject them at runtime.\n\n## Sources\n\n${nodes}\n\n## Output\n\n${widgets}\n\n## Runtime contract\n\nCall the generated workflow endpoint with JSON inputs. Validate upstream responses, preserve the configured output keys, and surface partial failures instead of silently inventing data.\n`;
}

export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}
