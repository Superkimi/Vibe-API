import { z } from "zod";
import { apiEdgeSchema, apiNodeSchema, apiWorkflowSchema, apiNodeDataSchema, workflowOutputSchema, type ApiWorkflow } from "./api-schema";

export const workflowOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_title"), title: z.string().min(1).max(100) }),
  z.object({ op: z.literal("set_description"), description: z.string().max(240) }),
  z.object({ op: z.literal("set_output"), output: workflowOutputSchema }),
  z.object({ op: z.literal("update_node"), id: z.string().min(1), patch: apiNodeDataSchema.partial() }),
  z.object({ op: z.literal("add_node"), node: apiNodeSchema }),
  z.object({ op: z.literal("remove_node"), id: z.string().min(1) }),
  z.object({ op: z.literal("update_edge"), id: z.string().min(1), patch: apiEdgeSchema.partial() }),
  z.object({ op: z.literal("add_edge"), edge: apiEdgeSchema }),
  z.object({ op: z.literal("remove_edge"), id: z.string().min(1) }),
]);

export type WorkflowOperation = z.infer<typeof workflowOperationSchema>;

function graphIds(workflow: ApiWorkflow) {
  return new Set([...workflow.nodes.map((node) => node.id), ...workflow.edges.map((edge) => edge.id)]);
}

export function applyWorkflowOperations(current: ApiWorkflow, operations: WorkflowOperation[]) {
  const next = structuredClone(current);
  for (const operation of operations) {
    if (operation.op === "set_title") { next.title = operation.title; continue; }
    if (operation.op === "set_description") { next.description = operation.description; continue; }
    if (operation.op === "set_output") { next.output = structuredClone(operation.output); continue; }
    if (operation.op === "update_node") {
      const node = next.nodes.find((candidate) => candidate.id === operation.id);
      if (!node) throw new Error(`Node ${operation.id} was not found.`);
      node.data = { ...node.data, ...operation.patch };
      continue;
    }
    if (operation.op === "add_node") {
      if (graphIds(next).has(operation.node.id)) throw new Error(`Graph id ${operation.node.id} is already in use.`);
      next.nodes.push(structuredClone(operation.node));
      continue;
    }
    if (operation.op === "remove_node") {
      const index = next.nodes.findIndex((candidate) => candidate.id === operation.id);
      if (index < 0) throw new Error(`Node ${operation.id} was not found.`);
      next.nodes.splice(index, 1);
      next.edges = next.edges.filter((edge) => edge.source !== operation.id && edge.target !== operation.id);
      next.output.widgets = next.output.widgets.filter((widget) => widget.sourceNodeId !== operation.id);
      continue;
    }
    if (operation.op === "update_edge") {
      const edge = next.edges.find((candidate) => candidate.id === operation.id);
      if (!edge) throw new Error(`Edge ${operation.id} was not found.`);
      Object.assign(edge, operation.patch);
      continue;
    }
    if (operation.op === "add_edge") {
      if (graphIds(next).has(operation.edge.id)) throw new Error(`Graph id ${operation.edge.id} is already in use.`);
      next.edges.push(structuredClone(operation.edge));
      continue;
    }
    const index = next.edges.findIndex((candidate) => candidate.id === operation.id);
    if (index < 0) throw new Error(`Edge ${operation.id} was not found.`);
    next.edges.splice(index, 1);
  }
  return apiWorkflowSchema.parse(next);
}
