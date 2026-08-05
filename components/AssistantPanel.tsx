"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle, GearSix, PaperPlaneTilt, Sparkle, WarningCircle, ArrowRight } from "@phosphor-icons/react";
import { withBasePath } from "@/lib/runtime-path";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";

type Message = { id: string; role: "user" | "assistant"; content: string; state?: "error" | "applied" };
type ModelSettings = { baseUrl: string; model: string; apiKey: string };
const defaultSettings: ModelSettings = { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", apiKey: "" };
const quickPrompts = ["把天气、新闻和汇率组合成一个日常数据看板", "把当前 API 换成 GitHub 仓库脉搏看板", "把第一个节点的输出改成一个可读的 metric"];

export function AssistantPanel() {
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const replaceIfUnchanged = useVibeApiStore((state) => state.replaceIfUnchanged);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: "告诉我你想组装什么数据产品。我会直接修改当前画布，并保留可导出的 Schema。" }]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("vibe-api-model-settings");
    if (stored) { try { setSettings({ ...defaultSettings, ...JSON.parse(stored) }); } catch { sessionStorage.removeItem("vibe-api-model-settings"); } }
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, pending]);

  const saveSettings = () => { sessionStorage.setItem("vibe-api-model-settings", JSON.stringify(settings)); setSettingsOpen(false); };
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || pending) return;
    const requestWorkflow = structuredClone(workflow);
    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: text };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setPending(true);
    try {
      const response = await fetch(withBasePath("/api/ai/workflow"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...settings, locale: "zh", prompt: text, workflow: requestWorkflow, history: messages.filter((message) => message.id !== "welcome").slice(-8).map(({ role, content }) => ({ role, content })) }) });
      const result = await response.json() as { summary?: string; workflow?: typeof workflow; error?: string; detail?: string };
      if (!response.ok || !result.workflow) throw new Error(result.error || result.detail || "AI 没有返回可应用的 workflow。");
      const outcome = replaceIfUnchanged(requestWorkflow.id, requestWorkflow.revision, result.workflow);
      if (outcome === "stale") throw new Error("画布在 AI 生成期间发生了变化，请重新发送这条指令。");
      if (outcome === "missing") throw new Error("当前 workflow 已不存在。");
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: result.summary || "已更新当前 API 组合。", state: "applied" }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", content: error instanceof Error ? error.message : "AI 请求失败。", state: "error" }]);
    } finally { setPending(false); }
  };

  return <div className="assistant-panel">
    <header className="assistant-heading"><div><span className="assistant-icon"><Sparkle size={14} weight="fill" /></span><div><strong>Vibe with API</strong><small>{settings.model} · schema-aware</small></div></div><button type="button" className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Configure AI model"><GearSix size={16} /></button></header>
    {settingsOpen ? <section className="model-settings" aria-label="AI model settings"><label>Provider endpoint<input value={settings.baseUrl} onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://api.openai.com/v1" /></label><label>Model<input value={settings.model} onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))} placeholder="gpt-4.1-mini" /></label><label>API key<input type="password" value={settings.apiKey} onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))} placeholder="留空使用本地演示模式" /></label><p>Key 只保存在当前浏览器标签页的 sessionStorage，不会进入 workflow、导出文件或 Git。</p><button type="button" className="primary-action" onClick={saveSettings}>Save model</button></section> : null}
    <div className="chat-thread" aria-live="polite">
      {messages.map((message) => <article key={message.id} className={`chat-message ${message.role} ${message.state ?? ""}`}>{message.role === "assistant" ? <span className="assistant-avatar"><Sparkle size={11} weight="fill" /></span> : null}<div><p>{message.content}</p>{message.state === "applied" ? <small><CheckCircle size={12} weight="fill" /> Applied to canvas and output contract</small> : null}{message.state === "error" ? <small><WarningCircle size={12} weight="fill" /> Check model settings or try a smaller edit</small> : null}</div></article>)}
      {pending ? <article className="chat-message assistant thinking"><span className="assistant-avatar"><Sparkle size={11} weight="fill" /></span><div><p>Inspecting the current Schema and preparing an edit…</p><span className="thinking-line" /></div></article> : null}
      <div ref={endRef} />
    </div>
    {messages.length === 1 ? <div className="quick-prompts">{quickPrompts.map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}><span>{item}</span><ArrowRight size={12} /></button>)}</div> : null}
    <form className="chat-composer" onSubmit={submit}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="例如：用天气和新闻做一个上海每日看板" aria-label="Describe an API composition" rows={3} /><footer><span>Enter send · Shift+Enter newline</span><button type="submit" className="send-button" disabled={!prompt.trim() || pending} aria-label="Send request"><PaperPlaneTilt size={14} weight="fill" /></button></footer></form>
  </div>;
}
