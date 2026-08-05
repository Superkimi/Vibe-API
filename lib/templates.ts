import type { ApiWorkflow, ApiNode } from "./api-schema";

function node(id: string, apiId: string, label: string, subtitle: string, x: number, y: number, params: Record<string, string | number | boolean>, tone: ApiNode["data"]["tone"] = "lilac"): ApiNode {
  const definition = { "60s-news": ["GET", "/v2/60s"], "60s-weather": ["GET", "/v2/weather/realtime"], "60s-exchange": ["GET", "/v2/exchange-rate"], "github-repository": ["GET", "/repos/{owner}/{repo}"], "open-exchange": ["GET", "/v6/latest/USD"], "json-placeholder": ["GET", "/todos/{id}"], "cat-fact": ["GET", "/fact"], "random-user": ["GET", "/api"] }[apiId] ?? ["GET", "/"];
  return { id, type: "apiNode", position: { x, y }, data: { apiId, label, subtitle, method: definition[0] as "GET", path: definition[1], params, outputKey: id, transform: "", tone } };
}

export const dailyIntelligence: ApiWorkflow = {
  id: "daily-intelligence",
  title: "Daily Intelligence Board",
  description: "Weather, headlines, and exchange rates assembled into one shareable output.",
  revision: 0,
  nodes: [
    node("weather", "60s-weather", "Shanghai weather", "Realtime conditions", 60, 180, { city: "Shanghai" }, "cyan"),
    node("headlines", "60s-news", "Morning brief", "Curated headlines", 360, 70, { encoding: "json" }),
    node("fx", "60s-exchange", "FX watch", "Currency snapshot", 360, 300, { currency: "USD" }, "amber"),
  ],
  edges: [
    { id: "edge-weather-headlines", source: "weather", target: "headlines", label: "context", mapping: "city -> brief", type: "smoothstep", animated: true },
    { id: "edge-headlines-fx", source: "headlines", target: "fx", label: "compose", mapping: "news.date -> updatedAt", type: "smoothstep", animated: false },
  ],
  output: {
    mode: "dashboard",
    title: "Shanghai daily brief",
    widgets: [
      { id: "weather-metric", kind: "metric", title: "Temperature", sourceNodeId: "weather", field: "temperature", format: "number" },
      { id: "weather-status", kind: "metric", title: "Conditions", sourceNodeId: "weather", field: "weather", format: "text" },
      { id: "news-list", kind: "list", title: "Top headlines", sourceNodeId: "headlines", field: "news", format: "text" },
      { id: "fx-table", kind: "table", title: "FX snapshot", sourceNodeId: "fx", field: "rates", format: "number" },
    ],
  },
  updatedAt: new Date().toISOString(),
};

export const githubPulse: ApiWorkflow = {
  id: "github-pulse",
  title: "Repository Pulse",
  description: "Turn public repository metadata into a compact engineering pulse board.",
  revision: 0,
  nodes: [node("repo", "github-repository", "Vibe API repository", "Public repo metadata", 140, 180, { owner: "Superkimi", repo: "Vibe-API" }, "slate")],
  edges: [],
  output: { mode: "dashboard", title: "Repository pulse", widgets: [
    { id: "repo-stars", kind: "metric", title: "Stars", sourceNodeId: "repo", field: "stargazers_count", format: "number" },
    { id: "repo-issues", kind: "metric", title: "Open issues", sourceNodeId: "repo", field: "open_issues_count", format: "number" },
    { id: "repo-meta", kind: "json", title: "Repository metadata", sourceNodeId: "repo", field: "", format: "text" },
  ]},
  updatedAt: new Date().toISOString(),
};

export const starterWorkflows = [dailyIntelligence, githubPulse];

export function blankWorkflow(): ApiWorkflow {
  return {
    id: `workflow-${Date.now()}`,
    title: "Untitled API composition",
    description: "Describe the data product you want to assemble.",
    revision: 0,
    nodes: [node("api_1", "json-placeholder", "First API", "Select a source and configure it", 120, 160, { id: 1 })],
    edges: [],
    output: { mode: "dashboard", title: "Untitled dashboard", widgets: [{ id: "widget-1", kind: "json", title: "Response", sourceNodeId: "api_1", field: "", format: "text" }] },
    updatedAt: new Date().toISOString(),
  };
}
