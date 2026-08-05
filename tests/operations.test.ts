import { describe, expect, it } from "vitest";
import { applyWorkflowOperations } from "@/lib/operations";
import { starterWorkflows } from "@/lib/templates";

describe("workflow operations", () => {
  it("applies an ID-addressed edit without dropping unrelated nodes", () => {
    const current = structuredClone(starterWorkflows[0]);
    const next = applyWorkflowOperations(current, [{ op: "update_node", id: "weather", patch: { label: "Shanghai now", outputKey: "weather_now" } }]);
    expect(next.nodes).toHaveLength(current.nodes.length);
    expect(next.nodes.find((node) => node.id === "weather")?.data.label).toBe("Shanghai now");
    expect(next.nodes.find((node) => node.id === "headlines")?.data.label).toBe("Morning brief");
  });

  it("removes dependent edges and widgets with a node", () => {
    const current = structuredClone(starterWorkflows[0]);
    const next = applyWorkflowOperations(current, [{ op: "remove_node", id: "weather" }]);
    expect(next.nodes.some((node) => node.id === "weather")).toBe(false);
    expect(next.edges.some((edge) => edge.source === "weather" || edge.target === "weather")).toBe(false);
    expect(next.output.widgets.some((widget) => widget.sourceNodeId === "weather")).toBe(false);
  });
});
