import { describe, expect, it } from "vitest";
import { apiCatalog, getCatalogStats } from "@/lib/api-catalog";
import { apiDefinitionSchema } from "@/lib/api-schema";

describe("complete source catalog", () => {
  it("contains every generated public-apis and 60s entry with unique ids", () => {
    const ids = new Set(apiCatalog.map((api) => api.id));
    const stats = getCatalogStats();
    expect(apiCatalog).toHaveLength(1716);
    expect(ids.size).toBe(apiCatalog.length);
    expect(stats.directory).toBe(1641);
    expect(stats.live).toBe(75);
    expect(apiCatalog.filter((api) => api.source === "public-apis")).toHaveLength(1641);
    expect(apiCatalog.filter((api) => api.source === "60s")).toHaveLength(75);
  });

  it("keeps each directory row schema-valid and response-previewable", () => {
    for (const api of apiCatalog) {
      expect(() => apiDefinitionSchema.parse(api)).not.toThrow();
      expect(api.sampleResponse).toBeDefined();
      expect(api.requestExample.startsWith("http")).toBe(true);
      expect(api.responsePreview.length).toBeGreaterThan(0);
    }
  });

  it("preserves composer ids for the original starter workflows", () => {
    expect(apiCatalog.map((api) => api.id)).toEqual(expect.arrayContaining(["60s-news", "60s-weather", "60s-exchange"]));
  });
});
