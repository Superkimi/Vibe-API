import { apiCatalog } from "./api-catalog";
import { apiWorkflowSchema, type ApiWorkflow } from "./api-schema";
import { dailyIntelligence, githubPulse } from "./templates";

function clone(workflow: ApiWorkflow) {
  return structuredClone({ ...workflow, updatedAt: new Date().toISOString() });
}

export function demoWorkflowFromPrompt(prompt: string, current: ApiWorkflow, locale: "zh" | "en" = "zh") {
  const text = prompt.toLowerCase();
  if (/github|仓库|repo|代码库/.test(text)) return { summary: locale === "zh" ? "已切换到仓库脉搏看板，输出仓库指标和原始元数据。" : "Switched to a repository pulse dashboard with repo metrics and raw metadata.", workflow: clone(githubPulse) };
  if (/天气|weather|看板|dashboard|新闻|news|汇率|exchange/.test(text)) return { summary: locale === "zh" ? "已把天气、新闻和汇率组合成一个可预览的数据看板。" : "Combined weather, news, and exchange rates into a previewable dashboard.", workflow: clone(dailyIntelligence) };
  if (/猫|cat/.test(text)) {
    const next = clone(current);
    const api = apiCatalog.find((item) => item.id === "cat-fact");
    if (api) {
      next.nodes[0].data = { ...next.nodes[0].data, apiId: api.id, label: api.name, method: api.method, path: api.path, params: {}, outputKey: next.nodes[0].id };
      next.output.title = locale === "zh" ? "猫咪事实预览" : "Cat fact preview";
      next.output.widgets = [{ id: "cat-fact", kind: "json", title: locale === "zh" ? "猫咪事实响应" : "Cat fact response", sourceNodeId: next.nodes[0].id, field: "fact", format: "text" }];
    }
    return { summary: locale === "zh" ? "已将当前首个节点换成 Cat Fact，并把 fact 字段放进预览。" : "Replaced the first node with Cat Fact and added its fact field to the preview.", workflow: apiWorkflowSchema.parse(next) };
  }
  const next = clone(current);
  next.title = prompt.trim().slice(0, 64) || next.title;
  next.description = locale === "zh" ? "AI 已保留现有组合，并准备继续按你的下一条指令调整。" : "AI kept the current composition and is ready for the next instruction.";
  return { summary: locale === "zh" ? "我保留了当前 Schema。可以继续说要新增哪个 API、改哪个字段，或描述想看的看板。" : "I kept the current Schema. Tell me which API or field to change, or describe the dashboard you want.", workflow: apiWorkflowSchema.parse(next) };
}
