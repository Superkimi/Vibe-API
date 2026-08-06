import { generatedCatalog } from "./catalog-data.generated";
import type { ApiDefinition } from "./api-schema";

// This is intentionally a checked-in, source-shaped catalog rather than a
// hand-picked demo list. The explorer is the product's primary surface; the
// composer consumes the same definitions when a user chooses "Compose".
export const apiCatalog = generatedCatalog as unknown as ApiDefinition[];

export const catalogSources = [
  { id: "all", label: "All sources" },
  { id: "60s", label: "60s · 75 routes" },
  { id: "public-apis", label: "public-apis · 1,641 entries" },
] as const;

export const catalogCategories = Array.from(new Set(apiCatalog.map((api) => api.category))).sort((a, b) => a.localeCompare(b));

export function getApiDefinition(apiId: string) {
  return apiCatalog.find((api) => api.id === apiId);
}

export function getCatalogStats() {
  return {
    total: apiCatalog.length,
    live: apiCatalog.filter((api) => api.livePreview).length,
    directory: apiCatalog.filter((api) => !api.livePreview).length,
    sources: new Set(apiCatalog.map((api) => api.source)).size,
    categories: catalogCategories.length,
  };
}
