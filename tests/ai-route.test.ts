import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/workflow/route";
import { starterWorkflows } from "@/lib/templates";

describe("AI workflow route", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("has a deterministic local demo mode when no key is configured", async () => {
    const response = await POST(new Request("http://localhost/api/ai/workflow", { method: "POST", body: JSON.stringify({ prompt: "做一个天气新闻汇率数据看板", workflow: starterWorkflows[1], history: [] }) }));
    const result = await response.json() as { editMode: string; workflow: { output: { widgets: unknown[] } } };
    expect(response.status).toBe(200);
    expect(result.editMode).toBe("demo");
    expect(result.workflow.output.widgets.length).toBeGreaterThan(1);
  });

  it("proxies an OpenAI-compatible response and normalizes workflow identity", async () => {
    const current = structuredClone(starterWorkflows[0]);
    const candidate = structuredClone(current);
    candidate.title = "Updated board";
    candidate.revision = 999;
    const providerFetch = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({ summary: "Updated", workflow: candidate }) } }] }));
    vi.stubGlobal("fetch", providerFetch);
    const response = await POST(new Request("http://localhost/api/ai/workflow", { method: "POST", body: JSON.stringify({ baseUrl: "https://models.example.com/v1?ignored=true", apiKey: "session-key", model: "workflow-model", prompt: "Improve the board", workflow: current, history: [] }) }));
    const result = await response.json() as { workflow: { id: string; revision: number } };
    expect(response.status).toBe(200);
    expect(result.workflow.id).toBe(current.id);
    expect(result.workflow.revision).toBe(current.revision);
    expect(providerFetch).toHaveBeenCalledOnce();
    expect(providerFetch.mock.calls[0][0]).toBe("https://models.example.com/v1/chat/completions");
  });
});
