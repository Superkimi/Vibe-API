import { describe, expect, it } from "vitest";
import { apiCatalog } from "@/lib/api-catalog";
import { localizeApiDefinition, localizeSampleResponse } from "@/lib/api-localization";

describe("catalog localization", () => {
  it("translates directory descriptions and response metadata", () => {
    const ipstack = apiCatalog.find((api) => api.id === "public-apis-ipstack");
    expect(ipstack).toBeDefined();
    const localized = localizeApiDefinition(ipstack!, "zh");
    expect(localized.description).toContain("IP 地址");
    expect(localized.sampleResponse).toHaveProperty("来源 (source)");
    expect(localized.sampleResponse).toHaveProperty("接口简介 (description)");
  });

  it("translates route inputs without changing their contract keys", () => {
    const weather = apiCatalog.find((api) => api.id === "60s-weather");
    expect(weather).toBeDefined();
    const localized = localizeApiDefinition(weather!, "zh");
    expect(localized.params.find((param) => param.name === "city")?.label).toBe("城市");
    expect(localized.params.find((param) => param.name === "city")?.description).toContain("上游模块");
    expect(localized.params.find((param) => param.name === "city")?.name).toBe("city");
  });

  it("keeps English response keys and values unchanged", () => {
    const sample = { code: 200, message: "success", data: { city: "Shanghai" } };
    expect(localizeSampleResponse(sample, "en")).toEqual(sample);
  });
});
