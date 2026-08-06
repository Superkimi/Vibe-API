"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle, GearSix, PaperPlaneTilt, Sparkle, WarningCircle, ArrowRight } from "@phosphor-icons/react";
import { withBasePath } from "@/lib/runtime-path";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";
import { useLocale } from "./LocaleProvider";

type Message = { id: string; role: "user" | "assistant"; content: string; state?: "error" | "applied" };
type ModelSettings = { baseUrl: string; model: string; apiKey: string };
const defaultSettings: ModelSettings = { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", apiKey: "" };

export function AssistantPanel() {
  const { locale, t } = useLocale();
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const replaceIfUnchanged = useVibeApiStore((state) => state.replaceIfUnchanged);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: t("welcome") }]);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("vibe-api-model-settings");
    if (stored) { try { setSettings({ ...defaultSettings, ...JSON.parse(stored) }); } catch { sessionStorage.removeItem("vibe-api-model-settings"); } }
  }, []);
  useEffect(() => { setMessages((current) => current.map((message) => message.id === "welcome" ? { ...message, content: t("welcome") } : message)); }, [t]);
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
      const response = await fetch(withBasePath("/api/ai/workflow"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...settings, locale, prompt: text, workflow: requestWorkflow, history: messages.filter((message) => message.id !== "welcome").slice(-8).map(({ role, content }) => ({ role, content })) }) });
      const result = await response.json() as { summary?: string; workflow?: typeof workflow; error?: string; detail?: string };
      if (!response.ok || !result.workflow) throw new Error(result.error || result.detail || (locale === "zh" ? "AI 没有返回可应用的工作流。" : "AI did not return an applicable workflow."));
      const outcome = replaceIfUnchanged(requestWorkflow.id, requestWorkflow.revision, result.workflow);
      if (outcome === "stale") throw new Error(locale === "zh" ? "AI 生成期间画布发生了变化，请重新发送这条指令。" : "The canvas changed while AI was working. Send the instruction again.");
      if (outcome === "missing") throw new Error(locale === "zh" ? "当前工作流已不存在。" : "The current workflow no longer exists.");
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: result.summary || (locale === "zh" ? "已更新当前 API 组合。" : "The current API composition is updated."), state: "applied" }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", content: error instanceof Error ? error.message : (locale === "zh" ? "AI 请求失败。" : "The AI request failed."), state: "error" }]);
    } finally { setPending(false); }
  };

  return <div className="assistant-panel">
    <header className="assistant-heading"><div><span className="assistant-icon"><Sparkle size={14} weight="fill" /></span><div><strong>{t("vibeWithApi")}</strong><small>{t("schemaAware", { model: settings.model })}</small></div></div><button type="button" className="icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-label={t("configureAiModel")}><GearSix size={16} /></button></header>
    {settingsOpen ? <section className="model-settings" aria-label={t("configureAiModel")}><label>{t("providerEndpoint")}<input value={settings.baseUrl} onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://api.openai.com/v1" /></label><label>{t("model")}<input value={settings.model} onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))} placeholder="gpt-4.1-mini" /></label><label>{t("apiKey")}<input type="password" value={settings.apiKey} onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))} placeholder={t("apiKeyPlaceholder")} /></label><p>{t("apiKeyNote")}</p><button type="button" className="primary-action" onClick={saveSettings}>{t("saveModel")}</button></section> : null}
    <div className="chat-thread" aria-live="polite">
      {messages.map((message) => <article key={message.id} className={`chat-message ${message.role} ${message.state ?? ""}`}>{message.role === "assistant" ? <span className="assistant-avatar"><Sparkle size={11} weight="fill" /></span> : null}<div><p>{message.content}</p>{message.state === "applied" ? <small><CheckCircle size={12} weight="fill" /> {t("appliedToCanvas")}</small> : null}{message.state === "error" ? <small><WarningCircle size={12} weight="fill" /> {t("errorHint")}</small> : null}</div></article>)}
      {pending ? <article className="chat-message assistant thinking"><span className="assistant-avatar"><Sparkle size={11} weight="fill" /></span><div><p>{t("thinking")}</p><span className="thinking-line" /></div></article> : null}
      <div ref={endRef} />
    </div>
    {messages.length === 1 ? <div className="quick-prompts">{[t("promptWeather"), t("promptRepo"), t("promptMetric")].map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}><span>{item}</span><ArrowRight size={12} /></button>)}</div> : null}
    <form className="chat-composer" onSubmit={submit}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder={t("promptPlaceholder")} aria-label={t("describeComposition")} rows={3} /><footer><span>{t("enterSend")}</span><button type="submit" className="send-button" disabled={!prompt.trim() || pending} aria-label={t("sendRequest")}><PaperPlaneTilt size={14} weight="fill" /></button></footer></form>
  </div>;
}
