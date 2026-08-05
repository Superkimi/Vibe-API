import { z } from "zod";

export const apiCategories = ["News", "Weather", "Finance", "Developer", "Utilities", "Lifestyle"] as const;
export const apiMethods = ["GET", "POST"] as const;
export const apiAuthModes = ["none", "apiKey", "bearer", "queryKey"] as const;
export const apiParamTypes = ["string", "number", "boolean"] as const;

export const apiParamSchema = z.object({
  name: z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
  label: z.string().min(1).max(80),
  type: z.enum(apiParamTypes),
  required: z.boolean().default(false),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().max(160).default(""),
});

export const apiDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  provider: z.string().min(1).max(80),
  category: z.enum(apiCategories),
  description: z.string().min(1).max(240),
  method: z.enum(apiMethods),
  baseUrl: z.string().url(),
  path: z.string().startsWith("/"),
  auth: z.enum(apiAuthModes).default("none"),
  authLabel: z.string().max(80).default(""),
  params: z.array(apiParamSchema).max(24).default([]),
  tags: z.array(z.string().max(30)).max(8).default([]),
  sourceUrl: z.string().url(),
  sampleResponse: z.unknown(),
});

export const apiNodeDataSchema = z.object({
  apiId: z.string().regex(/^[a-z0-9][a-z0-9-]+$/),
  label: z.string().min(1).max(100),
  subtitle: z.string().max(160).default(""),
  method: z.enum(apiMethods),
  path: z.string().startsWith("/"),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  outputKey: z.string().max(80).default("data"),
  transform: z.string().max(500).default(""),
  tone: z.enum(["lilac", "slate", "cyan", "amber", "rose"]).default("lilac"),
});

export const apiNodeSchema = z.object({
  // Accept imported/legacy graph ids that start with a digit; new ids are
  // generated with a `node-` prefix in the store.
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  type: z.literal("apiNode").default("apiNode"),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  data: apiNodeDataSchema,
});

export const apiEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(100).default(""),
  mapping: z.string().max(180).default(""),
  type: z.enum(["smoothstep", "straight", "bezier"]).default("smoothstep"),
  animated: z.boolean().default(false),
});

export const widgetSchema = z.object({
  // Widget ids are persisted in exported schemas, so keep the contract
  // backwards-compatible with the first local drafts.
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  kind: z.enum(["metric", "list", "table", "json"]),
  title: z.string().min(1).max(80),
  sourceNodeId: z.string().min(1),
  field: z.string().max(120).default(""),
  format: z.enum(["text", "number", "percent", "currency", "date"]).default("text"),
});

export const workflowOutputSchema = z.object({
  mode: z.enum(["dashboard", "json"]).default("dashboard"),
  title: z.string().min(1).max(100),
  widgets: z.array(widgetSchema).max(24).default([]),
});

export const apiWorkflowSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().max(240).default(""),
  revision: z.number().int().nonnegative().default(0),
  nodes: z.array(apiNodeSchema).min(1).max(60),
  edges: z.array(apiEdgeSchema).max(120),
  output: workflowOutputSchema,
  updatedAt: z.string().datetime(),
}).superRefine((workflow, ctx) => {
  const nodeIds = new Set<string>();
  const graphIds = new Set<string>();
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) ctx.addIssue({ code: "custom", message: `Duplicate node id: ${node.id}`, path: ["nodes"] });
    nodeIds.add(node.id);
    graphIds.add(node.id);
  }
  const edgeIds = new Set<string>();
  for (const edge of workflow.edges) {
    if (edgeIds.has(edge.id) || graphIds.has(edge.id)) ctx.addIssue({ code: "custom", message: `Duplicate graph id: ${edge.id}`, path: ["edges"] });
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) ctx.addIssue({ code: "custom", message: `Edge ${edge.id} references a missing node`, path: ["edges"] });
  }
  for (const widget of workflow.output.widgets) {
    if (!nodeIds.has(widget.sourceNodeId)) ctx.addIssue({ code: "custom", message: `Widget ${widget.id} references a missing node`, path: ["output", "widgets"] });
  }
});

export type ApiDefinition = z.infer<typeof apiDefinitionSchema>;
export type ApiParam = z.infer<typeof apiParamSchema>;
export type ApiNode = z.infer<typeof apiNodeSchema>;
export type ApiNodeData = z.infer<typeof apiNodeDataSchema>;
export type ApiEdge = z.infer<typeof apiEdgeSchema>;
export type WorkflowWidget = z.infer<typeof widgetSchema>;
export type WorkflowOutput = z.infer<typeof workflowOutputSchema>;
export type ApiWorkflow = z.infer<typeof apiWorkflowSchema>;
export type ApiCategory = (typeof apiCategories)[number];

export function validateWorkflow(input: unknown) {
  return apiWorkflowSchema.parse(input);
}

export function safeApiId(value: string, fallback = "api") {
  const normalized = value.trim().replace(/[^A-Za-z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const result = normalized || fallback;
  return /^[A-Za-z]/.test(result) ? result : `n_${result}`;
}
