import { z } from "zod";
import { getApiDefinition } from "@/lib/api-catalog";

const requestSchema = z.object({
  apiId: z.string().min(1).max(160),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

function compactPreview(value: unknown, depth = 0): unknown {
  if (depth > 4) return "…";
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => compactPreview(item, depth + 1));
  if (typeof value === "string") return value.length > 600 ? `${value.slice(0, 600)}…` : value;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).slice(0, 32).map(([key, item]) => [key, compactPreview(item, depth + 1)]));
}

function buildRequestUrl(api: ReturnType<typeof getApiDefinition>, params: Record<string, string | number | boolean>) {
  if (!api) throw new Error("Unknown API definition.");
  const url = new URL(api.path, api.baseUrl);
  for (const [name, value] of Object.entries(params)) {
    if (value === "" || value === undefined || value === null) continue;
    if (url.pathname.includes(`{${name}}`)) {
      url.pathname = url.pathname.replace(`{${name}}`, encodeURIComponent(String(value)));
    } else if (url.pathname.includes(`:${name}`)) {
      url.pathname = url.pathname.replace(`:${name}`, encodeURIComponent(String(value)));
    } else {
      url.searchParams.set(name, String(value));
    }
  }
  return url;
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const api = getApiDefinition(input.apiId);
    if (!api) return Response.json({ error: "API definition not found." }, { status: 404 });

    const target = buildRequestUrl(api, input.params);
    const startedAt = Date.now();
    const upstream = await fetch(target, {
      method: "GET",
      headers: { accept: "application/json, text/plain, */*", "user-agent": "Vibe-API-Preview/1.0" },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    const contentType = upstream.headers.get("content-type") || "";
    const raw = await upstream.text();
    let data: unknown = raw;
    if (contentType.includes("json")) {
      try { data = JSON.parse(raw); } catch { data = raw; }
    }
    return Response.json({
      apiId: api.id,
      source: api.source,
      previewMode: api.previewMode,
      ok: upstream.ok,
      status: upstream.status,
      contentType,
      elapsedMs: Date.now() - startedAt,
      url: target.toString(),
      data: compactPreview(data),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues.map((issue) => issue.message).join("; ") }, { status: 400 });
    if (error instanceof Error && error.name === "TimeoutError") return Response.json({ error: "The preview timed out after 12 seconds." }, { status: 504 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to preview this API." }, { status: 502 });
  }
}
