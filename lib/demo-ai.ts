import { apiCatalog } from "./api-catalog";
import { apiWorkflowSchema, type ApiWorkflow } from "./api-schema";
import { dailyIntelligence, githubPulse } from "./templates";

function clone(workflow: ApiWorkflow) {
  return structuredClone({ ...workflow, updatedAt: new Date().toISOString() });
}

export function demoWorkflowFromPrompt(prompt: string, current: ApiWorkflow) {
  const text = prompt.toLowerCase();
  if (/github|仓库|repo|代码库/.test(text)) return { summary: "已切换到仓库脉搏看板，输出仓库指标和原始元数据。", workflow: clone(githubPulse) };
  if (/天气|weather|看板|dashboard|新闻|news|汇率|exchange/.test(text)) return { summary: "已把天气、新闻和汇率组合成一个可预览的数据看板。", workflow: clone(dailyIntelligence) };
  if (/猫|cat/.test(text)) {
    const next = clone(current);
    const api = apiCatalog.find((item) => item.id === "cat-fact");
    if (api) {
      next.nodes[0].data = { ...next.nodes[0].data, apiId: api.id, label: api.name, method: api.method, path: api.path, params: {}, outputKey: next.nodes[0].id };
      next.output.title = "Cat fact preview";
      next.output.widgets = [{ id: "cat-fact", kind: "json", title: "Cat fact response", sourceNodeId: next.nodes[0].id, field: "fact", format: "text" }];
    }
    return { summary: "已将当前首个节点换成 Cat Fact，并把 fact 字段放进预览。", workflow: apiWorkflowSchema.parse(next) };
  }
  const next = clone(current);
  next.title = prompt.trim().slice(0, 64) || next.title;
  next.description = "AI 已保留现有组合，并准备继续按你的下一条指令调整。";
  return { summary: "我保留了当前 Schema。可以继续说要新增哪个 API、改哪个字段，或描述想看的看板。", workflow: apiWorkflowSchema.parse(next) };
}
