"use client";

import { useState } from "react";
import { ArrowClockwise, ArrowCounterClockwise, BracketsCurly, Copy, DownloadSimple, Moon, Sun, ArrowsClockwise, Check } from "@phosphor-icons/react";
import { downloadText, toOpenApi, toSkillMarkdown, toWorkflowCode } from "@/lib/codegen";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";
import { useLocale } from "./LocaleProvider";

type View = "canvas" | "preview" | "schema";
export function TopToolbar({ view, onViewChange }: { view: View; onViewChange: (view: View) => void }) {
  const { t } = useLocale();
  const workflow = useVibeApiStore(selectActiveWorkflow);
  const rename = useVibeApiStore((state) => state.renameWorkflow);
  const undo = useVibeApiStore((state) => state.undo);
  const redo = useVibeApiStore((state) => state.redo);
  const autoLayout = useVibeApiStore((state) => state.autoLayout);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);
  const exportJson = () => downloadText(`${workflow.id}.vibe-api.json`, toWorkflowCode(workflow), "application/json;charset=utf-8");
  const exportOpenApi = () => downloadText(`${workflow.id}.openapi.json`, JSON.stringify(toOpenApi(workflow), null, 2), "application/json;charset=utf-8");
  const exportSkill = () => downloadText(`${workflow.id}.skill.md`, toSkillMarkdown(workflow));
  const copySchema = async () => { await navigator.clipboard.writeText(toWorkflowCode(workflow)); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; };
  return <header className="top-toolbar"><div className="toolbar-title"><BracketsCurly size={16} color="var(--accent)" /><div>{editing ? <input autoFocus value={workflow.title} onChange={(event) => rename(event.target.value)} onBlur={() => setEditing(false)} onKeyDown={(event) => { if (event.key === "Enter") setEditing(false); }} aria-label={t("workflowSchema")} /> : <strong onDoubleClick={() => setEditing(true)} title={t("renameWorkflow")}>{workflow.title}</strong>}<small>{t("workflowSources", { count: workflow.nodes.length })} · {t("workflowOutputs", { count: workflow.output.widgets.length })} · {t("revision", { count: workflow.revision })}</small></div></div><div className="view-tabs" role="tablist"><button type="button" className={view === "canvas" ? "active" : ""} onClick={() => onViewChange("canvas")}>{t("canvas")}</button><button type="button" className={view === "preview" ? "active" : ""} onClick={() => onViewChange("preview")}>{t("preview")}</button><button type="button" className={view === "schema" ? "active" : ""} onClick={() => onViewChange("schema")}>{t("schema")}</button></div><div className="toolbar-actions"><button type="button" className="icon-only" onClick={undo} title={t("undo")} aria-label={t("undo")}><ArrowCounterClockwise size={15} /></button><button type="button" className="icon-only" onClick={redo} title={t("redo")} aria-label={t("redo")}><ArrowClockwise size={15} /></button><button type="button" className="icon-only" onClick={autoLayout} title={t("autoLayout")} aria-label={t("autoLayout")}><ArrowsClockwise size={15} /></button><button type="button" className="icon-only" onClick={copySchema} title={t("copySchema")} aria-label={t("copySchema")}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><details className="toolbar-menu"><summary><DownloadSimple size={14} /><span>{t("export")}</span></summary><div className="toolbar-popover"><button type="button" onClick={exportJson}><BracketsCurly size={13} /> {t("vibeApiJson")}</button><button type="button" onClick={exportOpenApi}><BracketsCurly size={13} /> {t("openapi")}</button><button type="button" onClick={exportSkill}><DownloadSimple size={13} /> {t("skillMarkdown")}</button></div></details><button type="button" className="icon-only" onClick={toggleTheme} title={t("toggleTheme")} aria-label={t("toggleTheme")}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button></div></header>;
}
