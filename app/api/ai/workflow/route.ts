import { z } from "zod";
import { apiWorkflowSchema } from "@/lib/api-schema";
import { demoWorkflowFromPrompt } from "@/lib/demo-ai";
import { buildApiSystemPrompt } from "@/lib/ai-skills";
import { applyWorkflowOperations, workflowOperationSchema } from "@/lib/operations";

const requestSchema = z.object({
  baseUrl: z.string().url().optional().or(z.literal("")),
  model: z.string().min(1).max(120).default("gpt-4.1-mini"),
  apiKey: z.string().max(500).optional().or(z.literal("")),
  locale: z.enum(["zh", "en"]).default("zh"),
  prompt: z.string().min(1).max(4000),
  workflow: apiWorkflowSchema,
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).default([]),
});

const responseSchema = z.object({
  summary: z.string().min(1).max(500),
  workflow: apiWorkflowSchema.optional(),
  operations: z.array(workflowOperationSchema).min(1).max(80).optional(),
}).refine((value) => value.workflow || value.operations, { message: "The model must return a workflow or at least one operation." });

function modelEndpoint(baseUrl: string) {
  const url = new URL(baseUrl || "https://api.openai.com/v1");
  if (!/^https?:$/.test(url.protocol)) throw new Error("The model endpoint must use http or https.");
  url.search = "";
  url.hash = "";
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/chat/completions") ? path : `${path}/chat/completions`;
  return url.toString();
}

function extractJson(content: string) {
  const clean = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return a JSON workflow.");
  return JSON.parse(clean.slice(start, end + 1)) as unknown;
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const apiKey = input.apiKey || process.env.VIBE_API_API_KEY || "";
    if (!apiKey) {
      const demo = demoWorkflowFromPrompt(input.prompt, input.workflow, input.locale);
      return Response.json({ ...demo, editMode: "demo" });
    }
    const response = await fetch(modelEndpoint(input.baseUrl || process.env.VIBE_API_BASE_URL || "https://api.openai.com/v1"), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: input.model,
        temperature: 0.15,
        messages: [
          { role: "system", content: buildApiSystemPrompt({ locale: input.locale }) },
          ...input.history.slice(-8),
          { role: "user", content: `${input.prompt}\n\nCurrent workflow JSON:\n${JSON.stringify(input.workflow)}` },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      return Response.json({ error: `Model request failed (${response.status}).`, detail: detail.slice(0, 500) }, { status: response.status });
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("The model returned an empty response.");
    const parsed = responseSchema.parse(extractJson(content));
    const workflow = parsed.workflow ?? applyWorkflowOperations(input.workflow, parsed.operations ?? []);
    const normalized = apiWorkflowSchema.parse({ ...workflow, id: input.workflow.id, revision: input.workflow.revision, updatedAt: new Date().toISOString() });
    return Response.json({ summary: parsed.summary, workflow: normalized, editMode: parsed.workflow ? "workflow" : "operations" });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") return Response.json({ error: "The model request timed out after 45 seconds." }, { status: 504 });
    const message = error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join("; ") : error instanceof Error ? error.message : "Unknown AI request error.";
    return Response.json({ error: message }, { status: 400 });
  }
}
