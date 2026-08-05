"use client";

import { useState } from "react";
import { ArrowClockwise, ArrowCounterClockwise, BracketsCurly, Copy, DownloadSimple, Moon, Sun, ArrowsClockwise, Check } from "@phosphor-icons/react";
import { downloadText, toOpenApi, toSkillMarkdown, toWorkflowCode } from "@/lib/codegen";
import { selectActiveWorkflow, useVibeApiStore } from "@/lib/store";

type View = "canvas" | "preview" | "schema";
export function TopToolbar({ view, onViewChange }: { view: View; onViewChange: (view: View) => void }) {
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
  return <header className="top-toolbar"><div className="toolbar-title"><BracketsCurly size={16} color="var(--accent)" /><div>{editing ? <input autoFocus value={workflow.title} onChange={(event) => rename(event.target.value)} onBlur={() => setEditing(false)} onKeyDown={(event) => { if (event.key === "Enter") setEditing(false); }} aria-label="Workflow title" /> : <strong onDoubleClick={() => setEditing(true)} title="Double-click to rename">{workflow.title}</strong>}<small>{workflow.nodes.length} sources · {workflow.output.widgets.length} outputs · rev {workflow.revision}</small></div></div><div className="view-tabs" role="tablist"><button type="button" className={view === "canvas" ? "active" : ""} onClick={() => onViewChange("canvas")}>Canvas</button><button type="button" className={view === "preview" ? "active" : ""} onClick={() => onViewChange("preview")}>Preview</button><button type="button" className={view === "schema" ? "active" : ""} onClick={() => onViewChange("schema")}>Schema</button></div><div className="toolbar-actions"><button type="button" className="icon-only" onClick={undo} title="Undo"><ArrowCounterClockwise size={15} /></button><button type="button" className="icon-only" onClick={redo} title="Redo"><ArrowClockwise size={15} /></button><button type="button" className="icon-only" onClick={autoLayout} title="Auto layout"><ArrowsClockwise size={15} /></button><button type="button" className="icon-only" onClick={copySchema} title="Copy schema">{copied ? <Check size={15} /> : <Copy size={15} />}</button><details className="toolbar-menu"><summary><DownloadSimple size={14} /><span>Export</span></summary><div className="toolbar-popover"><button type="button" onClick={exportJson}><BracketsCurly size={13} /> Vibe API JSON</button><button type="button" onClick={exportOpenApi}><BracketsCurly size={13} /> OpenAPI 3.1</button><button type="button" onClick={exportSkill}><DownloadSimple size={13} /> Skill markdown</button></div></details><button type="button" className="icon-only" onClick={toggleTheme} title="Toggle theme">{dark ? <Sun size={15} /> : <Moon size={15} />}</button></div></header>;
}
