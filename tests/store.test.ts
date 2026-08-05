import { beforeEach, describe, expect, it } from "vitest";
import { apiCatalog } from "@/lib/api-catalog";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";
import { starterWorkflows } from "@/lib/templates";

describe("workflow transactions", () => {
  beforeEach(() => {
    localStorage.clear();
    useVibeApiStore.setState({ workflows: structuredClone(starterWorkflows), activeId: starterWorkflows[0].id, past: [], future: [], selectedNodeId: null, selectedEdgeId: null, hydrated: true });
  });

  it("makes an AI result one undoable revision and rejects stale edits", () => {
    const before = selectActiveWorkflow(useVibeApiStore.getState());
    const updated = structuredClone(before);
    updated.title = "Fresh board";
    expect(useVibeApiStore.getState().replaceIfUnchanged(before.id, before.revision, updated)).toBe("applied");
    expect(selectActiveWorkflow(useVibeApiStore.getState()).revision).toBe(before.revision + 1);
    expect(useVibeApiStore.getState().replaceIfUnchanged(before.id, before.revision, before)).toBe("stale");
    useVibeApiStore.getState().undo();
    expect(selectActiveWorkflow(useVibeApiStore.getState()).title).toBe(before.title);
  });

  it("keeps manually added node and widget ids valid for the schema", () => {
    const api = apiCatalog.find((item) => item.id === "60s-weather");
    if (!api) throw new Error("weather fixture missing");
    useVibeApiStore.getState().addApiNode(api);
    const workflow = selectActiveWorkflow(useVibeApiStore.getState());
    expect(workflow.nodes.at(-1)?.id).toMatch(/^node-60s-weather-/);
    expect(workflow.output.widgets.at(-1)?.id).toMatch(/^widget-60s-weather-/);
  });
});
