import { describe, expect, it } from "vitest";
import { fromWorkflowCode, toOpenApi, toSkillMarkdown, toWorkflowCode } from "@/lib/codegen";
import { starterWorkflows } from "@/lib/templates";

describe("workflow exports", () => {
  it("round-trips the portable schema", () => {
    const current = structuredClone(starterWorkflows[0]);
    (current.nodes[0] as typeof current.nodes[0] & { measured?: { width: number; height: number } }).measured = { width: 208, height: 144 };
    const source = toWorkflowCode(current);
    expect(source).not.toContain("measured");
    const next = fromWorkflowCode(source, current);
    expect(next.nodes.map((node) => node.data.apiId)).toEqual(current.nodes.map((node) => node.data.apiId));
    expect(next.output.widgets).toHaveLength(current.output.widgets.length);
  });

  it("emits an OpenAPI path and skill without credentials", () => {
    const workflow = starterWorkflows[0];
    const openApi = toOpenApi(workflow) as { paths: Record<string, unknown> };
    expect(Object.keys(openApi.paths)[0]).toMatch(/^\/v1\//);
    expect(toSkillMarkdown(workflow)).toContain("## Sources");
    expect(toSkillMarkdown(workflow)).not.toContain("apiKey");
  });
});
