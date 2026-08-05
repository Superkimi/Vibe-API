import { describe, expect, it } from "vitest";
import { apiWorkflowSchema, safeApiId, validateWorkflow } from "@/lib/api-schema";
import { starterWorkflows } from "@/lib/templates";

describe("workflow schema", () => {
  it("accepts built-in workflows and stable ids", () => {
    for (const workflow of starterWorkflows) expect(validateWorkflow(workflow).id).toBe(workflow.id);
    expect(safeApiId("Shanghai daily brief")).toBe("Shanghai_daily_brief");
    expect(safeApiId("123 board")).toBe("n_123_board");
  });

  it("rejects dangling edges and widgets", () => {
    const invalid = structuredClone(starterWorkflows[0]);
    invalid.edges[0].target = "missing";
    expect(() => apiWorkflowSchema.parse(invalid)).toThrow(/missing node/);
    const invalidWidget = structuredClone(starterWorkflows[0]);
    invalidWidget.output.widgets[0].sourceNodeId = "missing";
    expect(() => apiWorkflowSchema.parse(invalidWidget)).toThrow(/missing node/);
  });
});
