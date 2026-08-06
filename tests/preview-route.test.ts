import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/catalog/preview/route";

describe("catalog preview route", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("executes a published live route and returns request and response details", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 200, data: { temperature: 22 } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", upstream);
    const response = await POST(new Request("http://localhost/api/catalog/preview", { method: "POST", body: JSON.stringify({ apiId: "60s-weather", params: { city: "Shanghai" } }) }));
    const result = await response.json() as { ok: boolean; requestMethod: string; requestParams: Record<string, string>; url: string; responseFields: string[]; data: { data: { temperature: number } } };
    expect(response.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.requestMethod).toBe("GET");
    expect(result.requestParams.city).toBe("Shanghai");
    expect(result.url).toContain("city=Shanghai");
    expect(result.responseFields).toEqual(["code", "data"]);
    expect(result.data.data.temperature).toBe(22);
    expect(upstream).toHaveBeenCalledOnce();
  });
});
