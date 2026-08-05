"use client";

import { useEffect, useState } from "react";
import { BracketsCurly, ChartLineUp, GearSix, Sparkle } from "@phosphor-icons/react";
import { ApiCanvas } from "./ApiCanvas";
import { ApiDirectory } from "./ApiDirectory";
import { AssistantPanel } from "./AssistantPanel";
import { PreviewPanel } from "./PreviewPanel";
import { SchemaPanel } from "./SchemaPanel";
import { TopToolbar } from "./TopToolbar";
import { WorkflowInspector } from "./WorkflowInspector";
import { useVibeApiStore } from "@/lib/store";

type View = "canvas" | "preview" | "schema";
type RightTab = "ai" | "config" | "preview";

export function VibeApiApp() {
  const hydrated = useVibeApiStore((state) => state.hydrated);
  const setHydrated = useVibeApiStore((state) => state.setHydrated);
  const [view, setView] = useState<View>("canvas");
  const [rightTab, setRightTab] = useState<RightTab>("ai");
  useEffect(() => { if (!hydrated) setHydrated(true); }, [hydrated, setHydrated]);
  if (!hydrated) return <main className="app-loading"><div className="loading-mark" /><strong>Loading Vibe API workspace</strong></main>;
  return <main className="vibe-api-shell">
    <ApiDirectory />
    <section className="workspace-center">
      <TopToolbar view={view} onViewChange={setView} />
      <div className="workspace-stage">{view === "canvas" ? <ApiCanvas /> : view === "preview" ? <PreviewPanel /> : <SchemaPanel />}</div>
    </section>
    <aside className="right-panel" aria-label="AI and workflow details">
      <div className="right-tabs" role="tablist"><button type="button" className={rightTab === "ai" ? "active" : ""} onClick={() => setRightTab("ai")} role="tab"><Sparkle size={12} weight="fill" /> AI</button><button type="button" className={rightTab === "config" ? "active" : ""} onClick={() => setRightTab("config")} role="tab"><GearSix size={12} /> Configure</button><button type="button" className={rightTab === "preview" ? "active" : ""} onClick={() => setRightTab("preview")} role="tab"><ChartLineUp size={12} /> Output</button></div>
      <div className="right-body">{rightTab === "ai" ? <AssistantPanel /> : rightTab === "config" ? <WorkflowInspector /> : <PreviewPanel />}</div>
      <div className="right-panel-footer"><BracketsCurly size={12} /><span>One schema. Manual edits, AI edits, and exports stay in sync.</span></div>
    </aside>
  </main>;
}
